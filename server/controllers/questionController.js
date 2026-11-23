const Question = require("../models/Question");

// Lấy danh sách câu hỏi
const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách câu hỏi thành công",
      data: questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách câu hỏi",
      error: error.message,
    });
  }
};

module.exports = {
  getQuestions,
};
