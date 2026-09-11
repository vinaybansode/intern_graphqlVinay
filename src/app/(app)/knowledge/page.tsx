import { getAuthContext } from "@/lib/auth/context";
import { assertCan, hasSchoolWide } from "@/lib/permissions/engine";
import { db } from "@/lib/db";
import { PageHeader, Empty, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import type { Audience } from "@prisma/client";

// Which article audiences this user is allowed to see, derived from real
// relationships (teacher/student/parent/staff), not a bare role string.
function allowedAudiences(ctx: { teacherId: string | null; studentId: string | null; guardianId: string | null; roleKeys: string[] }, admin: boolean): Audience[] {
  const a = new Set<Audience>(["PUBLIC", "ALL_USERS"]);
  if (ctx.teacherId) { a.add("TEACHERS"); a.add("STAFF"); }
  if (ctx.studentId) a.add("STUDENTS");
  if (ctx.guardianId) a.add("PARENTS");
  if (admin) { a.add("ADMIN_ONLY"); a.add("STAFF"); a.add("TEACHERS"); a.add("STUDENTS"); a.add("PARENTS"); }
  return [...a];
}

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = (await getAuthContext())!;
  assertCan(ctx, "knowledge", "articles", "view");
  const sp = await searchParams;

  const admin = hasSchoolWide(ctx, "knowledge", "articles", "edit");
  const audiences = allowedAudiences(ctx, admin);

  const articles = await db.knowledgeArticle.findMany({
    where: {
      schoolId: ctx.schoolId,
      status: "PUBLISHED",
      audience: { in: audiences },
      ...(sp.q ? { OR: [{ title: { contains: sp.q } }, { body: { contains: sp.q } }, { tags: { contains: sp.q } }] } : {}),
    },
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Knowledge Base" subtitle="School policies, handbooks & resources" />
      <form className="mb-4 flex gap-2" action="/knowledge" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search articles…" className="input max-w-sm" />
        <button className="btn-ghost" type="submit">Search</button>
      </form>

      {articles.length === 0 ? (
        <Empty>No articles are available to your role{sp.q ? " for this search" : ""}.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((a) => (
            <article key={a.id} className="card p-4">
              <div className="mb-1 flex items-center gap-2">
                {a.category && <Badge color="blue">{a.category.name}</Badge>}
                <Badge color="slate">{a.audience}</Badge>
              </div>
              <h2 className="font-semibold text-slate-900">{a.title}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-slate-600">{a.body}</p>
              <div className="mt-2 text-xs text-slate-400">Updated {fmtDate(a.updatedAt)} · v{a.version}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
