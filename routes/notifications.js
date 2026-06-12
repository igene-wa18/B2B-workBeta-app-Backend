const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// GET all notifications for the authenticated user
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ user_id: req.user._id })
            .sort({ createdAt: -1 })
            .limit(100); // limit to last 100 for performance
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET unread notifications count/list for the authenticated user
router.get('/unread', protect, async (req, res) => {
    try {
        const unreadCount = await Notification.countDocuments({ user_id: req.user._id, isRead: false });
        const unreadList = await Notification.find({ user_id: req.user._id, isRead: false })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({ count: unreadCount, list: unreadList });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH mark a specific notification as read
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH mark all notifications for the user as read
router.patch('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.user._id, isRead: false },
            { isRead: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
