const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Upload" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: String, // ✅ match this with backend field
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Comment", commentSchema);
