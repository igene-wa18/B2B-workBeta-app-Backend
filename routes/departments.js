const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// GET all departments
router.get('/', protect, async (req, res) => {
    try {
        const depts = await Department.find().populate('head_id', 'name email').populate('createdBy', 'name');
        res.json(depts);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create department (admin only)
router.post('/', protect, requireRole('admin'), async (req, res) => {
    try {
        const { name, head_id } = req.body;
        const dept = await Department.create({ name, head_id: head_id || null, createdBy: req.user._id });
        if (head_id) {
            await User.findByIdAndUpdate(head_id, { role: 'dept_head', department_id: dept._id });
        }
        res.status(201).json(dept);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update department
router.put('/:id', protect, requireRole('admin'), async (req, res) => {
    try {
        const { name, head_id } = req.body;
        const dept = await Department.findByIdAndUpdate(req.params.id, { name, head_id }, { new: true });
        if (head_id) {
            await User.findByIdAndUpdate(head_id, { role: 'dept_head', department_id: dept._id });
        }
        res.json(dept);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE department
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
    try {
        await Department.findByIdAndDelete(req.params.id);
        await User.updateMany({ department_id: req.params.id }, { department_id: null });
        res.json({ message: 'Department deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/departments/:id/members — get all users in a department
router.get('/:id/members', protect, async (req, res) => {
    try {
        const members = await User.find({ department_id: req.params.id, isActive: true })
            .select('-password')
            .populate('department_id', 'name');
        res.json(members);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
