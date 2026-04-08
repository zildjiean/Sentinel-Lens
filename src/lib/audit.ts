export async function logAudit(action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) {
  try {
    await fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, entity_type: entityType, entity_id: entityId, details }),
    });
  } catch {
    // Audit logging should never block operations
  }
}
