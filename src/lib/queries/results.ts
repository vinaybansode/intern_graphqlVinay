"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/context";
import { assertCan } from "@/lib/permissions/engine";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function saveMarks(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Not authenticated");

  const examSubjectId = String(formData.get("examSubjectId"));
  const es = await db.examSubject.findUnique({
    where: { id: examSubjectId },
    include: { offering: true },
  });
  if (!es) throw new Error("Not found");

  // Teachers may edit only their assigned subject offering; exam controllers /
  // headmaster pass via SCHOOL scope. Enforced on the server regardless of UI.
  assertCan(ctx, "exams", "results", "edit", {
    offeringId: es.offeringId,
    sectionId: es.offering.sectionId,
    schoolId: ctx.schoolId,
  });

  const roster = await db.enrollment.findMany({
    where: { sectionId: es.offering.sectionId, status: "ACTIVE" },
    select: { studentId: true },
  });

  let count = 0;
  for (const r of roster) {
    const raw = formData.get(`marks_${r.studentId}`);
    if (raw === null || raw === "") continue;
    const marks = Math.max(0, Math.min(es.maxMarks, Number(raw)));
    const existing = await db.assessmentResult.findUnique({
      where: { examSubjectId_studentId: { examSubjectId, studentId: r.studentId } },
    });
    if (existing?.status === "PUBLISHED") continue; // published marks are immutable here
    await db.assessmentResult.upsert({
      where: { examSubjectId_studentId: { examSubjectId, studentId: r.studentId } },
      update: { marks, status: "TEACHER_ENTRY", enteredById: ctx.teacherId ?? ctx.userId },
      create: { examSubjectId, studentId: r.studentId, marks, status: "TEACHER_ENTRY", enteredById: ctx.teacherId ?? ctx.userId },
    });
    count++;
  }

  await audit(ctx, {
    action: "update",
    module: "exams",
    resource: "results",
    recordId: examSubjectId,
    summary: `Entered marks for ${count} students`,
  });

  revalidatePath("/results");
}

// Approve + publish workflow (exam controller / headmaster).
export async function publishResults(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Not authenticated");
  const examSubjectId = String(formData.get("examSubjectId"));
  const es = await db.examSubject.findUnique({ where: { id: examSubjectId }, include: { offering: true } });
  if (!es) throw new Error("Not found");

  assertCan(ctx, "exams", "results", "publish", {
    offeringId: es.offeringId,
    sectionId: es.offering.sectionId,
    schoolId: ctx.schoolId,
  });

  await db.assessmentResult.updateMany({
    where: { examSubjectId, status: { not: "PUBLISHED" } },
    data: { status: "PUBLISHED", approvedById: ctx.userId },
  });

  await audit(ctx, {
    action: "publish",
    module: "exams",
    resource: "results",
    recordId: examSubjectId,
    summary: `Published results for exam subject ${examSubjectId}`,
  });

  revalidatePath("/results");
}
