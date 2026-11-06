/**
 * IntelliSync core engine — pure, framework-agnostic logic.
 * Persistence lives in ./client.ts; this file has no I/O so it is portable and testable.
 *
 * Layers:
 *  - IntelliSync: this engine (events, retry, reconciliation, health).
 *  - MySync: employee-facing view over a user's own connections/events.
 *  - Company Sync: admin-facing management of all connections.
 *  - Central Authorization: decides who may emit/handle events (see canEmit).
 */

export type ConnectionStatus = "not_connected" | "healthy" | "degraded" | "failed";
export type EventStatus = "pending" | "processing" | "succeeded" | "failed" | "dead";

export const SYNC_EVENT_TYPES = [
  "user.created", "user.updated", "user.offboarded",
  "device.assigned", "device.unassigned",
  "group.membership_changed", "role.changed",
  "license.assigned", "license.revoked",
  "ticket.created", "ticket.updated",
] as const;
export type SyncEventType = (typeof SYNC_EVENT_TYPES)[number];

export type SyncEvent = {
  id: string;
  connection_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  payload: unknown;
  status: EventStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string | null;
};

/** Exponential backoff: 30s, 60s, 120s ... capped at 1h. */
export function backoffMs(attempts: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 3_600_000);
}

/** State transition after a handler attempt. */
export function nextState(ev: Pick<SyncEvent, "attempts" | "max_attempts">, ok: boolean, now = Date.now()) {
  const attempts = ev.attempts + 1;
  if (ok) return { status: "succeeded" as const, attempts, next_attempt_at: new Date(now).toISOString() };
  if (attempts >= ev.max_attempts) return { status: "dead" as const, attempts, next_attempt_at: new Date(now).toISOString() };
  return { status: "failed" as const, attempts, next_attempt_at: new Date(now + backoffMs(attempts)).toISOString() };
}

/** Health derived from recent event outcomes. */
export function deriveHealth(recent: { status: EventStatus }[]): ConnectionStatus {
  if (recent.length === 0) return "not_connected";
  const bad = recent.filter((e) => e.status === "failed" || e.status === "dead").length;
  const ratio = bad / recent.length;
  if (ratio === 0) return "healthy";
  return ratio < 0.25 ? "degraded" : "failed";
}

/** Events due for processing or retry. */
export function dueEvents<T extends Pick<SyncEvent, "status" | "next_attempt_at">>(events: T[], now = Date.now()): T[] {
  return events.filter((e) => (e.status === "pending" || e.status === "failed") && Date.parse(e.next_attempt_at) <= now);
}

export type Role = "admin" | "it_staff" | "employee";
/** Central Authorization hook: who may emit which events. */
export function canEmit(roles: Role[], type: SyncEventType): boolean {
  if (roles.includes("admin")) return true;
  if (roles.includes("it_staff")) return !type.startsWith("role.");
  return type.startsWith("ticket.");
}

export type SyncHandler = (ev: SyncEvent) => Promise<void>;
/** Module registry: modules register handlers per connection id. */
export const handlers = new Map<string, SyncHandler>();
export function registerHandler(connectionId: string, h: SyncHandler) {
  handlers.set(connectionId, h);
}
