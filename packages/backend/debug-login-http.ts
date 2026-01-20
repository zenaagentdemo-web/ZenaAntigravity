


async function testLogin() {
    const url = 'http://localhost:3001/api/auth/login';
    console.log(`Testing login at ${url}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com', // Doesn't matter if valid for 500 debugging, just need structure
                password: 'password123',
            }),
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const contentType = response.headers.get('content-type');
        console.log(`Content-Type: ${contentType}`);

        const text = await response.text();
        console.log('Response Body:');
        console.log('---------------------------------------------------');
        console.log(text);
        console.log('---------------------------------------------------');

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testLogin();
