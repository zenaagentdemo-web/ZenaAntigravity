/**
 * Delete the demo email account from the database
 */

import prisma from '../src/config/database.js';

async function deleteDemoEmailAccount() {
  console.log('Deleting demo email account...');

  try {
    // Find the demo user
    const user = await prisma.user.findUnique({
      where: { email: 'demo@zena.ai' },
    });

    if (!user) {
      console.log('Demo user not found');
      return;
    }

    // Delete the email account
    const deleted = await prisma.emailAccount.deleteMany({
      where: {
        userId: user.id,
        email: 'demo@zena.ai',
      },
    });

    console.log(`✓ Deleted ${deleted.count} email account(s)`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDemoEmailAccount();
