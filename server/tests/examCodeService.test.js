const test = require("node:test");
const assert = require("node:assert/strict");
const { generateExamCode, generateUniqueExamCode } = require("../services/examCodeService");

test("mã đề có prefix PTIT, ngày và phần ngẫu nhiên đủ độ dài", () => {
  const code = generateExamCode();
  assert.match(code, /^PTIT-\d{6}-[A-F0-9]{8}$/);
});

test("hai lần sinh mã đề liên tiếp tạo mã khác nhau", () => {
  assert.notEqual(generateExamCode(), generateExamCode());
});

test("dịch vụ kiểm tra trùng trước khi trả mã đề", async () => {
  let calls = 0;
  const Exam = {
    exists: async () => {
      calls += 1;
      return calls === 1;
    },
  };
  const code = await generateUniqueExamCode(Exam);
  assert.match(code, /^PTIT-\d{6}-[A-F0-9]{8}$/);
  assert.equal(calls, 2);
});

test("báo lỗi rõ nếu không tìm được mã chưa sử dụng", async () => {
  await assert.rejects(
    generateUniqueExamCode({ exists: async () => true }, 2),
    { statusCode: 503 },
  );
});
