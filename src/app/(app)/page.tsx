import { getAuthContext } from "@/lib/auth/context";
import { hasSchoolWide } from "@/lib/permissions/engine";
import { PageHeader } from "@/components/ui";
import { HeadmasterDashboard } from "@/components/dashboards/HeadmasterDashboard";
import { TeacherDashboard } from "@/components/dashboards/TeacherDashboard";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";
import { ParentDashboard } from "@/components/dashboards/ParentDashboard";

export default async function DashboardPage() {
  const ctx = (await getAuthContext())!;

  // Dashboard composition is capability-driven, not role-string driven.
  const schoolWide = hasSchoolWide(ctx, "students", "personal_info", "view");

  return (
    <div>
      <PageHeader title={`Welcome, ${ctx.name.split(" ")[0]}`} subtitle="Academic Year 2026–27 · Greenfield International" />
      {schoolWide ? (
        <HeadmasterDashboard ctx={ctx} />
      ) : ctx.teacherId ? (
        <TeacherDashboard ctx={ctx} />
      ) : ctx.studentId ? (
        <StudentDashboard ctx={ctx} />
      ) : ctx.guardianId ? (
        <ParentDashboard ctx={ctx} />
      ) : (
        <p className="text-sm text-slate-500">No dashboard configured for this account.</p>
      )}
    </div>
  );
}
