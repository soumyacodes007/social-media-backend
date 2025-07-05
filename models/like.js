// models/like.js
const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema({
  // The post that was liked
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  // The user who liked the post
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a compound index to ensure a user can only like a post once.
// This is a database-level constraint for data integrity.
likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Like", likeSchema);
