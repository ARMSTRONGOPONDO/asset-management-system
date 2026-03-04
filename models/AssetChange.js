const mongoose = require("mongoose");

const AssetChangeSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
  description: { type: String, required: true },
  user: { type: String, default: "" },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AssetChange", AssetChangeSchema);
