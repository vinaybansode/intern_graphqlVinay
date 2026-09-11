import { db } from "@/lib/db";
import { getSessionId } from "@/lib/auth/session";
import type { Scope } from "@prisma/client";

export interface Grant {
  module: string;
  resource: string;
  action: string;
  scope: Scope;
}

// Everything the permission engine needs to evaluate a request, derived from
// the user's REAL relationships — never from a bare role string.
export interface AuthContext {
  userId: string;
  schoolId: string;
  name: string;
  email: string;
  roleKeys: string[];
  grants: Grant[];

  teacherId: string | null;
  departmentId: string | null;
  assignedOfferingIds: string[]; // subject offerings currently taught
  assignedSectionIds: string[]; // sections where the user teaches
  classTeacherSectionIds: string[]; // sections where the user is class teacher

  studentId: string | null;
  studentSectionIds: string[]; // sections the student is currently enrolled in

  guardianId: string | null;
  childStudentIds: string[]; // students linked to this guardian
}

function effective<T extends { endDate: Date | null }>(rows: T[]): T[] {
  const now = Date.now();
  return rows.filter((r) => !r.endDate || r.endDate.getTime() >= now);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const sessionId = await getSessionId();
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, expiresAt: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return buildContextForUser(session.userId);
}

// Load the full authorization context for a user directly. Shared by the
// session path and by tests (which have no cookie runtime).
export async function buildContextForUser(userId: string): Promise<AuthContext | null> {
  const u = await db.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: { include: { permissions: true } } } },
      teacher: true,
      student: true,
      guardian: true,
    },
  });
  if (!u || !u.isActive) return null;
  const roleKeys = u.userRoles.map((ur) => ur.role.key);
  const grants: Grant[] = u.userRoles.flatMap((ur) =>
    ur.role.permissions.map((p) => ({
      module: p.module,
      resource: p.resource,
      action: p.action,
      scope: p.scope,
    })),
  );

  const ctx: AuthContext = {
    userId: u.id,
    schoolId: u.schoolId,
    name: u.name,
    email: u.email,
    roleKeys,
    grants,
    teacherId: null,
    departmentId: null,
    assignedOfferingIds: [],
    assignedSectionIds: [],
    classTeacherSectionIds: [],
    studentId: null,
    studentSectionIds: [],
    guardianId: null,
    childStudentIds: [],
  };

  if (u.teacher) {
    ctx.teacherId = u.teacher.id;
    ctx.departmentId = u.teacher.departmentId;

    const [assignments, classTeacher] = await Promise.all([
      db.teacherAssignment.findMany({
        where: { teacherId: u.teacher.id },
        include: { offering: { select: { id: true, sectionId: true } } },
      }),
      db.classTeacherAssignment.findMany({ where: { teacherId: u.teacher.id } }),
    ]);
    const activeAssignments = effective(assignments);
    ctx.assignedOfferingIds = activeAssignments.map((a) => a.offering.id);
    ctx.assignedSectionIds = [...new Set(activeAssignments.map((a) => a.offering.sectionId))];
    ctx.classTeacherSectionIds = effective(classTeacher).map((c) => c.sectionId);
  }

  if (u.student) {
    ctx.studentId = u.student.id;
    const enr = effective(
      await db.enrollment.findMany({ where: { studentId: u.student.id } }),
    );
    ctx.studentSectionIds = [...new Set(enr.map((e) => e.sectionId))];
  }

  if (u.guardian) {
    ctx.guardianId = u.guardian.id;
    const links = await db.studentGuardian.findMany({
      where: { guardianId: u.guardian.id, portalAccess: true },
      select: { studentId: true },
    });
    ctx.childStudentIds = links.map((l) => l.studentId);
  }

  return ctx;
}
