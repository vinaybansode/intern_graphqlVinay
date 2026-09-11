import type { AuthContext } from "@/lib/auth/context";
import type { Scope } from "@prisma/client";

// A description of the record being accessed. Fields are optional; the engine
// only uses what the scope needs.
export interface Target {
  schoolId?: string;
  sectionId?: string | null;
  offeringId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  departmentId?: string | null;
  ownerId?: string | null; // user id that owns the record
}

export class ForbiddenError extends Error {
  constructor(msg = "Forbidden") {
    super(msg);
    this.name = "ForbiddenError";
  }
}

/** All scopes granted to the user for a given module/resource/action. */
export function scopesFor(
  ctx: AuthContext,
  module: string,
  resource: string,
  action: string,
): Scope[] {
  return ctx.grants
    .filter((g) => g.module === module && g.resource === resource && g.action === action)
    .map((g) => g.scope);
}

function assignedSections(ctx: AuthContext): Set<string> {
  return new Set([...ctx.assignedSectionIds, ...ctx.classTeacherSectionIds]);
}

/** Is a single scope satisfied by the target for this user? */
function scopeSatisfied(scope: Scope, ctx: AuthContext, t: Target): boolean {
  // School boundary always applies: a user can never reach another school.
  if (t.schoolId && t.schoolId !== ctx.schoolId) return false;

  switch (scope) {
    case "NONE":
      return false;
    case "SCHOOL":
    case "CAMPUS":
      return true;
    case "DEPARTMENT":
      return !!t.departmentId && t.departmentId === ctx.departmentId;
    case "ASSIGNED_CLASS":
    case "ASSIGNED_SECTION":
      return !!t.sectionId && assignedSections(ctx).has(t.sectionId);
    case "ASSIGNED_SUBJECT":
      return !!t.offeringId && ctx.assignedOfferingIds.includes(t.offeringId);
    case "ASSIGNED_STUDENTS":
      // A student is "assigned" to the user if enrolled in a section the user
      // teaches or is class teacher of.
      return !!t.sectionId && assignedSections(ctx).has(t.sectionId);
    case "OWN":
      if (t.ownerId && t.ownerId === ctx.userId) return true;
      if (t.studentId && t.studentId === ctx.studentId) return true;
      if (t.teacherId && t.teacherId === ctx.teacherId) return true;
      // Class-shared resources (homework, timetable, calendar) carry a sectionId
      // but NOT a specific studentId. Section membership grants OWN only then —
      // it must never expose another individual student's record.
      if (!t.studentId && t.sectionId && ctx.studentSectionIds.includes(t.sectionId)) return true;
      return false;
    case "OWN_CHILDREN":
      return !!t.studentId && ctx.childStudentIds.includes(t.studentId);
    default:
      return false;
  }
}

/**
 * Can the user perform module.resource.action on the given target?
 * If no target is supplied, returns true when the user holds ANY grant with a
 * scope broader than NONE (used for nav/menu visibility only — never as the
 * sole gate on a record).
 */
export function can(
  ctx: AuthContext | null,
  module: string,
  resource: string,
  action: string,
  target?: Target,
): boolean {
  if (!ctx) return false;
  const scopes = scopesFor(ctx, module, resource, action);
  if (scopes.length === 0) return false;
  if (!target) return scopes.some((s) => s !== "NONE");
  return scopes.some((s) => scopeSatisfied(s, ctx, target));
}

/** Throwing variant for use inside server actions / route handlers. */
export function assertCan(
  ctx: AuthContext | null,
  module: string,
  resource: string,
  action: string,
  target?: Target,
): asserts ctx is AuthContext {
  if (!can(ctx, module, resource, action, target)) {
    throw new ForbiddenError(`Not permitted: ${module}.${resource}.${action}`);
  }
}

/** Does the user have the broadest (school-wide) grant for this action? */
export function hasSchoolWide(
  ctx: AuthContext,
  module: string,
  resource: string,
  action: string,
): boolean {
  return scopesFor(ctx, module, resource, action).some(
    (s) => s === "SCHOOL" || s === "CAMPUS",
  );
}
