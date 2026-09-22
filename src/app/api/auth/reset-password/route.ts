import { NextResponse } from "next/server";
import { resetUserPassword, resetPasswordsByTarget } from "@/lib/auth/passwordReset";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if bulk reset by target role was requested (e.g. { target: "student", newPassword: "..." })
    if (body.target && ["admin", "principal", "student", "all"].includes(body.target)) {
      const results = await resetPasswordsByTarget(body.target, body.newPassword);
      return NextResponse.json({
        success: true,
        message: `Password reset successfully executed for target: ${body.target}`,
        count: results.length,
        results,
      });
    }

    // Individual user password reset by email
    if (!body.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: 'email' (or specify 'target': 'admin' | 'principal' | 'student').",
        },
        { status: 400 }
      );
    }

    const result = await resetUserPassword({
      email: body.email,
      newPassword: body.newPassword,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      email: result.email,
      role: result.role,
      ...(result.temporaryPassword ? { temporaryPassword: result.temporaryPassword } : {}),
    });
  } catch (error: any) {
    const isValidationError =
      error.name === "ZodError" ||
      error.message?.includes("must be at least") ||
      error.message?.includes("Invalid email");
    const isNotFound = error.message?.includes("not found");

    const status = isValidationError ? 400 : isNotFound ? 404 : 500;

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to reset password.",
      },
      { status }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/auth/reset-password",
    description: "API for resetting passwords of Admin, Principal, Student, and other school accounts.",
    methods: {
      POST: {
        description: "Reset password for an individual user or batch by role",
        formats: [
          {
            description: "Reset by Email",
            body: {
              email: "principal@greenfield.edu",
              newPassword: "NewSecurePassword123!",
            },
          },
          {
            description: "Batch Reset by Target Role",
            body: {
              target: "admin | principal | student | all",
              newPassword: "NewSecurePassword123!",
            },
          },
        ],
      },
    },
  });
}
