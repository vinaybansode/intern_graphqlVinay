import { getAuthContext } from "@/lib/auth/context";
import { assertCan, can } from "@/lib/permissions/engine";
import { listAccessibleStudents } from "@/lib/queries/students";
import { PageHeader } from "@/components/ui";
import { StudentDirectoryClient } from "@/components/students/StudentDirectoryClient";
import { db } from "@/lib/db";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const ctx = (await getAuthContext())!;
  // Server-side gate — never rely on the hidden nav item.
  assertCan(ctx, "students", "personal_info", "view");

  const sp = await searchParams;
  const { rows, total } = await listAccessibleStudents(ctx, {
    search: sp.q,
    pageSize: 100,
  });

  const sections = await db.section.findMany({
    where: { academicYear: { schoolId: ctx.schoolId, isCurrent: true } },
    include: { grade: true },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });

  const canCreate = can(ctx, "students", "personal_info", "create");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Students Directory"
        subtitle={`${total} student${total === 1 ? "" : "s"} enrolled · Filter, search, switch views, or export roster`}
      />

      <StudentDirectoryClient
        students={rows}
        sections={sections}
        canCreate={canCreate}
      />
    </div>
  );
}
