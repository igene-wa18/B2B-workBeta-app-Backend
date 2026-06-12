const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const User = require('../models/User');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const { protect, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/expenses — manager or employee submits expense
router.post('/', protect, requireRole('manager', 'employee'), upload.single('receipt'), async (req, res) => {
    try {
        const { amount, category, description } = req.body;
        const receipt_url = req.file ? `/uploads/${req.file.filename}` : '';
        const expense = await Expense.create({ manager_id: req.user._id, amount, category, description, receipt_url });

        // Trigger notifications for department head or admins
        const recipientIds = new Set();
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
                title: 'New Expense Claim',
                message: `${req.user.name} submitted an expense claim of $${amount} for ${category}.`,
                type: 'expense',
                link: '/expenses'
            });
        }

        res.status(201).json(expense);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/expenses — role-scoped view
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'manager' || req.user.role === 'employee') filter.manager_id = req.user._id;
        else if (req.user.role === 'dept_head') {
            const managers = await User.find({ department_id: req.user.department_id, role: 'manager' }).select('_id');
            filter.manager_id = { $in: managers.map(m => m._id) };
        }
        const expenses = await Expense.find(filter).populate('manager_id', 'name email').populate('approved_by', 'name').sort({ createdAt: -1 });
        res.json(expenses);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/expenses/:id/approve
router.patch('/:id/approve', protect, requireRole('dept_head', 'admin'), async (req, res) => {
    try {
        const expense = await Expense.findByIdAndUpdate(req.params.id, { status: 'approved', approved_by: req.user._id }, { new: true });
        
        // Notify employee/manager
        await Notification.create({
            user_id: expense.manager_id,
            title: 'Expense Claim Approved',
            message: `Your expense claim of $${expense.amount} has been approved by ${req.user.name}.`,
            type: 'expense',
            link: '/expenses'
        });

        res.json(expense);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/expenses/:id/reject
router.patch('/:id/reject', protect, requireRole('dept_head', 'admin'), async (req, res) => {
    try {
        const expense = await Expense.findByIdAndUpdate(req.params.id, { status: 'rejected', approved_by: req.user._id }, { new: true });
        
        // Notify employee/manager
        await Notification.create({
            user_id: expense.manager_id,
            title: 'Expense Claim Rejected',
            message: `Your expense claim of $${expense.amount} has been rejected by ${req.user.name}.`,
            type: 'expense',
            link: '/expenses'
        });

        res.json(expense);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
