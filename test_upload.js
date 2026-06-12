const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        const loginRes = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'manager.sales@smartops.com',
                password: 'Manager@123'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        const p = path.join(__dirname, 'dummy.txt');
        fs.writeFileSync(p, 'This is a test invoice file for the company.');

        const formData = new FormData();
        formData.append('amount', '5000');
        formData.append('category', 'Hardware');
        formData.append('description', 'Test upload of laptop receipt');
        
        // Convert to File interface
        const fileContent = fs.readFileSync(p);
        const file = new File([fileContent], 'dummy.txt', { type: 'text/plain' });
        formData.append('receipt', file);

        const expRes = await fetch('http://localhost:5001/api/expenses', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });
        
        const expData = await expRes.json();

        console.log('Returned Expense Data:');
        console.dir(expData);

        fs.unlinkSync(p);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testUpload();
