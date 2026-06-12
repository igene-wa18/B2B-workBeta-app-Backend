const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, generateToken } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        console.log('Signup body:', req.body);
        const { name, email, password, role = 'employee' } = req.body;
        if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists' });
        const user = await User.create({ name, email, password, role });
        const token = generateToken(user._id);
        res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, token });
    } catch (err) { 
        console.error('Signup error:', err);
        res.status(500).json({ message: err.message }); 
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = generateToken(user._id);
        res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, department_id: user.department_id, token });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    const user = await User.findById(req.user._id).select('-password').populate('department_id');
    res.json(user);
});

module.exports = router;
