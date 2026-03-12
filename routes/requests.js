const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const auth = require('../middleware/auth');

// Create a new request
router.post('/', auth, async (req, res) => {
  try {
    const { description, reason, staffID, department } = req.body;
    
    if (!description || !reason || !staffID || !department) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newRequest = new Request({
      description,
      reason,
      staffID,
      department,
      requestedBy: req.user.id
    });

    await newRequest.save();
    res.json(newRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all requests (Admin) or user's requests
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.requestedBy = req.user.id;
    }
    const requests = await Request.find(query).populate('requestedBy', 'username staffID department');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update request status (Admin only)
router.patch('/:id', auth, auth.requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await Request.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
