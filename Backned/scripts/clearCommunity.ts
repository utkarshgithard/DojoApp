import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.$executeRawUnsafe('TRUNCATE TABLE "Community" CASCADE');
  console.log('Truncated Community table');
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
