const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g., 'Delete User', 'Delete Asset'
  targetId: { type: String, required: true },
  targetName: { type: String, required: true }, // username or asset description
  details: { type: String }, // e.g., itemID, staffID, serialNumber
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
