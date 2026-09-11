import { getAuthContext } from "@/lib/auth/context";
import { assertCan, hasSchoolWide, can } from "@/lib/permissions/engine";
import { db } from "@/lib/db";
import { PageHeader, Section, Empty, Badge } from "@/components/ui";
import { saveMarks, publishResults } from "@/lib/queries/results";

export default async function ResultsPage() {
  const ctx = (await getAuthContext())!;
  assertCan(ctx, "exams", "results", "view");

  const schoolWide = hasSchoolWide(ctx, "exams", "results", "edit");
  const canEditSomewhere = schoolWide || ctx.assignedOfferingIds.length > 0;

  // Student / parent view: published marks only.
  if (!canEditSomewhere) {
    const studentIds = ctx.studentId ? [ctx.studentId] : ctx.childStudentIds;
    const results = await db.assessmentResult.findMany({
      where: { studentId: { in: studentIds }, status: "PUBLISHED" },
      include: { student: true, examSubject: { include: { exam: true, offering: { include: { subject: true } } } } },
      orderBy: { updatedAt: "desc" },
    });
    return (
      <div>
        <PageHeader title="Results" subtitle="Published results" />
        {results.length === 0 ? (
          <Empty>No results have been published yet.</Empty>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Student</th><th className="th">Exam</th><th className="th">Subject</th><th className="th">Marks</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className="td">{r.student.firstName} {r.student.lastName}</td>
                    <td className="td">{r.examSubject.exam.name}</td>
                    <td className="td">{r.examSubject.offering.subject.name}</td>
                    <td className="td font-medium">{r.marks}/{r.examSubject.maxMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Teacher / exam controller / headmaster: mark entry.
  const examSubjects = await db.examSubject.findMany({
    where: schoolWide ? {} : { offeringId: { in: ctx.assignedOfferingIds } },
    include: {
      exam: true,
      offering: { include: { subject: true, section: { include: { grade: true } } } },
      results: { include: { student: true } },
    },
  });

  const rosters = await Promise.all(
    examSubjects.map((es) =>
      db.enrollment.findMany({ where: { sectionId: es.offering.sectionId, status: "ACTIVE" }, include: { student: true }, orderBy: { rollNumber: "asc" } }),
    ),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Results — mark entry" subtitle="Draft → Teacher Entry → Approved → Published" />
      {examSubjects.length === 0 && <Empty>No exam subjects in your scope.</Empty>}
      {examSubjects.map((es, i) => {
        const marksBy = new Map(es.results.map((r) => [r.studentId, r]));
        const published = es.results.some((r) => r.status === "PUBLISHED");
        const canPublish = can(ctx, "exams", "results", "publish", { offeringId: es.offeringId, sectionId: es.offering.sectionId });
        const secName = `${es.offering.section.grade.name.replace("Class ", "")}-${es.offering.section.name}`;
        return (
          <Section
            key={es.id}
            title={`${es.exam.name} · ${secName} · ${es.offering.subject.name} (max ${es.maxMarks})`}
            action={published ? <Badge color="green">Published</Badge> : <Badge color="amber">In progress</Badge>}
          >
            <form action={saveMarks}>
              <input type="hidden" name="examSubjectId" value={es.id} />
              <table className="w-full">
                <thead><tr><th className="th">Roll</th><th className="th">Student</th><th className="th">Marks</th><th className="th">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rosters[i].map((e) => {
                    const r = marksBy.get(e.studentId);
                    return (
                      <tr key={e.id}>
                        <td className="td">{e.rollNumber}</td>
                        <td className="td font-medium">{e.student.firstName} {e.student.lastName}</td>
                        <td className="td">
                          <input name={`marks_${e.studentId}`} type="number" min={0} max={es.maxMarks} defaultValue={r?.marks ?? ""} disabled={r?.status === "PUBLISHED"} className="input max-w-[6rem]" />
                        </td>
                        <td className="td"><Badge color={r?.status === "PUBLISHED" ? "green" : r ? "blue" : "slate"}>{r?.status ?? "—"}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3 flex justify-end gap-2">
                <button type="submit" className="btn-ghost" disabled={published}>Save marks</button>
              </div>
            </form>
            {canPublish && !published && (
              <form action={publishResults} className="mt-2 flex justify-end">
                <input type="hidden" name="examSubjectId" value={es.id} />
                <button type="submit" className="btn-primary">Approve &amp; publish</button>
              </form>
            )}
          </Section>
        );
      })}
    </div>
  );
}
