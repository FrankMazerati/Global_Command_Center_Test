import type {
  ActivityEvent,
  Approval,
  CharacterProfile,
  Checklist,
  ChecklistCategory,
  CheckpointState,
  CommandState,
  DeclineReason,
  DocumentActionMode,
  EvidenceRef,
  ISODate,
  LedgerEntry,
  Mission,
  MissionEvent,
  MissionPendingReason,
  MissionPriority,
  ModuleDefinition,
  Note,
  StarRuleId,
  Task,
  TaskStatus,
  WorkTarget,
} from "./types";
import {
  BADGES,
  MISSION_COMPLETION_XP,
  MISSION_COMPLEXITY_XP,
  STAR_RULES,
  awardKey,
  eligibleBadges,
  hasAward,
  levelForXp,
  recognitionStats,
  totalXp,
} from "./recognition";
import { activeUser } from "./selectors";
import { replyTo } from "./assistant";
import { makeId } from "./format";
import { createSeedState } from "./seed";

export type CommandAction =
  | { type: "mission.view"; missionId: string }
  | { type: "mission.accept"; missionId: string }
  | { type: "mission.decline"; missionId: string; reason: DeclineReason; note: string }
  | { type: "mission.start"; missionId: string }
  | {
      type: "checkpoint.update";
      missionId: string;
      checkpointId: string;
      state: CheckpointState;
      actualResult: string;
      skipReason: string;
    }
  | {
      type: "checkpoint.evidence";
      missionId: string;
      checkpointId: string;
      label: string;
      kind: EvidenceRef["kind"];
      documentId: string | null;
    }
  | {
      type: "mission.pending";
      missionId: string;
      reason: MissionPendingReason;
      note: string;
      nextActionAt: string | null;
    }
  | { type: "mission.resume"; missionId: string }
  | {
      type: "mission.escalate";
      missionId: string;
      reason: string;
      expertise: string;
      receivingTeam: string;
    }
  | {
      type: "mission.resolve";
      missionId: string;
      rootCause: string;
      workPerformed: string;
      resolution: string;
      verification: string;
      knowledgeArticleId: string | null;
      finalNotes: string;
    }
  | { type: "mission.complete"; missionId: string }
  | { type: "mission.close"; missionId: string }
  | { type: "mission.note"; missionId: string; body: string; visibility: "internal" | "requester" }
  | {
      type: "checkpoint.assign";
      missionId: string;
      checkpointId: string;
      assigneeId: string;
      assigneeRole: string;
    }
  | { type: "checkpoint.verify"; missionId: string; checkpointId: string; note: string }
  | { type: "mission.pause"; missionId: string; note: string }
  | { type: "mission.requestHelp"; missionId: string; need: string }
  | { type: "mission.transfer"; missionId: string; toUserId: string; note: string }
  | { type: "mission.submitReview"; missionId: string }
  | { type: "mission.signoff"; missionId: string; signerName: string; role: string; note: string }
  | { type: "mission.authorize"; missionId: string; checkpointId: string }
  | { type: "session.actAs"; userId: string }
  | {
      type: "task.create";
      title: string;
      detail: string;
      priority: MissionPriority | "none";
      dueAt: string | null;
      project: string;
    }
  | { type: "task.status"; taskId: string; status: TaskStatus; progressNote: string }
  | { type: "checklist.toggle"; checklistId: string; itemId: string }
  | {
      type: "checklist.create";
      title: string;
      category: ChecklistCategory;
      dueAt: string | null;
      recurring: Checklist["recurring"];
      items: string[];
    }
  | { type: "checklist.item.add"; checklistId: string; text: string }
  | {
      type: "note.save";
      noteId: string | null;
      title: string;
      body: string;
      tags: string[];
      pinned: boolean;
      missionId: string | null;
    }
  | { type: "note.delete"; noteId: string }
  | {
      type: "approval.decide";
      approvalId: string;
      decision: "approve" | "reject" | "escalate";
      note: string;
    }
  | { type: "approval.comment"; approvalId: string; note: string }
  | { type: "signature.sign"; signatureId: string; profileId: string }
  | { type: "signature.decline"; signatureId: string; note: string }
  | { type: "knowledge.save"; articleId: string }
  | { type: "conversation.new" }
  | { type: "conversation.select"; conversationId: string }
  | { type: "conversation.send"; text: string; missionId: string | null }
  | { type: "connector.connect"; connectorId: string }
  | { type: "connector.disconnect"; connectorId: string }
  | { type: "connector.retry"; connectorId: string }
  | { type: "document.action"; documentId: string; mode: DocumentActionMode; target: WorkTarget }
  | { type: "module.install"; moduleId: string }
  | { type: "module.addToHelpBuddy"; moduleId: string }
  | { type: "module.removeFromHelpBuddy"; moduleId: string }
  | {
      type: "character.update";
      characterId: string;
      patch: Partial<Omit<CharacterProfile, "id" | "updatedAt">>;
    }
  | { type: "character.select"; characterId: string }
  | { type: "draft.set"; key: string; value: string }
  | { type: "state.reset" };

export interface ActionResult {
  state: CommandState;
  error: string | null;
}

const now = (): ISODate => new Date().toISOString();
const ok = (state: CommandState): ActionResult => ({ state, error: null });
const fail = (state: CommandState, error: string): ActionResult => ({ state, error });

function logActivity(
  state: CommandState,
  event: Omit<ActivityEvent, "id" | "at" | "actorId" | "actorName">,
): CommandState {
  const actor = activeUser(state);
  const entry: ActivityEvent = {
    id: makeId("act"),
    at: now(),
    actorId: actor.id,
    actorName: actor.name,
    ...event,
  };
  return { ...state, activity: [entry, ...state.activity] };
}

function trailEvent(
  type: MissionEvent["type"],
  summary: string,
  detail: string,
  actorId: string,
  actorName: string,
): MissionEvent {
  return { id: makeId("mev"), at: now(), type, actorId, actorName, summary, detail };
}

function withMission(
  state: CommandState,
  missionId: string,
  updater: (mission: Mission) => Mission,
): CommandState {
  return {
    ...state,
    missions: state.missions.map((mission) =>
      mission.id === missionId ? updater(mission) : mission,
    ),
  };
}

const COMPLETED_STATES: CheckpointState[] = ["completed", "skipped"];

/** Why a task cannot move forward yet. Dependencies, approvals and evidence are all checked. */
export function checkpointBlockers(
  state: CommandState,
  mission: Mission,
  checkpointId: string,
): string[] {
  const checkpoint = mission.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) return ["Task not found."];
  const reasons: string[] = [];
  for (const order of checkpoint.dependsOn ?? []) {
    const dependency = mission.checkpoints.find((item) => item.order === order);
    if (dependency && !COMPLETED_STATES.includes(dependency.state)) {
      reasons.push(
        `Step ${String(order).padStart(2, "0")} · ${dependency.title} must be completed first.`,
      );
    }
  }
  if (checkpoint.requiresApproval && checkpoint.approvalId) {
    const approval = state.approvals.find((item) => item.id === checkpoint.approvalId);
    if (!approval) reasons.push("The authorization request has not been submitted yet.");
    else if (approval.status !== "approved")
      reasons.push(
        `Authorization is ${approval.status}. ${approval.requiredApprover} must decide it.`,
      );
  }
  if (checkpoint.requiredEvidence && checkpoint.evidence.length === 0) {
    reasons.push("Attach the required evidence before completing this step.");
  }
  return reasons;
}

function awardFor(
  mission: Mission,
  checkpoint: Mission["checkpoints"][number],
  state: CommandState,
): AwardInput {
  const level = checkpoint.starLevel;
  if (level) {
    return {
      ruleId: "task_complexity",
      label: `Task completed · ${level} star${level === 1 ? "" : "s"}`,
      stars: level,
      xp: level * 10,
      sourceType: "checkpoint",
      sourceId: checkpoint.id,
      sourceLabel: `${mission.number} · ${checkpoint.title}`,
      evidence: `Step ${String(checkpoint.order).padStart(2, "0")} completed at its recorded difficulty.`,
      keyParts: [mission.id, checkpoint.id],
    };
  }
  const rule = STAR_RULES[checkpoint.starRule];
  void state;
  return {
    ruleId: checkpoint.starRule,
    label: rule.label,
    stars: rule.stars,
    xp: rule.xp,
    sourceType: "checkpoint",
    sourceId: checkpoint.id,
    sourceLabel: `${mission.number} · ${checkpoint.title}`,
    evidence: rule.evidence,
    keyParts: [mission.id, checkpoint.id],
  };
}

/** An approved authorization completes the gated step itself; the technician still does the work. */
function completeAuthorizedCheckpoints(state: CommandState, approvalId: string): CommandState {
  let next = state;
  const awards: AwardInput[] = [];
  for (const mission of state.missions) {
    const linked = mission.checkpoints.filter(
      (item) => item.approvalId === approvalId && item.state === "pending_authorization",
    );
    if (linked.length === 0) continue;
    next = withMission(next, mission.id, (item) => ({
      ...item,
      checkpoints: item.checkpoints.map((entry) =>
        linked.some((target) => target.id === entry.id)
          ? {
              ...entry,
              state: "completed" as CheckpointState,
              completedAt: now(),
              actualResult:
                entry.actualResult || "Authorization approved by the required administrator.",
              verifiedAt: now(),
              verifiedBy: activeUser(state).name,
            }
          : entry,
      ),
      trail: [
        ...item.trail,
        ...linked.map((entry) =>
          trailEvent(
            "mission.checkpoint",
            "Authorization recorded",
            `${entry.title} — the administrator decision was approved, so this step is now recorded as complete.`,
            activeUser(state).id,
            activeUser(state).name,
          ),
        ),
      ],
    }));
    for (const entry of linked) awards.push(awardFor(mission, entry, state));
  }
  if (awards.length === 0) return next;
  return grantAwards(next, awards, activeUser(state).id);
}

interface AwardInput {
  ruleId: string;
  label: string;
  stars: number;
  xp: number;
  sourceType: LedgerEntry["sourceType"];
  sourceId: string;
  sourceLabel: string;
  evidence: string;
  keyParts: string[];
}

/**
 * Applies configured awards once per award key, then re-evaluates levels and badges from the
 * resulting ledger so progression is always derived from recorded work.
 */
function grantAwards(state: CommandState, awards: AwardInput[], actorId: string): CommandState {
  let ledger = state.ledger;
  for (const award of awards) {
    const key = awardKey(award.ruleId, ...award.keyParts);
    if (hasAward(ledger, key)) continue;
    const entry: LedgerEntry = {
      id: makeId("led"),
      at: now(),
      kind: "star",
      ruleId: award.ruleId,
      label: award.label,
      stars: award.stars,
      xp: award.xp,
      sourceType: award.sourceType,
      sourceId: award.sourceId,
      sourceLabel: award.sourceLabel,
      evidence: award.evidence,
      awardKey: key,
      actorId,
    };
    ledger = [entry, ...ledger];
  }

  const beforeXp = totalXp(state.ledger.filter((entry) => entry.actorId === actorId));
  const afterXp = totalXp(ledger.filter((entry) => entry.actorId === actorId));
  const beforeLevel = levelForXp(beforeXp).level;
  const afterLevel = levelForXp(afterXp).level;
  if (afterLevel > beforeLevel) {
    for (let level = beforeLevel + 1; level <= afterLevel; level += 1) {
      const definition = levelForXp(0);
      void definition;
      const levelEntry: LedgerEntry = {
        id: makeId("led"),
        at: now(),
        kind: "level",
        ruleId: "level.up",
        label: `Level ${level}`,
        stars: 0,
        xp: 0,
        sourceType: "system",
        sourceId: `level-${level}`,
        sourceLabel: `Level ${level}`,
        evidence: `Reached level ${level} from accumulated XP.`,
        awardKey: awardKey("level", actorId, String(level)),
        actorId,
      };
      if (!hasAward(ledger, levelEntry.awardKey)) ledger = [levelEntry, ...ledger];
    }
  }

  let next: CommandState = { ...state, ledger };
  const stats = recognitionStats(next, actorId);
  const badges = eligibleBadges(stats, ledger);
  if (badges.length > 0) {
    const badgeEntries: LedgerEntry[] = badges.map((badge) => ({
      id: makeId("led"),
      at: now(),
      kind: "badge",
      ruleId: `badge:${badge.id}`,
      label: badge.name,
      stars: 0,
      xp: 0,
      sourceType: "system",
      sourceId: badge.id,
      sourceLabel: badge.criteria,
      evidence: BADGES.find((entry) => entry.id === badge.id)?.criteria ?? badge.criteria,
      awardKey: awardKey("badge", badge.id),
      actorId,
    }));
    next = { ...next, ledger: [...badgeEntries, ...next.ledger] };
    for (const badge of badges) {
      next = logActivity(next, {
        surface: "recognition",
        type: "recognition.badge",
        summary: `Badge earned · ${badge.name}`,
        detail: `${badge.criteria} — supported by recorded achievements.`,
        targetType: null,
        targetId: badge.id,
        targetLabel: badge.name,
      });
    }
  }

  if (afterLevel > beforeLevel) {
    next = logActivity(next, {
      surface: "recognition",
      type: "recognition.level",
      summary: `Level ${afterLevel} reached`,
      detail: `Accumulated ${afterXp} XP from recorded work.`,
      targetType: null,
      targetId: null,
      targetLabel: `Level ${afterLevel}`,
    });
  }

  const newStars =
    ledger.reduce((sum, entry) => sum + entry.stars, 0) -
    state.ledger.reduce((sum, entry) => sum + entry.stars, 0);
  if (newStars > 0) {
    next = logActivity(next, {
      surface: "recognition",
      type: "recognition.star",
      summary: `+${newStars} star${newStars === 1 ? "" : "s"} recorded`,
      detail: "Awarded from completed checkpoints with a recorded result.",
      targetType: null,
      targetId: null,
      targetLabel: "Recognition ledger",
    });
  }

  return next;
}

export function canDecideApproval(
  approval: Approval,
  user: { name: string; role: string },
): boolean {
  if (approval.status !== "pending" && approval.status !== "escalated") return false;
  if (user.role === "administrator") return true;
  return approval.requiredApprover.toLowerCase().includes(user.name.toLowerCase());
}

function hashOf(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function reduce(state: CommandState, action: CommandAction): ActionResult {
  switch (action.type) {
    case "state.reset":
      return ok(createSeedState());

    case "draft.set":
      return ok({ ...state, drafts: { ...state.drafts, [action.key]: action.value } });

    /* --------------------------------------------------------------- missions */
    case "mission.view": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (mission.trail.some((event) => event.type === "mission.viewed")) return ok(state);
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        trail: [
          ...item.trail,
          trailEvent(
            "mission.viewed",
            "Briefing reviewed",
            "Full mission briefing opened. The mission was not accepted.",
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(next);
    }

    case "mission.accept": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (!["available", "assigned"].includes(mission.status))
        return fail(state, "This mission is no longer available to accept.");
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: "accepted",
        statusChangedAt: now(),
        acceptedBy: user.id,
        acceptedAt: now(),
        trail: [
          ...item.trail,
          trailEvent(
            "mission.accepted",
            "Mission accepted",
            `Accepted by ${user.name}. SLA tracking started under the configured response policy.`,
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.accepted",
          summary: "Mission accepted",
          detail: `${mission.number} · ${mission.title} added to your accepted workload.`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }

    case "mission.decline": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (!["available", "assigned"].includes(mission.status))
        return fail(state, "Only an unaccepted mission can be declined.");
      if (action.note.trim().length < 4)
        return fail(state, "Record a short reason so the routing team can act on it.");
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: "available",
        statusChangedAt: now(),
        offeredTo: "",
        acceptedBy: null,
        acceptedAt: null,
        declines: [
          ...item.declines,
          {
            id: makeId("dec"),
            at: now(),
            technicianId: user.id,
            technicianName: user.name,
            reason: action.reason,
            note: action.note.trim(),
          },
        ],
        trail: [
          ...item.trail,
          trailEvent(
            "mission.declined",
            "Mission declined",
            `Declined by ${user.name}. Reason: ${action.reason.replace(/_/g, " ")} — ${action.note.trim()}. Returned to routing; the ticket remains open.`,
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.declined",
          summary: "Mission declined",
          detail: `${mission.number} returned to routing. The ticket was not resolved or deleted.`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }

    case "mission.start": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (mission.status !== "accepted")
        return fail(state, "The mission must be accepted before work can start.");
      const user = activeUser(state);
      const firstOpen = mission.checkpoints.find(
        (checkpoint) => checkpoint.state === "not_started",
      );
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: "in_progress",
        statusChangedAt: now(),
        startedAt: now(),
        checkpoints: item.checkpoints.map((checkpoint) =>
          firstOpen && checkpoint.id === firstOpen.id
            ? { ...checkpoint, state: "in_progress", startedAt: now(), updatedBy: user.id }
            : checkpoint,
        ),
        trail: [
          ...item.trail,
          trailEvent(
            "mission.started",
            "Work started",
            `Work started by ${user.name}. First checkpoint opened: ${firstOpen?.title ?? "none"}.`,
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.started",
          summary: "Work started",
          detail: `${mission.number} moved to in progress.`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }

    case "checkpoint.update": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      const checkpoint = mission.checkpoints.find((item) => item.id === action.checkpointId);
      if (!checkpoint) return fail(state, "Checkpoint not found.");
      if (!["accepted", "in_progress", "pending"].includes(mission.status)) {
        return fail(
          state,
          "Checkpoints can only be recorded on an accepted, in-progress or pending mission.",
        );
      }
      if (mission.pausedAt)
        return fail(
          state,
          "This mission is paused. Resume it before recording more task outcomes.",
        );
      const needsResult = ["completed", "unsuccessful", "escalation_required"].includes(
        action.state,
      );
      if (needsResult && action.actualResult.trim().length < 4) {
        return fail(
          state,
          "Record the actual result before changing this checkpoint. A checkpoint is not complete because it was displayed.",
        );
      }
      if (
        (action.state === "skipped" || action.state === "blocked") &&
        action.skipReason.trim().length < 4
      ) {
        return fail(state, "A skipped or blocked step needs a recorded reason.");
      }
      if (
        action.state === "waiting_on_person" &&
        !checkpoint.assigneeId &&
        !checkpoint.assigneeRole
      ) {
        return fail(
          state,
          "Assign this step to a person or department before setting it to waiting on another person.",
        );
      }
      if (action.state === "pending_authorization" && !checkpoint.requiresApproval) {
        return fail(state, "This step does not require an authorization decision.");
      }
      if (action.state === "completed") {
        const blockers = checkpointBlockers(state, mission, checkpoint.id);
        if (blockers.length > 0) return fail(state, blockers.join(" "));
        if (checkpoint.assigneeId && checkpoint.assigneeId !== activeUser(state).id) {
          const assignee = state.users.find((user) => user.id === checkpoint.assigneeId);
          return fail(
            state,
            `This task is assigned to ${assignee?.name ?? "another person"}. They record their own outcome; the mission stays with you.`,
          );
        }
      }
      const user = activeUser(state);
      const isCompleted = action.state === "completed";
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: item.status === "accepted" ? "in_progress" : item.status,
        statusChangedAt: item.status === "accepted" ? now() : item.statusChangedAt,
        startedAt: item.startedAt ?? now(),
        checkpoints: item.checkpoints.map((entry) =>
          entry.id === checkpoint.id
            ? {
                ...entry,
                state: action.state,
                actualResult: action.actualResult,
                skipReason: action.skipReason,
                ...(action.state === "blocked" ? { blockedReason: action.skipReason } : {}),
                startedAt: entry.startedAt ?? now(),
                completedAt: isCompleted || action.state === "unsuccessful" ? now() : null,
                ...(isCompleted && !entry.verifiedAt ? { verifiedAt: now() } : {}),
                updatedBy: user.id,
              }
            : entry,
        ),
        trail: [
          ...item.trail,
          trailEvent(
            "mission.checkpoint",
            `Checkpoint ${action.state.replace(/_/g, " ")}`,
            `${checkpoint.title} — ${action.actualResult.trim() || action.skipReason.trim() || "no result recorded"}`,
            user.id,
            user.name,
          ),
        ],
      }));

      if (!isCompleted) return ok(next);
      return ok(grantAwards(next, [awardFor(mission, checkpoint, state)], user.id));
    }

    case "checkpoint.evidence": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      const checkpoint = mission.checkpoints.find((item) => item.id === action.checkpointId);
      if (!checkpoint) return fail(state, "Checkpoint not found.");
      if (action.label.trim().length < 3)
        return fail(state, "Describe the evidence before attaching it.");
      const user = activeUser(state);
      const evidence: EvidenceRef = {
        id: makeId("ev"),
        label: action.label.trim(),
        kind: action.kind,
        documentId: action.documentId,
        addedAt: now(),
      };
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        checkpoints: item.checkpoints.map((entry) =>
          entry.id === checkpoint.id
            ? { ...entry, evidence: [evidence, ...entry.evidence], updatedBy: user.id }
            : entry,
        ),
        trail: [
          ...item.trail,
          trailEvent(
            "mission.note",
            "Evidence attached",
            `${evidence.label} added to ${checkpoint.title}.`,
            user.id,
            user.name,
          ),
        ],
      }));
      const rule = STAR_RULES.evidence_captured;
      return ok(
        grantAwards(
          next,
          [
            {
              ruleId: "evidence_captured",
              label: rule.label,
              stars: rule.stars,
              xp: rule.xp,
              sourceType: "checkpoint",
              sourceId: evidence.id,
              sourceLabel: `${mission.number} · ${checkpoint.title}`,
              evidence: evidence.label,
              keyParts: [mission.id, evidence.id],
            },
          ],
          user.id,
        ),
      );
    }

    case "mission.pending": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (!["accepted", "in_progress"].includes(mission.status))
        return fail(state, "Only active work can be set to pending.");
      if (action.note.trim().length < 4)
        return fail(state, "Record what the mission is waiting on.");
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: "pending",
        statusChangedAt: now(),
        pending: {
          reason: action.reason,
          note: action.note.trim(),
          nextActionAt: action.nextActionAt,
          since: now(),
        },
        trail: [
          ...item.trail,
          trailEvent(
            "mission.pending",
            "Mission set to pending",
            `${action.reason.replace(/_/g, " ")} — ${action.note.trim()}`,
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.pending",
          summary: "Mission set to pending",
          detail: `${mission.number} is waiting on ${action.reason.replace(/_/g, " ")}. It is not treated as completed.`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }

    case "mission.resume": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (mission.status !== "pending") return fail(state, "This mission is not pending.");
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: item.startedAt ? "in_progress" : "accepted",
        statusChangedAt: now(),
        pausedAt: null,
        pending: null,
        trail: [
          ...item.trail,
          trailEvent(
            "mission.resumed",
            "Mission resumed",
            "The dependency cleared and work resumed.",
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.resumed",
          summary: "Mission resumed",
          detail: `${mission.number} returned to active work.`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }

    case "mission.escalate": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (!["accepted", "in_progress", "pending"].includes(mission.status))
        return fail(state, "Only active work can be escalated.");
      if (
        action.reason.trim().length < 8 ||
        action.expertise.trim().length < 3 ||
        action.receivingTeam.trim().length < 3
      ) {
        return fail(
          state,
          "Escalation needs a reason, the expertise required and a receiving team.",
        );
      }
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: "escalated",
        statusChangedAt: now(),
        escalation: {
          reason: action.reason.trim(),
          expertise: action.expertise.trim(),
          receivingTeam: action.receivingTeam.trim(),
          at: now(),
          by: user.id,
          acknowledgedAt: null,
        },
        trail: [
          ...item.trail,
          trailEvent(
            "mission.escalated",
            "Mission escalated",
            `Escalated to ${action.receivingTeam.trim()} requiring ${action.expertise.trim()}. Reason: ${action.reason.trim()}. Full history preserved.`,
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.escalated",
          summary: "Mission escalated",
          detail: `${mission.number} escalated with the complete investigation history.`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }

    case "mission.resolve": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      const missing: string[] = [];
      if (action.rootCause.trim().length < 8) missing.push("root cause");
      if (action.workPerformed.trim().length < 8) missing.push("work performed");
      if (action.resolution.trim().length < 8) missing.push("resolution");
      if (action.verification.trim().length < 8) missing.push("verification");
      if (missing.length > 0)
        return fail(state, `Record the ${missing.join(", ")} before resolving.`);
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: "resolved",
        statusChangedAt: now(),
        resolution: {
          rootCause: action.rootCause.trim(),
          workPerformed: action.workPerformed.trim(),
          resolution: action.resolution.trim(),
          verification: action.verification.trim(),
          knowledgeArticleId: action.knowledgeArticleId,
          finalNotes: action.finalNotes.trim(),
          recordedAt: now(),
          recordedBy: user.id,
        },
        trail: [
          ...item.trail,
          trailEvent(
            "mission.resolved",
            "Resolution recorded",
            `Root cause: ${action.rootCause.trim()} · Verification: ${action.verification.trim()}`,
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.resolved",
          summary: "Resolution recorded",
          detail: `${mission.number} is resolved and awaiting completion review.`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }

    case "mission.complete": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (mission.status !== "resolved")
        return fail(state, "Record the resolution before completing the mission.");
      const openCheckpoints = mission.checkpoints.filter((checkpoint) =>
        ["not_started", "in_progress", "escalation_required"].includes(checkpoint.state),
      );
      if (openCheckpoints.length > 0)
        return fail(
          state,
          `${openCheckpoints.length} checkpoint(s) still need a recorded outcome.`,
        );
      if (!mission.resolution) return fail(state, "Resolution record is missing.");
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: "completed",
        statusChangedAt: now(),
        trail: [
          ...item.trail,
          trailEvent(
            "mission.completed",
            "Mission completed",
            `Completed by ${user.name}. All configured completion requirements satisfied.`,
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        grantAwards(
          next,
          [
            {
              ruleId: "mission_completion",
              label: "Mission completion",
              stars: 0,
              xp: MISSION_COMPLETION_XP[mission.priority],
              sourceType: "mission",
              sourceId: mission.id,
              sourceLabel: mission.number,
              evidence: `Mission completed with a verified resolution (${mission.priority}).`,
              keyParts: [mission.id],
            },
            {
              ruleId: "mission_complexity",
              label: "Mission complexity",
              stars: 0,
              xp: MISSION_COMPLEXITY_XP[mission.priority],
              sourceType: "mission",
              sourceId: mission.id,
              sourceLabel: mission.number,
              evidence: `Complexity weighting for ${mission.priority}.`,
              keyParts: [mission.id],
            },
          ],
          user.id,
        ),
      );
    }

    case "mission.close": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (mission.status !== "completed")
        return fail(state, "Closure follows completion under the configured workflow.");
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: "closed",
        statusChangedAt: now(),
        closedAt: now(),
        trail: [
          ...item.trail,
          trailEvent(
            "mission.closed",
            "Ticket closed",
            "Requester confirmation recorded; closure policy satisfied.",
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.closed",
          summary: "Ticket closed",
          detail: `${mission.number} closed after completion and confirmation.`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }

    case "mission.note": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (action.body.trim().length < 3) return fail(state, "Write the note before saving it.");
      const user = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        internalNotes: [
          {
            id: makeId("note"),
            at: now(),
            authorId: user.id,
            authorName: user.name,
            body: action.body.trim(),
            visibility: action.visibility,
          },
          ...item.internalNotes,
        ],
        trail: [
          ...item.trail,
          trailEvent(
            "mission.note",
            action.visibility === "internal" ? "Internal note added" : "Requester note added",
            action.body.trim(),
            user.id,
            user.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.note",
          summary:
            action.visibility === "internal" ? "Internal note added" : "Requester note added",
          detail: `${mission.number} · ${action.body.trim().slice(0, 90)}`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }

    /* ------------------------------------------------------------------ tasks */
    case "checkpoint.assign": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      const checkpoint = mission.checkpoints.find((item) => item.id === action.checkpointId);
      if (!checkpoint) return fail(state, "Task not found.");
      if (checkpoint.state === "completed") return fail(state, "This step is already complete.");
      const assignee = state.users.find((user) => user.id === action.assigneeId);
      if (!assignee) return fail(state, "Choose a person from the directory.");
      if (!action.assigneeRole.trim())
        return fail(state, "Record the role this task is assigned under.");
      const actor = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        checkpoints: item.checkpoints.map((entry) =>
          entry.id === checkpoint.id
            ? {
                ...entry,
                assigneeId: assignee.id,
                assigneeRole: action.assigneeRole.trim(),
                assignedAt: now(),
                state:
                  entry.state === "not_started"
                    ? ("waiting_on_person" as CheckpointState)
                    : entry.state,
                updatedBy: actor.id,
              }
            : entry,
        ),
        trail: [
          ...item.trail,
          trailEvent(
            "mission.task_assigned",
            "Task assigned",
            `Step ${String(checkpoint.order).padStart(2, "0")} · ${checkpoint.title} assigned to ${assignee.name} (${action.assigneeRole.trim()}). Ownership of the mission stays with ${actor.name}.`,
            actor.id,
            actor.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.task_assigned",
          summary: "Task assigned",
          detail: `${checkpoint.title} → ${assignee.name} · ${action.assigneeRole.trim()}`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }
    case "checkpoint.verify": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      const checkpoint = mission.checkpoints.find((item) => item.id === action.checkpointId);
      if (!checkpoint) return fail(state, "Task not found.");
      if (action.note.trim().length < 4)
        return fail(state, "Record what you verified before confirming this step.");
      const blockers = checkpointBlockers(state, mission, checkpoint.id);
      if (blockers.length > 0) return fail(state, blockers.join(" "));
      const actor = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        checkpoints: item.checkpoints.map((entry) =>
          entry.id === checkpoint.id
            ? {
                ...entry,
                state: "completed" as CheckpointState,
                completedAt: now(),
                verifiedAt: now(),
                verifiedBy: actor.name,
                actualResult: action.note.trim(),
                updatedBy: actor.id,
              }
            : entry,
        ),
        trail: [
          ...item.trail,
          trailEvent(
            "mission.checkpoint",
            "Checkpoint verified",
            `${checkpoint.title} — ${action.note.trim()}`,
            actor.id,
            actor.name,
          ),
        ],
      }));
      return ok(
        logActivity(grantAwards(next, [awardFor(mission, checkpoint, state)], actor.id), {
          surface: "mission",
          type: "mission.checkpoint_verified",
          summary: "Checkpoint verified",
          detail: `${mission.number} · ${checkpoint.title} verified by ${actor.name}.`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }
    case "mission.authorize": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      const checkpoint = mission.checkpoints.find((item) => item.id === action.checkpointId);
      if (!checkpoint) return fail(state, "Task not found.");
      if (!checkpoint.requiresApproval)
        return fail(state, "This step does not require authorization.");
      if (checkpoint.approvalId)
        return fail(state, "An authorization request has already been submitted for this step.");
      const approver = state.users.find((user) => user.id === checkpoint.assigneeId);
      if (!approver)
        return fail(state, "Assign the authorizing administrator before requesting authorization.");
      const actor = activeUser(state);
      const approval: Approval = {
        id: makeId("ap"),
        title: `${mission.number} · ${checkpoint.title}`,
        summary: `${checkpoint.title} — required before this step can proceed.`,
        type: "Access authorization",
        level: 2,
        amountUsd: null,
        requesterName: actor.name,
        requesterDepartment: actor.department,
        status: "pending",
        requiredApprover: `${approver.name} · ${checkpoint.assigneeRole ?? "Administrator"}`,
        createdAt: now(),
        dueAt: now(),
        decidedAt: null,
        decisionNote: "",
        history: [
          {
            id: makeId("aph"),
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            action: "submitted",
            note: `Authorization requested for step ${String(checkpoint.order).padStart(2, "0")} of ${mission.number}.`,
          },
        ],
        missionId: mission.id,
      };
      const next: CommandState = {
        ...withMission(state, mission.id, (item) => ({
          ...item,
          checkpoints: item.checkpoints.map((entry) =>
            entry.id === checkpoint.id
              ? {
                  ...entry,
                  state: "pending_authorization" as CheckpointState,
                  requiresApproval: true,
                  approvalId: approval.id,
                  updatedBy: actor.id,
                }
              : entry,
          ),
          trail: [
            ...item.trail,
            trailEvent(
              "mission.checkpoint",
              "Authorization requested",
              `${checkpoint.title} sent to ${approver.name} (${checkpoint.assigneeRole ?? "Administrator"}). The step stays blocked until that decision is recorded.`,
              actor.id,
              actor.name,
            ),
          ],
        })),
        approvals: [approval, ...state.approvals],
      };
      return ok(
        logActivity(next, {
          surface: "approval",
          type: "approval.submitted",
          summary: "Authorization requested",
          detail: `${approval.title} · waiting on ${approval.requiredApprover}`,
          targetType: "approval",
          targetId: approval.id,
          targetLabel: approval.title,
        }),
      );
    }
    case "mission.pause": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (mission.pausedAt) return fail(state, "This mission is already paused.");
      if (["completed", "closed"].includes(mission.status))
        return fail(state, "A completed mission cannot be paused.");
      if (action.note.trim().length < 4)
        return fail(state, "Record why the mission is being paused.");
      const actor = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        status: "pending",
        statusChangedAt: now(),
        pausedAt: now(),
        pending: item.pending ?? {
          reason: "other",
          note: action.note.trim(),
          nextActionAt: null,
          since: now(),
        },
        trail: [
          ...item.trail,
          trailEvent("mission.paused", "Mission paused", action.note.trim(), actor.id, actor.name),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.paused",
          summary: "Mission paused",
          detail: `${mission.number} paused · ${action.note.trim()}`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }
    case "mission.requestHelp": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (action.need.trim().length < 4)
        return fail(state, "Describe the help you need so the right person can respond.");
      const actor = activeUser(state);
      const request = {
        id: makeId("help"),
        at: now(),
        byId: actor.id,
        byName: actor.name,
        need: action.need.trim(),
        resolvedAt: null,
      };
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        helpRequests: [request, ...(item.helpRequests ?? [])],
        trail: [
          ...item.trail,
          trailEvent(
            "mission.help_requested",
            "Help requested",
            action.need.trim(),
            actor.id,
            actor.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.help_requested",
          summary: "Help requested",
          detail: `${mission.number} · ${action.need.trim()}`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }
    case "mission.transfer": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      const target = state.users.find((user) => user.id === action.toUserId);
      if (!target) return fail(state, "Choose a technician from the directory.");
      if (target.id === mission.acceptedBy)
        return fail(state, "This technician already owns the mission.");
      if (action.note.trim().length < 4)
        return fail(state, "Record why the mission is being transferred.");
      const actor = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        acceptedBy: target.id,
        acceptedAt: now(),
        offeredTo: target.id,
        status:
          item.status === "available" || item.status === "assigned" ? "accepted" : item.status,
        trail: [
          ...item.trail,
          trailEvent(
            "mission.transferred",
            "Mission transferred",
            `Ownership moved from ${actor.name} to ${target.name}. ${action.note.trim()}`,
            actor.id,
            actor.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.transferred",
          summary: "Mission transferred",
          detail: `${mission.number} → ${target.name} · ${action.note.trim()}`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }
    case "mission.submitReview": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (mission.reviewSubmittedAt)
        return fail(state, "This mission is already submitted for final review.");
      const open = mission.checkpoints.filter(
        (item) => item.state !== "completed" && item.state !== "skipped",
      );
      if (open.length > 0) {
        return fail(
          state,
          `Every mandatory step must be complete first. ${open.length} step${open.length === 1 ? "" : "s"} still open: ${open[0]?.title ?? ""}.`,
        );
      }
      if (!mission.resolution)
        return fail(state, "Record the resolution before submitting for final review.");
      const actor = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        reviewSubmittedAt: now(),
        pending: {
          reason: "awaiting_approval",
          note: "Submitted for final review and signoff.",
          nextActionAt: null,
          since: now(),
        },
        trail: [
          ...item.trail,
          trailEvent(
            "mission.review_submitted",
            "Submitted for final review",
            "All mandatory steps are recorded. Final signoff is now required.",
            actor.id,
            actor.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.review_submitted",
          summary: "Submitted for final review",
          detail: `${mission.number} · awaiting final signoff`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }
    case "mission.signoff": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission) return fail(state, "Mission not found.");
      if (!mission.reviewSubmittedAt)
        return fail(state, "Submit the mission for final review before recording signoff.");
      if (mission.signoff) return fail(state, "Signoff has already been recorded.");
      if (action.signerName.trim().length < 3) return fail(state, "Record who is signing off.");
      if (action.note.trim().length < 4) return fail(state, "Record the signoff note.");
      const actor = activeUser(state);
      const next = withMission(state, mission.id, (item) => ({
        ...item,
        signoff: {
          signerName: action.signerName.trim(),
          role: action.role.trim() || "Approver",
          note: action.note.trim(),
          at: now(),
        },
        trail: [
          ...item.trail,
          trailEvent(
            "mission.signed_off",
            "Final signoff recorded",
            `${action.signerName.trim()} (${action.role.trim() || "Approver"}) · ${action.note.trim()}`,
            actor.id,
            actor.name,
          ),
        ],
      }));
      return ok(
        logActivity(next, {
          surface: "mission",
          type: "mission.signed_off",
          summary: "Final signoff recorded",
          detail: `${mission.number} signed off by ${action.signerName.trim()}`,
          targetType: "mission",
          targetId: mission.id,
          targetLabel: `${mission.number} · ${mission.title}`,
        }),
      );
    }
    case "session.actAs": {
      const user = state.users.find((item) => item.id === action.userId);
      if (!user) return fail(state, "Unknown identity.");
      if (user.id === state.activeUserId) return fail(state, "That identity is already active.");
      const previous = activeUser(state);
      const next: CommandState = { ...state, activeUserId: user.id };
      return ok(
        logActivity(next, {
          surface: "identity",
          type: "session.act_as",
          summary: `Acting as ${user.name}`,
          detail: `${previous.name} → ${user.name} · ${user.role}. Authorization decisions stay with the named approver.`,
          targetType: "user",
          targetId: user.id,
          targetLabel: user.name,
        }),
      );
    }
    case "task.create": {
      if (action.title.trim().length < 3) return fail(state, "A task needs a title.");
      const user = activeUser(state);
      const task: Task = {
        id: makeId("task"),
        title: action.title.trim(),
        detail: action.detail.trim(),
        status: "open",
        priority: action.priority,
        dueAt: action.dueAt,
        project: action.project.trim() || "Personal",
        source: "personal",
        sourceLabel: "My work",
        missionId: null,
        progressNote: "",
        createdAt: now(),
        updatedAt: now(),
      };
      const next = { ...state, tasks: [task, ...state.tasks] };
      return ok(
        logActivity(next, {
          surface: "task",
          type: "task.created",
          summary: "Task created",
          detail: `${task.title}${task.dueAt ? ` · due ${new Date(task.dueAt).toLocaleDateString("en-US")}` : ""}`,
          targetType: "task",
          targetId: task.id,
          targetLabel: task.title,
        }),
      );
    }

    case "task.status": {
      const task = state.tasks.find((item) => item.id === action.taskId);
      if (!task) return fail(state, "Task not found.");
      const next = {
        ...state,
        tasks: state.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: action.status,
                updatedAt: now(),
                progressNote: action.progressNote.trim() || item.progressNote,
              }
            : item,
        ),
      };
      return ok(
        logActivity(next, {
          surface: "task",
          type: "task.updated",
          summary: `Task ${action.status.replace("_", " ")}`,
          detail: task.title,
          targetType: "task",
          targetId: task.id,
          targetLabel: task.title,
        }),
      );
    }

    /* ------------------------------------------------------------- checklists */
    case "checklist.toggle": {
      const checklist = state.checklists.find((item) => item.id === action.checklistId);
      if (!checklist) return fail(state, "Checklist not found.");
      const item = checklist.items.find((entry) => entry.id === action.itemId);
      if (!item) return fail(state, "Checklist item not found.");
      const next = {
        ...state,
        checklists: state.checklists.map((entry) =>
          entry.id === checklist.id
            ? {
                ...entry,
                updatedAt: now(),
                items: entry.items.map((row) =>
                  row.id === item.id
                    ? { ...row, done: !row.done, completedAt: row.done ? null : now() }
                    : row,
                ),
              }
            : entry,
        ),
      };
      return ok(
        logActivity(next, {
          surface: "checklist",
          type: "checklist.updated",
          summary: item.done ? "Checklist item reopened" : "Checklist item completed",
          detail: `${checklist.title} · ${item.text}`,
          targetType: "checklist",
          targetId: checklist.id,
          targetLabel: checklist.title,
        }),
      );
    }

    case "checklist.create": {
      if (action.title.trim().length < 3) return fail(state, "A checklist needs a title.");
      const items = action.items.map((text) => text.trim()).filter((text) => text.length > 0);
      if (items.length === 0) return fail(state, "Add at least one checklist item.");
      const checklist: Checklist = {
        id: makeId("cl"),
        title: action.title.trim(),
        category: action.category,
        items: items.map((text) => ({
          id: makeId("cli"),
          text,
          done: false,
          completedAt: null,
          linkedMissionId: null,
        })),
        dueAt: action.dueAt,
        recurring: action.recurring,
        missionId: null,
        createdAt: now(),
        updatedAt: now(),
      };
      const next = { ...state, checklists: [checklist, ...state.checklists] };
      return ok(
        logActivity(next, {
          surface: "checklist",
          type: "checklist.created",
          summary: "Checklist created",
          detail: `${checklist.title} · ${items.length} items`,
          targetType: "checklist",
          targetId: checklist.id,
          targetLabel: checklist.title,
        }),
      );
    }

    case "checklist.item.add": {
      const checklist = state.checklists.find((item) => item.id === action.checklistId);
      if (!checklist) return fail(state, "Checklist not found.");
      if (action.text.trim().length < 2) return fail(state, "Write the checklist item first.");
      const next = {
        ...state,
        checklists: state.checklists.map((entry) =>
          entry.id === checklist.id
            ? {
                ...entry,
                updatedAt: now(),
                items: [
                  ...entry.items,
                  {
                    id: makeId("cli"),
                    text: action.text.trim(),
                    done: false,
                    completedAt: null,
                    linkedMissionId: null,
                  },
                ],
              }
            : entry,
        ),
      };
      return ok(next);
    }

    /* ------------------------------------------------------------------ notes */
    case "note.save": {
      if (action.title.trim().length < 2) return fail(state, "A note needs a title.");
      const existing = action.noteId
        ? state.notes.find((note) => note.id === action.noteId)
        : undefined;
      const note: Note = existing
        ? {
            ...existing,
            title: action.title.trim(),
            body: action.body,
            tags: action.tags,
            pinned: action.pinned,
            missionId: action.missionId,
            updatedAt: now(),
          }
        : {
            id: makeId("note"),
            title: action.title.trim(),
            body: action.body,
            tags: action.tags,
            pinned: action.pinned,
            missionId: action.missionId,
            createdAt: now(),
            updatedAt: now(),
          };
      const notes = existing
        ? state.notes.map((entry) => (entry.id === note.id ? note : entry))
        : [note, ...state.notes];
      const next = { ...state, notes };
      return ok(
        logActivity(next, {
          surface: "note",
          type: existing ? "note.updated" : "note.created",
          summary: existing ? "Private note updated" : "Private note created",
          detail: `${note.title}${note.missionId ? ` · linked to ${note.missionId}` : ""}`,
          targetType: "note",
          targetId: note.id,
          targetLabel: note.title,
        }),
      );
    }

    case "note.delete": {
      const note = state.notes.find((item) => item.id === action.noteId);
      if (!note) return fail(state, "Note not found.");
      return ok({
        ...state,
        notes: state.notes.filter((item) => item.id !== note.id),
        activity: state.activity.filter(
          (event) => !(event.targetType === "note" && event.targetId === note.id),
        ),
      });
    }

    /* -------------------------------------------------------------- approvals */
    case "approval.decide": {
      const approval = state.approvals.find((item) => item.id === action.approvalId);
      if (!approval) return fail(state, "Approval not found.");
      const user = activeUser(state);
      if (!canDecideApproval(approval, user)) {
        return fail(
          state,
          `This approval belongs to ${approval.requiredApprover}. Your role cannot decide it.`,
        );
      }
      if (action.decision !== "escalate" && action.note.trim().length < 4)
        return fail(state, "Record the decision rationale.");
      const status =
        action.decision === "approve"
          ? "approved"
          : action.decision === "reject"
            ? "rejected"
            : "escalated";
      const next = {
        ...state,
        approvals: state.approvals.map((item) =>
          item.id === approval.id
            ? {
                ...item,
                status: status as Approval["status"],
                decidedAt: action.decision === "escalate" ? null : now(),
                decisionNote: action.note.trim(),
                history: [
                  ...item.history,
                  {
                    id: makeId("aph"),
                    at: now(),
                    actorId: user.id,
                    actorName: user.name,
                    action:
                      action.decision === "approve"
                        ? ("approved" as const)
                        : action.decision === "reject"
                          ? ("rejected" as const)
                          : ("escalated" as const),
                    note: action.note.trim(),
                  },
                ],
                requiredApprover:
                  action.decision === "escalate"
                    ? "Sarah Chen · Global Super Administrator"
                    : item.requiredApprover,
              }
            : item,
        ),
      };
      const authorized =
        action.decision === "approve" ? completeAuthorizedCheckpoints(next, approval.id) : next;
      return ok(
        logActivity(authorized, {
          surface: "approval",
          type: `approval.${action.decision}`,
          summary: `Approval ${status}`,
          detail: `${approval.title}${action.note.trim() ? ` · ${action.note.trim()}` : ""}`,
          targetType: "approval",
          targetId: approval.id,
          targetLabel: approval.title,
        }),
      );
    }

    case "approval.comment": {
      const approval = state.approvals.find((item) => item.id === action.approvalId);
      if (!approval) return fail(state, "Approval not found.");
      if (action.note.trim().length < 2) return fail(state, "Write the comment first.");
      const user = activeUser(state);
      const next = {
        ...state,
        approvals: state.approvals.map((item) =>
          item.id === approval.id
            ? {
                ...item,
                history: [
                  ...item.history,
                  {
                    id: makeId("aph"),
                    at: now(),
                    actorId: user.id,
                    actorName: user.name,
                    action: "commented" as const,
                    note: action.note.trim(),
                  },
                ],
              }
            : item,
        ),
      };
      return ok(
        logActivity(next, {
          surface: "approval",
          type: "approval.commented",
          summary: "Approval comment added",
          detail: `${approval.title} · ${action.note.trim()}`,
          targetType: "approval",
          targetId: approval.id,
          targetLabel: approval.title,
        }),
      );
    }

    /* ------------------------------------------------------------- signatures */
    case "signature.sign": {
      const signature = state.signatures.find((item) => item.id === action.signatureId);
      if (!signature) return fail(state, "Signature request not found.");
      if (signature.status !== "awaiting_signature")
        return fail(state, "This document is not awaiting your signature.");
      const profile = state.signatureProfiles.find((item) => item.id === action.profileId);
      if (!profile) return fail(state, "Select a signature profile first.");
      const user = activeUser(state);
      const auditHash = hashOf(`${signature.id}:${profile.id}:${now()}`);
      const next = {
        ...state,
        signatures: state.signatures.map((item) =>
          item.id === signature.id
            ? {
                ...item,
                status: "signed" as const,
                profileId: profile.id,
                signedAt: now(),
                auditHash,
              }
            : item,
        ),
      };
      return ok(
        logActivity(next, {
          surface: "signature",
          type: "signature.signed",
          summary: "Document signed",
          detail: `${signature.documentName} signed with profile "${profile.label}". Audit reference ${auditHash}.`,
          targetType: "signature",
          targetId: signature.id,
          targetLabel: signature.documentName,
        }),
      );
    }

    case "signature.decline": {
      const signature = state.signatures.find((item) => item.id === action.signatureId);
      if (!signature) return fail(state, "Signature request not found.");
      if (signature.status !== "awaiting_signature")
        return fail(state, "This document is not awaiting your signature.");
      if (action.note.trim().length < 4)
        return fail(state, "Record why the signature was declined.");
      const next = {
        ...state,
        signatures: state.signatures.map((item) =>
          item.id === signature.id
            ? { ...item, status: "declined" as const, note: action.note.trim() }
            : item,
        ),
      };
      return ok(
        logActivity(next, {
          surface: "signature",
          type: "signature.declined",
          summary: "Signature declined",
          detail: `${signature.documentName} · ${action.note.trim()}`,
          targetType: "signature",
          targetId: signature.id,
          targetLabel: signature.documentName,
        }),
      );
    }

    /* -------------------------------------------------------------- knowledge */
    case "knowledge.save": {
      const article = state.knowledge.find((item) => item.id === action.articleId);
      if (!article) return fail(state, "Article not found.");
      const saving = article.savedAt === null;
      const next = {
        ...state,
        knowledge: state.knowledge.map((item) =>
          item.id === article.id ? { ...item, savedAt: saving ? now() : null } : item,
        ),
      };
      return ok(
        logActivity(next, {
          surface: "knowledge",
          type: saving ? "knowledge.saved" : "knowledge.unsaved",
          summary: saving ? "Knowledge saved" : "Knowledge removed from saved",
          detail: article.title,
          targetType: null,
          targetId: article.id,
          targetLabel: article.title,
        }),
      );
    }

    /* ---------------------------------------------------------- conversations */
    case "conversation.new": {
      const conversation = {
        id: makeId("conv"),
        title: "New conversation",
        createdAt: now(),
        updatedAt: now(),
        messages: [
          {
            id: makeId("msg"),
            role: "assistant" as const,
            text: "New conversation started. I can see your current missions, tasks and knowledge base. I will not change anything without you asking.",
            at: now(),
            state: "idle" as const,
            references: [],
            grounded: true,
            attachmentIds: [],
          },
        ],
      };
      return ok({
        ...state,
        conversations: [conversation, ...state.conversations],
        activeConversationId: conversation.id,
      });
    }

    case "conversation.select": {
      if (!state.conversations.some((conversation) => conversation.id === action.conversationId))
        return fail(state, "Conversation not found.");
      return ok({ ...state, activeConversationId: action.conversationId });
    }

    case "conversation.send": {
      const text = action.text.trim();
      if (!text) return fail(state, "Write a message first.");
      const conversation =
        state.conversations.find((item) => item.id === state.activeConversationId) ??
        state.conversations[0];
      if (!conversation) return fail(state, "No conversation is open.");
      const reply = replyTo(state, text, { missionId: action.missionId });
      const userMessage = {
        id: makeId("msg"),
        role: "user" as const,
        text,
        at: now(),
        state: "idle" as const,
        references: [],
        grounded: true,
        attachmentIds: [],
      };
      const assistantMessage = {
        id: makeId("msg"),
        role: "assistant" as const,
        text: reply.text,
        at: new Date(Date.now() + 1000).toISOString(),
        state: reply.state,
        references: reply.references,
        grounded: reply.grounded,
        attachmentIds: [],
      };
      const conversations = state.conversations.map((item) =>
        item.id === conversation.id
          ? {
              ...item,
              title: item.messages.length <= 1 ? text.slice(0, 48) : item.title,
              updatedAt: now(),
              messages: [...item.messages, userMessage, assistantMessage],
            }
          : item,
      );
      const drafts = { ...state.drafts };
      delete drafts["helpbuddy.composer"];
      const next = { ...state, conversations, drafts };
      return ok(
        logActivity(next, {
          surface: "help_buddy",
          type: "help_buddy.message",
          summary: "Help Buddy conversation",
          detail: `${text.slice(0, 80)}${reply.grounded ? "" : " · no grounded source found"}`,
          targetType: null,
          targetId: conversation.id,
          targetLabel: conversation.title,
        }),
      );
    }

    /* --------------------------------------------------------------- connectors */
    case "connector.connect": {
      const connector = state.connectors.find((item) => item.id === action.connectorId);
      if (!connector) return fail(state, "Connector not found.");
      if (connector.status === "connected")
        return fail(state, `${connector.name} is already connected.`);
      if (!connector.configured) {
        return fail(
          state,
          `${connector.name} cannot be connected yet. ${connector.requirement ?? "Credentials are required."}`,
        );
      }
      const next = {
        ...state,
        connectors: state.connectors.map((item) =>
          item.id === connector.id
            ? {
                ...item,
                status: "connected" as const,
                lastSyncAt: now(),
                healthMessage: `Connected. Authorization confirmed for ${item.scopes.join(", ")}.`,
                account: item.account ?? "authorized account",
              }
            : item,
        ),
        syncEvents: [
          {
            id: makeId("sync"),
            at: now(),
            connectorId: connector.id,
            type: "connector.connected" as const,
            summary: `${connector.name} connected`,
            detail: `Authorization recorded for scopes: ${connector.scopes.join(", ")}.`,
            dedupeKey: null,
          },
          ...state.syncEvents,
        ],
      };
      return ok(
        logActivity(next, {
          surface: "connector",
          type: "connector.connected",
          summary: "Connector connected",
          detail: `${connector.name} authorized and connection health confirmed.`,
          targetType: "connector",
          targetId: connector.id,
          targetLabel: connector.name,
        }),
      );
    }

    case "connector.disconnect": {
      const connector = state.connectors.find((item) => item.id === action.connectorId);
      if (!connector) return fail(state, "Connector not found.");
      if (connector.status !== "connected")
        return fail(state, `${connector.name} is not connected.`);
      const next = {
        ...state,
        connectors: state.connectors.map((item) =>
          item.id === connector.id
            ? {
                ...item,
                status: "disconnected" as const,
                healthMessage: "Disconnected by you. Stored authorization has been revoked.",
                lastSyncAt: item.lastSyncAt,
              }
            : item,
        ),
        syncEvents: [
          {
            id: makeId("sync"),
            at: now(),
            connectorId: connector.id,
            type: "connector.disconnected" as const,
            summary: `${connector.name} disconnected`,
            detail:
              "Authorization revoked. Linked documents keep their source reference and may no longer open.",
            dedupeKey: null,
          },
          ...state.syncEvents,
        ],
      };
      return ok(
        logActivity(next, {
          surface: "connector",
          type: "connector.disconnected",
          summary: "Connector disconnected",
          detail: `${connector.name} authorization revoked.`,
          targetType: "connector",
          targetId: connector.id,
          targetLabel: connector.name,
        }),
      );
    }

    case "connector.retry": {
      const connector = state.connectors.find((item) => item.id === action.connectorId);
      if (!connector) return fail(state, "Connector not found.");
      if (connector.requirement) return fail(state, `Retry blocked. ${connector.requirement}`);
      const next = {
        ...state,
        connectors: state.connectors.map((item) =>
          item.id === connector.id
            ? {
                ...item,
                status: "connected" as const,
                lastSyncAt: now(),
                healthMessage: "Synchronization retried and completed.",
              }
            : item,
        ),
        syncEvents: [
          {
            id: makeId("sync"),
            at: now(),
            connectorId: connector.id,
            type: "sync.completed" as const,
            summary: `${connector.name} synchronized`,
            detail: "Retry completed without duplicate events.",
            dedupeKey: `${connector.id}:retry:${Date.now()}`,
          },
          ...state.syncEvents,
        ],
      };
      return ok(
        logActivity(next, {
          surface: "connector",
          type: "sync.completed",
          summary: "Synchronization retried",
          detail: `${connector.name} synchronized successfully.`,
          targetType: "connector",
          targetId: connector.id,
          targetLabel: connector.name,
        }),
      );
    }

    /* --------------------------------------------------------------- documents */
    case "document.action": {
      const document = state.library.find((item) => item.id === action.documentId);
      if (!document) return fail(state, "Document not found.");
      const connector = state.connectors.find((item) => item.id === document.connectorId);
      if (connector && connector.status !== "connected") {
        return fail(
          state,
          `${connector.name} is not connected. The document cannot be ${action.mode === "linked" ? "linked" : "imported"} until the source is available.`,
        );
      }
      const duplicate = state.documentActions.find(
        (entry) =>
          entry.documentId === document.id &&
          entry.target.id === action.target.id &&
          entry.mode === action.mode,
      );
      if (duplicate)
        return fail(state, `${document.name} is already ${action.mode} to this work item.`);
      const actionRecord = {
        id: makeId("da"),
        documentId: document.id,
        documentName: document.name,
        mode: action.mode,
        target: action.target,
        connectorId: document.connectorId,
        actorId: activeUser(state).id,
        at: now(),
        syncState:
          action.mode === "imported"
            ? ("copied" as const)
            : action.mode === "linked"
              ? ("linked" as const)
              : ("not_applicable" as const),
        note:
          action.mode === "linked"
            ? "Reference kept to the original document. Permissions stay with the source."
            : action.mode === "imported"
              ? "Managed copy stored in the workspace with IntelliStack permissions."
              : "Attached to the work item without copying the file.",
      };
      let next: CommandState = {
        ...state,
        documentActions: [actionRecord, ...state.documentActions],
      };
      if (action.target.type === "mission") {
        next = withMission(next, action.target.id, (mission) => ({
          ...mission,
          documentIds: mission.documentIds.includes(document.id)
            ? mission.documentIds
            : [...mission.documentIds, document.id],
          trail: [
            ...mission.trail,
            trailEvent(
              "mission.document",
              action.mode === "linked"
                ? "Document linked"
                : action.mode === "imported"
                  ? "Document imported"
                  : "Document attached",
              `${document.name} — ${actionRecord.note}`,
              activeUser(state).id,
              activeUser(state).name,
            ),
          ],
        }));
      }
      next = {
        ...next,
        syncEvents: [
          {
            id: makeId("sync"),
            at: now(),
            connectorId: document.connectorId,
            type:
              action.mode === "imported"
                ? ("document.imported" as const)
                : action.mode === "linked"
                  ? ("document.linked" as const)
                  : ("document.attached" as const),
            summary: `${document.name} ${action.mode}`,
            detail: `Target: ${action.target.label}. Deduplicated against the existing action set.`,
            dedupeKey: `${document.id}:${action.target.id}:${action.mode}`,
          },
          ...next.syncEvents,
        ],
      };
      next = logActivity(next, {
        surface: "connector",
        type: `document.${action.mode}`,
        summary:
          action.mode === "linked"
            ? "Document linked"
            : action.mode === "imported"
              ? "Document imported"
              : "Document attached",
        detail: `${document.name} → ${action.target.label}`,
        targetType: action.target.type,
        targetId: action.target.id,
        targetLabel: action.target.label,
      });
      return ok(next);
    }

    /* ----------------------------------------------------------------- modules */
    case "module.install": {
      const module = state.modules.find((item) => item.id === action.moduleId);
      if (!module) return fail(state, "Module not found.");
      if (module.installed) return fail(state, `${module.name} is already installed.`);
      if (module.entitlement > 3)
        return fail(
          state,
          `${module.unavailableReason ?? "Your subscription does not include this module."}`,
        );
      if (
        module.requires.some(
          (required) => !state.modules.find((item) => item.id === required)?.installed,
        )
      ) {
        return fail(state, "Required modules must be installed first.");
      }
      const next = {
        ...state,
        modules: state.modules.map((item) =>
          item.id === module.id
            ? {
                ...item,
                installed: true,
                operational: item.unavailableReason === null,
                unavailableReason: item.unavailableReason,
              }
            : item,
        ),
      };
      return ok(
        logActivity(next, {
          surface: "module",
          type: "module.installed",
          summary: "Module installed",
          detail: `${module.name} installed at entitlement level ${module.entitlement}.`,
          targetType: "module",
          targetId: module.id,
          targetLabel: module.name,
        }),
      );
    }

    case "module.addToHelpBuddy":
    case "module.removeFromHelpBuddy": {
      const module = state.modules.find((item) => item.id === action.moduleId);
      if (!module) return fail(state, "Module not found.");
      if (!module.installed)
        return fail(state, "Install the module before adding it to Help Buddy.");
      if (action.type === "module.addToHelpBuddy" && !module.operational)
        return fail(state, "This module has no live functionality yet, so it cannot be added.");
      const adding = action.type === "module.addToHelpBuddy";
      const next = {
        ...state,
        modules: state.modules.map((item) =>
          item.id === module.id ? { ...item, inHelpBuddy: adding } : item,
        ),
      };
      return ok(
        logActivity(next, {
          surface: "module",
          type: adding ? "module.added" : "module.removed",
          summary: adding ? "Module added to Help Buddy" : "Module removed from Help Buddy",
          detail: `${module.name} is ${adding ? "now available as a Help Buddy tab" : "no longer shown in Help Buddy"}.`,
          targetType: "module",
          targetId: module.id,
          targetLabel: module.name,
        }),
      );
    }

    /* -------------------------------------------------------------- characters */
    case "character.update": {
      const character = state.characters.find((item) => item.id === action.characterId);
      if (!character) return fail(state, "Character not found.");
      const next = {
        ...state,
        characters: state.characters.map((item) =>
          item.id === character.id ? { ...item, ...action.patch, updatedAt: now() } : item,
        ),
      };
      return ok(
        logActivity(next, {
          surface: "help_buddy",
          type: "character.updated",
          summary: "Character updated",
          detail: `${character.name} updated in Character Creator Studio.`,
          targetType: null,
          targetId: character.id,
          targetLabel: character.name,
        }),
      );
    }

    case "character.select": {
      if (!state.characters.some((item) => item.id === action.characterId))
        return fail(state, "Character not found.");
      return ok({ ...state, activeCharacterId: action.characterId });
    }

    default:
      return fail(state, "Unsupported action.");
  }
}

export type { ModuleDefinition, StarRuleId };
