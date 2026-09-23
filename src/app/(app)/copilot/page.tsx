import { getAuthContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui";
import { AiCopilotClient, type StudentSummary } from "@/components/ai/AiCopilotClient";
import { db } from "@/lib/db";

export default async function CopilotPage() {
  const ctx = await getAuthContext();

  let studentSummaries: StudentSummary[] = [];

  try {
    const students = await db.student.findMany({
      where: ctx?.schoolId ? { schoolId: ctx.schoolId, archived: false } : { archived: false },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            section: {
              include: { grade: true },
            },
          },
          take: 1,
        },
      },
      take: 20,
      orderBy: { lastName: "asc" },
    });

    studentSummaries = students.map((s) => {
      const enr = s.enrollments[0];
      const className = enr ? `${enr.section.grade.name}-${enr.section.name}` : "Class 8-A";
      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        className,
      };
    });
  } catch (err) {
    // Graceful fallback if database connection is offline
    studentSummaries = [
      { id: "1", name: "Arjun Mehta", className: "Class 8-A" },
      { id: "2", name: "Sara Kapoor", className: "Class 8-A" },
      { id: "3", name: "Kabir Shah", className: "Class 8-A" },
      { id: "4", name: "Anaya Verma", className: "Class 8-A" },
    ];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Academic Copilot"
        subtitle="LLM-assisted student evaluations, smart curriculum quizzes, and circular generation"
      />

      <AiCopilotClient students={studentSummaries} />
    </div>
  );
}
