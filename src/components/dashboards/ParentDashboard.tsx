import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { Section, Empty, StatCard, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/dates";

export async function ParentDashboard({ ctx }: { ctx: AuthContext }) {
  const children = await db.student.findMany({
    where: { id: { in: ctx.childStudentIds } },
    include: {
      enrollments: { where: { status: "ACTIVE" }, include: { section: { include: { grade: true } } } },
      attendance: true,
      submissions: { include: { homework: { include: { offering: { include: { subject: true } } } } } },
      results: { where: { status: "PUBLISHED" }, include: { examSubject: { include: { exam: true, offering: { include: { subject: true } } } } } },
    },
  });

  if (children.length === 0) return <Empty>No children are linked to this account.</Empty>;

  return (
    <div className="space-y-8">
      {children.map((c) => {
        const enr = c.enrollments[0];
        const present = c.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
        const pct = c.attendance.length ? Math.round((present / c.attendance.length) * 100) : 100;
        const pending = c.submissions.filter((s) => s.status === "ASSIGNED" || s.status === "LATE");
        return (
          <div key={c.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700">
                {c.firstName[0]}
              </div>
              <div>
                <div className="font-semibold">{c.firstName} {c.lastName}</div>
                <div className="text-xs text-slate-500">
                  {enr ? `${enr.section.grade.name.replace("Class ", "")}-${enr.section.name} · Roll ${enr.rollNumber}` : "Not enrolled"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Attendance" value={`${pct}%`} />
              <StatCard label="Homework pending" value={pending.length} />
              <StatCard label="Results" value={c.results.length} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Section title="Recent homework">
                {c.submissions.length === 0 ? (
                  <Empty>No homework assigned yet.</Empty>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {c.submissions.slice(0, 5).map((s) => (
                      <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                        <span>{s.homework.offering.subject.name} · {s.homework.title}</span>
                        <Badge color={s.status === "SUBMITTED" ? "green" : s.status === "REVIEWED" ? "blue" : "amber"}>{s.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="Published results">
                {c.results.length === 0 ? (
                  <Empty>No results published yet.</Empty>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {c.results.map((r) => (
                      <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                        <span>{r.examSubject.exam.name} · {r.examSubject.offering.subject.name}</span>
                        <span className="font-medium">{r.marks}/{r.examSubject.maxMarks}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>
        );
      })}
    </div>
  );
}
