const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Request = require('../models/Request');
const Return = require('../models/Return');
const Maintenance = require('../models/Maintenance');
const auth = require('../middleware/auth');

// Get admin dashboard statistics and lists
router.get('/admin', auth, auth.requireAdmin, async (req, res) => {
  try {
    const [
      totalAssets,
      totalRequests,
      totalReturns,
      totalAllocated,
      requestedItems,
      returnMarkedItems,
      pendingMaintenance,
      fullInventory
    ] = await Promise.all([
      Asset.countDocuments(),
      Request.countDocuments(),
      Return.countDocuments(),
      Asset.countDocuments({ status: 'Allocated' }),
      Request.find({ status: 'Pending' }).populate('requestedBy', 'username staffID department'),
      Return.find({ status: 'Pending' }).populate('asset').populate('returnedBy', 'username staffID department'),
      Maintenance.find({ status: 'Pending' }).populate('asset').populate('requestedBy', 'username staffID department'),
      Asset.find().populate('assignedTo', 'username staffID department')
    ]);

    res.json({
      stats: {
        totalAssets,
        totalRequests,
        totalReturns,
        totalAllocated
      },
      requestedItems,
      returnMarkedItems,
      pendingMaintenance,
      fullInventory
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user specific reports
router.get('/user', auth, async (req, res) => {
  try {
    const [requests, returns, allocatedAssets, maintenance] = await Promise.all([
      Request.find({ requestedBy: req.user.id }),
      Return.find({ returnedBy: req.user.id }).populate('asset'),
      Asset.find({ assignedTo: req.user.id }),
      Maintenance.find({ requestedBy: req.user.id }).populate('asset')
    ]);

    res.json({ requests, returns, allocatedAssets, maintenance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
