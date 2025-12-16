import { authService } from '../src/services/auth.service.js';

async function testLogin() {
  console.log('Testing login with demo credentials...');
  
  try {
    const result = await authService.login({
      email: 'demo@zena.ai',
      password: 'DemoSecure2024!'
    });
    
    console.log('✅ Login successful!');
    console.log('User:', result.user);
    console.log('Access token length:', result.tokens.accessToken.length);
  } catch (error) {
    console.log('❌ Login failed:', error.message);
    
    // Let's also check if the user exists
    try {
      const prisma = (await import('../src/config/database.js')).default;
      const user = await prisma.user.findUnique({
        where: { email: 'demo@zena.ai' }
      });
      
      if (user) {
        console.log('User exists in database');
        console.log('User ID:', user.id);
        console.log('Email:', user.email);
        console.log('Password hash length:', user.passwordHash.length);
        
        // Test password comparison directly
        const bcrypt = await import('bcrypt');
        const isValid = await bcrypt.compare('DemoSecure2024!', user.passwordHash);
        console.log('Password comparison result:', isValid);
      } else {
        console.log('User does not exist in database');
      }
    } catch (dbError) {
      console.log('Database check error:', dbError.message);
    }
  }
}

testLogin().catch(console.error);