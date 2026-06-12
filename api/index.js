const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('../config/db');

// Import all routes
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/users');
const departmentRoutes = require('../routes/departments');
const attendanceRoutes = require('../routes/attendance');
const leaveRoutes = require('../routes/leaves');
const expenseRoutes = require('../routes/expenses');
const memoRoutes = require('../routes/memos');
const statsRoutes = require('../routes/stats');
const notificationRoutes = require('../routes/notifications');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/memos', memoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);

// Seed route for demo/testing
app.post('/api/seed', async (req, res) => {
    try {
        const seed = require('../seed');
        await seed();
        res.status(200).json({ message: 'Database seeded successfully' });
    } catch (err) {
        console.error('Seed route error:', err);
        res.status(500).json({ message: 'Error seeding database', error: err.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({ message: err.message || 'Internal server error' });
});

// Connect DB and export app for Vercel
const Port = process.env.PORT || 5000;
connectDb()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });

