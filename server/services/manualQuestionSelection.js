const mongoose = require("mongoose");
const Question = require("../models/Question");

async function selectManualQuestions({ questionIds, subjectId }) {
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    const error = new Error("Đề thủ công phải có ít nhất một câu hỏi.");
    error.statusCode = 400;
    throw error;
  }

  const ids = questionIds.map((id) => String(id));
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    const error = new Error("Danh sách chứa ID câu hỏi không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  if (new Set(ids).size !== ids.length) {
    const error = new Error("Danh sách câu hỏi không được chứa ID trùng.");
    error.statusCode = 400;
    throw error;
  }

  const questions = await Question.find({ _id: { $in: ids }, subjectId })
    .select("_id subjectId")
    .lean();

  if (questions.length !== ids.length) {
    const foundIds = new Set(questions.map((question) => String(question._id)));
    const invalidQuestionIds = ids.filter((id) => !foundIds.has(id));
    const error = new Error("Có câu hỏi không tồn tại hoặc không thuộc môn học đã chọn.");
    error.statusCode = 422;
    error.details = { invalidQuestionIds };
    throw error;
  }

  // Giữ đúng thứ tự giảng viên đã chọn, không theo thứ tự MongoDB trả về.
  return ids;
}

module.exports = { selectManualQuestions };
