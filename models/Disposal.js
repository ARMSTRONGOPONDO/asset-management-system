// models/Disposal.js
const mongoose = require('mongoose');

const DisposalSchema = new mongoose.Schema({
  asset:    { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  name:     { type: String, required: true },
  quantity: { type: Number, default: 0 },
  reason:   { type: String },
  user:     { type: String },
  date:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Disposal', DisposalSchema);
