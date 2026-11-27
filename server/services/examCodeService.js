const crypto = require("crypto");

function generateExamCode() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PTIT-${datePart}-${randomPart}`;
}

async function generateUniqueExamCode(Exam, maxAttempts = 8) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateExamCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Exam.exists({ code });
    if (!exists) return code;
  }
  const error = new Error("Không thể tạo mã đề duy nhất. Vui lòng thử lại.");
  error.statusCode = 503;
  throw error;
}

module.exports = { generateExamCode, generateUniqueExamCode };
