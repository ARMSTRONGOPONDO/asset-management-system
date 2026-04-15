const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const Request = require("../models/Request");
const Return = require("../models/Return");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const Transfer = require("../models/Transfer");
const Maintenance = require("../models/Maintenance");
const auth = require("../middleware/auth");

// Get all assets
router.get("/", auth, async (req, res) => {
  try {
    const assets = await Asset.find().populate('assignedTo', 'username staffID department');
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create new asset (Admin only)
router.post("/", auth, auth.requireAdmin, async (req, res) => {
  try {
    const { description, itemID, serialNumber, category, value, location } = req.body;

    if (!description || !itemID || !serialNumber || !category || !value) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    const newAsset = new Asset({
      description,
      itemID,
      serialNumber,
      category,
      value,
      location
    });

    await newAsset.save();
    res.json(newAsset);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Item ID or Serial Number already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update asset (Admin only)
router.put("/:id", auth, auth.requireAdmin, async (req, res) => {
  try {
    const { description, itemID, serialNumber, category, value, location, status } = req.body;
    const assetToUpdate = await Asset.findById(req.params.id);
    if (!assetToUpdate) return res.status(404).json({ error: "Asset not found" });

    // Prepare audit log
    const changes = [];
    if (description && description !== assetToUpdate.description) changes.push(`description: ${assetToUpdate.description} -> ${description}`);
    if (itemID && itemID !== assetToUpdate.itemID) changes.push(`itemID: ${assetToUpdate.itemID} -> ${itemID}`);
    if (serialNumber && serialNumber !== assetToUpdate.serialNumber) changes.push(`serialNumber: ${assetToUpdate.serialNumber} -> ${serialNumber}`);
    if (category && category !== assetToUpdate.category) changes.push(`category: ${assetToUpdate.category} -> ${category}`);
    if (value && value !== assetToUpdate.value) changes.push(`value: ${assetToUpdate.value} -> ${value}`);
    if (location && location !== assetToUpdate.location) changes.push(`location: ${assetToUpdate.location} -> ${location}`);
    if (status && status !== assetToUpdate.status) changes.push(`status: ${assetToUpdate.status} -> ${status}`);

    if (changes.length > 0) {
      const newLog = new AuditLog({
        action: 'Update Asset',
        targetId: assetToUpdate._id,
        targetName: assetToUpdate.description || 'Unknown Asset',
        details: `Changes: ${changes.join(', ')}`,
        performedBy: req.user.id,
        performedByName: req.user.username || 'Admin'
      });
      await newLog.save();
    }

    const updatedAsset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedAsset);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Item ID or Serial Number already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Allocate asset (Admin only)
router.post("/:id/allocate", auth, auth.requireAdmin, async (req, res) => {
  try {
    const { userID, department } = req.body;
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    if (asset.status === 'Allocated') {
      return res.status(400).json({ error: "Asset is already allocated" });
    }

    asset.status = "Allocated";
    asset.assignedTo = userID;
    asset.department = department;
    await asset.save();

    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Dispose asset (Admin only)
router.post("/:id/dispose", auth, auth.requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    asset.status = "Disposed";
    asset.disposalReason = reason;
    asset.assignedTo = null;
    await asset.save();

    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Transfer asset (Admin only)
router.post("/:id/transfer", auth, auth.requireAdmin, async (req, res) => {
  try {
    const { toUserID, toDepartment, reason } = req.body;
    const asset = await Asset.findById(req.params.id).populate('assignedTo');
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    if (asset.status === 'Disposed') {
      return res.status(400).json({ error: "Cannot transfer a disposed asset" });
    }

    const newOwner = await User.findById(toUserID);
    if (!newOwner) return res.status(404).json({ error: "New owner not found" });

    const fromUserText = asset.assignedTo ? `${asset.assignedTo.username} (${asset.assignedTo.staffID})` : 'N/A';

    const transfer = new Transfer({
      asset: asset._id,
      itemID: asset.itemID,
      serialNumber: asset.serialNumber,
      reason,
      fromDepartment: asset.department,
      toDepartment: toDepartment || newOwner.department,
      fromUser: asset.assignedTo ? asset.assignedTo._id : null,
      fromUserName: asset.assignedTo ? asset.assignedTo.username : 'N/A',
      toUser: newOwner._id,
      toUserName: newOwner.username,
      performedBy: req.user.id
    });

    await transfer.save();

    // Log to master AuditLog
    const newAuditLog = new AuditLog({
      action: 'Transfer Asset',
      targetId: asset._id,
      targetName: asset.description,
      details: `Transferred from ${fromUserText} to ${newOwner.username} (${newOwner.staffID}). Reason: ${reason}`,
      performedBy: req.user.id,
      performedByName: req.user.username
    });
    await newAuditLog.save();

    // Update asset
    asset.assignedTo = newOwner._id;
    asset.department = toDepartment || newOwner.department;
    asset.status = "Allocated";
    await asset.save();

    res.json({ message: "Asset transferred successfully", transfer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Track asset (Admin only)
router.get("/:id/track", auth, auth.requireAdmin, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('assignedTo', 'username staffID department');
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const maintenanceHistory = await Maintenance.find({ asset: asset._id }).populate('requestedBy', 'username');
    const transferHistory = await Transfer.find({ asset: asset._id }).sort({ date: -1 });

    res.json({
      asset,
      maintenanceHistory,
      transferHistory
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete asset (Admin only)
router.delete("/:id", auth, auth.requireAdmin, async (req, res) => {
  try {
    const assetToDelete = await Asset.findById(req.params.id).populate('assignedTo', 'username staffID department');
    if (!assetToDelete) return res.status(404).json({ error: "Asset not found" });

    // Prepare rich details
    let details = `ItemID: ${assetToDelete.itemID}, S/N: ${assetToDelete.serialNumber}, Category: ${assetToDelete.category}, Value: ${assetToDelete.value}`;
    if (assetToDelete.assignedTo) {
      details += ` | WAS ALLOCATED TO: ${assetToDelete.assignedTo.username} (${assetToDelete.assignedTo.staffID}) in ${assetToDelete.assignedTo.department}`;
    } else {
      details += ` | Status: ${assetToDelete.status}`;
    }

    // Log the action before deleting
    const newLog = new AuditLog({
      action: 'Delete Asset',
      targetId: assetToDelete._id,
      targetName: assetToDelete.description || 'Unknown Asset',
      details: details,
      performedBy: req.user.id,
      performedByName: req.user.username || 'Admin'
    });
    await newLog.save();

    await Asset.findByIdAndDelete(req.params.id);
    res.json({ message: "Asset deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Search (Admin only)
router.get("/search", auth, auth.requireAdmin, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json({ assets: [], requests: [], returns: [], users: [] });

    const regex = new RegExp(query, 'i');

    const [assets, requests, returns, users] = await Promise.all([
      Asset.find({ $or: [{ description: regex }, { itemID: regex }, { serialNumber: regex }] }),
      Request.find({ $or: [{ description: regex }, { reason: regex }, { staffID: regex }] }),
      Return.find({ $or: [{ serialNumber: regex }, { reason: regex }, { staffID: regex }] }).populate('asset'),
      User.find({ $or: [{ username: regex }, { staffID: regex }, { department: regex }] }).select("-password")
    ]);

    res.json({ assets, requests, returns, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
