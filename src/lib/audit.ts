import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";

interface AuditInput {
  action: string; // create | update | delete | publish | approve | grant | ...
  module: string;
  resource: string;
  recordId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

// Write an immutable audit entry. Audit rows are never updated or deleted by
// application code.
export async function audit(ctx: AuthContext, input: AuditInput) {
  await db.auditLog.create({
    data: {
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      actorName: ctx.name,
      action: input.action,
      module: input.module,
      resource: input.resource,
      recordId: input.recordId,
      summary: input.summary,
      before: input.before === undefined ? undefined : (input.before as object),
      after: input.after === undefined ? undefined : (input.after as object),
      ip: input.ip,
    },
  });
}
