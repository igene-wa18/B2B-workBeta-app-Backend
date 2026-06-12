const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// GET all users (admin/dept_head/manager)
router.get('/', protect, requireRole('admin', 'dept_head', 'manager'), async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'dept_head') filter.department_id = req.user.department_id;
        if (req.user.role === 'manager') filter.manager_id = req.user._id;
        const users = await User.find(filter).select('-password').populate('department_id', 'name');
        res.json(users);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create user (admin/dept_head/manager)
router.post('/', protect, requireRole('admin', 'dept_head', 'manager'), async (req, res) => {
    try {
        const { name, email, password, role, department_id, manager_id } = req.body;
        if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists' });
        const user = await User.create({ name, email, password, role: role || 'employee', department_id, manager_id });
        res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update user
router.put('/:id', protect, requireRole('admin', 'dept_head', 'manager'), async (req, res) => {
    try {
        const { name, role, department_id, manager_id, isActive } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (role) updates.role = role;
        if (department_id !== undefined) updates.department_id = department_id;
        if (manager_id !== undefined) updates.manager_id = manager_id;
        if (isActive !== undefined) updates.isActive = isActive;
        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
        res.json(user);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE user (deactivate)
router.delete('/:id', protect, requireRole('admin', 'dept_head'), async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ message: 'User deactivated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
