const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  description: { type: String, required: true },
  reason:      { type: String, required: true },
  staffID:     { type: String, required: true },
  department:  { type: String, required: true },
  status:      { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', RequestSchema);
