import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'AI for Learning', slug: 'ai-for-learning', sortOrder: 1 },
  { name: 'AI for Coding', slug: 'ai-for-coding', sortOrder: 2 },
  { name: 'AI for Marketing', slug: 'ai-for-marketing', sortOrder: 3 },
  { name: 'AI for Branding', slug: 'ai-for-branding', sortOrder: 4 },
  {
    name: 'AI for Operational Efficiency',
    slug: 'ai-for-operational-efficiency',
    sortOrder: 5,
  },
  { name: 'AI for Innovation', slug: 'ai-for-innovation', sortOrder: 6 },
  { name: 'AI for Data Insights', slug: 'ai-for-data-insights', sortOrder: 7 },
];

async function main() {
  console.log('Seeding blog categories...');

  for (const category of categories) {
    await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
      },
      create: category,
    });
    console.log(`  - ${category.name}`);
  }

  console.log('Seeding blog config...');

  await prisma.blogConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      showPromoBanner: true,
      postsPerPage: 12,
      featuredPostsCount: 5,
      siteTitle: 'Tim Callagy',
      siteDescription: 'AI insights and practical applications',
    },
  });

  console.log('Blog seed complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding blog data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
