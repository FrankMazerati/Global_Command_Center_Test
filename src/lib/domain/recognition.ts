import type {
  BadgeDefinition,
  CommandState,
  LedgerEntry,
  LevelDefinition,
  Mission,
  RecognitionStats,
  StarRuleId,
} from "./types";

/**
 * Recognition configuration.
 *
 * Stars, XP, levels and badges are configured here rather than hardcoded in components, so an
 * organization can change thresholds without touching the UI. Awards are only produced from
 * recorded events (see `evaluateMissionAwards`), never from a ticket simply being closed.
 */

export const STAR_RULES: Record<
  StarRuleId,
  { label: string; stars: number; xp: number; evidence: string }
> = {
  checkpoint_complete: {
    label: "Checkpoint completed",
    stars: 1,
    xp: 10,
    evidence: "Checkpoint marked complete with a recorded result",
  },
  diagnostic_verified: {
    label: "Diagnostic verified",
    stars: 2,
    xp: 25,
    evidence: "Diagnostic result confirmed and recorded by the technician",
  },
  evidence_captured: {
    label: "Evidence captured",
    stars: 1,
    xp: 8,
    evidence: "Log, screenshot or document attached as evidence",
  },
  resolution_verified: {
    label: "Repair verified",
    stars: 3,
    xp: 40,
    evidence: "Restoration verified by the technician and confirmed in the resolution record",
  },
  documentation_complete: {
    label: "Finding documented",
    stars: 1,
    xp: 12,
    evidence: "Required finding written into the mission record",
  },
  escalation_prepared: {
    label: "Escalation prepared",
    stars: 1,
    xp: 10,
    evidence: "Complete handover recorded before escalation",
  },
};

/** XP for closing out a mission, weighted by the priority actually worked. */
export const MISSION_COMPLETION_XP: Record<Mission["priority"], number> = {
  P1: 80,
  P2: 60,
  P3: 40,
  P4: 25,
};

export const MISSION_COMPLEXITY_XP: Record<Mission["priority"], number> = {
  P1: 40,
  P2: 25,
  P3: 15,
  P4: 8,
};

export const LEVELS: LevelDefinition[] = [
  { level: 1, name: "Associate", minXp: 0 },
  { level: 2, name: "Practitioner", minXp: 150 },
  { level: 3, name: "Specialist", minXp: 400 },
  { level: 4, name: "Senior Specialist", minXp: 800 },
  { level: 5, name: "Lead", minXp: 1400 },
  { level: 6, name: "Principal", minXp: 2200 },
  { level: 7, name: "Distinguished", minXp: 3200 },
  { level: 8, name: "Fellow", minXp: 4500 },
];

export const BADGES: BadgeDefinition[] = [
  {
    id: "first-mission",
    name: "First Response",
    category: "Service",
    description: "Accepted and completed a first mission end to end.",
    stage: "bronze",
    criteria: "Complete 1 mission",
    threshold: 1,
    metric: "missionsCompleted",
  },
  {
    id: "consistent-performer",
    name: "Consistent Performer",
    category: "Service",
    description: "Keeps missions moving without stalling in acceptance.",
    stage: "bronze",
    criteria: "Complete 3 missions",
    threshold: 3,
    metric: "missionsCompleted",
  },
  {
    id: "resolution-expert",
    name: "Resolution Expert",
    category: "Technical",
    description: "Records verified resolutions with documented root cause.",
    stage: "silver",
    criteria: "Document 5 verified resolutions",
    threshold: 5,
    metric: "documentedResolutions",
  },
  {
    id: "sla-champion",
    name: "SLA Champion",
    category: "Service",
    description: "Handles priority incidents without letting them slip.",
    stage: "silver",
    criteria: "Complete 2 P1 missions",
    threshold: 2,
    metric: "p1Completed",
  },
  {
    id: "quality-champion",
    name: "Quality Champion",
    category: "Technical",
    description: "Captures evidence for the work performed rather than asserting it.",
    stage: "silver",
    criteria: "Attach 6 evidence items",
    threshold: 6,
    metric: "evidenceItems",
  },
  {
    id: "continuous-learner",
    name: "Continuous Learner",
    category: "Learning",
    description: "Grows through completed checkpoints, not attendance.",
    stage: "bronze",
    criteria: "Complete 15 checkpoints",
    threshold: 15,
    metric: "checkpointsCompleted",
  },
  {
    id: "knowledge-sharer",
    name: "Knowledge Sharer",
    category: "Collaboration",
    description: "Saves and contributes knowledge used by other people.",
    stage: "silver",
    criteria: "Save 4 knowledge articles",
    threshold: 4,
    metric: "knowledgeSaved",
  },
  {
    id: "problem-solver",
    name: "Problem Solver",
    category: "Technical",
    description: "Works difficult missions through to a verified repair.",
    stage: "gold",
    criteria: "Complete 8 missions",
    threshold: 8,
    metric: "missionsCompleted",
  },
  {
    id: "mentor",
    name: "Mentor",
    category: "Collaboration",
    description: "Prepares escalations that let another engineer continue immediately.",
    stage: "silver",
    criteria: "Prepare 3 escalations",
    threshold: 3,
    metric: "escalations",
  },
  {
    id: "automation-champion",
    name: "Automation Champion",
    category: "Innovation",
    description: "Reaches senior progression through consistent delivery.",
    stage: "gold",
    criteria: "Reach level 4",
    threshold: 4,
    metric: "level",
  },
];

export function levelForXp(xp: number): LevelDefinition {
  let current = LEVELS[0]!;
  for (const definition of LEVELS) {
    if (xp >= definition.minXp) current = definition;
  }
  return current;
}

export function nextLevel(xp: number): LevelDefinition | null {
  return LEVELS.find((definition) => definition.minXp > xp) ?? null;
}

export function totalStars(ledger: LedgerEntry[]): number {
  return ledger.reduce((sum, entry) => sum + entry.stars, 0);
}

export function totalXp(ledger: LedgerEntry[]): number {
  return ledger.reduce((sum, entry) => sum + entry.xp, 0);
}

export function awardKey(ruleId: string, ...parts: string[]): string {
  return [ruleId, ...parts].join(":");
}

export function hasAward(ledger: LedgerEntry[], key: string): boolean {
  return ledger.some((entry) => entry.awardKey === key);
}

export function recognitionStats(state: CommandState, userId: string): RecognitionStats {
  const owned = state.missions.filter(
    (mission) =>
      mission.acceptedBy === userId || mission.declines.some((d) => d.technicianId === userId),
  );
  const completed = owned.filter(
    (mission) => mission.status === "completed" || mission.status === "closed",
  );
  const ledger = state.ledger.filter((entry) => entry.actorId === userId);
  const xp = totalXp(ledger);
  const level = levelForXp(xp).level;
  return {
    missionsAccepted: owned.filter((mission) => mission.acceptedAt !== null).length,
    missionsDeclined: owned.reduce(
      (sum, mission) => sum + mission.declines.filter((d) => d.technicianId === userId).length,
      0,
    ),
    missionsCompleted: completed.length,
    missionsClosed: owned.filter((mission) => mission.status === "closed").length,
    checkpointsCompleted: owned.reduce(
      (sum, mission) =>
        sum + mission.checkpoints.filter((checkpoint) => checkpoint.state === "completed").length,
      0,
    ),
    checkpointsUnsuccessful: owned.reduce(
      (sum, mission) =>
        sum +
        mission.checkpoints.filter((checkpoint) => checkpoint.state === "unsuccessful").length,
      0,
    ),
    evidenceItems: owned.reduce(
      (sum, mission) =>
        sum +
        mission.checkpoints.reduce((count, checkpoint) => count + checkpoint.evidence.length, 0),
      0,
    ),
    documentedResolutions: completed.filter(
      (mission) => mission.resolution !== null && mission.resolution.verification.length > 0,
    ).length,
    escalations: owned.filter((mission) => mission.escalation !== null).length,
    knowledgeContributions: state.knowledge.filter(
      (article) => article.author === state.users.find((user) => user.id === userId)?.name,
    ).length,
    knowledgeSaved: state.knowledge.filter((article) => article.savedAt !== null).length,
    stars: totalStars(ledger),
    xp,
    level,
    p1Completed: completed.filter((mission) => mission.priority === "P1").length,
  };
}

/** Badges whose criteria are met but which have not been recorded yet. */
export function eligibleBadges(stats: RecognitionStats, ledger: LedgerEntry[]): BadgeDefinition[] {
  return BADGES.filter((badge) => {
    if (hasAward(ledger, awardKey("badge", badge.id))) return false;
    const value = stats[badge.metric];
    return typeof value === "number" && value >= badge.threshold;
  });
}

export const BADGE_BY_ID = new Map(BADGES.map((badge) => [badge.id, badge]));
