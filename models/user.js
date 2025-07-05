// models/user.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, unique: true, required: true },
    name: String,
    profileImage: String, // You have 'profileImage', we will use this.
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // This links to another document in the same User collection
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // This also links to another User
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
