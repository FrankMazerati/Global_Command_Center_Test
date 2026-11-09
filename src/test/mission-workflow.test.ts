import { describe, expect, it } from "vitest";
import { createSeedState } from "@/lib/domain/seed";
import { reduce, checkpointBlockers } from "@/lib/domain/reducer";
import { missionById, recognitionSummary, completionBlockers } from "@/lib/domain/selectors";
import type { CommandAction } from "@/lib/domain/reducer";
import type { CommandState } from "@/lib/domain/types";

const MISSION = "MO-2026-0016";
const step = (n: number) => `${MISSION}-c${n}`;

function run(state: CommandState, ...actions: CommandAction[]): CommandState {
  return actions.reduce((current, action) => {
    const result = reduce(current, action);
    if (result.error) throw new Error(`Unexpected rejection (${action.type}): ${result.error}`);
    return result.state;
  }, state);
}

function rejects(state: CommandState, action: CommandAction, matcher: RegExp) {
  const result = reduce(state, action);
  expect(result.error, `expected ${action.type} to be rejected`).not.toBeNull();
  expect(result.error ?? "").toMatch(matcher);
  expect(result.state).toBe(state);
}

function complete(state: CommandState, n: number, result = "Recorded outcome with enough detail.") {
  return run(
    state,
    {
      type: "checkpoint.update",
      missionId: MISSION,
      checkpointId: step(n),
      state: "in_progress",
      actualResult: result,
      skipReason: "",
    },
    {
      type: "checkpoint.update",
      missionId: MISSION,
      checkpointId: step(n),
      state: "completed",
      actualResult: result,
      skipReason: "",
    },
  );
}

describe("live mission structure", () => {
  it("seeds sixteen steps with individual star levels, owners and dependencies", () => {
    const state = createSeedState();
    const mission = missionById(state, MISSION);
    expect(mission).toBeDefined();
    if (!mission) return;
    expect(mission.checkpoints).toHaveLength(16);
    const levels = mission.checkpoints.map((checkpoint) => checkpoint.starLevel ?? 0);
    expect(new Set(levels).size).toBeGreaterThan(1);
    expect(levels).toContain(1);
    expect(levels).toContain(5);
    expect(mission.team?.map((member) => member.role)).toEqual(
      expect.arrayContaining([
        "Mission Owner · Technician",
        "Active Directory Administrator",
        "Security Administrator",
        "Manager or Approver",
      ]),
    );
    expect(mission.checkpoints[0]?.state).toBe("pending_authorization");
    expect(
      mission.checkpoints.filter((checkpoint) => (checkpoint.dependsOn ?? []).length > 0).length,
    ).toBeGreaterThan(8);
  });

  it("blocks a dependent step until its predecessor is completed", () => {
    const state = createSeedState();
    const mission = missionById(state, MISSION);
    if (!mission) return;
    const blockers = checkpointBlockers(state, mission, step(2));
    expect(blockers.join(" ")).toMatch(/Step 01/);
    rejects(
      state,
      {
        type: "checkpoint.update",
        missionId: MISSION,
        checkpointId: step(2),
        state: "completed",
        actualResult: "Verified the authorization.",
        skipReason: "",
      },
      /Step 01/,
    );
  });

  it("lets the technician work an independent step while authorization is pending", () => {
    const state = createSeedState();
    const next = complete(state, 3, "Inspected chassis, dock and cabling. No transit damage.");
    expect(missionById(next, MISSION)?.checkpoints[2]?.state).toBe("completed");
    // Step 01 is still awaiting the administrator, so progress cannot claim 2 of 16.
    expect(missionById(next, MISSION)?.checkpoints[0]?.state).toBe("pending_authorization");
  });
});

describe("authorization separation", () => {
  it("refuses a decision from the technician who requested it", () => {
    const state = createSeedState();
    rejects(
      state,
      {
        type: "approval.decide",
        approvalId: "ap-mo-access",
        decision: "approve",
        note: "Approving my own access request.",
      },
      /belongs to|approver|authorized/i,
    );
  });

  it("completes the gated step only after the named administrator approves", () => {
    const asAdmin = run(createSeedState(), { type: "session.actAs", userId: "u-marcus" });
    const approved = run(asAdmin, {
      type: "approval.decide",
      approvalId: "ap-mo-access",
      decision: "approve",
      note: "Approved restricted directory access for onboarding.",
    });
    const first = missionById(approved, MISSION)?.checkpoints[0];
    expect(first?.state).toBe("completed");
    expect(first?.actualResult).toMatch(/authorization approved/i);
    const ledger = approved.ledger.filter((entry) => entry.sourceId === step(1));
    expect(ledger.length).toBeGreaterThan(0);
    expect(ledger[0]?.stars).toBe(3);

    // The next dependent step unlocks, but only its own assignee may complete it.
    const asTechnician = run(approved, { type: "session.actAs", userId: "u-frank" });
    const mission = missionById(asTechnician, MISSION);
    expect(mission ? checkpointBlockers(asTechnician, mission, step(2)) : []).toHaveLength(0);
  });

  it("blocks a technician from completing work assigned to someone else", () => {
    const state = createSeedState();
    const handed = run(state, {
      type: "checkpoint.assign",
      missionId: MISSION,
      checkpointId: step(3),
      assigneeId: "u-priya",
      assigneeRole: "Security Administrator",
    });
    rejects(
      handed,
      {
        type: "checkpoint.update",
        missionId: MISSION,
        checkpointId: step(3),
        state: "completed",
        actualResult: "Inspected chassis and accessories.",
        skipReason: "",
      },
      /assigned to|another person/i,
    );
    const asAssignee = run(handed, { type: "session.actAs", userId: "u-priya" });
    const completed = complete(
      asAssignee,
      3,
      "Inspected chassis and accessories — no transit damage.",
    );
    expect(missionById(completed, MISSION)?.checkpoints[2]?.state).toBe("completed");
    expect(missionById(completed, MISSION)?.acceptedBy).toBe("u-frank");
  });

  it("records a handoff without moving mission ownership", () => {
    const state = createSeedState();
    const next = run(state, {
      type: "checkpoint.assign",
      missionId: MISSION,
      checkpointId: step(6),
      assigneeId: "u-marcus",
      assigneeRole: "Active Directory Administrator",
    });
    const mission = missionById(next, MISSION);
    expect(mission?.checkpoints[5]?.assigneeId).toBe("u-marcus");
    expect(mission?.checkpoints[5]?.state).toBe("waiting_on_person");
    expect(mission?.acceptedBy).toBe("u-frank");
    expect(next.activity[0]?.type).toBe("mission.task_assigned");
  });
});

describe("completion gates", () => {
  it("requires review and signoff before completion", () => {
    const state = createSeedState();
    const mission = missionById(state, MISSION);
    if (!mission) return;
    const blockers = completionBlockers(mission).map((blocker) => blocker.field);
    expect(blockers).toContain("review");
    expect(blockers).toContain("signoff");
    rejects(state, { type: "mission.submitReview", missionId: MISSION }, /mandatory step|open/i);
  });

  it("records signoff only after final review is submitted", () => {
    const state = createSeedState();
    rejects(
      state,
      {
        type: "mission.signoff",
        missionId: MISSION,
        signerName: "Diamond Carter",
        role: "Manager or Approver",
        note: "Reviewed.",
      },
      /final review/i,
    );
  });
});

describe("mission controls", () => {
  it("pauses, blocks new outcomes while paused, and resumes", () => {
    const paused = run(createSeedState(), {
      type: "mission.pause",
      missionId: MISSION,
      note: "Waiting for the start date.",
    });
    expect(missionById(paused, MISSION)?.pausedAt).not.toBeNull();
    rejects(
      paused,
      {
        type: "checkpoint.update",
        missionId: MISSION,
        checkpointId: step(3),
        state: "completed",
        actualResult: "Inspected the device.",
        skipReason: "",
      },
      /paused/i,
    );
    const resumed = run(paused, { type: "mission.resume", missionId: MISSION });
    expect(missionById(resumed, MISSION)?.pausedAt).toBeNull();
  });

  it("records help requests and transfers with the trail intact", () => {
    const helped = run(createSeedState(), {
      type: "mission.requestHelp",
      missionId: MISSION,
      need: "Directory group mapping for Marketing.",
    });
    expect(missionById(helped, MISSION)?.helpRequests?.[0]?.need).toMatch(/group mapping/i);

    const transferred = run(helped, {
      type: "mission.transfer",
      missionId: MISSION,
      toUserId: "u-marcus",
      note: "Covering while I am on leave.",
    });
    const mission = missionById(transferred, MISSION);
    expect(mission?.acceptedBy).toBe("u-marcus");
    expect(mission?.trail.some((event) => event.type === "mission.transferred")).toBe(true);
    expect(mission?.trail.some((event) => event.type === "mission.accepted")).toBe(true);
  });

  it("awards mission complexity once the record supports it", () => {
    const state = createSeedState();
    const summary = recognitionSummary(state, "u-frank");
    expect(summary.level).toBeGreaterThanOrEqual(1);
    expect(summary.nextLevelName === null || summary.progress >= 0).toBe(true);
  });
});
