import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Generate API key
  const apiKey = crypto.randomBytes(16).toString('hex');

  // Hash password
  const passwordHash = await bcrypt.hash('testpassword', 12);

  // Create test user
  const user = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {
      passwordHash,
      apiKey,
    },
    create: {
      username: 'testuser',
      passwordHash,
      apiKey,
    },
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('Test user created/updated:');
  console.log('='.repeat(60));
  console.log(`  Username: ${user.username}`);
  console.log(`  Password: testpassword`);
  console.log(`  API Key:  ${apiKey}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('Save the API key! You will need it to authenticate with the MCP server.');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
