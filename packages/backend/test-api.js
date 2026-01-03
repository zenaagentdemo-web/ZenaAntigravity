
const BASE_URL = 'http://localhost:3001';

async function login() {
    console.log('Attempting login...');
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
    console.log('Login successful. User:', data.user.email, 'ID:', data.user.id);
    return data.accessToken;
}

async function testEndpoint(endpoint, token) {
    console.log(`Testing ${endpoint}...`);
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Failed ${endpoint}: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response:', text);
            return;
        }

        const data = await response.json();
        console.log(`Success ${endpoint}: Found records`);

        // Log structure of first item if array
        if (data.contacts) {
            console.log(`Contacts count: ${data.contacts.length}`);
            if (data.contacts.length > 0) console.log('Sample Contact:', JSON.stringify(data.contacts[0], null, 2));
        } else if (data.properties) {
            console.log(`Properties count: ${data.properties.length}`);
            if (data.properties.length > 0) console.log('Sample Property:', JSON.stringify(data.properties[0], null, 2));
        } else if (Array.isArray(data)) {
            console.log(`Array count: ${data.length}`);
            if (data.length > 0) console.log('Sample Item:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('Response data:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error(`Error testing ${endpoint}:`, error.message);
    }
}

async function main() {
    try {
        const token = await login();
        await testEndpoint('/api/properties', token);
        await testEndpoint('/api/contacts', token);
    } catch (err) {
        console.error('Test execution failed:', err);
    }
}

main();
