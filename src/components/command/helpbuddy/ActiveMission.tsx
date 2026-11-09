import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  CircleDot,
  ClipboardList,
  Clock3,
  FileText,
  Flag,
  History,
  LifeBuoy,
  Lock,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Signature,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  UserRoundCog,
  Users,
} from "lucide-react";
import type { Checkpoint, CheckpointState, Mission, MissionTeamMember } from "@/lib/domain/types";
import {
  CHECKPOINT_LABEL,
  CHECKPOINT_TONE,
  PRIORITY_TONE,
  formatDateTime,
  relativeTime,
} from "@/lib/domain/format";
import { useAction, useCommandState, useDraft } from "@/lib/domain/store";
import { activeUser, recognitionSummary } from "@/lib/domain/selectors";
import { checkpointBlockers } from "@/lib/domain/reducer";
import { Chip, Empty, Field, Note, Progress, type Tone } from "@/components/command/ui";
import buddyArt from "@/assets/help-buddy-face.png";

function BuddyAvatar({ mood }: { mood: "welcoming" | "waiting" | "celebrating" | "focused" }) {
  return (
    <div className={`mx-buddy-avatar is-${mood}`}>
      <img src={buddyArt} alt="Help Buddy" />
    </div>
  );
}

const STAR_MAX = 5;

function Stars({ level }: { level: number | undefined }) {
  const value = level ?? 1;
  return (
    <span
      className="mx-stars"
      aria-label={`Difficulty ${value} of ${STAR_MAX}`}
      title={`${value} of ${STAR_MAX} stars`}
    >
      {Array.from({ length: STAR_MAX }, (_, index) => (
        <Star key={index} className={index < value ? "is-on" : ""} aria-hidden />
      ))}
    </span>
  );
}

function stateTone(state: CheckpointState): Tone {
  return CHECKPOINT_TONE[state] as Tone;
}

interface NextActor {
  name: string;
  role: string;
  why: string;
  tone: Tone;
}

function nextActor(state: ReturnType<typeof useCommandState>, mission: Mission): NextActor {
  if (mission.signoff) {
    return {
      name: mission.acceptedBy ? nameOf(state, mission.acceptedBy) : "Mission owner",
      role: "Mission Owner",
      why: "Signoff recorded. Complete the mission to close it.",
      tone: "success",
    };
  }
  if (mission.reviewSubmittedAt) {
    const approver = mission.team?.find(
      (member) => member.role.includes("Manager") || member.role.includes("Approver"),
    );
    return {
      name: approver?.name ?? "Approver",
      role: approver?.role ?? "Manager or Approver",
      why: "Final review submitted — signoff is the only thing left.",
      tone: "warning",
    };
  }
  if (mission.pausedAt) {
    return {
      name: nameOf(state, mission.acceptedBy),
      role: "Mission Owner",
      why: "The mission is paused. Resume it to continue.",
      tone: "warning",
    };
  }
  const pendingApproval = mission.checkpoints.find(
    (checkpoint) => checkpoint.state === "pending_authorization",
  );
  if (pendingApproval) {
    const approval = state.approvals.find((item) => item.id === pendingApproval.approvalId);
    return {
      name:
        approval?.requiredApprover.split("·")[0]?.trim() ??
        nameOf(state, pendingApproval.assigneeId ?? null),
      role: pendingApproval.assigneeRole ?? "Administrator",
      why: `${pendingApproval.title} is waiting on an authorization decision you cannot make on your own.`,
      tone: "warning",
    };
  }
  const waiting = mission.checkpoints.find(
    (checkpoint) => checkpoint.state === "waiting_on_person",
  );
  if (waiting) {
    return {
      name: waiting.assigneeId
        ? nameOf(state, waiting.assigneeId)
        : (waiting.assigneeRole ?? "Another person"),
      role: waiting.assigneeRole ?? "Assigned task owner",
      why: `${waiting.title} was assigned to them; the mission stays with you.`,
      tone: "warning",
    };
  }
  const next = mission.checkpoints
    .filter((checkpoint) => checkpoint.state !== "completed" && checkpoint.state !== "skipped")
    .sort((left, right) => left.order - right.order)[0];
  if (next) {
    return {
      name: "You",
      role: "Mission Owner",
      why: `Next actionable step: ${String(next.order).padStart(2, "0")} · ${next.title}.`,
      tone: "info",
    };
  }
  return {
    name: "You",
    role: "Mission Owner",
    why: "Every step is recorded. Submit for final review.",
    tone: "success",
  };
}

function nameOf(state: ReturnType<typeof useCommandState>, userId: string | null): string {
  if (!userId) return "Unassigned";
  return state.users.find((user) => user.id === userId)?.name ?? userId;
}

function buddyLine(mission: Mission, next: NextActor, done: number, total: number): string {
  if (mission.signoff)
    return "Deployment complete! All required steps have been verified and signed off.";
  if (mission.pausedAt)
    return "We're paused. Nothing moves until you resume — I'll keep the checklist exactly where it is.";
  if (done === total)
    return "All sixteen steps are verified. Submit for final review so the approver can sign off.";
  if (next.tone === "warning") return `We're waiting on ${next.name.split(" ")[0]}. ${next.why}`;
  if (done === 0)
    return "Welcome to your new PC deployment! I'll guide you through each step. We'll verify each step as we go.";
  if (next.why.toLowerCase().includes("blocked"))
    return "This step needs attention before we continue.";
  return `Great work — ${done} of ${total} verified. Let's take care of the next checklist item.`;
}

function groupCounts(checkpoints: Checkpoint[]) {
  const count = (predicate: (checkpoint: Checkpoint) => boolean) =>
    checkpoints.filter(predicate).length;
  return {
    completed: count((item) => item.state === "completed"),
    inProgress: count((item) => item.state === "in_progress"),
    awaiting: count(
      (item) => item.state === "pending_authorization" || item.state === "waiting_on_person",
    ),
    verification: count((item) => item.state === "pending_verification"),
    blocked: count((item) => item.state === "blocked"),
    notStarted: count((item) => item.state === "not_started"),
  };
}

export function ActiveMission({
  missionId,
  onMissionChange,
  onOpenTab,
  collapsed,
  onToggleCollapsed,
}: {
  missionId: string | null;
  onMissionChange: (missionId: string) => void;
  onOpenTab: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const state = useCommandState();
  const act = useAction();
  const user = activeUser(state);
  const missions = useMemo(
    () =>
      state.missions.filter(
        (mission) =>
          mission.status === "accepted" ||
          mission.status === "in_progress" ||
          mission.status === "pending",
      ),
    [state.missions],
  );
  const mission = missions.find((item) => item.id === missionId) ?? missions[0] ?? null;

  if (!mission) {
    return (
      <div className="mx-mission-window">
        <Empty
          icon={ClipboardList}
          title="No active mission"
          description="Accept a mission in Mission Control and it will open here with its live checklist, team and records."
        />
      </div>
    );
  }

  const counts = groupCounts(mission.checkpoints);
  const total = mission.checkpoints.length;
  const done = counts.completed;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const next = nextActor(state, mission);
  const summary = recognitionSummary(state, state.activeUserId);
  const missionStars = state.ledger
    .filter((entry) => entry.sourceLabel.startsWith(mission.number))
    .reduce((sum, entry) => sum + entry.stars, 0);
  const approvals = state.approvals.filter((approval) => approval.missionId === mission.id);
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
  const evidenceCount = mission.checkpoints.reduce(
    (sum, checkpoint) => sum + checkpoint.evidence.length,
    0,
  );

  return (
    <section
      className={`mx-mission-window${collapsed ? " is-collapsed" : ""}`}
      aria-label="Active mission"
    >
      <header className="mx-mission-head">
        <div className="mx-mission-identity">
          <span className="mx-mission-number">{mission.missionRef ?? mission.number}</span>
          <div className="mx-mission-title">
            <strong>{mission.title}</strong>
            <span className="mx-tiny mx-muted">
              {mission.status === "pending"
                ? "Paused"
                : mission.status === "accepted"
                  ? "Accepted"
                  : "Accepted — Working"}{" "}
              · {mission.acceptedBy ? nameOf(state, mission.acceptedBy) : "Unassigned"} · {done} of{" "}
              {total} steps completed
            </span>
          </div>
          <Chip tone={PRIORITY_TONE[mission.priority]}>{mission.priority}</Chip>
          <Chip tone={mission.pausedAt ? "warning" : "info"}>
            {mission.pausedAt ? "Paused" : "Working"}
          </Chip>
          <label className="mx-mission-switch" title="Switch identity to act as the named approver">
            <span className="mx-sr">Act as</span>
            <select
              value={state.activeUserId}
              onChange={(event) => act({ type: "session.actAs", userId: event.target.value })}
            >
              {state.users.map((option) => (
                <option key={option.id} value={option.id}>
                  Act as · {option.name.split(" ")[0]} ({option.role})
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden />
          </label>
          {missions.length > 1 ? (
            <label className="mx-mission-switch">
              <span className="mx-sr">Active mission</span>
              <select value={mission.id} onChange={(event) => onMissionChange(event.target.value)}>
                {missions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.missionRef ?? item.number} · {item.title}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden />
            </label>
          ) : null}
        </div>
        <button
          type="button"
          className="mx-btn mx-btn--sm"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
        >
          {collapsed ? <Play /> : <ChevronDown />} {collapsed ? "OPEN MISSION" : "COLLAPSE"}
        </button>
      </header>

      {collapsed ? (
        <div className="mx-mission-strip">
          <Progress value={percent} />
          <span className="mx-tiny mx-muted">
            {done}/{total} verified · {next.name} needs to act next
          </span>
        </div>
      ) : (
        <div className="mx-mission-body">
          <div className="mx-mission-rail mx-mission-rail--fade">
            <div className="mx-buddy-bubble-row">
              <BuddyAvatar
                mood={
                  mission.pausedAt
                    ? "waiting"
                    : next.tone === "warning"
                      ? "waiting"
                      : mission.signoff
                        ? "celebrating"
                        : done === 0
                          ? "welcoming"
                          : "focused"
                }
              />
              <div className="mx-bubble">
                <p>{buddyLine(mission, next, done, total)}</p>
                <span className="mx-bubble-tail" aria-hidden />
              </div>
            </div>

            <div className="mx-mission-progress">
              <div className="mx-inline" style={{ justifyContent: "space-between" }}>
                <span className="mx-label">Live mission checklist</span>
                <span className="mx-tiny mx-muted">
                  {done} / {total} · {percent}%
                </span>
              </div>
              <Progress
                value={percent}
                {...(percent === 100 ? { tone: "success" as const } : {})}
              />
              <div className="mx-mission-counts">
                <span>
                  <i className="is-done" /> {counts.completed} done
                </span>
                <span>
                  <i className="is-progress" /> {counts.inProgress} in progress
                </span>
                <span>
                  <i className="is-wait" /> {counts.awaiting} awaiting others
                </span>
                <span>
                  <i className="is-verify" /> {counts.verification} verifying
                </span>
                <span>
                  <i className="is-blocked" /> {counts.blocked} blocked
                </span>
                <span>
                  <i className="is-idle" /> {counts.notStarted} not started
                </span>
              </div>
            </div>

            <div className="mx-next-actor">
              <span className="mx-label">
                <UserRoundCog aria-hidden /> Who needs to act next
              </span>
              <strong>{next.name}</strong>
              <span className="mx-tiny mx-muted">{next.role}</span>
              <p className="mx-tiny">{next.why}</p>
            </div>

            <div className="mx-mission-team">
              <span className="mx-label">
                <Users aria-hidden /> Mission team
              </span>
              {(
                mission.team ?? [
                  {
                    userId: mission.acceptedBy ?? "",
                    name: nameOf(state, mission.acceptedBy),
                    role: "Mission Owner",
                    department: "",
                    responsibility: "",
                    availability: "available" as const,
                  },
                ]
              ).map((member) => (
                <TeamRow key={member.userId || member.role} member={member} />
              ))}
              <span className="mx-tiny mx-muted">
                Use “Act as” to see a decision from the approver&apos;s side.
              </span>
            </div>
          </div>

          <div className="mx-mission-checklist">
            <div className="mx-mission-checklist-head">
              <span className="mx-label">
                <ClipboardList aria-hidden /> Mission checklist
              </span>
              <span className="mx-tiny mx-muted">
                Every step records its own result, evidence, assignee and timestamp
              </span>
            </div>
            <div className="mx-mission-scroll">
              {mission.checkpoints.map((checkpoint) => (
                <StepRow
                  key={checkpoint.id}
                  mission={mission}
                  checkpoint={checkpoint}
                  blocked={checkpointBlockers(state, mission, checkpoint.id)}
                  canAct={!mission.pausedAt}
                  onOpenTab={onOpenTab}
                />
              ))}
            </div>
          </div>

          <div className="mx-mission-rail mx-mission-rail--right">
            <div className="mx-mission-records">
              <span className="mx-label">
                <FileText aria-hidden /> Mission records
              </span>
              <RecordRow
                label="Documents"
                value={`${mission.documentIds.length} linked`}
                onClick={() => onOpenTab("Attachments")}
              />
              <RecordRow
                label="Evidence"
                value={`${evidenceCount} items`}
                onClick={() => onOpenTab("Attachments")}
              />
              <RecordRow
                label="Approvals"
                value={
                  pendingApprovals.length > 0
                    ? `${pendingApprovals.length} pending`
                    : `${approvals.length} recorded`
                }
                onClick={() => onOpenTab("Approvals")}
                tone={pendingApprovals.length > 0 ? "warning" : "neutral"}
              />
              <RecordRow
                label="Signatures"
                value={mission.signoff ? "Signed off" : "Required at close"}
                onClick={() => onOpenTab("Signatures")}
              />
              <RecordRow
                label="Notes"
                value={`${mission.internalNotes.length} internal`}
                onClick={() => onOpenTab("Notes")}
              />
              <RecordRow
                label="Activity"
                value={`${mission.trail.length} events`}
                onClick={() => onOpenTab("Ticket Trail")}
              />
              <RecordRow
                label="Recognition"
                value={`${missionStars} stars earned`}
                onClick={() => onOpenTab("Recognition Ledger")}
                tone="warning"
              />
              <RecordRow
                label="Your level"
                value={`L${summary.level} · ${summary.levelName}`}
                onClick={() => onOpenTab("Recognition Ledger")}
              />
            </div>
            <MissionControls mission={mission} onOpenTab={onOpenTab} />
          </div>
        </div>
      )}
    </section>
  );
}

function TeamRow({ member }: { member: MissionTeamMember }) {
  return (
    <div className="mx-team-row" title={member.responsibility || undefined}>
      <span className={`mx-team-dot is-${member.availability}`} aria-hidden />
      <div>
        <strong>{member.name}</strong>
        <span className="mx-tiny mx-muted">{member.role}</span>
      </div>
    </div>
  );
}

function RecordRow({
  label,
  value,
  onClick,
  tone = "neutral",
}: {
  label: string;
  value: string;
  onClick: () => void;
  tone?: Tone;
}) {
  return (
    <button type="button" className="mx-record-row" onClick={onClick}>
      <span>{label}</span>
      <Chip tone={tone}>{value}</Chip>
    </button>
  );
}

function StepRow({
  mission,
  checkpoint,
  blocked,
  canAct,
  onOpenTab,
}: {
  mission: Mission;
  checkpoint: Checkpoint;
  blocked: string[];
  canAct: boolean;
  onOpenTab: (tab: string) => void;
}) {
  const state = useCommandState();
  const act = useAction();
  const user = activeUser(state);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"complete" | "block">("complete");
  const [result, setResult] = useDraft(`mission.${mission.id}.step.${checkpoint.id}`, "");
  const [assignee, setAssignee] = useState(checkpoint.assigneeId ?? user.id);
  const [role, setRole] = useState(checkpoint.assigneeRole ?? "Mission Owner");

  const completed = checkpoint.state === "completed";
  const locked = blocked.length > 0;
  const assignedToOther = Boolean(checkpoint.assigneeId && checkpoint.assigneeId !== user.id);
  const approval = state.approvals.find((item) => item.id === checkpoint.approvalId);
  const isAssignee = !checkpoint.assigneeId || checkpoint.assigneeId === user.id;

  function setState(next: CheckpointState, extra?: { result?: string; reason?: string }) {
    act(
      {
        type: "checkpoint.update",
        missionId: mission.id,
        checkpointId: checkpoint.id,
        state: next,
        actualResult: extra?.result ?? checkpoint.actualResult,
        skipReason: extra?.reason ?? "",
      },
      {
        success: `Step ${String(checkpoint.order).padStart(2, "0")} recorded · ${CHECKPOINT_LABEL[next]}`,
      },
    );
  }

  return (
    <article className={`mx-step is-${checkpoint.state}`}>
      <div className="mx-step-head">
        <span className="mx-step-number">{String(checkpoint.order).padStart(2, "0")}</span>
        <div className="mx-step-title">
          <strong>{checkpoint.title}</strong>
          <div className="mx-step-meta">
            <Stars level={checkpoint.starLevel} />
            <Chip tone={stateTone(checkpoint.state)}>{CHECKPOINT_LABEL[checkpoint.state]}</Chip>
            <span className="mx-tiny mx-muted">
              <UserRound aria-hidden />{" "}
              {checkpoint.assigneeId ? nameOf(state, checkpoint.assigneeId) : "Unassigned"}
              {checkpoint.assigneeRole ? ` · ${checkpoint.assigneeRole}` : ""}
            </span>
            {checkpoint.evidence.length > 0 ? (
              <span className="mx-tiny mx-muted">
                <BadgeCheck aria-hidden /> {checkpoint.evidence.length} evidence
              </span>
            ) : null}
            {checkpoint.completedAt ? (
              <span className="mx-tiny mx-muted">
                <Clock3 aria-hidden /> {formatDateTime(checkpoint.completedAt)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mx-step-actions">
          {completed ? (
            <CheckCheck className="mx-step-done" aria-hidden />
          ) : (
            <button
              type="button"
              className="mx-btn mx-btn--sm"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
            >
              {checkpoint.state === "not_started" ? "OPEN" : "RECORD"}
            </button>
          )}
        </div>
      </div>

      <p className="mx-step-why">{checkpoint.why}</p>
      {checkpoint.verification ? (
        <p className="mx-step-verify">
          <ShieldCheck aria-hidden /> Verification: {checkpoint.verification}
        </p>
      ) : null}

      {checkpoint.state === "pending_authorization" && approval ? (
        <div className="mx-step-gate">
          <Lock aria-hidden />
          <span>
            Waiting on {approval.requiredApprover} · requested {relativeTime(approval.createdAt)} ·{" "}
            {approval.status}
          </span>
          <button type="button" className="mx-link" onClick={() => onOpenTab("Approvals")}>
            Open decision
          </button>
        </div>
      ) : null}

      {checkpoint.state === "blocked" && checkpoint.blockedReason ? (
        <div className="mx-step-gate is-danger">
          <Ban aria-hidden />
          <span>{checkpoint.blockedReason}</span>
        </div>
      ) : null}

      {completed ? (
        <div className="mx-step-result">
          <Check aria-hidden />
          <span>{checkpoint.actualResult}</span>
          {checkpoint.verifiedBy ? (
            <span className="mx-tiny mx-muted">verified by {checkpoint.verifiedBy}</span>
          ) : null}
        </div>
      ) : null}

      {open && !completed ? (
        <div className="mx-step-form">
          {locked ? <Note tone="warning">{blocked.join(" ")}</Note> : null}

          {checkpoint.requiresApproval && !checkpoint.approvalId ? (
            <div className="mx-step-form-row">
              <span className="mx-tiny mx-muted">
                This step is decided by {checkpoint.assigneeRole ?? "an administrator"} — requesting
                authorization creates a real approval record.
              </span>
              <button
                type="button"
                className="mx-btn mx-btn--sm mx-btn--primary"
                onClick={() =>
                  act(
                    {
                      type: "mission.authorize",
                      missionId: mission.id,
                      checkpointId: checkpoint.id,
                    },
                    {
                      success:
                        "Authorization requested — the decision is now with the administrator",
                    },
                  )
                }
              >
                <Send /> REQUEST AUTHORIZATION
              </button>
            </div>
          ) : null}

          {!locked ? (
            <>
              <Field label={mode === "complete" ? "Recorded outcome" : "Why is this step blocked?"}>
                <textarea
                  className="mx-input"
                  rows={2}
                  value={result}
                  onChange={(event) => setResult(event.target.value)}
                  placeholder={
                    mode === "complete"
                      ? "What did you actually do, see or configure? This is the recorded result."
                      : "Name the missing dependency, access or decision."
                  }
                />
              </Field>
              <div className="mx-step-form-row">
                <div className="mx-inline" style={{ gap: 4 }}>
                  <button
                    type="button"
                    className="mx-btn mx-btn--sm"
                    aria-pressed={mode === "complete"}
                    onClick={() => setMode("complete")}
                  >
                    <Check /> COMPLETE
                  </button>
                  <button
                    type="button"
                    className="mx-btn mx-btn--sm"
                    aria-pressed={mode === "block"}
                    onClick={() => setMode("block")}
                  >
                    <Ban /> BLOCK
                  </button>
                  <button
                    type="button"
                    className="mx-btn mx-btn--sm"
                    onClick={() => {
                      setState("in_progress", { result });
                      setOpen(false);
                    }}
                  >
                    <Play /> IN PROGRESS
                  </button>
                </div>
                <button
                  type="button"
                  className="mx-btn mx-btn--sm mx-btn--primary"
                  disabled={result.trim().length < 4 || (mode === "complete" && assignedToOther)}
                  onClick={() => {
                    if (mode === "complete") setState("completed", { result });
                    else setState("blocked", { reason: result });
                    setOpen(false);
                  }}
                >
                  RECORD
                </button>
              </div>
              {mode === "complete" && assignedToOther ? (
                <p className="mx-tiny mx-muted">
                  This task belongs to {nameOf(state, checkpoint.assigneeId ?? null)}. Only they can
                  record its outcome — the mission stays yours.
                </p>
              ) : null}
            </>
          ) : null}

          <div className="mx-step-assign">
            <Field label="Assign task to">
              <select
                className="mx-input"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
              >
                {state.users.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} · {option.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Role">
              <input
                className="mx-input"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              />
            </Field>
            <button
              type="button"
              className="mx-btn mx-btn--sm"
              onClick={() =>
                act(
                  {
                    type: "checkpoint.assign",
                    missionId: mission.id,
                    checkpointId: checkpoint.id,
                    assigneeId: assignee,
                    assigneeRole: role,
                  },
                  { success: "Task assigned — the mission owner keeps ownership" },
                )
              }
            >
              <UserRoundCog /> ASSIGN
            </button>
          </div>
        </div>
      ) : null}
      {!completed && checkpoint.state === "waiting_on_person" && isAssignee === false ? null : null}
      {!completed && checkpoint.state === "in_progress" && !canAct ? (
        <p className="mx-tiny mx-muted">Mission paused.</p>
      ) : null}
    </article>
  );
}

function MissionControls({
  mission,
  onOpenTab,
}: {
  mission: Mission;
  onOpenTab: (tab: string) => void;
}) {
  const state = useCommandState();
  const act = useAction();
  const [panel, setPanel] = useState<
    "none" | "pause" | "help" | "transfer" | "escalate" | "signoff"
  >("none");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState(state.users[1]?.id ?? state.users[0]?.id ?? "");

  const done = mission.checkpoints.filter((checkpoint) => checkpoint.state === "completed").length;
  const total = mission.checkpoints.length;
  const canSubmit = done === total && Boolean(mission.resolution) && !mission.reviewSubmittedAt;

  return (
    <div className="mx-mission-controls">
      <span className="mx-label">
        <Flag aria-hidden /> Mission controls
      </span>
      <div className="mx-control-grid">
        <button
          type="button"
          className="mx-btn mx-btn--sm"
          onClick={() => setPanel(panel === "pause" ? "none" : "pause")}
        >
          <Pause /> PAUSE
        </button>
        <button
          type="button"
          className="mx-btn mx-btn--sm"
          onClick={() => setPanel(panel === "help" ? "none" : "help")}
        >
          <LifeBuoy /> HELP
        </button>
        <button
          type="button"
          className="mx-btn mx-btn--sm"
          onClick={() => setPanel(panel === "transfer" ? "none" : "transfer")}
        >
          <UserRoundCog /> REASSIGN
        </button>
        <button
          type="button"
          className="mx-btn mx-btn--sm"
          onClick={() => setPanel(panel === "escalate" ? "none" : "escalate")}
        >
          <ArrowRight /> ESCALATE
        </button>
        <button
          type="button"
          className="mx-btn mx-btn--sm"
          onClick={() => onOpenTab("Ticket Trail")}
        >
          <History /> HISTORY
        </button>
        <button
          type="button"
          className="mx-btn mx-btn--sm mx-btn--primary"
          onClick={() => setPanel(panel === "signoff" ? "none" : "signoff")}
          title={
            canSubmit
              ? "Submit for final review"
              : "All steps and the resolution must be recorded first"
          }
        >
          <Send /> FINAL REVIEW
        </button>
      </div>

      {panel !== "none" ? (
        <div className="mx-control-panel">
          {panel === "pause" ? (
            <>
              <Field label="Why pause the mission?">
                <input
                  className="mx-input"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Waiting for the new hire's start date"
                />
              </Field>
              <div className="mx-inline">
                <button
                  type="button"
                  className="mx-btn mx-btn--sm mx-btn--primary"
                  onClick={() => {
                    act(
                      { type: "mission.pause", missionId: mission.id, note },
                      { success: "Mission paused" },
                    );
                    setPanel("none");
                  }}
                >
                  PAUSE MISSION
                </button>
                <button
                  type="button"
                  className="mx-btn mx-btn--sm"
                  onClick={() => {
                    act(
                      { type: "mission.resume", missionId: mission.id },
                      { success: "Mission resumed" },
                    );
                    setPanel("none");
                  }}
                >
                  <Play /> RESUME
                </button>
              </div>
            </>
          ) : null}
          {panel === "help" ? (
            <>
              <Field label="What do you need help with?">
                <input
                  className="mx-input"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Directory group mapping for Marketing"
                />
              </Field>
              <button
                type="button"
                className="mx-btn mx-btn--sm mx-btn--primary"
                onClick={() => {
                  act(
                    { type: "mission.requestHelp", missionId: mission.id, need: note },
                    { success: "Help requested — recorded on the mission" },
                  );
                  setPanel("none");
                }}
              >
                <LifeBuoy /> REQUEST HELP
              </button>
            </>
          ) : null}
          {panel === "transfer" ? (
            <>
              <Field label="Transfer mission to">
                <select
                  className="mx-input"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                >
                  {state.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Handover note">
                <input
                  className="mx-input"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Covering while I am on leave"
                />
              </Field>
              <button
                type="button"
                className="mx-btn mx-btn--sm mx-btn--primary"
                onClick={() => {
                  act(
                    { type: "mission.transfer", missionId: mission.id, toUserId: target, note },
                    { success: "Mission transferred with its full trail" },
                  );
                  setPanel("none");
                }}
              >
                TRANSFER
              </button>
            </>
          ) : null}
          {panel === "escalate" ? (
            <>
              <Field label="Escalation reason">
                <input
                  className="mx-input"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Authorization has been pending for a day"
                />
              </Field>
              <button
                type="button"
                className="mx-btn mx-btn--sm mx-btn--primary"
                onClick={() => {
                  act(
                    {
                      type: "mission.escalate",
                      missionId: mission.id,
                      reason: note,
                      expertise: "Directory authorization",
                      receivingTeam: "Identity Operations",
                    },
                    { success: "Mission escalated with its trail" },
                  );
                  setPanel("none");
                }}
              >
                ESCALATE
              </button>
            </>
          ) : null}
          {panel === "signoff" ? (
            <>
              <p className="mx-tiny mx-muted">
                {done} of {total} steps recorded · resolution{" "}
                {mission.resolution ? "recorded" : "missing"} · signoff{" "}
                {mission.signoff ? "recorded" : "pending"}
              </p>
              <div className="mx-inline">
                <button
                  type="button"
                  className="mx-btn mx-btn--sm"
                  disabled={!canSubmit}
                  onClick={() => {
                    act(
                      { type: "mission.submitReview", missionId: mission.id },
                      { success: "Submitted for final review" },
                    );
                    setPanel("none");
                  }}
                >
                  <Send /> SUBMIT FOR REVIEW
                </button>
                <button
                  type="button"
                  className="mx-btn mx-btn--sm mx-btn--primary"
                  disabled={!mission.reviewSubmittedAt || Boolean(mission.signoff)}
                  onClick={() => {
                    act(
                      {
                        type: "mission.signoff",
                        missionId: mission.id,
                        signerName: "Diamond Carter",
                        role: "Manager or Approver",
                        note: note || "Reviewed and accepted.",
                      },
                      { success: "Signoff recorded" },
                    );
                    setPanel("none");
                  }}
                >
                  <Signature /> RECORD SIGNOFF
                </button>
                <button
                  type="button"
                  className="mx-btn mx-btn--sm"
                  disabled={Boolean(!mission.signoff || mission.status === "completed")}
                  onClick={() => {
                    act(
                      { type: "mission.complete", missionId: mission.id },
                      { success: "Mission completed — recognition issued" },
                    );
                    setPanel("none");
                  }}
                >
                  <Trophy /> COMPLETE
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mx-mission-foot">
        <span className="mx-tiny mx-muted">
          <CircleDot aria-hidden /> Every control writes a recorded event
        </span>
        <span className="mx-tiny mx-muted">
          <Sparkles aria-hidden /> Help Buddy never marks work it did not see
        </span>
      </div>
    </div>
  );
}

export function StarRow({ level }: { level: number | undefined }) {
  return <Stars level={level} />;
}

export function countByState(checkpoints: Checkpoint[]) {
  return groupCounts(checkpoints);
}
