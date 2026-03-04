const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, default: 'Available' },
    value: { type: Number, required: true },
    dateAcquired: { type: Date, default: Date.now },
    location: { type: String },
    disposalReason: { type: String }
});

module.exports = mongoose.model('Asset', AssetSchema);
