// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  staffID:  { type: String, required: true, unique: true },
  department: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt:{ type: Date, default: Date.now } // Automatically store registration time
});

// Export the User model
module.exports = mongoose.model("User", UserSchema);
