import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
const db = new PrismaClient();
const email = process.argv[2];
const u = await db.user.findFirstOrThrow({ where: { email } });
const id = randomBytes(32).toString("hex");
await db.session.create({ data: { id, userId: u.id, expiresAt: new Date(Date.now() + 3600000) } });
console.log(id);
await db.$disconnect();
