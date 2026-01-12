import { PrismaClient } from '@prisma/client';
import { seedKpiMetrics } from './seeds/kpiMetrics';
import { seedKpiPeriodValues } from './seeds/kpiPeriodValues';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('');
  console.log('='.repeat(60));
  console.log('KPI Driver Tree - Database Seed');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Seed metric definitions
  await seedKpiMetrics();

  console.log('');

  // Step 2: Seed periods and values
  await seedKpiPeriodValues();

  console.log('');
  console.log('='.repeat(60));
  console.log('KPI seed completed successfully!');
  console.log('='.repeat(60));
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
