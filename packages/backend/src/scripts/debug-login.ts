
import { authService } from '../services/auth.service.js';
import prisma from '../config/database.js';

async function main() {
    console.log('--- Starting Debug Script ---');

    // 1. Check DB Connection
    try {
        console.log('Checking DB connection...');
        const count = await prisma.user.count();
        console.log(`DB Connected. User count: ${count}`);
    } catch (error) {
        console.error('CRITICAL: DB Connection failed:', error);
        process.exit(1);
    }


    // 2. Try to find a user
    const email = 'demo@zena.ai';
    console.log(`Looking up user: ${email}`);
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log('User not found. Creating demo user...');
        // Create if missing (unlikely based on previous run)
        const hashedPassword = await authService.hashPassword('password123');
        user = await prisma.user.create({
            data: {
                email,
                name: 'Demo User',
                passwordHash: hashedPassword
            }
        });
    } else {
        // Reset password to known value
        console.log('User found. Resetting password to "password123"...');
        const hashedPassword = await authService.hashPassword('password123');
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashedPassword }
        });
    }

    // 3. Try Login with KNOWN password
    console.log('Attempting login with NEW password...');
    try {
        const result = await authService.login({
            email: 'demo@zena.ai',
            password: 'password123'
        });
        console.log('Login successful!');
        console.log('Access Token (first 20 chars):', result.tokens.accessToken.substring(0, 20));
    } catch (error: any) {
        console.error('CRITICAL: Login threw unexpected error:');
        console.error(error);
    }

    await prisma.$disconnect();
}


main().catch(console.error);
