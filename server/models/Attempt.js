// D1 – Attempt model (khớp hợp đồng TV3: examId + studentId, score thang 10)
const mongoose = require('mongoose');
const { Schema } = mongoose;

const attemptSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    // Bộ câu hỏi cố định của lần thi (snapshot từ Exam.questionIds) -> reload không đổi đề
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    startedAt: { type: Date, required: true, default: Date.now }, // do server ghi
    expiresAt: { type: Date, required: true },
    // { [questionId]: [optionId, ...] } – optionId là Question.options[].id
    answers: { type: Schema.Types.Mixed, default: {} },
    markedQuestions: [{ type: String }],
    progressUpdatedAt: { type: Date, default: null },
    score: { type: Number, default: null }, // thang 10, chỉ server tính
    correctCount: { type: Number, default: null },
    totalQuestions: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null },
    status: { type: String, enum: ['in-progress', 'submitted', 'expired'], default: 'in-progress' },
  },
  { timestamps: true, minimize: false }
);

attemptSchema.index({ studentId: 1, examId: 1, startedAt: -1 });
// Mỗi thí sinh chỉ có 1 attempt in-progress / đề -> chống double-click
attemptSchema.index(
  { studentId: 1, examId: 1 },
  { unique: true, partialFilterExpression: { status: 'in-progress' } }
);
attemptSchema.index({ examId: 1, status: 1, score: -1 }); // bảng điểm + aggregation TV3

module.exports = mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema);
