
import { authService } from './src/services/auth.service.js';
import prisma from './src/config/database.js';
import process from 'process';

async function testFullFlow() {
    console.log('--- STARTING FULL FLOW TEST ---');
    const email = `test-user-${Date.now()}@example.com`;
    const password = 'secure-password-123';
    const name = 'Test Flow User';

    try {
        // 1. Register
        console.log(`1. Registering user: ${email}`);
        const regResult = await authService.register({ email, password, name });
        console.log('✅ Registration successful');
        console.log('User ID:', regResult.user.id);
        console.log('Access Token:', regResult.tokens.accessToken ? 'Present' : 'Missing');

        // 2. Login
        console.log(`2. Logging in user: ${email}`);
        const loginResult = await authService.login({ email, password });
        console.log('✅ Login successful');
        console.log('Access Token:', loginResult.tokens.accessToken ? 'Present' : 'Missing');

    } catch (error: any) {
        console.log('--- CAUGHT ERROR ---');
        console.error('Error message:', error.message);
        if (error.stack) console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        try {
            await prisma.user.deleteMany({ where: { email } });
            console.log('Cleanup successful');
        } catch (e) {
            console.log('Cleanup failed', e);
        }
        await prisma.$disconnect();
    }
    console.log('--- END FULL FLOW TEST ---');
    process.exit(0);
}

testFullFlow();
