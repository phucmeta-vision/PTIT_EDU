const express = require("express");
const router = express.Router();
const {
  getExams,
  getAvailableQuestions,
  createExam,
  getExamById,
  updateExam,
  deleteExam,
  getExamByCode,
} = require("../controllers/examController");
const { getExamScores } = require("../controllers/examScoreController");
const { getExamAnalytics } = require("../controllers/analyticsController");
const { requireAuth, requireLecturerOrAdmin } = require("../middleware/examAuth");

// Tra mã đề là endpoint an toàn cho thí sinh, không cần quyền Lecturer.
router.get("/code/:code", getExamByCode);

router.use(requireAuth, requireLecturerOrAdmin);
router.get("/available-questions", getAvailableQuestions);
router.get("/", getExams);
router.post("/", createExam);
router.get("/:examId/scores", getExamScores);
router.get("/:examId/analytics", getExamAnalytics);
router.get("/:id", getExamById);
router.put("/:id", updateExam);
router.delete("/:id", deleteExam);

module.exports = router;
