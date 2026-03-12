const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  serialNumber: { type: String, required: true },
  reason: { type: String, required: true },
  staffID: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  cost: { type: Number, default: 0 }
});

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
