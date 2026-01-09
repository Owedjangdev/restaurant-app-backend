const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  category: {
    type: String,
    enum: ["technical", "billing", "delivery", "account", "other"],
    default: "other",
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["open", "in-progress", "closed"],
    default: "open",
  },
  responses: [
    {
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      message: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
supportSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Support", supportSchema);
