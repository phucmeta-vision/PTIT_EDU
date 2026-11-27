const mongoose = require("mongoose");

function validateExamFields(payload, currentExam = null) {
  const title = payload.title !== undefined ? String(payload.title ?? "").trim() : currentExam?.title;
  const subjectId = payload.subjectId !== undefined ? payload.subjectId : currentExam?.subjectId;
  const duration = payload.duration !== undefined ? Number(payload.duration) : currentExam?.duration;
  const maxAttempts = payload.maxAttempts !== undefined
    ? Number(payload.maxAttempts)
    : currentExam?.maxAttempts;
  const openAtValue = payload.openAt !== undefined ? payload.openAt : currentExam?.openAt;
  const closeAtValue = payload.closeAt !== undefined ? payload.closeAt : currentExam?.closeAt;
  const openAt = openAtValue ? new Date(openAtValue) : new Date(NaN);
  const closeAt = closeAtValue ? new Date(closeAtValue) : new Date(NaN);

  if (!title) throw Object.assign(new Error("Vui lòng nhập tên đề thi."), { statusCode: 400 });
  if (title.length > 200) throw Object.assign(new Error("Tên đề thi tối đa 200 ký tự."), { statusCode: 400 });
  if (!mongoose.isValidObjectId(subjectId)) {
    throw Object.assign(new Error("subjectId không hợp lệ."), { statusCode: 400 });
  }
  if (!Number.isInteger(duration) || duration <= 0) {
    throw Object.assign(new Error("duration phải là số nguyên lớn hơn 0 (đơn vị: phút)."), { statusCode: 400 });
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw Object.assign(new Error("maxAttempts phải là số nguyên lớn hơn hoặc bằng 1."), { statusCode: 400 });
  }
  if (Number.isNaN(openAt.getTime())) {
    throw Object.assign(new Error("openAt không phải thời điểm hợp lệ."), { statusCode: 400 });
  }
  if (Number.isNaN(closeAt.getTime())) {
    throw Object.assign(new Error("closeAt không phải thời điểm hợp lệ."), { statusCode: 400 });
  }
  if (openAt >= closeAt) {
    throw Object.assign(new Error("openAt phải sớm hơn closeAt."), { statusCode: 400 });
  }

  const status = payload.status !== undefined ? payload.status : currentExam?.status || "draft";
  if (!["draft", "published", "closed"].includes(status)) {
    throw Object.assign(new Error("status chỉ nhận draft, published hoặc closed."), { statusCode: 400 });
  }

  return { title, subjectId, duration, maxAttempts, openAt, closeAt, status };
}

module.exports = { validateExamFields };
