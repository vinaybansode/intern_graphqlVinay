import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { can } from "@/lib/permissions/engine";
import { db } from "@/lib/db";
import { PageHeader, Section, Badge, StatCard, Empty } from "@/components/ui";
import { fmtDate } from "@/lib/dates";

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = (await getAuthContext())!;
  const { id } = await params;

  const student = await db.student.findUnique({
    where: { id },
    include: {
      enrollments: { where: { status: "ACTIVE" }, include: { section: { include: { grade: true } } }, take: 1 },
      guardians: { include: { guardian: true } },
      results: { where: { status: "PUBLISHED" }, include: { examSubject: { include: { exam: true, offering: { include: { subject: true } } } } } },
      attendance: true,
      notes: true,
    },
  });
  if (!student || student.schoolId !== ctx.schoolId) notFound();

  const sectionId = student.enrollments[0]?.sectionId ?? null;
  const target = { studentId: student.id, sectionId, schoolId: student.schoolId };

  // Per-record authorization: a parent/teacher/student cannot open a student
  // outside their scope even by guessing the URL id.
  if (!can(ctx, "students", "personal_info", "view", target)) {
    return (
      <div>
        <PageHeader title="Access denied" />
        <Empty>You do not have permission to view this student&apos;s information.</Empty>
      </div>
    );
  }

  const canConfidential = can(ctx, "students", "confidential_notes", "view", target);
  const enr = student.enrollments[0];
  const present = student.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const pct = student.attendance.length ? Math.round((present / student.attendance.length) * 100) : 100;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        subtitle={`Admission ${student.admissionNo}`}
        action={enr ? <Badge color="blue">{enr.section.grade.name.replace("Class ", "")}-{enr.section.name} · Roll {enr.rollNumber}</Badge> : null}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Attendance" value={`${pct}%`} />
        <StatCard label="Published results" value={student.results.length} />
        <StatCard label="Guardians" value={student.guardians.length} />
        <StatCard label="Admission date" value={fmtDate(student.admissionDate)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Guardians">
          <ul className="divide-y divide-slate-100">
            {student.guardians.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium">{g.guardian.name}</span> · {g.relationship}
                  {g.isPrimary && <Badge color="green"> Primary</Badge>}
                </span>
                <span className="text-xs text-slate-500">{g.guardian.phone}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Published results">
          {student.results.length === 0 ? (
            <Empty>No results published yet.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {student.results.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{r.examSubject.exam.name} · {r.examSubject.offering.subject.name}</span>
                  <span className="font-medium">{r.marks}/{r.examSubject.maxMarks}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {student.notes.length > 0 && (
        <Section title="Notes">
          <ul className="divide-y divide-slate-100">
            {student.notes.map((n) => {
              // Confidential notes are only rendered when the viewer is permitted.
              if (n.confidential && !canConfidential) {
                return (
                  <li key={n.id} className="py-2 text-sm text-slate-400">
                    <Badge color="red">Confidential</Badge> — hidden from your role
                  </li>
                );
              }
              return (
                <li key={n.id} className="py-2 text-sm">
                  <Badge color="slate">{n.category}</Badge> <span className="ml-2">{n.body}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}
