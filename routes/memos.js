const express = require('express');
const router = express.Router();
const Memo = require('../models/Memo');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// GET all memos
router.get('/', protect, async (req, res) => {
    try {
        const memos = await Memo.find().populate('created_by', 'name role').sort({ createdAt: -1 });
        res.json(memos);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create memo
router.post('/', protect, async (req, res) => {
    try {
        const { title, content } = req.body;
        const memo = await Memo.create({ title, content, created_by: req.user._id });

        // Trigger notifications for all other users
        const users = await User.find({ _id: { $ne: req.user._id } }).select('_id');
        for (const u of users) {
            await Notification.create({
                user_id: u._id,
                title: 'New Announcement',
                message: `A new memo has been posted: "${title}"`,
                type: 'memo',
                link: '/memos'
            });
        }

        res.status(201).json(memo);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE memo (only creator or admin)
router.delete('/:id', protect, async (req, res) => {
    try {
        const memo = await Memo.findById(req.params.id);
        if (!memo) return res.status(404).json({ message: 'Memo not found' });
        if (memo.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        await Memo.findByIdAndDelete(req.params.id);
        res.json({ message: 'Memo deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
