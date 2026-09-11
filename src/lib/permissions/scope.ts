import type { AuthContext } from "@/lib/auth/context";
import { scopesFor } from "@/lib/permissions/engine";

// Resolve a permission into a concrete DB filter so scope-limited queries run
// server-side (never "load everything then filter in the browser").
//
// Returns:
//   "ALL"        → school-wide access; caller filters by schoolId only
//   string[]     → the exact set of section ids the user may touch
//   []           → no access
export function accessibleSectionIds(
  ctx: AuthContext,
  module: string,
  resource: string,
  action: string,
): "ALL" | string[] {
  const scopes = scopesFor(ctx, module, resource, action);
  if (scopes.length === 0) return [];
  if (scopes.some((s) => s === "SCHOOL" || s === "CAMPUS")) return "ALL";

  const sections = new Set<string>();
  for (const s of scopes) {
    if (s === "ASSIGNED_SECTION" || s === "ASSIGNED_CLASS" || s === "ASSIGNED_STUDENTS") {
      ctx.assignedSectionIds.forEach((id) => sections.add(id));
      ctx.classTeacherSectionIds.forEach((id) => sections.add(id));
    }
    if (s === "OWN" && ctx.studentSectionIds.length) {
      ctx.studentSectionIds.forEach((id) => sections.add(id));
    }
  }
  return [...sections];
}

// The set of student ids a user may access (for student-centric queries such as
// a parent's children or a class teacher's roster).
export function accessibleStudentScope(
  ctx: AuthContext,
  module: string,
  resource: string,
  action: string,
): { schoolWide: boolean; sectionIds: string[]; studentIds: string[] } {
  const scopes = scopesFor(ctx, module, resource, action);
  const schoolWide = scopes.some((s) => s === "SCHOOL" || s === "CAMPUS");
  const sectionIds = new Set<string>();
  const studentIds = new Set<string>();
  for (const s of scopes) {
    if (s === "ASSIGNED_SECTION" || s === "ASSIGNED_CLASS" || s === "ASSIGNED_STUDENTS") {
      ctx.assignedSectionIds.forEach((id) => sectionIds.add(id));
      ctx.classTeacherSectionIds.forEach((id) => sectionIds.add(id));
    }
    if (s === "OWN_CHILDREN") ctx.childStudentIds.forEach((id) => studentIds.add(id));
    if (s === "OWN" && ctx.studentId) studentIds.add(ctx.studentId);
  }
  return { schoolWide, sectionIds: [...sectionIds], studentIds: [...studentIds] };
}
