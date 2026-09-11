import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { StatCard, Section, Empty, Badge } from "@/components/ui";
import Link from "next/link";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export async function TeacherDashboard({ ctx }: { ctx: AuthContext }) {
  const today = new Date().getUTCDay() || 7;

  const [offerings, todayClasses, awaitingReview, marksToEnter, classTeacher] = await Promise.all([
    db.subjectOffering.findMany({
      where: { id: { in: ctx.assignedOfferingIds } },
      include: { subject: true, section: { include: { grade: true } } },
    }),
    db.timetableEntry.findMany({
      where: { offeringId: { in: ctx.assignedOfferingIds }, dayOfWeek: today },
      include: { offering: { include: { subject: true, section: { include: { grade: true } } } }, period: true, room: true },
      orderBy: { period: { sequence: "asc" } },
    }),
    db.homeworkSubmission.count({
      where: { status: "SUBMITTED", homework: { offeringId: { in: ctx.assignedOfferingIds } } },
    }),
    db.assessmentResult.count({
      where: { status: { in: ["DRAFT", "TEACHER_ENTRY"] }, examSubject: { offeringId: { in: ctx.assignedOfferingIds } } },
    }),
    ctx.classTeacherSectionIds.length
      ? db.section.findMany({
          where: { id: { in: ctx.classTeacherSectionIds } },
          include: { grade: true, _count: { select: { enrollments: true } } },
        })
      : Promise.resolve([]),
  ]);

  const sectionName = (o: (typeof offerings)[number]) => `${o.section.grade.name.replace("Class ", "")}-${o.section.name}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Assigned subjects" value={offerings.length} />
        <StatCard label="Classes today" value={todayClasses.length} hint={DAYS[today]} />
        <StatCard label="Homework to review" value={awaitingReview} />
        <StatCard label="Marks to enter" value={marksToEnter} />
      </div>

      {classTeacher.length > 0 && (
        <Section title="Class teacher responsibilities">
          <ul className="flex flex-wrap gap-3">
            {classTeacher.map((s) => (
              <li key={s.id} className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-2 text-sm">
                <span className="font-medium">{s.grade.name.replace("Class ", "")}-{s.name}</span>
                <span className="ml-2 text-slate-500">{s._count.enrollments} students</span>
                <Link href="/students" className="ml-3 text-xs text-brand-600">Open class →</Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={`Today's classes — ${DAYS[today]}`}>
          {todayClasses.length === 0 ? (
            <Empty>No classes scheduled for today.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todayClasses.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{sectionName(t.offering)}</span> · {t.offering.subject.name}
                  </span>
                  <span className="text-xs text-slate-500">{t.period.startTime}–{t.period.endTime} · {t.room?.name ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="My subjects" action={<Link href="/results" className="text-xs text-brand-600">Enter marks →</Link>}>
          <ul className="divide-y divide-slate-100">
            {offerings.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{o.subject.name}</span>
                <Badge color="blue">{sectionName(o)}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
