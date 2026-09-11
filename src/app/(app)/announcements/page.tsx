import { getAuthContext } from "@/lib/auth/context";
import { assertCan } from "@/lib/permissions/engine";
import { db } from "@/lib/db";
import { PageHeader, Empty, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import type { Prisma } from "@prisma/client";

export default async function AnnouncementsPage() {
  const ctx = (await getAuthContext())!;
  assertCan(ctx, "announcements", "announcement", "view");

  // Everyone sees ALL_USERS; role/section/audience narrowing applied per user.
  const or: Prisma.AnnouncementWhereInput[] = [{ audience: "ALL_USERS" }, { audience: "PUBLIC" }];
  if (ctx.teacherId) or.push({ audience: "TEACHERS" }, { audience: "STAFF" });
  if (ctx.studentId) or.push({ audience: "STUDENTS" });
  if (ctx.guardianId) or.push({ audience: "PARENTS" });
  const secIds = [...new Set([...ctx.studentSectionIds, ...ctx.assignedSectionIds, ...ctx.classTeacherSectionIds])];
  if (secIds.length) or.push({ audience: "SECTION", sectionId: { in: secIds } });
  ctx.roleKeys.forEach((rk) => or.push({ audience: "ROLE", roleKey: rk }));

  const items = await db.announcement.findMany({
    where: { schoolId: ctx.schoolId, OR: or },
    orderBy: [{ priority: "desc" }, { publishAt: "desc" }],
  });

  return (
    <div>
      <PageHeader title="Announcements" />
      {items.length === 0 ? (
        <Empty>No announcements for you right now.</Empty>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <article key={a.id} className="card p-4">
              <div className="flex items-center gap-2">
                {a.priority > 0 && <Badge color="red">Important</Badge>}
                <Badge color="slate">{a.audience}</Badge>
                <span className="ml-auto text-xs text-slate-400">{fmtDate(a.publishAt)}</span>
              </div>
              <h2 className="mt-1 font-semibold">{a.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{a.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
