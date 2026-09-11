"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/context";
import { assertCan } from "@/lib/permissions/engine";
import { accessibleSectionIds } from "@/lib/permissions/scope";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { dayRange } from "@/lib/dates";

const VALID = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY", "LEAVE"] as const;
type Status = (typeof VALID)[number];

export async function saveAttendance(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Not authenticated");

  const sectionId = String(formData.get("sectionId"));
  const dateStr = String(formData.get("date"));

  // Authorize against the specific section (relationship-checked, not role).
  assertCan(ctx, "attendance", "student", "create", { sectionId, schoolId: ctx.schoolId });

  // Double-check the section is within the resolved DB scope.
  const scope = accessibleSectionIds(ctx, "attendance", "student", "create");
  if (scope !== "ALL" && !scope.includes(sectionId)) throw new Error("Forbidden section");

  const date = new Date(dateStr + "T00:00:00.000Z");
  const enrollments = await db.enrollment.findMany({
    where: { sectionId, status: "ACTIVE" },
    select: { studentId: true },
  });

  // Day-level attendance rows have a null offeringId. MySQL treats NULLs as
  // distinct in unique keys, so we reconcile explicitly rather than upsert.
  const existing = await db.studentAttendance.findMany({
    where: { sectionId, date, offeringId: null },
  });
  const byStudent = new Map(existing.map((r) => [r.studentId, r]));
  const markedBy = ctx.teacherId ?? ctx.userId;

  let changed = 0;
  for (const e of enrollments) {
    const raw = String(formData.get(`status_${e.studentId}`) ?? "PRESENT");
    const status = (VALID.includes(raw as Status) ? raw : "PRESENT") as Status;
    const prev = byStudent.get(e.studentId);
    if (prev) {
      if (prev.status !== status) {
        await db.studentAttendance.update({ where: { id: prev.id }, data: { status, markedById: markedBy } });
        changed++;
      }
    } else {
      await db.studentAttendance.create({ data: { studentId: e.studentId, sectionId, date, status, markedById: markedBy } });
      changed++;
    }
  }

  await audit(ctx, {
    action: "update",
    module: "attendance",
    resource: "student",
    recordId: sectionId,
    summary: `Marked attendance for ${changed} students on ${dateStr}`,
  });

  revalidatePath("/attendance");
}
