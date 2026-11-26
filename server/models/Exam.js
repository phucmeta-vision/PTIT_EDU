const mongoose = require("mongoose");

const randomConfigSchema = new mongoose.Schema(
  {
    easy: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    medium: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    hard: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    selectionMode: {
      type: String,
      enum: ["manual", "random"],
      required: true,
      default: "manual",
    },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    randomConfig: { type: randomConfigSchema, default: undefined },
    duration: { type: Number, required: true, min: 1 }, // phút
    openAt: { type: Date, required: true },
    closeAt: { type: Date, required: true },
    maxAttempts: { type: Number, required: true, min: 1, default: 1 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
    },
  },
  { timestamps: true }
);

examSchema.path("duration").validate(Number.isInteger, "duration phải là số nguyên phút.");
examSchema.path("maxAttempts").validate(Number.isInteger, "maxAttempts phải là số nguyên.");
examSchema.path("closeAt").validate(function validateCloseAt(value) {
  return !this.openAt || value > this.openAt;
}, "closeAt phải sau openAt.");

examSchema.index({ createdBy: 1, createdAt: -1 });
examSchema.index({ subjectId: 1, status: 1 });

module.exports = mongoose.models.Exam || mongoose.model("Exam", examSchema);
