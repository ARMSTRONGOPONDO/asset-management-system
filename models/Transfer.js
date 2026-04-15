const mongoose = require('mongoose');

const TransferSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  itemID: { type: String, required: true },
  serialNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  reason: { type: String, required: true },
  fromDepartment: { type: String },
  toDepartment: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fromUserName: { type: String },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserName: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Transfer', TransferSchema);
