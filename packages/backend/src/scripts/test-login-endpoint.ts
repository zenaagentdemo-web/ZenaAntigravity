
import fetch from 'node-fetch';

async function main() {
    console.log('Testing Login Endpoint...');
    try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'demo@zena.ai',
                password: 'ZenaIsAwesome!2025'
            })
        });

        console.log(`Status: ${response.status}`);
        const data = await response.json();

        if (response.ok) {
            console.log('Login Succeeded!');
            console.log('User:', data.user.email);
        } else {
            console.log('Login Failed:', data);
        }
    } catch (err) {
        console.error('Network Error:', err.message);
    }
}

main();
