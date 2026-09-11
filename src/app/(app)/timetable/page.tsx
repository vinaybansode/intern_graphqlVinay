import { getAuthContext } from "@/lib/auth/context";
import { assertCan } from "@/lib/permissions/engine";
import { db } from "@/lib/db";
import { PageHeader, Empty } from "@/components/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default async function TimetablePage() {
  const ctx = (await getAuthContext())!;
  assertCan(ctx, "academics", "timetable", "view");

  // Which sections to show: teacher/class-teacher → their sections;
  // student/parent → their (children's) sections; school-wide → current sections.
  let sectionIds: string[] = [...new Set([...ctx.assignedSectionIds, ...ctx.classTeacherSectionIds, ...ctx.studentSectionIds])];
  if (ctx.guardianId) {
    const enr = await db.enrollment.findMany({ where: { studentId: { in: ctx.childStudentIds }, status: "ACTIVE" }, select: { sectionId: true } });
    sectionIds = [...new Set([...sectionIds, ...enr.map((e) => e.sectionId)])];
  }
  if (sectionIds.length === 0) {
    const secs = await db.section.findMany({ where: { academicYear: { schoolId: ctx.schoolId, isCurrent: true } }, select: { id: true } });
    sectionIds = secs.map((s) => s.id);
  }

  const [periods, entries] = await Promise.all([
    db.timetablePeriod.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { sequence: "asc" } }),
    db.timetableEntry.findMany({
      where: { sectionId: { in: sectionIds } },
      include: { offering: { include: { subject: true, section: { include: { grade: true } }, teacherAssignments: { include: { teacher: true } } } }, room: true, period: true },
    }),
  ]);

  const cell = (periodId: string, day: number) => entries.find((e) => e.periodId === periodId && e.dayOfWeek === day + 1);

  return (
    <div>
      <PageHeader title="Timetable" subtitle="Weekly schedule" />
      {entries.length === 0 ? (
        <Empty>No timetable has been published yet.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Period</th>
                {DAYS.map((d) => <th key={d} className="th">{d}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((p) => (
                <tr key={p.id}>
                  <td className="td whitespace-nowrap"><div className="font-medium">{p.name}</div><div className="text-xs text-slate-400">{p.startTime}–{p.endTime}</div></td>
                  {DAYS.map((_, di) => {
                    const e = cell(p.id, di);
                    return (
                      <td key={di} className="td">
                        {e ? (
                          <div className="rounded-md bg-brand-50 px-2 py-1">
                            <div className="text-xs font-medium text-brand-700">{e.offering.subject.name}</div>
                            <div className="text-[11px] text-slate-500">{e.offering.section.grade.name.replace("Class ", "")}-{e.offering.section.name} · {e.room?.name ?? ""}</div>
                          </div>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
