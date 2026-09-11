import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const s = await db.student.findFirstOrThrow({ where: { firstName: process.argv[2] } });
console.log(s.id);
await db.$disconnect();
