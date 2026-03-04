const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');

// Get all assets
router.get('/', async (req, res) => {
    try {
        const assets = await Asset.find();
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create asset
router.post('/', async (req, res) => {
    try {
        const { name, category, status, value, location } = req.body;
        const asset = new Asset({ name, category, status, value, location });
        await asset.save();
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update asset
router.put('/:id', async (req, res) => {
    try {
        const { name, status, location, disposalReason } = req.body;
        const updatedFields = {};
        if (name !== undefined) updatedFields.name = name;
        if (status !== undefined) updatedFields.status = status;
        if (location !== undefined) updatedFields.location = location;
        if (disposalReason !== undefined) updatedFields.disposalReason = disposalReason;

        const asset = await Asset.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete asset
router.delete('/:id', async (req, res) => {
    try {
        await Asset.findByIdAndDelete(req.params.id);
        res.json({ message: 'Asset deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Transfer asset
router.put('/:id/transfer', async (req, res) => {
    try {
        const { location } = req.body;
        const asset = await Asset.findByIdAndUpdate(req.params.id, { location }, { new: true });
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Dispose asset
router.put('/:id/dispose', async (req, res) => {
    try {
        const { status, disposalReason } = req.body;
        const asset = await Asset.findByIdAndUpdate(req.params.id, { status, disposalReason }, { new: true });
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
