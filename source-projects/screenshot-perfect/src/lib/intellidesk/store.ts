// IntelliDesk Mission Control — demo data + client store.
// DEMO-ONLY: state lives in the browser (localStorage). Backend enforcement
// (permissions, SLA engine, star awards) is pending Lovable Cloud connection.
import { useSyncExternalStore } from "react";

export type Priority = "Critical" | "High" | "Normal" | "Low";
export type Severity = "Sev 1" | "Sev 2" | "Sev 3" | "Sev 4";
export type MissionStatus =
  | "Unassigned"
  | "Available"
  | "Accepted"
  | "In Progress"
  | "Paused"
  | "Escalated"
  | "Pending Verification"
  | "Resolved"
  | "Closed";
export type SupportLevel = 1 | 2 | 3;
export type Role = "Technician" | "Manager";

export interface ObjectiveDef {
  id: string;
  title: string;
  instructions: string;
  requirement: string;
  stars: number;
  evidenceRequired: boolean;
  approvalRequired: boolean;
  optional?: boolean | undefined;
}

export interface ObjectiveState extends ObjectiveDef {
  notes: string;
  attachments: string[];
  completedAt?: number | undefined;
  completedBy?: string | undefined;
  awaitingApproval?: boolean | undefined;
  approvedBy?: string | undefined;
  starsEarned: number;
}

export interface LogEntry {
  at: number;
  who: string;
  kind: "activity" | "note" | "requester" | "assignment" | "sla" | "recognition";
  text: string;
}

export interface Mission {
  id: string; // underlying ticket record ID — retained for tracking/integration
  title: string;
  description: string;
  priority: Priority;
  severity: Severity;
  requester: string;
  affectedUser: string;
  department: string;
  asset: string;
  category: string;
  subcategory: string;
  templateId: string;
  team: string;
  technician?: string | undefined;
  status: MissionStatus;
  receivedAt: number;
  responseDue: number;
  resolutionDue: number;
  respondedAt?: number | undefined;
  acceptedAt?: number | undefined;
  closedAt?: number | undefined;
  escalated: boolean;
  related: string[];
  kb: string[];
  estimate: string;
  objectives: ObjectiveState[];
  log: LogEntry[];
}

export interface Technician {
  name: string;
  level: SupportLevel;
  team: string;
  availability: "Available" | "On Mission" | "Away" | "Offline";
  stars: number;
  objectivesCompleted: number;
  missionsCompleted: number;
  qualifications: string[];
}

export interface Template {
  id: string;
  name: string;
  defaultLevel: SupportLevel;
  slaPolicy: string;
  responseMin: number;
  resolutionMin: number;
  escalation: string;
  objectives: ObjectiveDef[];
}

const o = (
  id: string,
  title: string,
  stars: number,
  extra: Partial<ObjectiveDef> = {},
): ObjectiveDef => ({
  id,
  title,
  stars,
  instructions: extra.instructions ?? `Carry out: ${title.toLowerCase()}.`,
  requirement: extra.requirement ?? "Mark complete when finished.",
  evidenceRequired: extra.evidenceRequired ?? false,
  approvalRequired: extra.approvalRequired ?? false,
  optional: extra.optional,
});

const CORE: ObjectiveDef[] = [
  o("brief", "Review mission briefing", 1, { instructions: "Read the full briefing, SLA targets and related records." }),
  o("confirm", "Confirm requester and affected user", 1, { instructions: "Contact the requester and confirm identity and impact." }),
  o("asset", "Verify device or asset information", 1, { instructions: "Validate asset tag, model and ownership against the asset record." }),
  o("diag", "Perform initial diagnostics", 2, {
    evidenceRequired: true,
    requirement: "Diagnostic notes or log output required.",
  }),
  o("root", "Identify the root cause", 2, { evidenceRequired: true, requirement: "Document the identified root cause." }),
  o("fix", "Implement the approved solution", 3, {
    evidenceRequired: true,
    approvalRequired: true,
    requirement: "Change notes required; supervisor verifies before stars are awarded.",
  }),
  o("verify", "Verify the solution with the requester", 2, { evidenceRequired: true, requirement: "Record requester confirmation." }),
  o("doc", "Document the resolution", 1, { evidenceRequired: true, requirement: "Resolution summary required." }),
];

const mk = (id: string, name: string, lvl: SupportLevel, policy: string, r: number, res: number, esc: string, extra: ObjectiveDef[] = []): Template => ({
  id, name, defaultLevel: lvl, slaPolicy: policy, responseMin: r, resolutionMin: res, escalation: esc,
  objectives: [...CORE.slice(0, 6), ...extra, ...CORE.slice(6)],
});

export const TEMPLATES: Template[] = [
  mk("hw", "Hardware Support", 1, "Standard 8x5", 60, 480, "Escalate to L2 if hardware replacement needed"),
  mk("sw", "Software Support", 1, "Standard 8x5", 60, 480, "Escalate to L2 after 2 failed fixes"),
  mk("acct", "Account and Access Support", 1, "Priority 24x7", 15, 120, "Escalate to Security on privileged accounts", [
    o("mfa", "Validate MFA and identity proofing", 2, { evidenceRequired: true, approvalRequired: true }),
  ]),
  mk("net", "Network Support", 2, "Priority 24x7", 15, 240, "Escalate to L3 on site-wide impact"),
  mk("sec", "Security Support", 2, "Critical 24x7", 5, 120, "Notify SOC manager immediately", [
    o("contain", "Contain the threat", 3, { evidenceRequired: true, approvalRequired: true }),
  ]),
  mk("print", "Printer and Peripheral Support", 1, "Standard 8x5", 120, 960, "Vendor dispatch after 1 day"),
  mk("onb", "Onboarding Requests", 1, "Standard 8x5", 240, 2880, "Notify HR on missed start date"),
  mk("prov", "Device Provisioning", 1, "Standard 8x5", 240, 1440, "Escalate on stock shortage"),
  mk("svc", "Service Requests", 1, "Standard 8x5", 240, 1440, "Manager notification at 80% SLA"),
  mk("major", "Major Incidents", 3, "Critical 24x7", 5, 240, "Bridge call + exec notification", [
    o("comms", "Publish stakeholder communication", 2, { evidenceRequired: true, approvalRequired: true }),
  ]),
];

export const SUPPORT_LEVELS: Record<SupportLevel, { name: string; scope: string[] }> = {
  1: { name: "Frontline Operations", scope: ["Initial intake", "Basic troubleshooting", "Standard service requests", "Approved first-line resolutions", "Documentation and routing"] },
  2: { name: "Advanced Support", scope: ["Complex troubleshooting", "Advanced diagnostics", "Level 1 escalations", "Specialized technical resolutions"] },
  3: { name: "Senior Engineering", scope: ["Advanced engineering", "Critical technical incidents", "Complex infrastructure issues", "Highest-level escalations"] },
};

export const TEAMS = ["L1 Support", "L2 Support", "L3 Engineering", "Network Ops", "Security Ops"];

const TECHS: Technician[] = [
  { name: "Diamond Carter", level: 2, team: "L2 Support", availability: "Available", stars: 214, objectivesCompleted: 132, missionsCompleted: 41, qualifications: ["ITIL 4 Foundation", "CompTIA Network+"] },
  { name: "Marcus Johnson", level: 1, team: "L1 Support", availability: "On Mission", stars: 96, objectivesCompleted: 70, missionsCompleted: 22, qualifications: ["CompTIA A+"] },
  { name: "Priya Raman", level: 3, team: "L3 Engineering", availability: "Available", stars: 488, objectivesCompleted: 301, missionsCompleted: 88, qualifications: ["CCNP", "AWS SA Pro"] },
  { name: "Leo Alvarez", level: 2, team: "Network Ops", availability: "On Mission", stars: 175, objectivesCompleted: 118, missionsCompleted: 37, qualifications: ["CCNA"] },
  { name: "Hannah Brooks", level: 1, team: "L1 Support", availability: "Away", stars: 61, objectivesCompleted: 44, missionsCompleted: 14, qualifications: ["CompTIA A+"] },
  { name: "Kenji Watanabe", level: 3, team: "Security Ops", availability: "Available", stars: 402, objectivesCompleted: 260, missionsCompleted: 71, qualifications: ["CISSP", "GCIH"] },
];

type Seed = [string, string, Priority, Severity, string, string, string, string, string, string, number, MissionStatus, string?];
const SEEDS: Seed[] = [
  ["INC-4842", "Email not syncing on executive laptop", "High", "Sev 2", "Marcus Johnson", "Finance", "LT-2291 Dell XPS 15", "sw", "Email Client", "L1 Support", 25, "Available"],
  ["INC-4851", "Core switch packet loss — Building C", "Critical", "Sev 1", "Facilities Desk", "Operations", "SW-CORE-03 Cisco 9500", "net", "LAN", "Network Ops", 12, "Escalated", "Leo Alvarez"],
  ["SR-4810", "New hire onboarding — 3 accounts", "Normal", "Sev 3", "Jenna Ortiz", "HR", "N/A", "onb", "New Hire", "L1 Support", 180, "Unassigned"],
  ["INC-4839", "Workstation blue screen on boot", "High", "Sev 2", "Tomás Reyes", "Engineering", "WS-D1047 HP Z4", "hw", "Desktop", "L1 Support", 70, "Available"],
  ["SR-4805", "Finance portal access request", "Normal", "Sev 3", "Alicia Grant", "Finance", "Finance Portal", "acct", "Access Grant", "L1 Support", 95, "In Progress", "Diamond Carter"],
  ["SEC-4860", "Suspicious login from foreign IP", "Critical", "Sev 1", "SOC Monitor", "Security", "Okta Tenant", "sec", "Identity Threat", "Security Ops", 4, "Available"],
  ["INC-4822", "Floor 4 printer offline", "Low", "Sev 4", "Ray Patel", "Legal", "PRN-4F HP M607", "print", "Network Printer", "L1 Support", 300, "Unassigned"],
  ["SR-4799", "Provision 10 laptops for sales", "Normal", "Sev 3", "Dana Kim", "Sales", "Stock pool", "prov", "Laptop Batch", "L1 Support", 600, "Available"],
  ["MAJ-4870", "ERP outage — all regions", "Critical", "Sev 1", "NOC", "All", "ERP-PROD Cluster", "major", "Application Outage", "L3 Engineering", 18, "In Progress", "Priya Raman"],
  ["INC-4815", "VPN drops every 10 minutes", "High", "Sev 2", "Grace Liu", "Marketing", "GlobalProtect", "net", "VPN", "Network Ops", 140, "Unassigned"],
  ["SR-4790", "Install Adobe CC for design team", "Low", "Sev 4", "Owen Hart", "Marketing", "Software Center", "svc", "Software Install", "L1 Support", 900, "Closed", "Hannah Brooks"],
];

function buildMission(s: Seed, now: number): Mission {
  const [id, title, priority, severity, requester, department, asset, templateId, sub, team, ago, status, tech] = s;
  const t = TEMPLATES.find((x) => x.id === templateId)!;
  const factor = priority === "Critical" ? 0.25 : priority === "High" ? 0.5 : 1;
  const receivedAt = now - ago * 60_000;
  const accepted = !!tech;
  const objectives: ObjectiveState[] = t.objectives.map((d, i) => {
    const done = status === "Closed" || (accepted && i < 3);
    return {
      ...d, notes: done && d.evidenceRequired ? "Completed per runbook." : "", attachments: [],
      completedAt: done ? receivedAt + (i + 1) * 300_000 : undefined, completedBy: done ? tech : undefined,
      approvedBy: done && d.approvalRequired ? "Service Desk Manager" : undefined, starsEarned: done ? d.stars : 0,
    };
  });
  return {
    id, title, priority, severity, requester, affectedUser: requester, department, asset,
    category: t.name, subcategory: sub, templateId, team, technician: tech, status,
    description: `${title}. Reported by ${requester} (${department}). Impact assessed as ${severity}. Follow the ${t.name} template and the linked knowledge articles.`,
    receivedAt,
    responseDue: receivedAt + t.responseMin * factor * 60_000,
    resolutionDue: receivedAt + t.resolutionMin * factor * 60_000,
    respondedAt: accepted ? receivedAt + 120_000 : undefined,
    acceptedAt: accepted ? receivedAt + 120_000 : undefined,
    closedAt: status === "Closed" ? now - 3_600_000 : undefined,
    escalated: status === "Escalated",
    related: [`INC-${4700 + (id.charCodeAt(4) % 90)}`],
    kb: [`KB-${1000 + (id.charCodeAt(5) % 400)}: ${t.name} runbook`, `KB-${1500 + (id.charCodeAt(6) % 300)}: ${sub} troubleshooting`],
    estimate: priority === "Critical" ? "1–2 h" : "2–4 h",
    objectives,
    log: [
      { at: receivedAt, who: "System", kind: "activity", text: `Ticket ${id} created via service portal.` },
      ...(accepted ? [{ at: receivedAt + 120_000, who: tech!, kind: "assignment" as const, text: `Mission accepted by ${tech}.` }] : []),
    ],
  };
}

export interface State {
  version: number;
  me: string;
  role: Role;
  missions: Mission[];
  technicians: Technician[];
  templates: Template[];
  recognition: { at: number; who: string; missionId: string; objective: string; stars: number }[];
}

const KEY = "intellidesk-state-v1";
let state: State | null = null;
const listeners = new Set<() => void>();
const serverSnapshot: State = { version: 1, me: "Diamond Carter", role: "Technician", missions: [], technicians: TECHS, templates: TEMPLATES, recognition: [] };

export function seedState(now = Date.now()): State {
  return { version: 1, me: "Diamond Carter", role: "Technician", missions: SEEDS.map((s) => buildMission(s, now)), technicians: structuredClone(TECHS), templates: structuredClone(TEMPLATES), recognition: [] };
}

function load(): State {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as State) : seedState();
  } catch {
    state = seedState();
  }
  return state;
}

export function setState(fn: (s: State) => State) {
  state = fn(load());
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function resetDemo() { setState(() => seedState()); }

export function useStore(): State & { ready: boolean } {
  const s = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => load(),
    () => serverSnapshot,
  );
  return { ...s, ready: s !== serverSnapshot };
}

// ---------- pure domain rules (tested) ----------
export const possibleStars = (m: Mission) => m.objectives.reduce((a, x) => a + x.stars, 0);
export const earnedStars = (m: Mission) => m.objectives.reduce((a, x) => a + x.starsEarned, 0);
export const progressPct = (m: Mission) => {
  const req = m.objectives.filter((x) => !x.optional);
  return req.length ? Math.round((req.filter((x) => x.starsEarned > 0).length / req.length) * 100) : 0;
};

export type CompleteResult = { ok: true; mission: Mission; awarded: number; pending: boolean } | { ok: false; reason: string };

export function completeObjective(m: Mission, objId: string, who: string, now = Date.now()): CompleteResult {
  if (m.technician !== who) return { ok: false, reason: "Only the assigned technician can complete objectives." };
  if (!["Accepted", "In Progress", "Escalated"].includes(m.status)) return { ok: false, reason: `Mission is ${m.status}; objectives are locked.` };
  const obj = m.objectives.find((x) => x.id === objId);
  if (!obj) return { ok: false, reason: "Objective not found." };
  if (obj.completedAt) return { ok: false, reason: "Objective already completed." };
  if (obj.evidenceRequired && obj.notes.trim().length < 10 && obj.attachments.length === 0)
    return { ok: false, reason: "Evidence required: add notes (10+ characters) or an attachment." };
  const pending = obj.approvalRequired;
  const awarded = pending ? 0 : obj.stars;
  const objectives = m.objectives.map((x) => x.id === objId ? { ...x, completedAt: now, completedBy: who, awaitingApproval: pending, starsEarned: awarded } : x);
  return { ok: true, awarded, pending, mission: { ...m, status: "In Progress", objectives } };
}

export function approveObjective(m: Mission, objId: string, approver: string, role: Role): CompleteResult {
  if (role !== "Manager") return { ok: false, reason: "Supervisor approval requires the Manager role." };
  const obj = m.objectives.find((x) => x.id === objId);
  if (!obj || !obj.awaitingApproval) return { ok: false, reason: "Nothing awaiting approval." };
  const objectives = m.objectives.map((x) => x.id === objId ? { ...x, awaitingApproval: false, approvedBy: approver, starsEarned: x.stars } : x);
  return { ok: true, awarded: obj.stars, pending: false, mission: { ...m, objectives } };
}

export function canSubmitForResolution(m: Mission): string | null {
  const open = m.objectives.filter((x) => !x.optional && (!x.completedAt || x.awaitingApproval));
  if (open.length) return `${open.length} required objective(s) still open or awaiting approval.`;
  return null;
}

export type SlaState = "met" | "ok" | "warning" | "breached";
export function slaState(m: Mission, now: number): SlaState {
  if (m.status === "Closed" || m.status === "Resolved") return (m.closedAt ?? now) <= m.resolutionDue ? "met" : "breached";
  if (now > m.resolutionDue) return "breached";
  const total = m.resolutionDue - m.receivedAt;
  return (m.resolutionDue - now) / total < 0.25 ? "warning" : "ok";
}

export function fmtCountdown(ms: number) {
  const neg = ms < 0; const a = Math.abs(ms);
  const h = Math.floor(a / 3_600_000); const mm = Math.floor((a % 3_600_000) / 60_000); const ss = Math.floor((a % 60_000) / 1000);
  return `${neg ? "-" : ""}${h ? `${h}h ` : ""}${mm}m ${String(ss).padStart(2, "0")}s`;
}

export function updateMission(id: string, fn: (m: Mission) => Mission) {
  setState((s) => ({ ...s, missions: s.missions.map((m) => (m.id === id ? fn(m) : m)) }));
}

export const addLog = (m: Mission, who: string, kind: LogEntry["kind"], text: string): Mission => ({ ...m, log: [...m.log, { at: Date.now(), who, kind, text }] });

export const FILTERS = ["All", "Critical", "High", "Normal", "Low", "Unassigned", "Available to Accept", "Assigned to Me", "My Team", "Escalated", "SLA Warning", "SLA Breached", "Active", "Completed"] as const;
export type Filter = (typeof FILTERS)[number];

export function applyFilter(ms: Mission[], f: Filter, me: Technician | undefined, now: number) {
  const active = (m: Mission) => !["Closed", "Resolved"].includes(m.status);
  switch (f) {
    case "All": return ms;
    case "Critical": case "High": case "Normal": case "Low": return ms.filter((m) => m.priority === f && active(m));
    case "Unassigned": return ms.filter((m) => !m.technician && active(m));
    case "Available to Accept": return ms.filter((m) => !m.technician && (m.status === "Available" || m.status === "Unassigned"));
    case "Assigned to Me": return ms.filter((m) => m.technician === me?.name && active(m));
    case "My Team": return ms.filter((m) => m.team === me?.team);
    case "Escalated": return ms.filter((m) => m.escalated && active(m));
    case "SLA Warning": return ms.filter((m) => active(m) && slaState(m, now) === "warning");
    case "SLA Breached": return ms.filter((m) => active(m) && slaState(m, now) === "breached");
    case "Active": return ms.filter(active);
    case "Completed": return ms.filter((m) => !active(m));
  }
}
