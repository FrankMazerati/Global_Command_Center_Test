import { toast } from "sonner";
import {
  addLog, approveObjective, canSubmitForResolution, completeObjective, earnedStars, setState, TEAMS, type Mission, type State,
} from "./store";

const getMission = (s: State, id: string) => s.missions.find((m) => m.id === id)!;

function award(s: State, who: string, missionId: string, objective: string, stars: number): State {
  return {
    ...s,
    technicians: s.technicians.map((t) => t.name === who ? { ...t, stars: t.stars + stars, objectivesCompleted: t.objectivesCompleted + 1 } : t),
    recognition: [{ at: Date.now(), who, missionId, objective, stars }, ...s.recognition],
  };
}
const put = (s: State, m: Mission): State => ({ ...s, missions: s.missions.map((x) => (x.id === m.id ? m : x)) });

export function acceptMission(id: string) {
  setState((s) => {
    const m = getMission(s, id);
    if (m.technician) { toast.error(`Already assigned to ${m.technician}`); return s; }
    const now = Date.now();
    let nm: Mission = { ...m, technician: s.me, status: "Accepted", acceptedAt: now, respondedAt: m.respondedAt ?? now };
    nm = addLog(nm, s.me, "assignment", `Mission accepted by ${s.me}.`);
    toast.success("Mission accepted", { description: `${id} is now in your Mission Workspace.` });
    return { ...put(s, nm), technicians: s.technicians.map((t) => (t.name === s.me ? { ...t, availability: "On Mission" } : t)) };
  });
}

export function setObjectiveField(id: string, objId: string, patch: { notes?: string; attachments?: string[] }) {
  setState((s) => {
    const m = getMission(s, id);
    return put(s, { ...m, objectives: m.objectives.map((o) => (o.id === objId ? { ...o, ...patch } : o)) });
  });
}

export function doCompleteObjective(id: string, objId: string) {
  setState((s) => {
    const m = getMission(s, id);
    const r = completeObjective(m, objId, s.me);
    if (!r.ok) { toast.error(r.reason); return s; }
    const obj = m.objectives.find((o) => o.id === objId)!;
    let nm = addLog(r.mission, s.me, "activity", `Objective completed: ${obj.title}${r.pending ? " (awaiting supervisor approval)" : ""}.`);
    if (r.pending) { toast.info("Objective submitted for approval", { description: `${obj.stars}★ will be awarded after supervisor verification.` }); return put(s, nm); }
    nm = addLog(nm, "System", "recognition", `${s.me} earned ${r.awarded}★ for "${obj.title}".`);
    toast.success(`+${r.awarded}★ earned`, { description: obj.title });
    return award(put(s, nm), s.me, id, obj.title, r.awarded);
  });
}

export function doApprove(id: string, objId: string) {
  setState((s) => {
    const m = getMission(s, id);
    const r = approveObjective(m, objId, s.me, s.role);
    if (!r.ok) { toast.error(r.reason); return s; }
    const obj = m.objectives.find((o) => o.id === objId)!;
    const nm = addLog(addLog(r.mission, s.me, "activity", `Supervisor approved: ${obj.title}.`), "System", "recognition", `${m.technician} earned ${r.awarded}★ for "${obj.title}".`);
    toast.success(`Approved — ${m.technician} earned ${r.awarded}★`);
    return award(put(s, nm), m.technician!, id, obj.title, r.awarded);
  });
}

export function addWorkLog(id: string, text: string, kind: "note" | "requester" = "note") {
  setState((s) => put(s, addLog(getMission(s, id), s.me, kind, text)));
  toast.success("Mission Log updated");
}

export function escalate(id: string, to: string, reason: string) {
  setState((s) => {
    const m = getMission(s, id);
    toast.warning(`Mission ${id} escalated to ${to}`);
    return put(s, addLog({ ...m, escalated: true, status: "Escalated", team: to }, s.me, "assignment", `Escalated to ${to}: ${reason}`));
  });
}

export function transfer(id: string, to: string, reason: string) {
  setState((s) => {
    const m = getMission(s, id);
    const isTeam = TEAMS.includes(to);
    toast.success(`Mission transferred to ${to}`);
    const nm: Mission = isTeam ? { ...m, team: to, technician: undefined, status: "Available" } : { ...m, technician: to, status: "Accepted" };
    return put(s, addLog(nm, s.me, "assignment", `Transferred to ${to}: ${reason}`));
  });
}

export function pauseToggle(id: string) {
  setState((s) => {
    const m = getMission(s, id);
    if (s.role !== "Manager" && m.priority === "Critical") { toast.error("Critical missions can only be paused by a Manager."); return s; }
    const paused = m.status === "Paused";
    toast(paused ? "Mission resumed" : "Mission paused", { description: "SLA clock pause rules are enforced by the backend SLA engine (pending)." });
    return put(s, addLog({ ...m, status: paused ? "In Progress" : "Paused" }, s.me, "activity", paused ? "Mission resumed." : "Mission paused."));
  });
}

export function submitForResolution(id: string) {
  setState((s) => {
    const m = getMission(s, id);
    const why = canSubmitForResolution(m);
    if (why) { toast.error(why); return s; }
    toast.success("Submitted for resolution", { description: "Awaiting verification and closure." });
    return put(s, addLog({ ...m, status: "Pending Verification" }, s.me, "activity", "Submitted for resolution."));
  });
}

export function closeMission(id: string) {
  setState((s) => {
    const m = getMission(s, id);
    if (s.role !== "Manager") { toast.error("Verification & closure requires the Manager role."); return s; }
    if (m.status !== "Pending Verification") { toast.error("Mission must be submitted for resolution first."); return s; }
    const now = Date.now();
    toast.success(`Mission ${id} complete`, { description: `${earnedStars(m)}★ recognized for ${m.technician}.` });
    return {
      ...put(s, addLog({ ...m, status: "Closed", closedAt: now }, s.me, "activity", "Resolution verified. Mission closed.")),
      technicians: s.technicians.map((t) => (t.name === m.technician ? { ...t, missionsCompleted: t.missionsCompleted + 1, availability: "Available" } : t)),
    };
  });
}
