import { describe, expect, it } from "vitest";
import { approveObjective, canSubmitForResolution, completeObjective, earnedStars, seedState, slaState } from "./store";

const fresh = () => {
  const s = seedState(1_000_000_000);
  const m = s.missions.find((x) => x.id === "SR-4805")!; // assigned to Diamond Carter, first 3 objectives done
  return m;
};

describe("mission objectives & stars", () => {
  it("awards the objective's star value only for that objective", () => {
    const m = fresh();
    const before = earnedStars(m);
    const r = completeObjective({ ...m, objectives: m.objectives.map((o) => (o.id === "diag" ? { ...o, notes: "Checked logs, auth errors found" } : o)) }, "diag", "Diamond Carter");
    expect(r.ok && earnedStars(r.mission) - before).toBe(2);
  });
  it("blocks evidence-required objectives without notes", () => {
    expect(completeObjective(fresh(), "diag", "Diamond Carter").ok).toBe(false);
  });
  it("blocks someone other than the assigned technician", () => {
    expect(completeObjective(fresh(), "brief", "Marcus Johnson").ok).toBe(false);
  });
  it("holds stars until a manager approves", () => {
    const m = { ...fresh(), objectives: fresh().objectives.map((o) => (o.id === "fix" ? { ...o, notes: "Applied group change" } : o)) };
    const r = completeObjective(m, "fix", "Diamond Carter");
    expect(r.ok && r.awarded).toBe(0);
    if (!r.ok) return;
    expect(approveObjective(r.mission, "fix", "Tech", "Technician").ok).toBe(false);
    const a = approveObjective(r.mission, "fix", "Mgr", "Manager");
    expect(a.ok && a.awarded).toBe(3);
  });
  it("cannot submit for resolution with open objectives", () => {
    expect(canSubmitForResolution(fresh())).not.toBeNull();
  });
  it("stars do not mark SLA as met while still open past deadline", () => {
    const m = fresh();
    expect(slaState(m, m.resolutionDue + 1)).toBe("breached");
  });
});
