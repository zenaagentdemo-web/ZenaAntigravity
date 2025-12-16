import { authService } from '../src/services/auth.service.js';
import bcrypt from 'bcrypt';

async function debugLogin() {
  console.log('=== Debug Login Process ===');
  
  const email = 'demo@zena.ai';
  const password = 'DemoSecure2024!';
  
  try {
    // First, let's check the user in the database
    const prisma = (await import('../src/config/database.js')).default;
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHashLength: user.passwordHash.length
    });
    
    // Test password comparison
    console.log('\n=== Password Comparison ===');
    console.log('Input password:', password);
    console.log('Stored hash:', user.passwordHash);
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', isValid);
    
    // Test with different variations
    const variations = [
      'DemoSecure2024!',
      'demo123',
      'DemoSecure2024',
      'demosecure2024!'
    ];
    
    console.log('\n=== Testing Password Variations ===');
    for (const testPassword of variations) {
      const result = await bcrypt.compare(testPassword, user.passwordHash);
      console.log(`"${testPassword}": ${result}`);
    }
    
    // Now test the full login flow
    console.log('\n=== Full Login Test ===');
    const result = await authService.login({ email, password });
    console.log('✅ Login successful!');
    console.log('User ID:', result.user.id);
    
  } catch (error) {
    console.log('❌ Login failed:', error.message);
  }
}

debugLogin().catch(console.error);