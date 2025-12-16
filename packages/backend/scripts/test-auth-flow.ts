/**
 * Test Authentication Flow
 * Tests login and authenticated requests to debug 401 issues
 */

const API_BASE_URL = 'http://localhost:3000';

async function testAuthFlow() {
  console.log('=== Testing Authentication Flow ===\n');

  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'demo@zena.ai',
        password: 'DemoSecure2024!',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✓ Login successful');
    console.log('Full response:', JSON.stringify(loginData, null, 2));
    
    // Handle different response structures
    const token = loginData.tokens?.accessToken || loginData.accessToken;
    
    if (!token) {
      throw new Error('No access token in response');
    }
    
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...\n');

    // Step 2: Test authenticated request to /api/auth/me
    console.log('Step 2: Testing authenticated request to /api/auth/me...');
    const meResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', meResponse.status);
    
    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.log('✗ Request failed');
      console.log('Error response:', errorText);
      throw new Error(`Request failed: ${meResponse.status}`);
    }

    const meData = await meResponse.json();
    console.log('✓ Authenticated request successful');
    console.log('User data:', meData);

    // Step 3: Test another authenticated endpoint
    console.log('\nStep 3: Testing /api/accounts/email...');
    const accountsResponse = await fetch(`${API_BASE_URL}/api/accounts/email`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', accountsResponse.status);
    
    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.log('✗ Request failed');
      console.log('Error response:', errorText);
    } else {
      const accountsData = await accountsResponse.json();
      console.log('✓ Request successful');
      console.log('Email accounts:', accountsData);
    }

    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

testAuthFlow();
