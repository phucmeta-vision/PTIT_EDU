const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const { selectManualQuestions } = require("../services/manualQuestionSelection");
const { selectRandomQuestions } = require("../services/randomQuestionService");
const { validateExamFields } = require("../services/examValidation");
const { generateUniqueExamCode } = require("../services/examCodeService");
const { getUserId, isAdmin } = require("../middleware/examAuth");
const { getDisplayStatus } = require("../utils/examStatus");

function sendError(res, error, fallbackMessage) {
  const statusCode = error.statusCode || (error.name === "ValidationError" ? 400 : 500);
  return res.status(statusCode).json({
    success: false,
    message: error.message || fallbackMessage,
    ...(error.code ? { code: error.code } : {}),
    ...(error.details ? { details: error.details } : {}),
    ...(statusCode >= 500 && process.env.NODE_ENV !== "production"
      ? { error: error.message }
      : {}),
  });
}

function validObjectId(value) {
  return mongoose.isValidObjectId(value);
}

function getActorId(req) {
  const id = getUserId(req.user);
  return id && validObjectId(id) ? id : null;
}

function canManageExam(exam, req) {
  if (isAdmin(req.user)) return true;
  const actorId = getActorId(req);
  return Boolean(actorId && String(exam.createdBy) === String(actorId));
}

async function addSafeQuestions(examDocument) {
  const exam = examDocument.toObject ? examDocument.toObject() : { ...examDocument };
  const ids = (exam.questionIds || []).map((id) => String(id?._id || id));
  const questions = await Question.find({ _id: { $in: ids } })
    .select("content options type difficulty subjectId")
    .lean();
  const byId = new Map(questions.map((question) => [String(question._id), question]));
  exam.questions = ids.map((id) => byId.get(id)).filter(Boolean);
  exam.questionCount = ids.length;
  exam.displayStatus = getDisplayStatus(exam);
  return exam;
}

// GET /api/exams - danh sách đề do giảng viên sở hữu (Admin xem tất cả).
async function getExams(req, res) {
  try {
    const actorId = getActorId(req);
    if (!isAdmin(req.user) && !actorId) {
      return res.status(401).json({ success: false, message: "Không xác định được tài khoản đăng nhập." });
    }

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const filter = {};
    if (!isAdmin(req.user)) filter.createdBy = actorId;
    if (req.query.subjectId) {
      if (!validObjectId(req.query.subjectId)) {
        return res.status(400).json({ success: false, message: "subjectId không hợp lệ." });
      }
      filter.subjectId = req.query.subjectId;
    }
    const conditions = [];
    const now = new Date();
    if (req.query.status === "draft") {
      conditions.push({ $or: [
        { status: "draft" },
        { status: "published", openAt: { $gt: now }, closeAt: { $gt: now } },
      ] });
    } else if (req.query.status === "open") {
      conditions.push({ status: "published", openAt: { $lte: now }, closeAt: { $gt: now } });
    } else if (req.query.status === "closed") {
      conditions.push({ $or: [
        { status: "closed" },
        { status: "published", closeAt: { $lte: now } },
      ] });
    }
    if (req.query.q) {
      const escaped = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      conditions.push({ $or: [
        { title: { $regex: escaped, $options: "i" } },
        { code: { $regex: escaped, $options: "i" } },
      ] });
    }
    if (conditions.length) filter.$and = conditions;

    const [exams, total] = await Promise.all([
      Exam.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Exam.countDocuments(filter),
    ]);

    const data = exams.map((exam) => ({
      ...exam,
      questionCount: (exam.questionIds || []).length,
      displayStatus: getDisplayStatus(exam),
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return sendError(res, error, "Không thể lấy danh sách đề thi.");
  }
}

// GET /api/exams/available-questions - danh sách câu hỏi dùng trong form, tuyệt đối không trả đáp án.
async function getAvailableQuestions(req, res) {
  try {
    const { subjectId, difficulty, keyword } = req.query;
    if (!validObjectId(subjectId)) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp subjectId hợp lệ." });
    }
    const filter = { subjectId };
    if (difficulty && ["easy", "medium", "hard"].includes(difficulty)) filter.difficulty = difficulty;
    if (keyword) {
      const escaped = String(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.content = { $regex: escaped, $options: "i" };
    }
    const data = await Question.find(filter)
      .select("content options type difficulty subjectId createdAt")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, "Không thể lấy ngân hàng câu hỏi.");
  }
}

// POST /api/exams
async function createExam(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ success: false, message: "Tài khoản không có ID hợp lệ." });

    const fields = validateExamFields(req.body);
    const selectionMode = req.body.selectionMode || "manual";
    if (!["manual", "random"].includes(selectionMode)) {
      return res.status(400).json({ success: false, message: "selectionMode chỉ nhận manual hoặc random." });
    }

    let questionIds;
    let randomConfig;
    if (selectionMode === "manual") {
      questionIds = await selectManualQuestions({
        questionIds: req.body.questionIds,
        subjectId: fields.subjectId,
      });
    } else {
      const selected = await selectRandomQuestions({
        subjectId: fields.subjectId,
        randomConfig: req.body.randomConfig,
      });
      questionIds = selected.questionIds;
      randomConfig = selected.randomConfig;
    }

    let createdExam;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const code = await generateUniqueExamCode(Exam);
      try {
        // eslint-disable-next-line no-await-in-loop
        createdExam = await Exam.create({
          ...fields,
          code,
          selectionMode,
          questionIds,
          ...(randomConfig ? { randomConfig } : {}),
          createdBy: actorId,
        });
        break;
      } catch (error) {
        if (error.code !== 11000 || attempt === 3) throw error;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Tạo đề thi thành công.",
      data: await addSafeQuestions(createdExam),
    });
  } catch (error) {
    return sendError(res, error, "Không thể tạo đề thi.");
  }
}

// GET /api/exams/:id
async function getExamById(req, res) {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID đề thi không hợp lệ." });
    }
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: "Không tìm thấy đề thi." });
    if (!canManageExam(exam, req)) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đề thi." });
    }
    return res.status(200).json({ success: true, data: await addSafeQuestions(exam) });
  } catch (error) {
    return sendError(res, error, "Không thể lấy thông tin đề thi.");
  }
}

// PUT /api/exams/:id
async function updateExam(req, res) {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID đề thi không hợp lệ." });
    }
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: "Không tìm thấy đề thi." });
    if (!canManageExam(exam, req)) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đề thi." });
    }

    const fields = validateExamFields(req.body, exam);
    const nextMode = req.body.selectionMode || exam.selectionMode;
    if (!["manual", "random"].includes(nextMode)) {
      return res.status(400).json({ success: false, message: "selectionMode chỉ nhận manual hoặc random." });
    }

    const currentRandomConfig = exam.randomConfig?.toObject?.() || exam.randomConfig || {};
    const incomingRandomConfig = req.body.randomConfig;
    const randomConfigChanged = incomingRandomConfig !== undefined &&
      ["easy", "medium", "hard"].some((key) => Number(incomingRandomConfig[key] || 0) !== Number(currentRandomConfig[key] || 0));
    const selectionChanged =
      (req.body.selectionMode !== undefined && req.body.selectionMode !== exam.selectionMode) ||
      (req.body.subjectId !== undefined && String(req.body.subjectId) !== String(exam.subjectId)) ||
      (nextMode === "manual" && req.body.questionIds !== undefined) ||
      (nextMode === "random" && randomConfigChanged);

    let questionIds = exam.questionIds.map((id) => String(id));
    let randomConfig = exam.randomConfig ? currentRandomConfig : undefined;
    if (selectionChanged && nextMode === "manual") {
      questionIds = await selectManualQuestions({
        questionIds: req.body.questionIds !== undefined ? req.body.questionIds : questionIds,
        subjectId: fields.subjectId,
      });
      randomConfig = undefined;
    } else if (selectionChanged && nextMode === "random") {
      const selected = await selectRandomQuestions({
        subjectId: fields.subjectId,
        randomConfig: req.body.randomConfig !== undefined ? req.body.randomConfig : randomConfig,
      });
      questionIds = selected.questionIds;
      randomConfig = selected.randomConfig;
    }

    Object.assign(exam, fields, {
      selectionMode: nextMode,
      questionIds,
      ...(randomConfig ? { randomConfig } : {}),
    });
    if (!randomConfig) exam.randomConfig = undefined;
    await exam.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật đề thi thành công.",
      data: await addSafeQuestions(exam),
    });
  } catch (error) {
    return sendError(res, error, "Không thể cập nhật đề thi.");
  }
}

// DELETE /api/exams/:id
async function deleteExam(req, res) {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID đề thi không hợp lệ." });
    }
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: "Không tìm thấy đề thi." });
    if (!canManageExam(exam, req)) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đề thi." });
    }
    await exam.deleteOne();
    return res.status(200).json({ success: true, message: "Xóa đề thi thành công." });
  } catch (error) {
    return sendError(res, error, "Không thể xóa đề thi.");
  }
}

// GET /api/exams/code/:code - endpoint tra mã an toàn cho thí sinh.
async function getExamByCode(req, res) {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, message: "Vui lòng nhập mã đề." });
    const exam = await Exam.findOne({ code }).lean();
    if (!exam) return res.status(404).json({ success: false, message: "Mã đề không tồn tại." });

    const now = new Date();
    const canStart = exam.status === "published" && now >= new Date(exam.openAt) && now < new Date(exam.closeAt);
    const response = {
      _id: exam._id,
      title: exam.title,
      code: exam.code,
      subjectId: exam.subjectId,
      duration: exam.duration,
      openAt: exam.openAt,
      closeAt: exam.closeAt,
      maxAttempts: exam.maxAttempts,
      status: getDisplayStatus(exam, now),
      canStart,
      questionCount: (exam.questionIds || []).length,
    };

    // Chỉ cung cấp nội dung câu hỏi khi đang trong khung giờ thi; không bao giờ chọn correctAnswers.
    if (canStart) {
      const ids = (exam.questionIds || []).map(String);
      const questions = await Question.find({ _id: { $in: ids } })
        .select("content options type difficulty")
        .lean();
      const byId = new Map(questions.map((question) => [String(question._id), question]));
      response.questions = ids.map((id) => byId.get(id)).filter(Boolean);
    }

    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    return sendError(res, error, "Không thể tra cứu mã đề.");
  }
}

module.exports = {
  getExams,
  getAvailableQuestions,
  createExam,
  getExamById,
  updateExam,
  deleteExam,
  getExamByCode,
};
