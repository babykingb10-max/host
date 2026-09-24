import { PrismaClient, RoleKey } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node dist/prisma/make-admin.js <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`No user found with email ${email}. Register the account first, then run this command.`);
    process.exit(1);
  }

  const role = await prisma.role.findUnique({ where: { key: RoleKey.SUPER_ADMIN } });
  if (!role) {
    console.error('SUPER_ADMIN role not found — run the seed script first (node dist/prisma/seed.js).');
    process.exit(1);
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  console.log(`Done — ${user.email} is now SUPER_ADMIN. Log out and back in (or refresh) so the new role takes effect, then visit /admin.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
