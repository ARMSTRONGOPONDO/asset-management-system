const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const Acquisition = require("../models/Acquisition");
const Disposal = require("../models/Disposal");
const Maintenance = require("../models/Maintenance");
const AssetChange = require("../models/AssetChange");
const auth = require("../middleware/auth");

const verifyToken = auth;
const requireAdmin = auth.requireAdmin;

// -------------------
// Get all assets
// -------------------
router.get("/", verifyToken, async (req, res) => {
  try {
    const assets = await Asset.find();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------
// Create new asset
// -------------------
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, category, status, value, location, assignedTo, department } = req.body;

    const newAsset = new Asset({
      name,
      category,
      status,
      value,
      location,
      assignedTo,
      department
    });

    await newAsset.save();

    // Also log acquisition
    const acquisition = new Acquisition({
      asset: newAsset._id,
      name,
      quantity: 1,
      reason: "Asset created",
      user: req.user ? req.user.username : "system"
    });
    await acquisition.save();

    res.json(newAsset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------
// Update asset (name, status, location, disposalReason, etc.) and log change
// -------------------
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { name, status, location, disposalReason, assignedTo, department, value, category } = req.body;

    const existing = await Asset.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const updatedFields = {};
    if (name !== undefined) updatedFields.name = name;
    if (status !== undefined) updatedFields.status = status;
    if (location !== undefined) updatedFields.location = location;
    if (assignedTo !== undefined) updatedFields.assignedTo = assignedTo;
    if (department !== undefined) updatedFields.department = department;
    if (disposalReason !== undefined) updatedFields.disposalReason = disposalReason;
    if (value !== undefined) updatedFields.value = value;
    if (category !== undefined) updatedFields.category = category;

    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true }
    );

    // Build a simple human-readable change description
    const changes = [];
    if (name !== undefined && name !== existing.name) {
      changes.push(`name: "${existing.name}" → "${name}"`);
    }
    if (category !== undefined && category !== existing.category) {
      changes.push(`category: "${existing.category}" → "${category}"`);
    }
    if (department !== undefined && department !== existing.department) {
      changes.push(`department: "${existing.department || ""}" → "${department || ""}"`);
    }
    if (location !== undefined && location !== existing.location) {
      changes.push(`location: "${existing.location || ""}" → "${location || ""}"`);
    }
    if (assignedTo !== undefined && assignedTo !== existing.assignedTo) {
      changes.push(`assignedTo: "${existing.assignedTo || ""}" → "${assignedTo || ""}"`);
    }
    if (typeof value !== "undefined" && value !== existing.value) {
      changes.push(`value: ${existing.value} → ${value}`);
    }
    if (status !== undefined && status !== existing.status) {
      changes.push(`status: "${existing.status}" → "${status}"`);
    }

    if (changes.length) {
      const desc = `Asset details updated (${changes.join("; ")})`;
      try {
        await AssetChange.create({
          asset: existing._id,
          description: desc,
          user: req.user ? req.user.username : "system"
        });
      } catch (logErr) {
        console.error("Failed to log asset change:", logErr);
      }
    }

    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------
// Delete asset (admin only)
// -------------------
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------
// Transfer asset (and log location change)
// -------------------
router.put("/:id/transfer", verifyToken, async (req, res) => {
  try {
    const { location } = req.body;

    const existing = await Asset.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const oldLocation = existing.location || "";
    existing.location = location;
    const asset = await existing.save();

    // Log a change entry if the location actually changed
    if (typeof location !== "undefined" && location !== oldLocation) {
      const desc = `Asset transferred (location: "${oldLocation}" \\u2192 "${location}")`;
      try {
        await AssetChange.create({
          asset: existing._id,
          description: desc,
          user: req.user ? req.user.username : "system"
        });
      } catch (logErr) {
        console.error("Failed to log transfer change:", logErr);
      }
    }

    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------
// Dispose asset (admin only)
// -------------------
router.put("/:id/dispose", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { disposalReason, status } = req.body;

    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { status, disposalReason },
      { new: true }
    );

    if (asset) {
      const disposal = new Disposal({
        asset: asset._id,
        name: asset.name,
        quantity: 1,
        reason: disposalReason,
        user: req.user ? req.user.username : "system"
      });
      await disposal.save();
    }

    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------
// Audit trail for a single asset
// -------------------
router.get('/:id/audit', verifyToken, async (req, res) => {
  try {
    const assetId = req.params.id;

    const [acquisitions, disposals, maintenance, changes] = await Promise.all([
      Acquisition.find({ asset: assetId }).sort({ date: 1 }),
      Disposal.find({ asset: assetId }).sort({ date: 1 }),
      Maintenance.find({ asset: assetId }).sort({ date: 1 }),
      AssetChange.find({ asset: assetId }).sort({ date: 1 })
    ]);

    const timeline = [];

    acquisitions.forEach((a) => {
      timeline.push({
        type: 'Acquisition',
        date: a.date,
        description: a.reason || 'Asset created',
        user: a.user || ''
      });
    });

    disposals.forEach((d) => {
      timeline.push({
        type: 'Disposal',
        date: d.date,
        description: d.reason || 'Asset disposed',
        user: d.user || ''
      });
    });

    maintenance.forEach((m) => {
      timeline.push({
        type: 'Maintenance',
        date: m.date,
        description: m.description,
        user: m.createdBy || ''
      });
    });

    changes.forEach((c) => {
      timeline.push({
        type: 'Edit',
        date: c.date,
        description: c.description,
        user: c.user || ''
      });
    });

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(timeline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
