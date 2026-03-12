const express = require('express');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

const router = express.Router();

const verifyToken = auth;
const requireAdmin = auth.requireAdmin;

// GET /api/users - list all users (admin only)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'username email role staffID department createdAt').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id - delete a user (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) return res.status(404).json({ error: 'User not found' });

    // Prevent self-deletion
    if (userToDelete._id.toString() === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    // Check if user has allocated assets
    const Asset = require('../models/Asset');
    const allocatedAssets = await Asset.find({ assignedTo: userToDelete._id });
    
    let details = `StaffID: ${userToDelete.staffID}, Email: ${userToDelete.email}, Dept: ${userToDelete.department}, Role: ${userToDelete.role}`;
    if (allocatedAssets.length > 0) {
      const itemNames = allocatedAssets.map(a => a.description).join(', ');
      details += ` | HAD ALLOCATED ITEMS: ${itemNames}. (Items are now unassigned)`;
      
      // Unassign assets before deleting user
      await Asset.updateMany({ assignedTo: userToDelete._id }, { assignedTo: null, status: 'Available' });
    }

    // Log the action before deleting
    const newLog = new AuditLog({
      action: 'Delete User',
      targetId: userToDelete._id,
      targetName: userToDelete.username || 'Unknown User',
      details: details,
      performedBy: req.user.id,
      performedByName: req.user.username || 'Admin'
    });
    await newLog.save();

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id - update user info (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, staffID, department, role } = req.body;
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

    // Prepare audit log
    const changes = [];
    if (username && username !== userToUpdate.username) changes.push(`username: ${userToUpdate.username} -> ${username}`);
    if (email && email !== userToUpdate.email) changes.push(`email: ${userToUpdate.email} -> ${email}`);
    if (staffID && staffID !== userToUpdate.staffID) changes.push(`staffID: ${userToUpdate.staffID} -> ${staffID}`);
    if (department && department !== userToUpdate.department) changes.push(`dept: ${userToUpdate.department} -> ${department}`);
    if (role && role !== userToUpdate.role) changes.push(`role: ${userToUpdate.role} -> ${role}`);

    if (changes.length > 0) {
      const newLog = new AuditLog({
        action: 'Update User',
        targetId: userToUpdate._id,
        targetName: userToUpdate.username || 'Unknown User',
        details: `Changes: ${changes.join(', ')}`,
        performedBy: req.user.id,
        performedByName: req.user.username || 'Admin'
      });
      await newLog.save();
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, staffID, department, role },
      { new: true, fields: 'username email role staffID department createdAt' }
    );

    res.json(updatedUser);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username, Email or StaffID already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id/role - change a user's role (admin only)
router.put('/:id/role', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, fields: 'username email role staffID department createdAt' }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
