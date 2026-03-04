const express = require('express');
const Maintenance = require('../models/Maintenance');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Create maintenance record
router.post('/', verifyToken, async (req, res) => {
  try {
    const { assetId, description, date, status, cost } = req.body;

    const record = new Maintenance({
      asset: assetId,
      description,
      date: date || Date.now(),
      status: status || 'Completed',
      cost: cost || 0,
      createdBy: req.user ? req.user.username : 'system'
    });

    await record.save();
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get maintenance records (optionally filter by assetId)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { assetId } = req.query;
    const filter = assetId ? { asset: assetId } : {};

    const records = await Maintenance.find(filter)
      .sort({ date: -1 })
      .populate('asset', 'name');

    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
