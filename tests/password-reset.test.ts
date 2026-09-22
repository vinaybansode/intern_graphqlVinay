import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  resetUserPassword,
  resetPasswordsByTarget,
} from "@/lib/auth/passwordReset";
import { createSchema } from "graphql-yoga";
import { typeDefs } from "@/lib/graphql/schema";
import { resolvers } from "@/lib/graphql/resolvers";
import { graphql } from "graphql";

const DEFAULT_PASSWORD = "Password123!";

describe("Password Reset API & Services", () => {
  // Restore all passwords to default after tests finish
  afterAll(async () => {
    await resetPasswordsByTarget("all", DEFAULT_PASSWORD);
  });

  describe("Individual User Password Reset", () => {
    it("should successfully reset password for Principal / Headmaster", async () => {
      const email = "principal@greenfield.edu";
      const newPassword = "PrincipalNewPass2026!";

      const result = await resetUserPassword({ email, newPassword });

      expect(result.success).toBe(true);
      expect(result.email).toBe(email);
      expect(result.role).toBe("Headmaster");
      expect(result.message).toContain("Password successfully reset");

      // Verify in DB that argon2 hash matches the new password
      const user = await db.user.findFirstOrThrow({ where: { email } });
      const isValid = await verifyPassword(user.passwordHash, newPassword);
      expect(isValid).toBe(true);

      // Verify old password no longer works
      const isOldValid = await verifyPassword(user.passwordHash, DEFAULT_PASSWORD);
      expect(isOldValid).toBe(false);
    });

    it("should successfully reset password for Student (Arjun Mehta)", async () => {
      const email = "arjun@student.greenfield.edu";
      const newPassword = "StudentPass2026!";

      const result = await resetUserPassword({ email, newPassword });

      expect(result.success).toBe(true);
      expect(result.email).toBe(email);
      expect(result.role).toBe("Student");

      const user = await db.user.findFirstOrThrow({ where: { email } });
      const isValid = await verifyPassword(user.passwordHash, newPassword);
      expect(isValid).toBe(true);
    });

    it("should successfully reset password for Admin account", async () => {
      const email = "admin@greenfield.edu";
      const newPassword = "AdminSecurePass2026!";

      const result = await resetUserPassword({ email, newPassword });

      expect(result.success).toBe(true);
      expect(result.email).toBe(email);
      expect(result.role).toBe("Headmaster");

      const user = await db.user.findFirstOrThrow({ where: { email } });
      const isValid = await verifyPassword(user.passwordHash, newPassword);
      expect(isValid).toBe(true);
    });

    it("should auto-generate a secure temporary password if newPassword is not provided", async () => {
      const email = "sara@student.greenfield.edu";

      const result = await resetUserPassword({ email });

      expect(result.success).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword!.length).toBeGreaterThanOrEqual(10);

      const user = await db.user.findFirstOrThrow({ where: { email } });
      const isValid = await verifyPassword(user.passwordHash, result.temporaryPassword!);
      expect(isValid).toBe(true);
    });

    it("should invalidate all active sessions when password is reset", async () => {
      const email = "kabir@student.greenfield.edu";
      const user = await db.user.findFirstOrThrow({ where: { email } });

      // Create dummy session
      await db.session.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        },
      });

      const sessionBefore = await db.session.count({ where: { userId: user.id } });
      expect(sessionBefore).toBeGreaterThan(0);

      // Reset password
      await resetUserPassword({ email, newPassword: "KabirReset2026!" });

      // Sessions must be deleted
      const sessionAfter = await db.session.count({ where: { userId: user.id } });
      expect(sessionAfter).toBe(0);
    });
  });

  describe("Validation & Security Controls", () => {
    it("should reject password reset when password is less than 8 characters", async () => {
      await expect(
        resetUserPassword({
          email: "principal@greenfield.edu",
          newPassword: "short",
        })
      ).rejects.toThrow("Password must be at least 8 characters long");
    });

    it("should reject password reset when email format is invalid", async () => {
      await expect(
        resetUserPassword({
          email: "not-an-email",
          newPassword: "ValidPassword123!",
        })
      ).rejects.toThrow("Invalid email address");
    });

    it("should reject password reset for non-existent user", async () => {
      await expect(
        resetUserPassword({
          email: "ghost_user_99999@school.internal",
          newPassword: "ValidPassword123!",
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("GraphQL Password Reset Mutation", () => {
    it("should execute resetPassword mutation via GraphQL engine", async () => {
      const schema = createSchema({
        typeDefs,
        resolvers,
      });

      const mutation = `
        mutation ResetStudentPassword($input: ResetPasswordInput!) {
          resetPassword(input: $input) {
            success
            message
            email
            role
          }
        }
      `;

      const variables = {
        input: {
          email: "anaya@student.greenfield.edu",
          newPassword: "AnayaGraphQLPass2026!",
        },
      };

      const response = await graphql({
        schema,
        source: mutation,
        variableValues: variables,
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.resetPassword).toEqual({
        success: true,
        message: expect.stringContaining("Password successfully reset"),
        email: "anaya@student.greenfield.edu",
        role: "Student",
      });

      // Verify in DB
      const user = await db.user.findFirstOrThrow({
        where: { email: "anaya@student.greenfield.edu" },
      });
      const isValid = await verifyPassword(user.passwordHash, "AnayaGraphQLPass2026!");
      expect(isValid).toBe(true);
    });
  });

  describe("Batch Target Role Password Resets", () => {
    it("should reset all students passwords in bulk", async () => {
      const results = await resetPasswordsByTarget("student", "BulkStudentPass2026!");

      expect(results.length).toBeGreaterThanOrEqual(4);
      results.forEach((r) => {
        expect(r.success).toBe(true);
        expect(r.role).toBe("Student");
      });
    });
  });
});
