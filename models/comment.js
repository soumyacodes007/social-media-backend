// models/comment.js
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Upload" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  comment: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Comment", commentSchema);
