const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const today = () => new Date().toISOString().split('T')[0];

// POST /api/attendance/check-in
router.post('/check-in', protect, async (req, res) => {
    try {
        if (req.user.role === 'admin') return res.status(403).json({ message: 'Admin does not mark attendance' });
        const dateStr = today();
        let record = await Attendance.findOne({ user_id: req.user._id, date: dateStr });
        if (record) return res.status(400).json({ message: 'Already checked in today' });

        const now = new Date();
        const hour = now.getHours();
        const status = hour >= 10 ? 'late' : 'present';

        record = await Attendance.create({ user_id: req.user._id, date: dateStr, check_in: now, status });
        res.status(201).json(record);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/attendance/check-out
router.post('/check-out', protect, async (req, res) => {
    try {
        const dateStr = today();
        const record = await Attendance.findOne({ user_id: req.user._id, date: dateStr });
        if (!record) return res.status(400).json({ message: 'You have not checked in today' });
        if (record.check_out) return res.status(400).json({ message: 'Already checked out' });

        record.check_out = new Date();
        const diffMs = record.check_out - record.check_in;
        record.hours_worked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        if (record.hours_worked < 4) record.status = 'half_day';
        await record.save();
        res.json(record);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/attendance/my — own attendance history
router.get('/my', protect, async (req, res) => {
    try {
        const { month, year } = req.query;
        let filter = { user_id: req.user._id };
        if (month && year) {
            const start = `${year}-${month.padStart(2, '0')}-01`;
            const end = `${year}-${month.padStart(2, '0')}-31`;
            filter.date = { $gte: start, $lte: end };
        }
        const records = await Attendance.find(filter).sort({ date: -1 });
        res.json(records);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/attendance/today — check today's status
router.get('/today', protect, async (req, res) => {
    try {
        const record = await Attendance.findOne({ user_id: req.user._id, date: today() });
        res.json(record || { checked_in: false });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/attendance/team — manager sees team
router.get('/team', protect, requireRole('manager', 'dept_head', 'admin'), async (req, res) => {
    try {
        const { date } = req.query;
        const dateStr = date || today();
        let userFilter = {};
        if (req.user.role === 'manager') userFilter.manager_id = req.user._id;
        else if (req.user.role === 'dept_head') userFilter.department_id = req.user.department_id;

        const users = await User.find(userFilter).select('_id name role');
        const userIds = users.map(u => u._id);
        const records = await Attendance.find({ user_id: { $in: userIds }, date: dateStr });

        const result = users.map(u => {
            const rec = records.find(r => r.user_id.toString() === u._id.toString());
            return { user: u, attendance: rec || { status: 'absent', date: dateStr } };
        });
        res.json(result);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/attendance/stats — monthly stats for a user
router.get('/stats', protect, async (req, res) => {
    try {
        const userId = req.query.userId || req.user._id;
        const month = req.query.month || (new Date().getMonth() + 1).toString();
        const year = req.query.year || new Date().getFullYear().toString();
        const start = `${year}-${month.padStart(2, '0')}-01`;
        const end = `${year}-${month.padStart(2, '0')}-31`;

        const records = await Attendance.find({ user_id: userId, date: { $gte: start, $lte: end } });
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const leave = records.filter(r => r.status === 'leave').length;
        const total = records.length;
        const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        res.json({ present, late, absent, leave, total, percentage, month, year });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
