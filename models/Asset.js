const mongoose = require("mongoose");

const AssetSchema = new mongoose.Schema({
  description: { type: String, required: true },
  itemID: { type: String, required: true, unique: true },
  serialNumber: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  status: { type: String, default: "Available", enum: ["Available", "Allocated", "Maintenance", "Disposed"] }, 
  value: { type: Number, required: true },
  location: { type: String, default: "Head Office" }, // For transfers
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Person responsible for the asset
  department: { type: String, default: "" }, // Department that owns the asset
  disposalReason: { type: String, default: "" }, // Reason for disposal
  dateAcquired: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Asset", AssetSchema);
