import { describe, expect, it } from "vitest";
import { backoffMs, canEmit, deriveHealth, dueEvents, nextState } from "./engine";

describe("IntelliSync engine", () => {
  it("backs off exponentially, capped at one hour", () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(3)).toBe(120_000);
    expect(backoffMs(20)).toBe(3_600_000);
  });
  it("marks an event dead after max attempts", () => {
    expect(nextState({ attempts: 4, max_attempts: 5 }, false).status).toBe("dead");
    expect(nextState({ attempts: 0, max_attempts: 5 }, false).status).toBe("failed");
    expect(nextState({ attempts: 0, max_attempts: 5 }, true).status).toBe("succeeded");
  });
  it("derives health from recent outcomes", () => {
    expect(deriveHealth([])).toBe("not_connected");
    expect(deriveHealth([{ status: "succeeded" }])).toBe("healthy");
    expect(deriveHealth([{ status: "failed" }, { status: "succeeded" }])).toBe("failed");
  });
  it("only returns due pending/failed events", () => {
    const now = Date.now();
    const evs = [
      { status: "pending" as const, next_attempt_at: new Date(now - 1).toISOString() },
      { status: "failed" as const, next_attempt_at: new Date(now + 60_000).toISOString() },
      { status: "succeeded" as const, next_attempt_at: new Date(now - 1).toISOString() },
    ];
    expect(dueEvents(evs, now)).toHaveLength(1);
  });
  it("only admins may emit role changes; employees only tickets", () => {
    expect(canEmit(["admin"], "role.changed")).toBe(true);
    expect(canEmit(["it_staff"], "role.changed")).toBe(false);
    expect(canEmit(["employee"], "user.created")).toBe(false);
    expect(canEmit(["employee"], "ticket.created")).toBe(true);
  });
});
