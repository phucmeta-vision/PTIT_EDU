const express = require("express");
const router = express.Router();

const {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  searchQuestions,
  filterBySubject,
  filterByDifficulty,
  filterByType,
  paginateQuestions,
} = require("../controllers/questionController");
// Tìm kiếm câu hỏi
router.get("/search", searchQuestions);

// Lọc câu hỏi
router.get("/filter/subject", filterBySubject);
router.get("/filter/difficulty", filterByDifficulty);
router.get("/filter/type", filterByType);

// Phân trang câu hỏi
router.get("/pagination", paginateQuestions);

// Lấy danh sách câu hỏi
router.get("/", getQuestions);

// Thêm câu hỏi
router.post("/", createQuestion);

// Cập nhật câu hỏi
router.put("/:id", updateQuestion);

// Xóa câu hỏi
router.delete("/:id", deleteQuestion);

module.exports = router;