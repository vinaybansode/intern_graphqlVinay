"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Best-effort in-memory brute-force throttle (per email). A production system
// would back this with Redis; the interface stays the same.
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW = 1000 * 60 * 10;
const MAX = 8;

function throttled(email: string): boolean {
  const now = Date.now();
  const rec = attempts.get(email);
  if (!rec || now - rec.first > WINDOW) {
    attempts.set(email, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX;
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const email = parsed.data.email.toLowerCase().trim();
  if (throttled(email)) return { error: "Too many attempts. Please try again later." };

  const user = await db.user.findFirst({ where: { email } });
  // Constant-ish response regardless of whether the user exists.
  if (!user || !user.isActive) return { error: "Invalid credentials." };

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) return { error: "Invalid credentials." };

  attempts.delete(email);
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
