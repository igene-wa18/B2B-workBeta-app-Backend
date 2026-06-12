const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    check_in: { type: Date, default: null },
    check_out: { type: Date, default: null },
    status: { type: String, enum: ['present', 'absent', 'late', 'leave', 'half_day'], default: 'present' },
    hours_worked: { type: Number, default: 0 }
}, { timestamps: true });

attendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
