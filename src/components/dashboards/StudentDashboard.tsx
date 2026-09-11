import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { StatCard, Section, Empty, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import Link from "next/link";

export async function StudentDashboard({ ctx }: { ctx: AuthContext }) {
  const studentId = ctx.studentId!;

  const [attendance, homework, results, announcements] = await Promise.all([
    db.studentAttendance.findMany({ where: { studentId } }),
    db.homeworkSubmission.findMany({
      where: { studentId },
      include: { homework: { include: { offering: { include: { subject: true } } } } },
      orderBy: { homework: { dueAt: "asc" } },
    }),
    db.assessmentResult.findMany({
      where: { studentId, status: "PUBLISHED" },
      include: { examSubject: { include: { exam: true, offering: { include: { subject: true } } } } },
    }),
    db.announcement.findMany({
      where: { schoolId: ctx.schoolId, OR: [{ audience: "ALL_USERS" }, { audience: "STUDENTS" }, { audience: "SECTION", sectionId: { in: ctx.studentSectionIds } }] },
      orderBy: { publishAt: "desc" },
      take: 5,
    }),
  ]);

  const present = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const pct = attendance.length ? Math.round((present / attendance.length) * 100) : 100;
  const pending = homework.filter((h) => h.status === "ASSIGNED" || h.status === "LATE");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Attendance" value={`${pct}%`} hint={`${present}/${attendance.length} days`} />
        <StatCard label="Homework pending" value={pending.length} />
        <StatCard label="Published results" value={results.length} />
        <StatCard label="Announcements" value={announcements.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="My homework" action={<Link href="/homework" className="text-xs text-brand-600">All homework →</Link>}>
          {homework.length === 0 ? (
            <Empty>No homework has been assigned yet.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {homework.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{h.homework.offering.subject.name}</span> · {h.homework.title}
                    <span className="ml-2 text-xs text-slate-400">due {fmtDate(h.homework.dueAt)}</span>
                  </span>
                  <Badge color={h.status === "SUBMITTED" ? "green" : h.status === "REVIEWED" ? "blue" : "amber"}>{h.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Latest results" action={<Link href="/results" className="text-xs text-brand-600">All results →</Link>}>
          {results.length === 0 ? (
            <Empty>No results have been published yet.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{r.examSubject.exam.name} · {r.examSubject.offering.subject.name}</span>
                  <span className="font-medium">{r.marks}/{r.examSubject.maxMarks}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Announcements">
        <ul className="divide-y divide-slate-100">
          {announcements.map((a) => (
            <li key={a.id} className="py-2 text-sm">
              <div className="font-medium">{a.title}</div>
              <div className="text-xs text-slate-500">{fmtDate(a.publishAt)}</div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
