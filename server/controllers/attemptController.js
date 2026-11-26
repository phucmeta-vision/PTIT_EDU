// D2 available · D4 start · D5 questions · D11 state/progress · D12 submit · D13 result/history
const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');         // TV3
const Question = require('../models/Question'); // TV2
const { gradeAttempt, gradeQuestion } = require('../services/gradingService');
const { assertExamWindow, assertAttemptsAvailable } = require('../services/examPolicyService'); // TV3

const GRACE_MS = 10 * 1000; // cho phép trễ mạng khi tự nộp lúc hết giờ
const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const httpError = (status, message) => Object.assign(new Error(message), { status });

// Cùng định dạng response với TV3: { success, data } / { success:false, message }
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
function fail(res, e) {
  const status = e.status || e.statusCode || 500;
  if (status >= 500) console.error(e);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'Lỗi máy chủ.' : e.message,
    ...(e.code && { code: e.code }),
  });
}

// ---------- helpers ----------
// Question (TV2): options[] = { id, content }, correctAnswers = [option.id]. KHÔNG dùng o._id.
const optId = (o) => String(o.id ?? o._id);
const optText = (o) => o.content ?? o.text ?? '';

function publicQuestion(q) {
  // Chỉ liệt kê trường an toàn -> không bao giờ lộ correctAnswers
  return {
    _id: q._id,
    content: q.content,
    type: q.type,
    difficulty: q.difficulty,
    options: (q.options || []).map((o) => ({ id: optId(o), text: optText(o) })),
  };
}

function summary(a) {
  return {
    _id: a._id,
    examId: a.examId,
    status: a.status,
    startedAt: a.startedAt,
    expiresAt: a.expiresAt,
    submittedAt: a.submittedAt,
    totalQuestions: a.totalQuestions,
    ...(a.status !== 'in-progress' && { score: a.score, correctCount: a.correctCount }),
  };
}

const state = (a) => ({
  ...summary(a),
  serverNow: new Date(), // client dùng để tính lệch đồng hồ
  answers: a.answers || {},
  markedQuestions: a.markedQuestions || [],
  progressUpdatedAt: a.progressUpdatedAt,
});

// Chỉ giữ câu thuộc attempt, option hợp lệ, single tối đa 1 đáp án
function sanitizeAnswers(questions, raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object') return clean;
  for (const q of questions) {
    const sel = raw[String(q._id)];
    if (!Array.isArray(sel)) continue;
    const valid = new Set((q.options || []).map(optId));
    let picked = [...new Set(sel.map(String))].filter((x) => valid.has(x));
    if (q.type === 'single') picked = picked.slice(0, 1);
    if (picked.length) clean[String(q._id)] = picked;
  }
  return clean;
}

async function loadQuestions(ids) {
  const rows = await Question.find({ _id: { $in: ids } }).lean();
  const map = new Map(rows.map((r) => [String(r._id), r]));
  return ids.map((id) => map.get(String(id))).filter(Boolean); // giữ thứ tự đề
}

// Chốt attempt – chỉ thành công 1 lần nhờ điều kiện status
async function finalize(attempt, { answers, markedQuestions, status }) {
  const questions = await loadQuestions(attempt.questionIds);
  const clean = sanitizeAnswers(questions, answers);
  const g = gradeAttempt(questions, clean);
  const updated = await Attempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in-progress' },
    {
      $set: {
        answers: clean,
        markedQuestions: markedQuestions || attempt.markedQuestions || [],
        score: g.score,
        correctCount: g.correctCount,
        totalQuestions: g.total,
        submittedAt: new Date(),
        status,
      },
    },
    { returnDocument: 'after' }
  ).lean();
  return updated || (await Attempt.findById(attempt._id).lean()); // đã có request khác chốt trước
}

// Quá hạn mà chưa nộp -> chấm theo bản autosave cuối
async function settleIfExpired(a) {
  if (a.status === 'in-progress' && Date.now() > new Date(a.expiresAt).getTime()) {
    return finalize(a, { answers: a.answers, status: 'expired' });
  }
  return a;
}

async function ownAttempt(req) {
  if (!isId(req.params.id)) throw httpError(404, 'Không tìm thấy bài thi.');
  // lọc theo studentId lấy từ token -> bài của người khác trả 404
  const a = await Attempt.findOne({ _id: req.params.id, studentId: req.studentId }).lean();
  if (!a) throw httpError(404, 'Không tìm thấy bài thi.');
  return a;
}

// ---------- D2: kỳ thi đang mở (server quyết định trạng thái) ----------
exports.getAvailableExams = async (req, res) => {
  try {
    const now = new Date();
    let q = Exam.find({ status: 'published', openAt: { $lte: now }, closeAt: { $gt: now } })
      .select('title code subjectId duration openAt closeAt maxAttempts')
      .sort({ closeAt: 1 });
    if (mongoose.models.Subject) q = q.populate('subjectId', 'name');
    const exams = await q.lean();

    const mine = await Attempt.find({ studentId: req.studentId, examId: { $in: exams.map((e) => e._id) } })
      .select('examId status expiresAt').lean();

    ok(res, exams.map((e) => {
      const own = mine.filter((a) => String(a.examId) === String(e._id));
      const live = own.find((a) => a.status === 'in-progress' && new Date(a.expiresAt) > now);
      const used = own.length;
      return {
        ...e,
        attemptsUsed: used,
        attemptsRemaining: Math.max(e.maxAttempts - used, 0),
        inProgressAttemptId: live ? live._id : null,
      };
    }));
  } catch (e) { fail(res, e); }
};

// ---------- D4: bắt đầu thi ----------
exports.startAttempt = async (req, res) => {
  try {
    const { examId } = req.body || {};
    if (!isId(examId)) throw httpError(400, 'examId không hợp lệ.');
    const exam = await Exam.findById(examId).lean();
    if (!exam) throw httpError(404, 'Không tìm thấy đề thi.');

    assertExamWindow(exam); // TV3: draft / chưa mở / đã đóng -> 403

    // Đang có bài dở -> trả lại (double-click / mở tab khác)
    let existing = await Attempt.findOne({ studentId: req.studentId, examId, status: 'in-progress' }).lean();
    if (existing) {
      existing = await settleIfExpired(existing);
      if (existing.status === 'in-progress') return ok(res, { ...state(existing), resumed: true });
    }

    await assertAttemptsAvailable({ Attempt, exam, studentId: req.studentId }); // TV3: hết lượt -> 403

    const questionIds = exam.questionIds || []; // snapshot của TV3 (manual lẫn random)
    if (!questionIds.length) throw httpError(400, 'Đề thi chưa có câu hỏi.');

    const startedAt = new Date(); // giờ server
    const end = Math.min(startedAt.getTime() + exam.duration * 60 * 1000, new Date(exam.closeAt).getTime());

    try {
      const doc = await Attempt.create({
        studentId: req.studentId, examId, questionIds, startedAt,
        expiresAt: new Date(end), totalQuestions: questionIds.length,
      });
      return ok(res, { ...state(doc.toObject()), resumed: false }, 201);
    } catch (err) {
      if (err.code === 11000) { // 2 request song song -> unique index chặn
        const dup = await Attempt.findOne({ studentId: req.studentId, examId, status: 'in-progress' }).lean();
        if (dup) return ok(res, { ...state(dup), resumed: true });
      }
      throw err;
    }
  } catch (e) { fail(res, e); }
};

// ---------- D11: trạng thái attempt (reload) ----------
exports.getAttemptState = async (req, res) => {
  try {
    const a = await settleIfExpired(await ownAttempt(req));
    const exam = await Exam.findById(a.examId).select('title duration').lean();
    ok(res, { ...state(a), exam });
  } catch (e) { fail(res, e); }
};

// ---------- D5: câu hỏi không lộ đáp án ----------
exports.getAttemptQuestions = async (req, res) => {
  try {
    const a = await settleIfExpired(await ownAttempt(req));
    if (a.status !== 'in-progress') throw httpError(409, 'Bài thi đã kết thúc.');
    const questions = await loadQuestions(a.questionIds);
    ok(res, { questions: questions.map(publicQuestion) });
  } catch (e) { fail(res, e); }
};

// ---------- D11: autosave lên server ----------
exports.saveProgress = async (req, res) => {
  try {
    const a = await ownAttempt(req);
    if (a.status !== 'in-progress' || Date.now() > new Date(a.expiresAt).getTime() + GRACE_MS)
      throw httpError(409, 'Bài thi đã kết thúc.');
    const body = req.body || {};
    const questions = await loadQuestions(a.questionIds);
    const answers = sanitizeAnswers(questions, body.answers);
    const ids = new Set(a.questionIds.map(String));
    const marked = (Array.isArray(body.markedQuestions) ? body.markedQuestions : [])
      .map(String).filter((x) => ids.has(x));
    const now = new Date();
    await Attempt.updateOne(
      { _id: a._id, status: 'in-progress' },
      { $set: { answers, markedQuestions: marked, progressUpdatedAt: now } }
    );
    ok(res, { progressUpdatedAt: now });
  } catch (e) { fail(res, e); }
};

// ---------- D12: nộp bài & chấm điểm ----------
exports.submitAttempt = async (req, res) => {
  try {
    const a = await ownAttempt(req);
    // Nộp lại (retry mạng / bấm 2 lần) -> trả kết quả cũ, KHÔNG chấm lại
    if (a.status !== 'in-progress') return ok(res, { ...summary(a), alreadySubmitted: true });

    const body = req.body || {};
    const late = Date.now() > new Date(a.expiresAt).getTime() + GRACE_MS;
    // Nộp trễ quá GRACE: bỏ payload client, chấm theo bản autosave cuối, status = expired.
    // `score` trong body (nếu có) không bao giờ được đọc.
    const done = await finalize(a, {
      answers: late ? a.answers : body.answers ?? a.answers,
      markedQuestions: late ? a.markedQuestions : body.markedQuestions,
      status: late ? 'expired' : 'submitted',
    });
    ok(res, { ...summary(done), late });
  } catch (e) { fail(res, e); }
};

// ---------- D13: kết quả chi tiết (chỉ sau khi nộp) ----------
exports.getAttemptResult = async (req, res) => {
  try {
    const a = await settleIfExpired(await ownAttempt(req));
    if (a.status === 'in-progress') throw httpError(403, 'Chỉ xem được đáp án sau khi nộp bài.');
    const [exam, questions] = await Promise.all([
      Exam.findById(a.examId).select('title').lean(),
      loadQuestions(a.questionIds),
    ]);
    const review = questions.map((q) => {
      const selected = (a.answers || {})[String(q._id)] || [];
      return {
        ...publicQuestion(q),
        correctAnswers: (q.correctAnswers || []).map(String),
        selected,
        isCorrect: gradeQuestion(q, selected) === 1,
      };
    });
    ok(res, { attempt: summary(a), examTitle: exam?.title, review });
  } catch (e) { fail(res, e); }
};

// ---------- D13: lịch sử thi ----------
exports.getMyAttempts = async (req, res) => {
  try {
    const stale = await Attempt.find({ studentId: req.studentId, status: 'in-progress', expiresAt: { $lt: new Date() } }).lean();
    for (const s of stale) await settleIfExpired(s);

    const rows = await Attempt.find({ studentId: req.studentId })
      .sort({ startedAt: -1 })
      .select('-answers -questionIds -markedQuestions')
      .populate('examId', 'title code duration maxAttempts')
      .lean();
    ok(res, { attempts: rows.map((r) => ({ ...summary({ ...r, examId: r.examId?._id }), exam: r.examId })) });
  } catch (e) { fail(res, e); }
};
