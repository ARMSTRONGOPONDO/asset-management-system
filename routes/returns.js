const express = require('express');
const router = express.Router();
const Return = require('../models/Return');
const Asset = require('../models/Asset');
const auth = require('../middleware/auth');

// Create a return request
router.post('/', auth, async (req, res) => {
  try {
    const { serialNumber, reason, staffID, department } = req.body;

    if (!serialNumber || !reason || !staffID || !department) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const asset = await Asset.findOne({ serialNumber });
    if (!asset) {
      return res.status(404).json({ error: 'Asset with this serial number not found' });
    }

    const newReturn = new Return({
      asset: asset._id,
      serialNumber,
      reason,
      staffID,
      department,
      returnedBy: req.user.id
    });

    await newReturn.save();
    res.json(newReturn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all returns (Admin) or user's returns
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.returnedBy = req.user.id;
    }
    const returns = await Return.find(query).populate('asset').populate('returnedBy', 'username staffID department');
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Process return (Admin only)
router.patch('/:id', auth, auth.requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'Received'
    if (status !== 'Received') {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const returnRecord = await Return.findById(req.params.id);
    if (!returnRecord) return res.status(404).json({ error: 'Return record not found' });

    returnRecord.status = 'Received';
    await returnRecord.save();

    // Update asset status
    await Asset.findByIdAndUpdate(returnRecord.asset, { 
      status: 'Available', 
      assignedTo: null, 
      department: '' 
    });

    res.json(returnRecord);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
