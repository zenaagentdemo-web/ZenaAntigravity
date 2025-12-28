
// using native fetch

async function testBackendLogin() {
    console.log('Testing backend login endpoint...');
    const API_URL = 'http://localhost:3001/api/auth/login';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'demo@zena.ai',
                password: 'ZenaRocks!2025',
            }),
        });

        console.log(`Response Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            console.log('Login Successful!');
            console.log('User:', data.user.email);
            console.log('Tokens received:', Object.keys(data.tokens));
        } else {
            console.error('Login Failed!');
            const text = await response.text();
            console.error('Error Body:', text);
        }
    } catch (error) {
        console.error('Network Error:', error);
    }
}

testBackendLogin();
