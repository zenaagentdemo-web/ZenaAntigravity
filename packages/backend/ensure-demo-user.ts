import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('DemoSecure2024!', 10);

    // Delete existing user if any
    await prisma.user.deleteMany({
        where: { email: 'demo@zena.ai' }
    });

    const user = await prisma.user.create({
        data: {
            id: 'demo-user-id',
            email: 'demo@zena.ai',
            passwordHash,
            name: 'Demo Agent',
            preferences: {
                notificationSettings: {
                    enabled: true,
                    highPriorityThreads: true,
                    riskDeals: true,
                    calendarReminders: true,
                    taskReminders: true,
                },
                voiceSettings: {
                    sttProvider: 'openai',
                    ttsProvider: 'openai',
                    ttsVoice: 'alloy',
                    autoPlayResponses: false,
                },
                uiSettings: {
                    theme: 'auto',
                    focusListSize: 5,
                    defaultView: 'focus',
                },
            },
        },
    });

    console.log(`Ensured demo user exists with ID: ${user.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
