import { getAuthContext } from "@/lib/auth/context";
import { assertCan } from "@/lib/permissions/engine";
import { listAccessibleStudents } from "@/lib/queries/students";
import { PageHeader, Empty, Badge } from "@/components/ui";
import Link from "next/link";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const ctx = (await getAuthContext())!;
  // Server-side gate — never rely on the hidden nav item.
  assertCan(ctx, "students", "personal_info", "view");

  const sp = await searchParams;
  const { rows, total } = await listAccessibleStudents(ctx, {
    search: sp.q,
    page: sp.page ? Number(sp.page) : 1,
  });

  return (
    <div>
      <PageHeader title="Students" subtitle={`${total} student${total === 1 ? "" : "s"} within your access scope`} />

      <form className="mb-4 flex gap-2" action="/students" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search name or admission no…" className="input max-w-sm" />
        <button className="btn-ghost" type="submit">Search</button>
      </form>

      {rows.length === 0 ? (
        <Empty>No students match your access scope{sp.q ? " and search" : ""}.</Empty>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Admission No</th>
                <th className="th">Class</th>
                <th className="th">Roll</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => {
                const enr = s.enrollments[0];
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="td font-medium">{s.firstName} {s.lastName}</td>
                    <td className="td">{s.admissionNo}</td>
                    <td className="td">
                      {enr ? <Badge color="blue">{enr.section.grade.name.replace("Class ", "")}-{enr.section.name}</Badge> : "—"}
                    </td>
                    <td className="td">{enr?.rollNumber ?? "—"}</td>
                    <td className="td text-right">
                      <Link href={`/students/${s.id}`} className="text-xs text-brand-600">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
