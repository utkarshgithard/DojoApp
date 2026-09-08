/**
 * One-off backfill: generates a username for every user that does not have one.
 *
 * Run with:  npx ts-node --esm src/scripts/backfill-usernames.ts
 * (or compile first and run the dist JS equivalent)
 *
 * Idempotent — users that already have a username are skipped.
 */
import prisma from '../lib/prisma.js';
import { generateUsernameFromName, isValidUsername } from '../utils/username.js';

async function backfill(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' }, // oldest users get the cleanest names
  });

  console.log(`Backfilling usernames for ${users.length} user(s)...`);

  let created = 0;
  for (const user of users) {
    let username = await generateUsernameFromName(user.name);

    // generateUsernameFromName returns a unique candidate, but validate anyway
    // in case the name slugifies to something reserved.
    let attempts = 0;
    while (!isValidUsername(username) && attempts < 10) {
      username = await generateUsernameFromName(`${user.name} ${Math.floor(Math.random() * 9999)}`);
      attempts++;
    }

    try {
      await prisma.user.update({ where: { id: user.id }, data: { username } });
      created++;
      console.log(`  ✓ ${user.name} (${user.id}) -> @${username}`);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        console.warn(`  ! collision on @${username} for ${user.id}, retrying...`);
        // Retry once with a fresh random one
        const retry = await generateUsernameFromName(user.name);
        try {
          await prisma.user.update({ where: { id: user.id }, data: { username: retry } });
          created++;
          console.log(`  ✓ ${user.name} (${user.id}) -> @${retry} (retry)`);
          continue;
        } catch {
          console.error(`  ✗ failed for ${user.id}, skipping`);
          continue;
        }
      }
      throw err;
    }
  }

  console.log(`Done. Assigned ${created}/${users.length} username(s).`);
}

backfill()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
