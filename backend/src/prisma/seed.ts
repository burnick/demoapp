import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seed...');

  try {
    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: hashedPassword,
      },
    });

    const user2 = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        name: 'Regular User',
        password: hashedPassword,
      },
    });

    logger.info('Database seeded successfully', {
      users: [user1.id, user2.id],
    });
  } catch (error) {
    logger.error('Error seeding database', { error });
    throw error;
  }
}

main()
  .catch((e) => {
    logger.error('Seed script failed', { error: e });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });