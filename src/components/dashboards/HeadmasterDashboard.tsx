import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { StatCard, Section, Badge, Empty } from "@/components/ui";
import { dayRange, fmtDate } from "@/lib/dates";
import Link from "next/link";

export async function HeadmasterDashboard({ ctx }: { ctx: AuthContext }) {
  const { start, end } = dayRange();

  const [
    students,
    teachers,
    sections,
    subjects,
    absentToday,
    pendingResults,
    events,
    announcements,
    recentAudit,
  ] = await Promise.all([
    db.student.count({ where: { schoolId: ctx.schoolId, archived: false } }),
    db.teacher.count({ where: { schoolId: ctx.schoolId, isActive: true } }),
    db.section.count({ where: { academicYear: { schoolId: ctx.schoolId, isCurrent: true } } }),
    db.subject.count({ where: { schoolId: ctx.schoolId, archived: false } }),
    db.studentAttendance.findMany({
      where: { date: { gte: start, lt: end }, status: { in: ["ABSENT", "LEAVE"] } },
      include: { student: true },
    }),
    db.assessmentResult.count({ where: { status: { in: ["SUBMITTED", "REVIEWED", "TEACHER_ENTRY"] } } }),
    db.calendarEvent.findMany({
      where: { schoolId: ctx.schoolId, startAt: { gte: start } },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    db.announcement.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { publishAt: "desc" }, take: 5 }),
    db.auditLog.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Students" value={students} />
        <StatCard label="Teachers" value={teachers} />
        <StatCard label="Sections" value={sections} hint="current year" />
        <StatCard label="Subjects" value={subjects} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Absent today" action={<Link href="/attendance" className="text-xs text-brand-600">View attendance</Link>}>
          {absentToday.length === 0 ? (
            <Empty>No student absences recorded today.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {absentToday.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{a.student.firstName} {a.student.lastName}</span>
                  <Badge color="red">{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Pending result approvals">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-semibold">{pendingResults}</div>
            <p className="text-sm text-slate-500">marks awaiting review / approval / publication across all classes.</p>
          </div>
          <Link href="/results" className="mt-3 inline-block text-xs text-brand-600">Go to results workflow →</Link>
        </Section>

        <Section title="Upcoming events">
          {events.length === 0 ? (
            <Empty>No upcoming calendar events.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{e.title}</span>
                  <span className="text-xs text-slate-500">{fmtDate(e.startAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent announcements">
          <ul className="divide-y divide-slate-100">
            {announcements.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-slate-500">{fmtDate(a.publishAt)} · {a.audience}</div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Recent administrative activity" action={<Link href="/audit" className="text-xs text-brand-600">Full audit log →</Link>}>
        <ul className="divide-y divide-slate-100">
          {recentAudit.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2 text-sm">
              <span>{l.summary}</span>
              <span className="text-xs text-slate-400">{l.actorName} · {fmtDate(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
