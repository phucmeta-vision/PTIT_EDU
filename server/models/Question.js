const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    options: [
      {
        id: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],

    correctAnswers: {
      type: [String],
      required: true,
    },

    type: {
      type: String,
      enum: ["single", "multiple"],
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Question", questionSchema);