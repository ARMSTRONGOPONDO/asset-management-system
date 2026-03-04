const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'Completed' },
  cost: { type: Number, default: 0 },
  createdBy: { type: String, default: '' }
});

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
