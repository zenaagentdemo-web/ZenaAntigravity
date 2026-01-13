import prisma from '../src/config/database.js';

console.log('----------------------------------------');
console.log('Script: Testing Prisma Import');
console.log('Is Prisma defined?', !!prisma);
console.log('Type of Prisma:', typeof prisma);
if (prisma) {
    console.log('Prisma keys:', Object.keys(prisma));
}
console.log('----------------------------------------');
