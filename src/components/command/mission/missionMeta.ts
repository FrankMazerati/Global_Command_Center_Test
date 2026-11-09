import type { Checkpoint, CommandState, Mission, MissionEventType } from "@/lib/domain/types";
import { PENDING_REASON_LABEL } from "@/lib/domain/format";
import { STAR_RULES } from "@/lib/domain/recognition";
import { completionBlockers, missionProgress } from "@/lib/domain/selectors";
import type { Tone } from "@/components/command/ui";

/**
 * Shared, derived facts about a mission.
 *
 * Everything here reads recorded state or the mission trail. Nothing invents an event: if a
 * stage has no timestamp in the record it is reported as "not recorded".
 */

export interface StageEntry {
  label: string;
  at: string | null;
}

export function trailAt(mission: Mission, type: MissionEventType): string | null {
  const event = mission.trail.find((entry) => entry.type === type);
  return event?.at ?? null;
}

/** The five stages the product refuses to collapse, in the order they are recorded. */
export function stageEntries(mission: Mission): StageEntry[] {
  return [
    { label: "Offered", at: trailAt(mission, "mission.assigned") },
    { label: "Viewed", at: trailAt(mission, "mission.viewed") },
    { label: "Accepted", at: mission.acceptedAt },
    { label: "Work started", at: mission.startedAt },
    { label: "Resolved", at: mission.resolution?.recordedAt ?? null },
    { label: "Completed", at: trailAt(mission, "mission.completed") },
    { label: "Closed", at: mission.closedAt },
  ];
}

export interface AwardView {
  label: string;
  stars: number;
  xp: number;
}

export function checkpointAward(checkpoint: Checkpoint): AwardView {
  const rule = STAR_RULES[checkpoint.starRule];
  return { label: rule.label, stars: rule.stars, xp: rule.xp };
}

export function awardText(award: AwardView): string {
  return `+${award.stars} star${award.stars === 1 ? "" : "s"}, +${award.xp} XP`;
}

export function displayName(state: CommandState, userId: string | null): string {
  if (!userId) return "Not recorded";
  const user = state.users.find((entry) => entry.id === userId);
  return user ? user.name : userId;
}

export const EVENT_LABEL: Record<MissionEventType, string> = {
  "mission.received": "Received",
  "mission.assigned": "Offered",
  "mission.viewed": "Viewed",
  "mission.accepted": "Accepted",
  "mission.declined": "Declined",
  "mission.started": "Work started",
  "mission.checkpoint": "Checkpoint",
  "mission.pending": "Pending",
  "mission.resumed": "Resumed",
  "mission.escalated": "Escalated",
  "mission.resolved": "Resolved",
  "mission.completed": "Completed",
  "mission.closed": "Closed",
  "mission.document": "Document",
  "mission.note": "Note",
  "mission.paused": "Paused",
  "mission.help_requested": "Help requested",
  "mission.task_assigned": "Task assigned",
  "mission.transferred": "Transferred",
  "mission.review_submitted": "Submitted for review",
  "mission.signed_off": "Signed off",
  "recognition.star": "Stars",
  "recognition.xp": "XP",
  "recognition.level": "Level",
  "recognition.badge": "Badge",
};

export const EVENT_TONE: Record<MissionEventType, Tone> = {
  "mission.received": "neutral",
  "mission.assigned": "info",
  "mission.viewed": "neutral",
  "mission.accepted": "info",
  "mission.declined": "warning",
  "mission.started": "accent",
  "mission.checkpoint": "info",
  "mission.pending": "warning",
  "mission.resumed": "accent",
  "mission.escalated": "danger",
  "mission.resolved": "success",
  "mission.completed": "success",
  "mission.closed": "neutral",
  "mission.document": "info",
  "mission.note": "neutral",
  "mission.paused": "warning",
  "mission.help_requested": "warning",
  "mission.task_assigned": "info",
  "mission.transferred": "warning",
  "mission.review_submitted": "info",
  "mission.signed_off": "success",
  "recognition.star": "success",
  "recognition.xp": "success",
  "recognition.level": "accent",
  "recognition.badge": "accent",
};

export interface Recommendation {
  label: string;
  detail: string;
  tone: Tone;
}

/** A suggestion for the technician, derived from the recorded state. Never presented as done. */
export function nextRecommendedAction(mission: Mission): Recommendation {
  const open = mission.checkpoints.find((checkpoint) => checkpoint.state === "in_progress");
  const next = open ?? mission.checkpoints.find((checkpoint) => checkpoint.state === "not_started");
  switch (mission.status) {
    case "available":
    case "assigned":
      return {
        label: "Review, then decide",
        detail: `${mission.number} is unaccepted. Reading the briefing records a view — it does not accept the mission.`,
        tone: "accent",
      };
    case "accepted":
      return {
        label: "Start work",
        detail:
          "Acceptance is recorded. Starting work is a separate event that opens the first checkpoint.",
        tone: "info",
      };
    case "in_progress":
      return next
        ? {
            label: `Record checkpoint ${next.order}`,
            detail: `${next.title} — expected: ${next.expectedResult}`,
            tone: "info",
          }
        : {
            label: "Record the resolution",
            detail: "Every checkpoint has an outcome; the resolution record is the next step.",
            tone: "warning",
          };
    case "pending": {
      const reason = mission.pending
        ? (PENDING_REASON_LABEL[mission.pending.reason] ?? "Dependency")
        : "Dependency";
      return {
        label: "Check the dependency",
        detail: mission.pending
          ? `${reason} — ${mission.pending.note}`
          : "The mission is waiting on an external dependency.",
        tone: "warning",
      };
    }
    case "escalated":
      return {
        label: "Track the escalation",
        detail: `${mission.escalation?.receivingTeam ?? "Receiving team"} · acknowledgement ${
          mission.escalation?.acknowledgedAt ? "recorded" : "not yet recorded"
        }. The full trail travels with the ticket.`,
        tone: "danger",
      };
    case "resolved": {
      const blockers = completionBlockers(mission).length;
      return blockers === 0
        ? {
            label: "Complete the mission",
            detail:
              "Resolution is recorded and every requirement is met. Completion is its own event.",
            tone: "success",
          }
        : {
            label: `Clear ${blockers} completion requirement${blockers === 1 ? "" : "s"}`,
            detail: "Completion stays blocked until each recorded requirement is satisfied.",
            tone: "warning",
          };
    }
    case "completed":
      return {
        label: "Close the ticket",
        detail: "Closure is a separate step after completion and requester confirmation.",
        tone: "success",
      };
    case "closed":
      return {
        label: "No action required",
        detail: "The ticket is closed. The trail stays available and read-only.",
        tone: "neutral",
      };
  }
}

/** Mission progress expressed for a header line without implying accomplishment. */
export function progressLine(mission: Mission): string {
  const progress = missionProgress(mission);
  return `${progress.done} of ${progress.total} checkpoints have a recorded outcome`;
}

/** Converts an `<input type="date">` value into an ISO timestamp without inventing a time zone. */
export function isoFromDateInput(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(`${value}T17:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
