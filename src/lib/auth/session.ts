import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const COOKIE = "sms_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function newToken() {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string) {
  const hdr = await headers();
  const session = await db.session.create({
    data: {
      id: newToken(),
      userId,
      expiresAt: new Date(Date.now() + TTL_MS),
      ip: hdr.get("x-forwarded-for") ?? undefined,
      userAgent: hdr.get("user-agent") ?? undefined,
    },
  });
  const jar = await cookies();
  jar.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  return session;
}

export async function getSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function destroySession() {
  const id = await getSessionId();
  if (id) await db.session.deleteMany({ where: { id } });
  const jar = await cookies();
  jar.delete(COOKIE);
}

// Mark the current session as recently re-authenticated (for high-risk actions).
export async function markReauth() {
  const id = await getSessionId();
  if (id) await db.session.updateMany({ where: { id }, data: { reauthAt: new Date() } });
}

export async function isRecentlyReauthed(withinMs = 1000 * 60 * 5): Promise<boolean> {
  const id = await getSessionId();
  if (!id) return false;
  const s = await db.session.findUnique({ where: { id } });
  return !!s?.reauthAt && Date.now() - s.reauthAt.getTime() < withinMs;
}
