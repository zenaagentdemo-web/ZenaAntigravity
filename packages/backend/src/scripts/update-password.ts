
import { authService } from '../services/auth.service.js';
import prisma from '../config/database.js';

async function main() {
    const email = 'demo@zena.ai';
    const newPassword = 'ZenaIsAwesome!2025';

    console.log(`Updating password for ${email}...`);

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.error('User not found!');
            process.exit(1);
        }

        const hashedPassword = await authService.hashPassword(newPassword);

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashedPassword }
        });

        console.log('Password updated successfully!');
        console.log(`New credentials: ${email} / ${newPassword}`);

    } catch (error) {
        console.error('Error updating password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
