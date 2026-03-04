// routes/acquisitions.js
const express = require('express');
const Acquisition = require('../models/Acquisition');
const auth = require('../middleware/auth');

const router = express.Router();

const verifyToken = auth;
const requireAdmin = auth.requireAdmin;

// Create acquisition (admin only; normally created automatically when assets are added)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const item = new Acquisition(req.body);
    await item.save();
    res.json({ msg: 'Acquisition saved', acquisition: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all acquisitions (authenticated)
router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await Acquisition.find().sort({ date: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
