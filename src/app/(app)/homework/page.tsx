import { getAuthContext } from "@/lib/auth/context";
import { assertCan, hasSchoolWide } from "@/lib/permissions/engine";
import { db } from "@/lib/db";
import { PageHeader, Empty, Section, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/dates";

export default async function HomeworkPage() {
  const ctx = (await getAuthContext())!;
  assertCan(ctx, "homework", "assignment", "view");

  const schoolWide = hasSchoolWide(ctx, "homework", "assignment", "view");

  // Resolve which offerings' homework the user may see.
  let offeringIds: string[] | "ALL" = "ALL";
  if (!schoolWide) {
    if (ctx.assignedOfferingIds.length) {
      offeringIds = ctx.assignedOfferingIds;
    } else {
      // student / parent: homework for their (children's) sections
      const studentIds = ctx.studentId ? [ctx.studentId] : ctx.childStudentIds;
      const enr = await db.enrollment.findMany({ where: { studentId: { in: studentIds }, status: "ACTIVE" }, select: { sectionId: true } });
      const secIds = [...new Set(enr.map((e) => e.sectionId))];
      const offs = await db.subjectOffering.findMany({ where: { sectionId: { in: secIds } }, select: { id: true } });
      offeringIds = offs.map((o) => o.id);
    }
  }

  const homework = await db.homework.findMany({
    where: offeringIds === "ALL" ? {} : { offeringId: { in: offeringIds } },
    include: {
      offering: { include: { subject: true, section: { include: { grade: true } } } },
      teacher: true,
      submissions: true,
    },
    orderBy: { dueAt: "asc" },
  });

  return (
    <div>
      <PageHeader title="Homework" subtitle={`${homework.length} item${homework.length === 1 ? "" : "s"} in scope`} />
      {homework.length === 0 ? (
        <Empty>No homework has been assigned for your subjects yet.</Empty>
      ) : (
        <div className="space-y-4">
          {homework.map((h) => {
            const submitted = h.submissions.filter((s) => s.status === "SUBMITTED" || s.status === "REVIEWED").length;
            const secName = `${h.offering.section.grade.name.replace("Class ", "")}-${h.offering.section.name}`;
            return (
              <Section
                key={h.id}
                title={`${h.title}`}
                action={<Badge color="blue">{secName} · {h.offering.subject.name}</Badge>}
              >
                <p className="text-sm text-slate-600">{h.description}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Due {fmtDate(h.dueAt)}</span>
                  <span>By {h.teacher.firstName} {h.teacher.lastName}</span>
                  {h.maxMarks && <span>Max {h.maxMarks} marks</span>}
                  <span>{submitted}/{h.submissions.length} submitted</span>
                </div>
              </Section>
            );
          })}
        </div>
      )}
    </div>
  );
}
