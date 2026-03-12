const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const Asset = require('../models/Asset');
const auth = require('../middleware/auth');

// Create a maintenance request
router.post('/', auth, async (req, res) => {
  try {
    const { serialNumber, reason, staffID } = req.body;

    if (!serialNumber || !reason || !staffID) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const asset = await Asset.findOne({ serialNumber });
    if (!asset) {
      return res.status(404).json({ error: 'Asset with this serial number not found' });
    }

    const newMaintenance = new Maintenance({
      asset: asset._id,
      serialNumber,
      reason,
      staffID,
      requestedBy: req.user.id
    });

    await newMaintenance.save();
    res.json(newMaintenance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all maintenance requests (Admin) or user's requests
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.requestedBy = req.user.id;
    }
    const maintenance = await Maintenance.find(query).populate('asset').populate('requestedBy', 'username staffID department');
    res.json(maintenance);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update maintenance status (Admin only)
router.patch('/:id', auth, auth.requireAdmin, async (req, res) => {
  try {
    const { status, cost } = req.body;
    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) return res.status(404).json({ error: 'Maintenance record not found' });

    maintenance.status = status;
    if (cost !== undefined) maintenance.cost = cost;
    await maintenance.save();

    // If completed, make asset available again? 
    // Usually maintenance means it's back in inventory.
    if (status === 'Completed') {
      await Asset.findByIdAndUpdate(maintenance.asset, { status: 'Available' });
    } else if (status === 'In Progress') {
      await Asset.findByIdAndUpdate(maintenance.asset, { status: 'Maintenance' });
    }

    res.json(maintenance);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
