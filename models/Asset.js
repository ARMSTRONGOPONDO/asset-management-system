const mongoose = require("mongoose");

const AssetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, default: "Available" }, // Available, In Use, Disposed
  value: { type: Number, required: true },
  location: { type: String, default: "Head Office" }, // For transfers
  assignedTo: { type: String, default: "" }, // Person responsible for the asset
  department: { type: String, default: "" }, // Department that owns the asset
  disposalReason: { type: String, default: "" }, // Reason for disposal
  dateAcquired: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Asset", AssetSchema);
