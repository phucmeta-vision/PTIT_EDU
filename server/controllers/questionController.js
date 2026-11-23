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

// Tìm kiếm câu hỏi theo từ khóa
const searchQuestions = async (req, res) => {
  try {
    const { keyword } = req.query;

    const questions = await Question.find({
      content: {
        $regex: keyword || "",
        $options: "i",
      },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Tìm kiếm câu hỏi thành công",
      data: questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm câu hỏi",
      error: error.message,
    });
  }
};
// Lọc câu hỏi theo môn học
const filterBySubject = async (req, res) => {
  try {
    const { subjectId } = req.query;

    const questions = await Question.find({
      subjectId: subjectId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Lọc câu hỏi theo môn học thành công",
      data: questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lọc câu hỏi",
      error: error.message,
    });
  }
};
// Lọc câu hỏi theo độ khó
const filterByDifficulty = async (req, res) => {
  try {
    const { difficulty } = req.query;

    const questions = await Question.find({
      difficulty: difficulty,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Lọc câu hỏi theo độ khó thành công",
      data: questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lọc câu hỏi",
      error: error.message,
    });
  }
};
// Lọc câu hỏi theo loại
const filterByType = async (req, res) => {
  try {
    const { type } = req.query;

    const questions = await Question.find({
      type: type,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Lọc câu hỏi theo loại thành công",
      data: questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lọc câu hỏi",
      error: error.message,
    });
  }
};
// Phân trang danh sách câu hỏi
const paginateQuestions = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const questions = await Question.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalQuestions = await Question.countDocuments();

    res.status(200).json({
      success: true,
      message: "Lấy danh sách câu hỏi thành công",
      data: questions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalQuestions / limit),
        totalQuestions,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi phân trang câu hỏi",
      error: error.message,
    });
  }
};


module.exports = {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  searchQuestions,
  filterBySubject,
  filterByDifficulty,
  filterByType,
  paginateQuestions,
};
