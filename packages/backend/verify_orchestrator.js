
const BASE_URL = 'http://localhost:3001';

async function login() {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'demo@zena.ai',
            password: 'DemoSecure2024!'
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Login failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    return data.accessToken;
}

async function verifyOrchestrator(token) {
    const prompt = "Find Patricia O'Brien, update her email to patricia.ob@example.com, link her to the 55 Symonds Street property, and create a task to 'Send contract' due tomorrow. Also, change the price of that house to 1.2M.";
    console.log('Sending prompt:', prompt);

    const response = await fetch(`${BASE_URL}/api/ask`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: prompt })
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Prompt failed: ${response.status} ${response.statusText}`);
        console.error('Response:', text);
        return;
    }

    const data = await response.json();
    console.log('Success! Response from Zena:');
    console.log(JSON.stringify(data, null, 2));
}

async function main() {
    try {
        const token = await login();
        await verifyOrchestrator(token);
    } catch (err) {
        console.error('Verification failed:', err);
    }
}

main();
