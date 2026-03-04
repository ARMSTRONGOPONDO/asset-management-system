// routes/disposals.js
const express = require('express');
const Disposal = require('../models/Disposal');
const auth = require('../middleware/auth');

const router = express.Router();

const verifyToken = auth;
const requireAdmin = auth.requireAdmin;

// Create disposal (admin only; normally handled via /api/assets/:id/dispose)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const item = new Disposal(req.body);
    await item.save();
    res.json({ msg: 'Disposal saved', disposal: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all disposals (authenticated)
router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await Disposal.find().sort({ date: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
