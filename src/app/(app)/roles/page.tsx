import { getAuthContext } from "@/lib/auth/context";
import { assertCan } from "@/lib/permissions/engine";
import { db } from "@/lib/db";
import { PageHeader, Section, Badge } from "@/components/ui";

const scopeColor: Record<string, "green" | "blue" | "amber" | "slate" | "red"> = {
  SCHOOL: "green", CAMPUS: "green", ASSIGNED_CLASS: "blue", ASSIGNED_SECTION: "blue",
  ASSIGNED_SUBJECT: "blue", ASSIGNED_STUDENTS: "blue", DEPARTMENT: "amber",
  OWN: "slate", OWN_CHILDREN: "slate", NONE: "red",
};

export default async function RolesPage() {
  const ctx = (await getAuthContext())!;
  assertCan(ctx, "admin", "roles", "view");

  const roles = await db.role.findMany({
    where: { schoolId: ctx.schoolId },
    include: {
      permissions: { orderBy: [{ module: "asc" }, { resource: "asc" }] },
      _count: { select: { userRoles: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Users & Roles" subtitle="Roles combine into effective permissions. Scope is resolved against real relationships." />
      {roles.map((r) => (
        <Section
          key={r.id}
          title={r.name}
          action={
            <span className="flex items-center gap-2">
              {r.isSystem ? <Badge color="slate">System</Badge> : <Badge color="green">Custom</Badge>}
              <span className="text-xs text-slate-500">{r._count.userRoles} user(s)</span>
            </span>
          }
        >
          <p className="mb-3 text-sm text-slate-500">{r.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {r.permissions.length === 0 && <span className="text-xs text-slate-400">No permissions granted.</span>}
            {r.permissions.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                <span className="font-medium text-slate-700">{p.module}.{p.resource}.{p.action}</span>
                <Badge color={scopeColor[p.scope] ?? "slate"}>{p.scope}</Badge>
              </span>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}
