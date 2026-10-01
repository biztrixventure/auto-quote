import { db } from "./db";

export async function audit(
  actor: string,
  action: string,
  entity: string,
  entityId: string,
  detail?: unknown
) {
  try {
    await db.auditLog.create({
      data: {
        actor,
        action,
        entity,
        entityId,
        detail: detail === undefined ? null : JSON.stringify(detail).slice(0, 4000),
      },
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}
