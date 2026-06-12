const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const { protect, requireRole } = require('../middleware/auth');

// POST /api/leaves — submit leave request
router.post('/', protect, async (req, res) => {
    try {
        const { start_date, end_date, reason } = req.body;
        const leave = await Leave.create({ user_id: req.user._id, start_date, end_date, reason });

        // Trigger notifications for managers / department heads
        const recipientIds = new Set();
        if (req.user.manager_id) {
            recipientIds.add(req.user.manager_id.toString());
        }
        if (req.user.department_id) {
            const dept = await Department.findById(req.user.department_id);
            if (dept && dept.head_id) {
                recipientIds.add(dept.head_id.toString());
            }
        }
        if (recipientIds.size === 0) {
            const admins = await User.find({ role: 'admin' }).select('_id');
            admins.forEach(admin => recipientIds.add(admin._id.toString()));
        }
        recipientIds.delete(req.user._id.toString());

        for (const recipientId of recipientIds) {
            await Notification.create({
                user_id: recipientId,
                title: 'New Leave Request',
                message: `${req.user.name} has requested leave from ${start_date} to ${end_date}.`,
                type: 'leave',
                link: '/leaves'
            });
        }

        res.status(201).json(leave);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/leaves/my — own leave history
router.get('/my', protect, async (req, res) => {
    try {
        const leaves = await Leave.find({ user_id: req.user._id }).sort({ createdAt: -1 });
        res.json(leaves);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/leaves/team — pending requests for managers/dept_heads
router.get('/team', protect, requireRole('manager', 'dept_head', 'admin'), async (req, res) => {
    try {
        let userFilter = {};
        if (req.user.role === 'manager') userFilter.manager_id = req.user._id;
        else if (req.user.role === 'dept_head') userFilter.department_id = req.user.department_id;

        const users = await User.find(userFilter).select('_id');
        const userIds = users.map(u => u._id);
        const leaves = await Leave.find({ user_id: { $in: userIds } }).populate('user_id', 'name email role').sort({ createdAt: -1 });
        res.json(leaves);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/leaves/:id/approve
router.patch('/:id/approve', protect, requireRole('manager', 'dept_head', 'admin'), async (req, res) => {
    try {
        const leave = await Leave.findByIdAndUpdate(req.params.id, {
            status: 'approved', approved_by: req.user._id, response_note: req.body.note || ''
        }, { new: true });

        // Auto-update attendance for leave days
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            await Attendance.findOneAndUpdate(
                { user_id: leave.user_id, date: dateStr },
                { user_id: leave.user_id, date: dateStr, status: 'leave' },
                { upsert: true }
            );
        }

        // Notify employee
        await Notification.create({
            user_id: leave.user_id,
            title: 'Leave Request Approved',
            message: `Your leave request from ${leave.start_date} to ${leave.end_date} has been approved by ${req.user.name}.`,
            type: 'leave',
            link: '/leaves'
        });

        res.json(leave);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/leaves/:id/reject
router.patch('/:id/reject', protect, requireRole('manager', 'dept_head', 'admin'), async (req, res) => {
    try {
        const leave = await Leave.findByIdAndUpdate(req.params.id, {
            status: 'rejected', approved_by: req.user._id, response_note: req.body.note || ''
        }, { new: true });

        // Notify employee
        await Notification.create({
            user_id: leave.user_id,
            title: 'Leave Request Rejected',
            message: `Your leave request from ${leave.start_date} to ${leave.end_date} has been rejected by ${req.user.name}.`,
            type: 'leave',
            link: '/leaves'
        });

        res.json(leave);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
