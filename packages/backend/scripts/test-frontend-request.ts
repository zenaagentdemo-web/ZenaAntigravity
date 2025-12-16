// Test the exact same request the frontend makes
async function testFrontendRequest() {
  console.log('Testing frontend-style request...');
  
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      email: 'demo@zena.ai', 
      password: 'DemoSecure2024!' 
    }),
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  const data = await response.json();
  console.log('Response data:', data);
  
  if (response.ok) {
    console.log('✅ Login successful!');
  } else {
    console.log('❌ Login failed');
  }
}

testFrontendRequest().catch(console.error);