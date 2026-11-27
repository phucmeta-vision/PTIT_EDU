const Question = require("../models/Question");

const DIFFICULTIES = ["easy", "medium", "hard"];

function normalizeRandomConfig(config = {}) {
  const normalized = {};
  for (const difficulty of DIFFICULTIES) {
    const value = config[difficulty] === undefined || config[difficulty] === ""
      ? 0
      : Number(config[difficulty]);
    if (!Number.isInteger(value) || value < 0) {
      const error = new Error(`Số câu mức ${difficulty} phải là số nguyên không âm.`);
      error.statusCode = 400;
      throw error;
    }
    normalized[difficulty] = value;
  }

  if (Object.values(normalized).every((count) => count === 0)) {
    const error = new Error("Cần chọn ít nhất một câu hỏi cho cấu hình random.");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

async function selectRandomQuestions({ subjectId, randomConfig }) {
  const config = normalizeRandomConfig(randomConfig);
  const selectedIds = [];
  const insufficient = [];

  for (const difficulty of DIFFICULTIES) {
    const requiredCount = config[difficulty];
    if (requiredCount === 0) continue;

    const candidates = await Question.find({ subjectId, difficulty }).select("_id").lean();
    if (candidates.length < requiredCount) {
      insufficient.push({ difficulty, requested: requiredCount, available: candidates.length });
      continue;
    }

    selectedIds.push(...shuffle(candidates).slice(0, requiredCount).map((question) => String(question._id)));
  }

  if (insufficient.length) {
    const error = new Error("Ngân hàng câu hỏi không đủ số lượng theo độ khó đã yêu cầu.");
    error.statusCode = 422;
    error.details = { insufficient };
    throw error;
  }

  return { questionIds: selectedIds, randomConfig: config };
}

module.exports = { DIFFICULTIES, normalizeRandomConfig, selectRandomQuestions };
