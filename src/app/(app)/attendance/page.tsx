import { getAuthContext } from "@/lib/auth/context";
import { assertCan, can } from "@/lib/permissions/engine";
import { accessibleSectionIds } from "@/lib/permissions/scope";
import { db } from "@/lib/db";
import { PageHeader, Empty, Section, Badge } from "@/components/ui";
import { saveAttendance } from "@/lib/queries/attendance";
import { dayRange } from "@/lib/dates";
import Link from "next/link";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "LEAVE"] as const;

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ section?: string; date?: string }> }) {
  const ctx = (await getAuthContext())!;
  assertCan(ctx, "attendance", "student", "view");

  const sp = await searchParams;
  const scope = accessibleSectionIds(ctx, "attendance", "student", "view");

  const sections = await db.section.findMany({
    where:
      scope === "ALL"
        ? { academicYear: { schoolId: ctx.schoolId, isCurrent: true } }
        : { id: { in: scope } },
    include: { grade: true },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });

  if (sections.length === 0) return <div><PageHeader title="Attendance" /><Empty>You have no sections in your attendance scope.</Empty></div>;

  const activeSection = sections.find((s) => s.id === sp.section) ?? sections[0];
  const date = sp.date ?? new Date().toISOString().slice(0, 10);
  const canMark = can(ctx, "attendance", "student", "create", { sectionId: activeSection.id });

  const { start, end } = dayRange(new Date(date + "T00:00:00.000Z"));
  const roster = await db.enrollment.findMany({
    where: { sectionId: activeSection.id, status: "ACTIVE" },
    include: { student: true, section: true },
    orderBy: { rollNumber: "asc" },
  });
  const todays = await db.studentAttendance.findMany({
    where: { sectionId: activeSection.id, date: { gte: start, lt: end }, offeringId: null },
  });
  const statusFor = (studentId: string) => todays.find((t) => t.studentId === studentId)?.status ?? "PRESENT";

  return (
    <div>
      <PageHeader title="Attendance" subtitle={`${roster.length} students`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {sections.map((s) => (
          <Link
            key={s.id}
            href={`/attendance?section=${s.id}&date=${date}`}
            className={`badge ${s.id === activeSection.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {s.grade.name.replace("Class ", "")}-{s.name}
          </Link>
        ))}
        <form action="/attendance" method="get" className="ml-auto flex items-center gap-2">
          <input type="hidden" name="section" value={activeSection.id} />
          <input type="date" name="date" defaultValue={date} className="input max-w-[10rem]" />
          <button className="btn-ghost" type="submit">Load</button>
        </form>
      </div>

      <Section title={`${activeSection.grade.name.replace("Class ", "")}-${activeSection.name} · ${date}`}>
        {roster.length === 0 ? (
          <Empty>No students enrolled in this section.</Empty>
        ) : (
          <form action={saveAttendance}>
            <input type="hidden" name="sectionId" value={activeSection.id} />
            <input type="hidden" name="date" value={date} />
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Roll</th>
                  <th className="th">Student</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((e) => (
                  <tr key={e.id}>
                    <td className="td">{e.rollNumber}</td>
                    <td className="td font-medium">{e.student.firstName} {e.student.lastName}</td>
                    <td className="td">
                      {canMark ? (
                        <select name={`status_${e.studentId}`} defaultValue={statusFor(e.studentId)} className="input max-w-[10rem]">
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <Badge color={statusFor(e.studentId) === "PRESENT" ? "green" : "red"}>{statusFor(e.studentId)}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {canMark && (
              <div className="mt-4 flex justify-end">
                <button type="submit" className="btn-primary">Save attendance</button>
              </div>
            )}
          </form>
        )}
      </Section>
    </div>
  );
}
