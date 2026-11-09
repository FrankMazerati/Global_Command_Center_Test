import { describe, expect, it } from "vitest";
import { createSeedState } from "@/lib/domain/seed";
import { reduce, canDecideApproval } from "@/lib/domain/reducer";
import {
  activeUser,
  completionBlockers,
  missionById,
  recognitionSummary,
  workQueue,
} from "@/lib/domain/selectors";
import { replyTo } from "@/lib/domain/assistant";
import { LEVELS, levelForXp } from "@/lib/domain/recognition";
import type { CommandAction } from "@/lib/domain/reducer";
import type { CommandState } from "@/lib/domain/types";

function run(state: CommandState, ...actions: CommandAction[]): CommandState {
  return actions.reduce((current, action) => {
    const result = reduce(current, action);
    if (result.error) throw new Error(`Unexpected rejection: ${result.error}`);
    return result.state;
  }, state);
}

function expectRejected(state: CommandState, action: CommandAction, matcher?: RegExp) {
  const result = reduce(state, action);
  expect(result.error).not.toBeNull();
  if (matcher) expect(result.error).toMatch(matcher);
  expect(result.state).toBe(state);
}

describe("admission control", () => {
  it("separates viewing, accepting and starting work", () => {
    const seed = createSeedState();
    const viewed = run(seed, { type: "mission.view", missionId: "INC-9842" });
    const viewedMission = missionById(viewed, "INC-9842");
    expect(viewedMission?.status).toBe("available");
    expect(viewedMission?.acceptedAt).toBeNull();
    expect(viewedMission?.startedAt).toBeNull();

    const accepted = run(viewed, { type: "mission.accept", missionId: "INC-9842" });
    const acceptedMission = missionById(accepted, "INC-9842");
    expect(acceptedMission?.status).toBe("accepted");
    expect(acceptedMission?.acceptedAt).not.toBeNull();
    // Accepting must not pretend any work happened.
    expect(acceptedMission?.startedAt).toBeNull();
    expect(
      acceptedMission?.checkpoints.every((checkpoint) => checkpoint.state === "not_started"),
    ).toBe(true);

    const started = run(accepted, { type: "mission.start", missionId: "INC-9842" });
    const startedMission = missionById(started, "INC-9842");
    expect(startedMission?.status).toBe("in_progress");
    expect(startedMission?.startedAt).not.toBeNull();
    expect(startedMission?.resolution).toBeNull();
    expect(startedMission?.trail.map((event) => event.type)).toEqual(
      expect.arrayContaining(["mission.viewed", "mission.accepted", "mission.started"]),
    );
  });

  it("records a decline and returns the ticket to routing without resolving it", () => {
    const seed = createSeedState();
    expectRejected(
      seed,
      { type: "mission.decline", missionId: "INC-9842", reason: "workload_conflict", note: "" },
      /reason/i,
    );

    const declined = run(seed, {
      type: "mission.decline",
      missionId: "INC-9842",
      reason: "outside_skill_set",
      note: "Needs a network specialist.",
    });
    const mission = missionById(declined, "INC-9842");
    expect(mission?.status).toBe("available");
    expect(mission?.offeredTo ?? "").toBe("");
    expect(mission?.declines.length).toBeGreaterThan(0);
    expect(mission?.resolution).toBeNull();
    expect(declined.activity[0]?.type).toBe("mission.declined");
  });

  it("refuses to complete a mission with open checkpoints or no resolution", () => {
    const seed = createSeedState();
    const accepted = run(
      seed,
      { type: "mission.accept", missionId: "INC-9842" },
      { type: "mission.start", missionId: "INC-9842" },
    );
    const mission = missionById(accepted, "INC-9842");
    expect(mission).toBeDefined();
    if (!mission) return;
    expect(completionBlockers(mission).length).toBeGreaterThan(0);
    expectRejected(
      accepted,
      { type: "mission.complete", missionId: "INC-9842" },
      /checkpoint|resolution/i,
    );
  });
});

describe("checkpoints and recognition", () => {
  it("awards stars once per checkpoint and blocks repeats", () => {
    const seed = createSeedState();
    const state = run(
      seed,
      { type: "mission.accept", missionId: "INC-9842" },
      { type: "mission.start", missionId: "INC-9842" },
    );
    const mission = missionById(state, "INC-9842");
    const checkpoint = mission?.checkpoints.find(
      (item) => item.state === "not_started" || item.state === "in_progress",
    );
    expect(checkpoint).toBeDefined();
    if (!mission || !checkpoint) return;

    const afterFirst = run(state, {
      type: "checkpoint.update",
      missionId: mission.id,
      checkpointId: checkpoint.id,
      state: "completed",
      actualResult: "Recorded the observed failure state.",
      skipReason: "",
    });
    const starsAfterFirst = recognitionSummary(afterFirst, afterFirst.activeUserId).stars;

    const afterSecond = run(afterFirst, {
      type: "checkpoint.update",
      missionId: mission.id,
      checkpointId: checkpoint.id,
      state: "completed",
      actualResult: "Recorded the observed failure state again.",
      skipReason: "",
    });
    expect(recognitionSummary(afterSecond, afterSecond.activeUserId).stars).toBe(starsAfterFirst);
    const ledgerKeys = afterSecond.ledger.map((entry) => `${entry.ruleId}:${entry.sourceId}`);
    expect(new Set(ledgerKeys).size).toBe(ledgerKeys.length);
  });

  it("levels are monotonic in XP", () => {
    const thresholds = LEVELS.map((level) => level.minXp);
    expect([...thresholds].sort((a, b) => a - b)).toEqual(thresholds);
    expect(levelForXp(0).level).toBe(1);
    expect(levelForXp(1_000_000).level).toBe(LEVELS[LEVELS.length - 1]?.level);
  });
});

describe("approvals and signatures", () => {
  it("blocks decisions from users who do not own the approval", () => {
    const state = createSeedState();
    const user = activeUser(state);
    const other = state.approvals.find(
      (approval) => approval.status === "pending" && !canDecideApproval(approval, user),
    );
    expect(other).toBeDefined();
    if (!other) return;
    expectRejected(
      state,
      {
        type: "approval.decide",
        approvalId: other.id,
        decision: "approve",
        note: "Trying to approve outside my authority.",
      },
      /belongs to|approver|authorized/i,
    );
  });

  it("requires a rationale before a decision", () => {
    const state = createSeedState();
    const user = activeUser(state);
    const owned = state.approvals.find(
      (approval) => approval.status === "pending" && canDecideApproval(approval, user),
    );
    expect(owned).toBeDefined();
    if (!owned) return;
    expectRejected(
      state,
      { type: "approval.decide", approvalId: owned.id, decision: "approve", note: "" },
      /note|rationale|reason/i,
    );
  });

  it("signing is independent from approval decisions", () => {
    const state = createSeedState();
    const signature = state.signatures.find((item) => item.status === "awaiting_signature");
    expect(signature).toBeDefined();
    if (!signature) return;
    const profile = state.signatureProfiles[0];
    expect(profile).toBeDefined();
    if (!profile) return;
    const signed = run(state, {
      type: "signature.sign",
      signatureId: signature.id,
      profileId: profile.id,
    });
    const updated = signed.signatures.find((item) => item.id === signature.id);
    expect(updated?.status).toBe("signed");
    expect(updated?.auditHash).toBeTruthy();
    // The approval ledger must be untouched by a signature.
    expect(signed.approvals.map((item) => item.status)).toEqual(
      state.approvals.map((item) => item.status),
    );
  });
});

describe("connector honesty", () => {
  it("refuses to connect a connector whose prerequisite is missing", () => {
    const state = createSeedState();
    const unconfigured = state.connectors.find((connector) => !connector.configured);
    expect(unconfigured).toBeDefined();
    if (!unconfigured) return;
    const result = reduce(state, { type: "connector.connect", connectorId: unconfigured.id });
    expect(result.error).toBeTruthy();
    expect(result.error).toContain(unconfigured.requirement ?? "");
    expect(
      result.state.connectors.find((connector) => connector.id === unconfigured.id)?.status,
    ).not.toBe("connected");
  });

  it("records a document action against its target", () => {
    const state = createSeedState();
    const connected = state.connectors.find((connector) => connector.status === "connected");
    const document = state.library.find((item) => item.connectorId === connected?.id);
    expect(connected).toBeDefined();
    expect(document).toBeDefined();
    if (!connected || !document) return;
    const next = run(state, {
      type: "document.action",
      documentId: document.id,
      mode: "linked",
      target: { type: "mission", id: "INC-9831", label: "INC-9831" },
    });
    expect(next.documentActions.length).toBe(state.documentActions.length + 1);
    expect(next.documentActions[0]?.mode).toBe("linked");
    expect(next.syncEvents[0]?.type).toBe("document.linked");
  });
});

describe("Help Buddy grounding", () => {
  it("answers from real records and cites them", () => {
    const state = createSeedState();
    const reply = replyTo(state, "What is waiting on me today?", { missionId: null });
    expect(reply.text.length).toBeGreaterThan(20);
    expect(reply.grounded).toBe(true);
    expect(reply.references.length).toBeGreaterThan(0);
    const queue = workQueue(state, state.activeUserId);
    expect(queue.length).toBeGreaterThan(0);
  });

  it("admits when it has no grounded answer", () => {
    const state = createSeedState();
    const reply = replyTo(state, "What is the airspeed velocity of an unladen swallow?", {
      missionId: null,
    });
    expect(reply.grounded).toBe(false);
  });

  it("persists conversations through the reducer", () => {
    const state = createSeedState();
    const next = run(state, {
      type: "conversation.send",
      text: "What should I capture first on INC-9842?",
      missionId: "INC-9842",
    });
    const conversation = next.conversations.find((item) => item.id === next.activeConversationId);
    expect(conversation?.messages.length).toBeGreaterThan(1);
    expect(conversation?.messages.at(-1)?.role).toBe("assistant");
    expect(next.activity[0]?.surface).toBe("help_buddy");
  });
});
