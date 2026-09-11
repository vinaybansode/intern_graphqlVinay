import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { accessibleStudentScope } from "@/lib/permissions/scope";
import type { Prisma } from "@prisma/client";

// Build a scope-limited WHERE clause for students so we never load the whole
// school and filter in memory. Returns null when the user may see nobody.
export function studentScopeWhere(ctx: AuthContext, search?: string): Prisma.StudentWhereInput | null {
  const scope = accessibleStudentScope(ctx, "students", "personal_info", "view");
  const and: Prisma.StudentWhereInput[] = [{ schoolId: ctx.schoolId, archived: false }];

  if (search) {
    and.push({ OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }, { admissionNo: { contains: search } }] });
  }

  if (scope.schoolWide) {
    return { AND: and };
  }

  const or: Prisma.StudentWhereInput[] = [];
  if (scope.sectionIds.length) {
    or.push({ enrollments: { some: { sectionId: { in: scope.sectionIds }, status: "ACTIVE" } } });
  }
  if (scope.studentIds.length) {
    or.push({ id: { in: scope.studentIds } });
  }
  if (or.length === 0) return null;

  and.push({ OR: or });
  return { AND: and };
}

export async function listAccessibleStudents(ctx: AuthContext, opts: { search?: string; page?: number; pageSize?: number } = {}) {
  const where = studentScopeWhere(ctx, opts.search);
  if (!where) return { rows: [], total: 0 };

  const pageSize = opts.pageSize ?? 25;
  const page = Math.max(1, opts.page ?? 1);

  const [rows, total] = await Promise.all([
    db.student.findMany({
      where,
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: { section: { include: { grade: true } } },
          take: 1,
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.student.count({ where }),
  ]);

  return { rows, total, page, pageSize };
}
