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

// Thêm câu hỏi mới
const createQuestion = async (req, res) => {
  try {
    const newQuestion = await Question.create(req.body);

    res.status(201).json({
      success: true,
      message: "Thêm câu hỏi thành công",
      data: newQuestion,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Không thể thêm câu hỏi",
      error: error.message,
    });
  }
};
// Cập nhật câu hỏi
const updateQuestion = async (req, res) => {
  try {
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedQuestion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy câu hỏi",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật câu hỏi thành công",
      data: updatedQuestion,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Không thể cập nhật câu hỏi",
      error: error.message,
    });
  }
};
// Xóa câu hỏi
const deleteQuestion = async (req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(
      req.params.id
    );

    if (!deletedQuestion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy câu hỏi",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa câu hỏi thành công",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Không thể xóa câu hỏi",
      error: error.message,
    });
  }
};

module.exports = {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
