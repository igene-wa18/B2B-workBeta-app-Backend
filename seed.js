const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const Attendance = require('./models/Attendance');
const Leave = require('./models/Leave');
const Expense = require('./models/Expense');
const Memo = require('./models/Memo');
const connectDB = require('./config/db');
require('dotenv').config();

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
    await connectDB();

    // Clear all
    await Promise.all([User.deleteMany(), Department.deleteMany(), Attendance.deleteMany(), Leave.deleteMany(), Expense.deleteMany(), Memo.deleteMany()]);
    console.log('🗑️  Cleared existing data');

    // 1. HR
    const hr1 = await User.create({ name: 'Priya Sharma', email: 'hr@smartops.com', password: 'Hr@123', role: 'admin' });
    const hr2 = await User.create({ name: 'Ankit Verma', email: 'hr2@smartops.com', password: 'Hr@123', role: 'admin' });
    console.log('👑 Created 2 Admin/HR users');

    // 2. Departments
    const salesDept = await Department.create({ name: 'Sales', createdBy: hr1._id });
    const techDept = await Department.create({ name: 'Tech', createdBy: hr1._id });
    const opsDept = await Department.create({ name: 'Operations', createdBy: hr1._id });
    console.log('🏢 Created 3 departments');

    // 3. Managers
    const salesMgr = await User.create({ name: 'Rahul Singh (Sales Manager)', email: 'manager.sales@smartops.com', password: 'Manager@123', role: 'manager', department_id: salesDept._id });
    const techMgr = await User.create({ name: 'Neha Gupta (Tech Manager)', email: 'manager.tech@smartops.com', password: 'Manager@123', role: 'manager', department_id: techDept._id });
    const opsMgr = await User.create({ name: 'Operations Department', email: 'dept.operations@smartops.com', password: 'Dept@123', role: 'manager', department_id: opsDept._id });
    
    await Department.findByIdAndUpdate(salesDept._id, { head_id: salesMgr._id });
    await Department.findByIdAndUpdate(techDept._id, { head_id: techMgr._id });
    await Department.findByIdAndUpdate(opsDept._id, { head_id: opsMgr._id });
    console.log('🧑‍💼 Created 3 Managers');

    // 4. Employees
    const bcrypt = require('bcryptjs');
    const hashedEmpPwd = await bcrypt.hash('Emp@123', 10);
    const empData = [
        // Sales Team
        { name: 'Amit Kumar', email: 'amit@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: salesDept._id, manager_id: salesMgr._id },
        { name: 'Rohit Raj', email: 'rohit@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: salesDept._id, manager_id: salesMgr._id },
        { name: 'Sanjay Patro', email: 'sanjay@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: salesDept._id, manager_id: salesMgr._id },
        { name: 'Pooja Tiwari', email: 'pooja@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: salesDept._id, manager_id: salesMgr._id },
        
        // Tech Team
        { name: 'Sneha Das', email: 'sneha@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: techDept._id, manager_id: techMgr._id },
        { name: 'Arjun Mehta', email: 'arjun@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: techDept._id, manager_id: techMgr._id },
        { name: 'Tariq Khan', email: 'tariq@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: techDept._id, manager_id: techMgr._id },
        { name: 'Alia Bhatt', email: 'alia@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: techDept._id, manager_id: techMgr._id },
        
        // Operations / Extra
        { name: 'Kavita Singh', email: 'kavita@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: opsDept._id, manager_id: opsMgr._id },
        { name: 'Deepak Yadav', email: 'deepak@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: opsDept._id, manager_id: opsMgr._id },
        { name: 'Vikram Joshi', email: 'vikram@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: opsDept._id, manager_id: opsMgr._id },
        { name: 'Meera Rajput', email: 'meera@smartops.com', password: hashedEmpPwd, role: 'employee', department_id: opsDept._id, manager_id: opsMgr._id }
    ];

    const employees = await User.insertMany(empData);
    console.log(`👥 Created ${employees.length} employees`);

    // 5. Random Attendance (Last 45 days)
    const allStaff = [hr1, hr2, salesMgr, techMgr, opsMgr, ...employees];
    const attendanceRecords = [];
    for (let i = 45; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if (d.getDay() === 0 || d.getDay() === 6) continue; // Skip weekends
        const dateStr = d.toISOString().split('T')[0];

        for (const u of allStaff) {
            if (Math.random() < 0.05) continue; // Absent
            const checkIn = new Date(d); checkIn.setHours(8, 30 + Math.floor(Math.random() * 120), 0);
            const checkOut = new Date(d); checkOut.setHours(16, 30 + Math.floor(Math.random() * 180), 0);
            const hours = Math.round(((checkOut - checkIn) / 3600000) * 100) / 100;
            
            attendanceRecords.push({ 
                user_id: u._id, 
                date: dateStr, 
                check_in: checkIn, 
                check_out: checkOut, 
                status: checkIn.getHours() >= 10 ? 'late' : 'present', 
                hours_worked: hours 
            });
        }
    }
    await Attendance.insertMany(attendanceRecords);
    console.log(`📋 Created ${attendanceRecords.length} attendance records`);

    // 6. Random Leave Requests
    const leaveReasons = ['Medical Checkup', 'Family Function', 'Vacation', 'Personal Work', 'Sick Leave'];
    const statuses = ['pending', 'approved', 'rejected', 'approved'];
    let leaves = [];
    for (const emp of allStaff) {
        if (emp.role === 'admin') continue;
        const numLeaves = Math.floor(Math.random() * 3) + 1;
        for (let l = 0; l < numLeaves; l++) {
            const startStr = new Date(); startStr.setDate(startStr.getDate() - Math.floor(Math.random() * 40));
            const endStr = new Date(startStr); endStr.setDate(endStr.getDate() + Math.floor(Math.random() * 3));
            const stat = statuses[Math.floor(Math.random() * statuses.length)];
            leaves.push({
                user_id: emp._id,
                start_date: startStr.toISOString().split('T')[0],
                end_date: endStr.toISOString().split('T')[0],
                reason: leaveReasons[Math.floor(Math.random() * leaveReasons.length)],
                status: stat,
                approved_by: stat !== 'pending' ? hr1._id : null
            });
        }
    }
    await Leave.insertMany(leaves);
    console.log(`📅 Created ${leaves.length} random leave requests`);

    // 7. Random Expenses
    const categories = ['Travel', 'Equipment', 'Office Supplies', 'Meals', 'Miscellaneous'];
    let expenses = [];
    const threeMoAgo = new Date(); threeMoAgo.setMonth(threeMoAgo.getMonth() - 2);
    // Managers submit expenses
    const managers = [salesMgr, techMgr, opsMgr];
    for (let i = 0; i < 30; i++) {
        const mgr = managers[Math.floor(Math.random() * managers.length)];
        const amount = Math.floor(Math.random() * 50000) + 1000;
        const stat = statuses[Math.floor(Math.random() * statuses.length)];
        const createdAt = randomDate(threeMoAgo, new Date());
        expenses.push({
            manager_id: mgr._id,
            amount: amount,
            category: categories[Math.floor(Math.random() * categories.length)],
            description: 'Operation expense ' + i,
            status: stat,
            approved_by: stat !== 'pending' ? hr1._id : null,
            createdAt: createdAt,
            updatedAt: createdAt
        });
    }
    await Expense.insertMany(expenses);
    console.log(`💰 Created ${expenses.length} random expenses`);

    // 8. Random Memos
    await Memo.create({ title: 'Welcome to SmartOps!', content: 'All daily reports are due by 5 PM.', created_by: hr1._id });
    await Memo.create({ title: 'Sales Targets Revised', content: 'Our targets have increased by 10%.', created_by: salesMgr._id });
    await Memo.create({ title: 'Weekly Maintenance', content: 'Servers will be down on Sunday.', created_by: techMgr._id });
    console.log('📝 Created 3 memos');

    console.log('\n✅ Seed completed successfully! Demo credentials:\n');
    console.log('HR / ADMIN:');
    console.log('  hr@smartops.com           / Hr@123');
    console.log('  hr2@smartops.com          / Hr@123\n');
    console.log('MANAGERS:');
    console.log('  manager.sales@smartops.com / Manager@123');
    console.log('  manager.tech@smartops.com  / Manager@123');
    console.log('  dept.operations@smartops.com / Dept@123\n');
    console.log('EMPLOYEES (Sample):');
    console.log('  amit@smartops.com         / Emp@123');
    console.log('  sneha@smartops.com        / Emp@123');
    console.log('  kavita@smartops.com       / Emp@123\n');
}

if (require.main === module) {
    seed().then(() => {
        console.log('Exiting seed script.');
        process.exit(0);
    }).catch(err => { 
        console.error('Seed error:', err); 
        process.exit(1); 
    });
} else {
    module.exports = seed;
}
