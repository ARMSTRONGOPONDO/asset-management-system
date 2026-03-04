const Asset = require("../models/Asset");

// Get all assets
exports.getAssets = async (req, res) => {
  try {
    const assets = await Asset.find();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Add new asset
exports.addAsset = async (req, res) => {
  try {
    const { name, category, value, location } = req.body;
    const asset = new Asset({ name, category, value, location });
    await asset.save();
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Update asset (edit or transfer)
exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    // Handle transfer
    if (updates.transferTo && updates.reason) {
      asset.status = "Transferred";
      asset.transferHistory.push({
        transferredTo: updates.transferTo,
        reason: updates.reason
      });
    }

    // Handle disposal
    if (updates.disposeReason) {
      asset.status = "Disposed";
      asset.disposal = { reason: updates.disposeReason, date: new Date() };
    }

    // General updates
    if (updates.name) asset.name = updates.name;
    if (updates.category) asset.category = updates.category;
    if (updates.value) asset.value = updates.value;
    if (updates.location) asset.location = updates.location;

    await asset.save();
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Delete asset
exports.deleteAsset = async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
