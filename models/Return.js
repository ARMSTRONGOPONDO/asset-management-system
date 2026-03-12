const mongoose = require('mongoose');

const ReturnSchema = new mongoose.Schema({
  asset:       { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  serialNumber:{ type: String, required: true },
  reason:      { type: String, required: true },
  staffID:     { type: String, required: true },
  department:  { type: String, required: true },
  status:      { type: String, enum: ['Pending', 'Received'], default: 'Pending' },
  returnedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Return', ReturnSchema);
