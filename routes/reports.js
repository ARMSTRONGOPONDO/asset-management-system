const express = require('express');
const Asset = require('../models/Asset');
const Acquisition = require('../models/Acquisition');
const Disposal = require('../models/Disposal');
const Maintenance = require('../models/Maintenance');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/summary
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const totalAssets = await Asset.countDocuments();
    const totalAcquisitions = await Acquisition.countDocuments();
    const totalDisposals = await Disposal.countDocuments();
    const totalMaintenance = await Maintenance.countDocuments();

    const byStatusAgg = await Asset.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byCategoryAgg = await Asset.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const byDepartmentAgg = await Asset.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    const byStatus = {};
    byStatusAgg.forEach((item) => {
      byStatus[item._id || 'Unknown'] = item.count;
    });

    const byCategory = {};
    byCategoryAgg.forEach((item) => {
      byCategory[item._id || 'Uncategorized'] = item.count;
    });

    const byDepartment = {};
    byDepartmentAgg.forEach((item) => {
      byDepartment[item._id || 'Unassigned'] = item.count;
    });

    res.json({
      totalAssets,
      totalAcquisitions,
      totalDisposals,
      totalMaintenance,
      byStatus,
      byCategory,
      byDepartment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
