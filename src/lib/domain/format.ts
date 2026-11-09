import type { MissionPriority, MissionStatus, CheckpointState, ISODate } from "./types";

let counter = 0;

/** Monotonic id so every records keeps a stable, readable identifier. */
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function parseDate(value: ISODate): Date {
  return new Date(value);
}

export function formatTime(value: ISODate): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
    parseDate(value),
  );
}

export function formatDate(value: ISODate): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDate(value));
}

export function formatDateTime(value: ISODate): string {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function relativeTime(value: ISODate): string {
  const diffMs = parseDate(value).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 36) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return formatDate(value);
}

export function dueLabel(value: ISODate | null): string {
  if (!value) return "No deadline";
  const diffMs = parseDate(value).getTime() - Date.now();
  if (diffMs < 0) return `${relativeTime(value)} · overdue`;
  return `Due ${relativeTime(value)}`;
}

export function isOverdue(value: ISODate | null): boolean {
  if (!value) return false;
  return parseDate(value).getTime() < Date.now();
}

export function slaRemaining(value: ISODate): {
  label: string;
  minutes: number;
  tone: "danger" | "warning" | "ok";
} {
  const minutes = Math.round((parseDate(value).getTime() - Date.now()) / 60_000);
  if (minutes < 0) return { label: `${Math.abs(minutes)} min past SLA`, minutes, tone: "danger" };
  if (minutes < 120) return { label: `${minutes} min left`, minutes, tone: "danger" };
  if (minutes < 480)
    return { label: `${Math.round(minutes / 60)} h left`, minutes, tone: "warning" };
  return { label: `${Math.round(minutes / 60)} h left`, minutes, tone: "ok" };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUsd(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export const PRIORITY_TONE: Record<MissionPriority, "danger" | "warning" | "info" | "neutral"> = {
  P1: "danger",
  P2: "warning",
  P3: "info",
  P4: "neutral",
};

export const STATUS_LABEL: Record<MissionStatus, string> = {
  available: "Available",
  assigned: "Assigned",
  accepted: "Accepted",
  in_progress: "In progress",
  pending: "Pending",
  escalated: "Escalated",
  resolved: "Resolved · awaiting review",
  completed: "Completed",
  closed: "Closed",
};

export const STATUS_TONE: Record<
  MissionStatus,
  "danger" | "warning" | "info" | "success" | "neutral" | "accent"
> = {
  available: "accent",
  assigned: "info",
  accepted: "info",
  in_progress: "info",
  pending: "warning",
  escalated: "danger",
  resolved: "warning",
  completed: "success",
  closed: "neutral",
};

export const CHECKPOINT_LABEL: Record<CheckpointState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  pending_authorization: "Pending authorization",
  waiting_on_person: "Waiting on another person",
  pending_verification: "Pending verification",
  blocked: "Blocked",
  completed: "Completed",
  unsuccessful: "Unsuccessful",
  skipped: "Skipped",
  escalation_required: "Needs escalation",
};

export const CHECKPOINT_TONE: Record<
  CheckpointState,
  "neutral" | "info" | "success" | "danger" | "warning"
> = {
  not_started: "neutral",
  in_progress: "info",
  pending_authorization: "warning",
  waiting_on_person: "warning",
  pending_verification: "info",
  blocked: "danger",
  completed: "success",
  unsuccessful: "danger",
  skipped: "warning",
  escalation_required: "danger",
};

export const DECLINE_REASON_LABEL: Record<string, string> = {
  outside_skill_set: "Outside my skill set",
  incorrect_assignment: "Incorrect assignment",
  access_unavailable: "Required access unavailable",
  workload_conflict: "Workload or availability conflict",
  another_department: "Requires another department",
  other: "Other",
};

export const PENDING_REASON_LABEL: Record<string, string> = {
  awaiting_requester: "Awaiting requester information",
  awaiting_provider: "Awaiting external provider",
  awaiting_action: "Awaiting an authorized action",
  awaiting_approval: "Awaiting approval",
  scheduled: "Scheduled work",
  other: "Other dependency",
};

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
