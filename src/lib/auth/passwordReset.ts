import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { z } from "zod";

export const ResetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .optional(),
});

export interface ResetPasswordResult {
  success: boolean;
  message: string;
  email: string;
  role?: string;
  temporaryPassword?: string;
}

/**
 * Generate a secure random password if none is provided.
 */
function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let pwd = "P@ss";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + "1!";
}

/**
 * Ensures an admin user exists for the school if specifically requested.
 */
async function ensureAdminUser(schoolId: string, headmasterRoleId: string) {
  const adminEmail = "admin@greenfield.edu";
  let admin = await db.user.findFirst({
    where: { schoolId, email: adminEmail },
    include: { userRoles: { include: { role: true } } },
  });

  if (!admin) {
    const defaultHash = await hashPassword("Password123!");
    admin = await db.user.create({
      data: {
        schoolId,
        email: adminEmail,
        name: "System Administrator",
        passwordHash: defaultHash,
        userRoles: {
          create: [{ roleId: headmasterRoleId }],
        },
      },
      include: { userRoles: { include: { role: true } } },
    });
  }

  return admin;
}

/**
 * Reset password for a specific user (Admin, Student, Principal, etc.)
 */
export async function resetUserPassword(input: {
  email: string;
  newPassword?: string;
}): Promise<ResetPasswordResult> {
  const parsed = ResetPasswordSchema.parse(input);
  const normalizedEmail = parsed.email.toLowerCase().trim();

  // Find user by email
  let user = await db.user.findFirst({
    where: { email: normalizedEmail },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });

  // If targeting admin@greenfield.edu and not yet created, auto-provision it
  if (!user && normalizedEmail === "admin@greenfield.edu") {
    const school = await db.school.findFirst();
    const headmasterRole = await db.role.findFirst({
      where: { key: "headmaster" },
    });
    if (school && headmasterRole) {
      user = await ensureAdminUser(school.id, headmasterRole.id);
    }
  }

  if (!user) {
    throw new Error(`User with email "${normalizedEmail}" not found.`);
  }

  if (!user.isActive) {
    throw new Error(`User account "${normalizedEmail}" is deactivated.`);
  }

  const passwordToSet = parsed.newPassword || generateSecurePassword();
  const passwordHash = await hashPassword(passwordToSet);

  // Update password in database
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      updatedAt: new Date(),
    },
  });

  // Invalidate all existing sessions for security
  await db.session.deleteMany({
    where: { userId: user.id },
  });

  const primaryRole = user.userRoles[0]?.role.name || "User";

  return {
    success: true,
    message: `Password successfully reset for ${primaryRole} (${normalizedEmail}).`,
    email: normalizedEmail,
    role: primaryRole,
    temporaryPassword: parsed.newPassword ? undefined : passwordToSet,
  };
}

/**
 * Bulk reset password by role: 'admin', 'principal', or 'student'.
 */
export async function resetPasswordsByTarget(
  target: "admin" | "principal" | "student" | "all",
  newPassword = "Password123!"
): Promise<ResetPasswordResult[]> {
  const results: ResetPasswordResult[] = [];

  if (target === "admin" || target === "all") {
    results.push(await resetUserPassword({ email: "admin@greenfield.edu", newPassword }));
  }

  if (target === "principal" || target === "all") {
    results.push(await resetUserPassword({ email: "principal@greenfield.edu", newPassword }));
  }

  if (target === "student" || target === "all") {
    const studentUsers = await db.user.findMany({
      where: {
        userRoles: {
          some: {
            role: { key: "student" },
          },
        },
      },
    });

    for (const stu of studentUsers) {
      results.push(await resetUserPassword({ email: stu.email, newPassword }));
    }
  }

  return results;
}
