import { getAuthContext } from "@/lib/auth/context";
import { assertCan } from "@/lib/permissions/engine";
import { db } from "@/lib/db";
import { PageHeader, Empty, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/dates";

export default async function ActivitiesPage() {
  const ctx = (await getAuthContext())!;
  assertCan(ctx, "activities", "activity", "view");

  const activities = await db.activity.findMany({
    where: { schoolId: ctx.schoolId },
    include: { coordinator: true, _count: { select: { participants: true } } },
    orderBy: { startDate: "desc" },
  });

  return (
    <div>
      <PageHeader title="Activities" subtitle="Clubs, sports, competitions & events" />
      {activities.length === 0 ? (
        <Empty>No activities have been created yet.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((a) => (
            <article key={a.id} className="card p-4">
              <div className="mb-1 flex items-center gap-2">
                <Badge color="blue">{a.kind}</Badge>
                {a.consentRequired && <Badge color="amber">Consent required</Badge>}
              </div>
              <h2 className="font-semibold">{a.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{a.description}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Coordinator: {a.coordinator.firstName} {a.coordinator.lastName}</span>
                <span>{a._count.participants} participants</span>
                {a.venue && <span>Venue: {a.venue}</span>}
                {a.startDate && <span>{fmtDate(a.startDate)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
