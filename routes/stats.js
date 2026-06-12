const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Expense = require('../models/Expense');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/stats/dashboard
router.get('/dashboard', protect, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ isActive: true });
        const totalDepts = await Department.countDocuments();
        const today = new Date().toISOString().split('T')[0];
        const presentToday = await Attendance.countDocuments({ date: today, status: { $in: ['present', 'late'] } });
        const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
        const pendingExpenses = await Expense.countDocuments({ status: 'pending' });

        // Monthly attendance trend (last 7 days)
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = await Attendance.countDocuments({ date: dateStr, status: { $in: ['present', 'late'] } });
            last7.push({ date: dateStr, count });
        }

        // Expense by status
        const expApproved = await Expense.countDocuments({ status: 'approved' });
        const expPending = await Expense.countDocuments({ status: 'pending' });
        const expRejected = await Expense.countDocuments({ status: 'rejected' });

        res.json({
            totalUsers, totalDepts, presentToday, pendingLeaves, pendingExpenses,
            attendanceTrend: last7,
            expenseBreakdown: { approved: expApproved, pending: expPending, rejected: expRejected }
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/stats/reports (Admin only)
router.get('/reports', protect, requireRole('admin', 'dept_head'), async (req, res) => {
    try {
        // 1. Expense by Category
        const expensesByCategory = await Expense.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } }
        ]);

        // 2. Monthly Expense Trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        const monthlyExpenses = await Expense.aggregate([
            { $match: { status: 'approved', createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, total: { $sum: '$amount' } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // 3. Attendance Performance (Top 5 most present users)
        const topPerformers = await Attendance.aggregate([
            { $match: { status: 'present' } },
            { $group: { _id: '$user_id', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' }
        ]);

        // 4. Overall Attendance Status Breakdown (All time)
        const attendanceStats = await Attendance.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.json({
            expensesByCategory,
            monthlyExpenses,
            topPerformers: topPerformers.map(p => ({ name: p.user.name, count: p.count })),
            attendanceStats
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
