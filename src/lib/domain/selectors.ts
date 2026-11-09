import type {
  CommandState,
  ISODate,
  LedgerEntry,
  Mission,
  MissionPriority,
  RecognitionStats,
  Task,
  User,
  WorkTargetType,
} from "./types";
import {
  BADGES,
  nextLevel,
  levelForXp,
  recognitionStats,
  totalStars,
  totalXp,
} from "./recognition";
import { STATUS_LABEL, STATUS_TONE, dueLabel, isOverdue } from "./format";

export type Tone = "danger" | "warning" | "info" | "success" | "neutral" | "accent";

export function activeUser(state: CommandState): User {
  return state.users.find((user) => user.id === state.activeUserId) ?? state.users[0]!;
}

export function missionById(state: CommandState, missionId: string): Mission | undefined {
  return state.missions.find((mission) => mission.id === missionId);
}

export function newestFirst<T>(rows: T[]): T[] {
  const timeOf = (row: T): number => {
    const record = row as { at?: ISODate; submittedAt?: ISODate; createdAt?: ISODate };
    return new Date(record.at ?? record.submittedAt ?? record.createdAt ?? 0).getTime();
  };
  return [...rows].sort((a, b) => timeOf(b) - timeOf(a));
}

export function incomingMissions(state: CommandState, userId: string): Mission[] {
  return newestFirst(
    state.missions.filter(
      (mission) =>
        mission.offeredTo === userId &&
        (mission.status === "available" || mission.status === "assigned"),
    ),
  );
}

export function activeMissions(state: CommandState, userId: string): Mission[] {
  return newestFirst(
    state.missions.filter(
      (mission) =>
        mission.acceptedBy === userId &&
        ["accepted", "in_progress", "pending", "escalated", "resolved"].includes(mission.status),
    ),
  );
}

export function missionShell(
  state: CommandState,
  userId: string,
): Record<Mission["status"], Mission[]> {
  const owned = state.missions.filter(
    (mission) => mission.offeredTo === userId || mission.acceptedBy === userId,
  );
  return {
    available: newestFirst(owned.filter((mission) => mission.status === "available")),
    assigned: newestFirst(owned.filter((mission) => mission.status === "assigned")),
    accepted: newestFirst(owned.filter((mission) => mission.status === "accepted")),
    in_progress: newestFirst(owned.filter((mission) => mission.status === "in_progress")),
    pending: newestFirst(owned.filter((mission) => mission.status === "pending")),
    escalated: newestFirst(owned.filter((mission) => mission.status === "escalated")),
    resolved: newestFirst(owned.filter((mission) => mission.status === "resolved")),
    completed: newestFirst(owned.filter((mission) => mission.status === "completed")),
    closed: newestFirst(owned.filter((mission) => mission.status === "closed")),
  };
}

export function missionProgress(mission: Mission): {
  done: number;
  total: number;
  percent: number;
  open: number;
} {
  const total = mission.checkpoints.length;
  const done = mission.checkpoints.filter((checkpoint) =>
    ["completed", "skipped"].includes(checkpoint.state),
  ).length;
  const open = mission.checkpoints.filter((checkpoint) =>
    ["not_started", "in_progress", "escalation_required"].includes(checkpoint.state),
  ).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100), open };
}

export function missionLedger(state: CommandState, missionId: string): LedgerEntry[] {
  return state.ledger.filter(
    (entry) =>
      entry.sourceId === missionId ||
      entry.sourceId.startsWith(`cp-${missionId}-`) ||
      entry.sourceLabel.startsWith(missionId),
  );
}

export function missionStars(state: CommandState, missionId: string): number {
  return totalStars(missionLedger(state, missionId));
}

export function missionXp(state: CommandState, missionId: string): number {
  return totalXp(missionLedger(state, missionId));
}

export interface CompletionBlocker {
  field: string;
  message: string;
}

/** The configured requirements a mission must satisfy before it can be completed. */
export function completionBlockers(mission: Mission): CompletionBlocker[] {
  const blockers: CompletionBlocker[] = [];
  const open = mission.checkpoints.filter(
    (checkpoint) => !["completed", "skipped"].includes(checkpoint.state),
  );
  if (open.length > 0) {
    blockers.push({
      field: "checkpoints",
      message: `${open.length} checkpoint${open.length === 1 ? "" : "s"} still open. Every checkpoint needs a recorded outcome.`,
    });
  }
  if (!mission.resolution) {
    blockers.push({
      field: "resolution",
      message: "Record the resolution before completing the mission.",
    });
    if (mission.missionRef) {
      if (!mission.reviewSubmittedAt)
        blockers.push({
          field: "review",
          message: "Submit the mission for final review before it can be completed.",
        });
      if (!mission.signoff)
        blockers.push({
          field: "signoff",
          message: "Final signoff from the approver is still required.",
        });
    }
    return blockers;
  }
  if (mission.resolution.rootCause.trim().length < 8)
    blockers.push({ field: "rootCause", message: "Root cause is required." });
  if (mission.resolution.workPerformed.trim().length < 8)
    blockers.push({ field: "workPerformed", message: "Work performed is required." });
  if (mission.resolution.resolution.trim().length < 8)
    blockers.push({ field: "resolution", message: "Resolution summary is required." });
  if (mission.resolution.verification.trim().length < 8)
    blockers.push({ field: "verification", message: "Verification is required." });
  if (mission.missionRef) {
    if (!mission.reviewSubmittedAt) {
      blockers.push({
        field: "review",
        message: "Submit the mission for final review before it can be completed.",
      });
    }
    if (!mission.signoff) {
      blockers.push({
        field: "signoff",
        message: "Final signoff from the approver is still required.",
      });
    }
  }
  return blockers;
}

export interface WorkItem {
  id: string;
  source: string;
  sourceType: WorkTargetType | "connector" | "approval" | "signature";
  targetId: string;
  title: string;
  description: string;
  statusLabel: string;
  tone: Tone;
  priority: MissionPriority | null;
  dueAt: ISODate | null;
  overdue: boolean;
  requiredAction: string;
  receivedAt: ISODate;
  section: "new" | "accepted" | "tasks" | "approvals" | "documents" | "followups";
  missionId: string | null;
}

function taskToWorkItem(task: Task): WorkItem {
  const tone: Tone =
    task.status === "blocked"
      ? "danger"
      : task.priority === "P1"
        ? "danger"
        : task.priority === "P2"
          ? "warning"
          : task.priority === "P3"
            ? "info"
            : "neutral";
  return {
    id: `work-task-${task.id}`,
    source: task.source === "assigned" ? `Task · assigned by ${task.sourceLabel}` : "Task",
    sourceType: "task",
    targetId: task.id,
    title: task.title,
    description: task.detail,
    statusLabel:
      task.status === "in_progress"
        ? "In progress"
        : task.status === "blocked"
          ? "Blocked"
          : task.status === "done"
            ? "Done"
            : "Open",
    tone,
    priority: task.priority === "none" ? null : task.priority,
    dueAt: task.dueAt,
    overdue: task.status !== "done" && isOverdue(task.dueAt),
    requiredAction:
      task.status === "blocked"
        ? "Resolve the blocker"
        : task.status === "done"
          ? "No action"
          : "Work the task",
    receivedAt: task.createdAt,
    section: task.status === "done" ? "followups" : "tasks",
    missionId: task.missionId,
  };
}

/** Everything that is genuinely waiting on the signed-in user, from real records only. */
export function workQueue(state: CommandState, userId: string): WorkItem[] {
  const items: WorkItem[] = [];

  for (const mission of incomingMissions(state, userId)) {
    const isNew = mission.status === "available";
    items.push({
      id: `work-mission-${mission.id}`,
      source: `IntelliDesk · ${mission.assignedTeam}`,
      sourceType: "mission",
      targetId: mission.id,
      title: mission.title,
      description: mission.description.split(".")[0] ?? mission.description,
      statusLabel: STATUS_LABEL[mission.status],
      tone: STATUS_TONE[mission.status],
      priority: mission.priority,
      dueAt: mission.slaDueAt,
      overdue: isOverdue(mission.slaDueAt),
      requiredAction: isNew ? "Review and accept or decline" : "Accept to start work",
      receivedAt: mission.submittedAt,
      section: "new",
      missionId: mission.id,
    });
  }

  for (const mission of activeMissions(state, userId)) {
    const progress = missionProgress(mission);
    items.push({
      id: `work-mission-${mission.id}`,
      source: `IntelliDesk · ${mission.acceptedBy === userId ? "accepted by you" : mission.assignedTeam}`,
      sourceType: "mission",
      targetId: mission.id,
      title: mission.title,
      description:
        mission.status === "pending"
          ? (mission.pending?.note ?? "Mission is waiting on a dependency.")
          : `${progress.done} of ${progress.total} checkpoints recorded.`,
      statusLabel: STATUS_LABEL[mission.status],
      tone: STATUS_TONE[mission.status],
      priority: mission.priority,
      dueAt: mission.slaDueAt,
      overdue: isOverdue(mission.slaDueAt) && mission.status !== "resolved",
      requiredAction:
        mission.status === "accepted"
          ? "Start work and record the first checkpoint"
          : mission.status === "pending"
            ? "Check the dependency"
            : mission.status === "escalated"
              ? "Track the escalation"
              : "Continue the mission",
      receivedAt: mission.submittedAt,
      section:
        mission.status === "pending" || mission.status === "escalated" ? "followups" : "accepted",
      missionId: mission.id,
    });
  }

  for (const task of state.tasks) {
    if (task.status === "done") continue;
    items.push(taskToWorkItem(task));
  }

  for (const approval of state.approvals) {
    if (approval.status !== "pending" && approval.status !== "escalated") continue;
    items.push({
      id: `work-approval-${approval.id}`,
      source: "Approvals · Help Buddy",
      sourceType: "approval",
      targetId: approval.id,
      title: approval.title,
      description: approval.summary,
      statusLabel: approval.status === "pending" ? `Level ${approval.level} approval` : "Escalated",
      tone: approval.status === "escalated" ? "danger" : "warning",
      priority: approval.level === 3 ? "P2" : "P3",
      dueAt: approval.dueAt,
      overdue: isOverdue(approval.dueAt),
      requiredAction: approval.status === "pending" ? "Decide" : "Review the escalation",
      receivedAt: approval.createdAt,
      section: "approvals",
      missionId: approval.missionId,
    });
  }

  for (const signature of state.signatures) {
    if (signature.status !== "awaiting_signature") continue;
    items.push({
      id: `work-signature-${signature.id}`,
      source: "Signatures · Help Buddy",
      sourceType: "signature",
      targetId: signature.id,
      title: `Signature required · ${signature.documentName}`,
      description: signature.note,
      statusLabel: "Awaiting signature",
      tone: "info",
      priority: "P3",
      dueAt: signature.dueAt,
      overdue: isOverdue(signature.dueAt),
      requiredAction: "Review and sign",
      receivedAt: signature.requestedAt,
      section: "documents",
      missionId: null,
    });
  }

  for (const action of state.documentActions) {
    if (action.target.type !== "mission") continue;
    items.push({
      id: `work-document-${action.id}`,
      source: `Document · ${action.target.label}`,
      sourceType: "mission",
      targetId: action.target.id,
      title: action.documentName,
      description:
        action.mode === "imported"
          ? "Managed copy imported into the workspace."
          : "Linked original — permissions stay with the source.",
      statusLabel: action.mode === "imported" ? "Imported copy" : "Linked original",
      tone: "info",
      priority: "P4",
      dueAt: null,
      overdue: false,
      requiredAction: "Open the document",
      receivedAt: action.at,
      section: "documents",
      missionId: action.target.type === "mission" ? action.target.id : null,
    });
  }

  return newestFirst(items);
}

export interface RecognitionSummary {
  userId: string;
  stars: number;
  xp: number;
  level: number;
  levelName: string;
  nextLevelName: string | null;
  nextLevelXp: number | null;
  xpToNext: number;
  progress: number;
  stats: RecognitionStats;
  badges: { id: string; name: string; stage: string; earnedAt: ISODate; description: string }[];
  levelHistory: { level: number; at: ISODate }[];
}

export function recognitionSummary(state: CommandState, userId: string): RecognitionSummary {
  const ledger = state.ledger.filter((entry) => entry.actorId === userId);
  const xp = totalXp(ledger);
  const stars = totalStars(ledger);
  const current = levelForXp(xp);
  const upcoming = nextLevel(xp);
  const badgeEntries = ledger.filter((entry) => entry.kind === "badge");
  const stats = recognitionStats(state, userId);
  const xpToNext = upcoming ? Math.max(0, upcoming.minXp - xp) : 0;
  const span = upcoming ? upcoming.minXp - current.minXp : 1;
  return {
    userId,
    stars,
    xp,
    level: current.level,
    levelName: current.name,
    nextLevelName: upcoming?.name ?? null,
    nextLevelXp: upcoming?.minXp ?? null,
    xpToNext,
    progress: upcoming ? Math.min(100, Math.round(((xp - current.minXp) / span) * 100)) : 100,
    stats,
    badges: badgeEntries.map((entry) => ({
      id: entry.ruleId.replace("badge:", ""),
      name: entry.label,
      stage: BADGES.find((badge) => `badge:${badge.id}` === entry.ruleId)?.stage ?? "bronze",
      earnedAt: entry.at,
      description: entry.evidence,
    })),
    levelHistory: ledger
      .filter((entry) => entry.kind === "level")
      .map((entry) => ({ level: Number(entry.label.replace(/\D/g, "")) || 1, at: entry.at })),
  };
}

export function connectorSummary(state: CommandState): {
  connected: number;
  attention: number;
  available: number;
  syncing: number;
} {
  return {
    connected: state.connectors.filter((connector) => connector.status === "connected").length,
    attention: state.connectors.filter((connector) => connector.status === "attention").length,
    available: state.connectors.filter(
      (connector) => connector.status === "available" || connector.status === "disconnected",
    ).length,
    syncing: state.connectors.filter((connector) => connector.status === "syncing").length,
  };
}

export function documentsFor(connectorId: string, state: CommandState): CommandState["library"] {
  const ids = new Set([connectorId, "workspace-library"]);
  return state.library.filter((document) => ids.has(document.connectorId));
}

export function activityFor(state: CommandState, surface?: string): CommandState["activity"] {
  const rows = surface
    ? state.activity.filter((event) => event.surface === surface)
    : state.activity;
  return [...rows].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function dueSoonCount(state: CommandState, userId: string): number {
  return workQueue(state, userId).filter(
    (item) =>
      item.overdue || (item.dueAt && new Date(item.dueAt).getTime() - Date.now() < 4 * 3_600_000),
  ).length;
}

export function workSummary(
  state: CommandState,
  userId: string,
): { newCount: number; accepted: number; tasks: number; approvals: number; documents: number } {
  const queue = workQueue(state, userId);
  return {
    newCount: queue.filter((item) => item.section === "new").length,
    accepted: queue.filter((item) => item.section === "accepted").length,
    tasks: queue.filter((item) => item.section === "tasks").length,
    approvals: queue.filter((item) => item.section === "approvals").length,
    documents: queue.filter((item) => item.section === "documents").length,
  };
}

export function dueLabelFor(item: WorkItem): string {
  return dueLabel(item.dueAt);
}
