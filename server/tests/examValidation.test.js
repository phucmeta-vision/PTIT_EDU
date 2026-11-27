const test = require("node:test");
const assert = require("node:assert/strict");
const { validateExamFields } = require("../services/examValidation");

const basePayload = {
  title: "Kiểm tra giữa kỳ",
  subjectId: "64f000000000000000000001",
  duration: 60,
  maxAttempts: 2,
  openAt: "2026-11-25T02:00:00.000Z",
  closeAt: "2026-11-25T03:30:00.000Z",
  status: "published",
};

test("chấp nhận cấu hình đề thi hợp lệ", () => {
  const result = validateExamFields(basePayload);
  assert.equal(result.duration, 60);
  assert.equal(result.maxAttempts, 2);
  assert.equal(result.status, "published");
});

test("từ chối duration không dương hoặc không nguyên", () => {
  assert.throws(() => validateExamFields({ ...basePayload, duration: 0 }), { statusCode: 400 });
  assert.throws(() => validateExamFields({ ...basePayload, duration: 1.5 }), { statusCode: 400 });
});

test("từ chối maxAttempts không phải số nguyên dương", () => {
  assert.throws(() => validateExamFields({ ...basePayload, maxAttempts: 0 }), { statusCode: 400 });
  assert.throws(() => validateExamFields({ ...basePayload, maxAttempts: 1.2 }), { statusCode: 400 });
});

test("từ chối openAt không nhỏ hơn closeAt", () => {
  assert.throws(() => validateExamFields({
    ...basePayload,
    openAt: "2026-11-25T04:00:00.000Z",
    closeAt: "2026-11-25T03:00:00.000Z",
  }), { statusCode: 400 });
});
