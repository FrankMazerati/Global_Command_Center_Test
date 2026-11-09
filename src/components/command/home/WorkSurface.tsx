import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, ChevronLeft, Play, ShieldAlert, X } from "lucide-react";
import { canDecideApproval, type CommandAction } from "@/lib/domain/reducer";
import { activeUser, missionById, missionProgress, type WorkItem } from "@/lib/domain/selectors";
import { useAction, useCommandState, useDraft } from "@/lib/domain/store";
import type { DeclineReason } from "@/lib/domain/types";
import {
  DECLINE_REASON_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  formatDateTime,
  formatUsd,
  slaRemaining,
} from "@/lib/domain/format";
import { Chip, Field, Note } from "@/components/command/ui";
import { ConnectorWorkspace } from "@/components/command/connectors/ConnectorWorkspace";

export function WorkSurface({
  target,
  connector,
  onClose,
}: {
  target: WorkItem | null;
  connector: { id: string; docId: string | null } | null;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (connector) {
    return (
      <div className="mx-scope" style={{ position: "absolute", inset: 0, zIndex: 9 }}>
        <ConnectorWorkspace
          connectorId={connector.id}
          initialDocumentId={connector.docId}
          onClose={onClose}
          expanded={expanded}
          onToggleExpand={() => setExpanded((value) => !value)}
        />
      </div>
    );
  }

  if (!target) return null;

  return (
    <div className="mx-scope mx-surface" role="dialog" aria-label={`${target.title} work surface`}>
      <div className="mx-surface-head">
        <button className="mx-icon-btn" onClick={onClose} aria-label="Back to the queue">
          <ChevronLeft />
        </button>
        <span className="mx-overlay-title" style={{ flex: 1 }}>
          {target.source}
        </span>
        <button className="mx-icon-btn" onClick={onClose} aria-label="Close work surface">
          <X />
        </button>
      </div>
      {target.sourceType === "mission" ? <MissionSurface item={target} /> : null}
      {target.sourceType === "approval" ? <ApprovalSurface item={target} /> : null}
      {target.sourceType === "signature" ? <SignatureSurface item={target} /> : null}
      {target.sourceType === "task" ? <TaskSurface item={target} /> : null}
    </div>
  );
}

function Head({ title, chips }: { title: string; chips: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <strong style={{ fontSize: 11.5, color: "#1c4c78", lineHeight: 1.3 }}>{title}</strong>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{chips}</div>
    </div>
  );
}

function MissionSurface({ item }: { item: WorkItem }) {
  const state = useCommandState();
  const act = useAction();
  const mission = missionById(state, item.targetId);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<DeclineReason>("incorrect_assignment");
  const [note, setNote] = useDraft(`home.mission.${item.targetId}.decline`, "");

  if (!mission)
    return <div className="mx-surface-body">This mission is no longer available to you.</div>;

  const progress = missionProgress(mission);
  const sla = slaRemaining(mission.slaDueAt);
  const canAct = mission.status === "available" || mission.status === "assigned";

  return (
    <>
      <div className="mx-surface-body">
        <Head
          title={`${mission.number} · ${mission.title}`}
          chips={
            <>
              <Chip tone={PRIORITY_TONE[mission.priority]}>{mission.priority}</Chip>
              <Chip tone={STATUS_TONE[mission.status]}>{STATUS_LABEL[mission.status]}</Chip>
              <Chip tone={sla.tone === "ok" ? "success" : sla.tone}>{sla.label}</Chip>
            </>
          }
        />
        <p style={{ fontSize: 10, lineHeight: 1.5, color: "#2c4f6e" }}>{mission.description}</p>
        <dl className="mx-kv">
          <dt>Requester</dt>
          <dd>
            {mission.requester.name} · {mission.requester.department}
          </dd>
          <dt>Team</dt>
          <dd>{mission.assignedTeam}</dd>
          <dt>Received</dt>
          <dd>{formatDateTime(mission.submittedAt)}</dd>
          <dt>Checkpoints</dt>
          <dd>
            {progress.done} of {progress.total} recorded
          </dd>
        </dl>

        {mission.status === "accepted" ? (
          <Note tone="info">
            Accepted by {mission.acceptedBy ?? "you"} on{" "}
            {mission.acceptedAt ? formatDateTime(mission.acceptedAt) : "record"}. Acceptance is
            recorded; work has not started yet.
          </Note>
        ) : null}

        {declining ? (
          <div style={{ display: "grid", gap: 5 }}>
            <Field label="Decline reason">
              <select
                className="mx-select"
                value={reason}
                onChange={(event) => setReason(event.target.value as DeclineReason)}
              >
                {Object.entries(DECLINE_REASON_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note for the routing team">
              <textarea
                className="mx-textarea"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Why this mission should be routed elsewhere…"
              />
            </Field>
            <Note tone="warning">
              The ticket stays open and returns to routing. Declining never resolves or deletes it.
            </Note>
            <div className="mx-btn-row">
              <button
                className="mx-btn mx-btn--danger"
                disabled={note.trim().length < 4}
                onClick={() => {
                  const result = act(
                    { type: "mission.decline", missionId: mission.id, reason, note: note.trim() },
                    { success: "Mission declined and returned to routing." },
                  );
                  if (result.ok) {
                    setDeclining(false);
                    setNote("");
                  }
                }}
              >
                Confirm decline
              </button>
              <button className="mx-btn mx-btn--ghost" onClick={() => setDeclining(false)}>
                Keep reviewing
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mx-surface-foot">
        {canAct ? (
          <>
            <button
              className="mx-btn mx-btn--primary"
              onClick={() =>
                act(
                  { type: "mission.accept", missionId: mission.id },
                  { success: "Mission accepted. Start work when you are ready." },
                )
              }
            >
              <Check /> Accept mission
            </button>
            <button className="mx-btn mx-btn--danger" onClick={() => setDeclining(true)}>
              Decline
            </button>
          </>
        ) : null}
        {mission.status === "accepted" ? (
          <button
            className="mx-btn mx-btn--primary"
            onClick={() =>
              act(
                { type: "mission.start", missionId: mission.id },
                { success: "Work started. Checkpoints are now open." },
              )
            }
          >
            <Play /> Start work
          </button>
        ) : null}
        <Link
          to="/mission-control"
          search={{ mission: mission.id }}
          className="mx-btn mx-btn--sm"
          style={{ marginLeft: "auto" }}
        >
          Full mission <ArrowUpRight style={{ width: 9, height: 9 }} />
        </Link>
      </div>
    </>
  );
}

function TaskSurface({ item }: { item: WorkItem }) {
  const state = useCommandState();
  const act = useAction();
  const task = state.tasks.find((entry) => entry.id === item.targetId);
  const [note, setNote] = useDraft(`home.task.${item.targetId}.note`, "");

  if (!task)
    return <div className="mx-surface-body">This task is no longer in your workspace.</div>;

  return (
    <>
      <div className="mx-surface-body">
        <Head
          title={task.title}
          chips={
            <>
              <Chip tone={PRIORITY_TONE[task.priority === "none" ? "P4" : task.priority]}>
                {task.priority === "none" ? "No priority" : task.priority}
              </Chip>
              <Chip tone={task.status === "blocked" ? "danger" : "info"}>
                {task.status.replace("_", " ")}
              </Chip>
            </>
          }
        />
        <p style={{ fontSize: 10, color: "#2c4f6e", lineHeight: 1.5 }}>{task.detail}</p>
        <dl className="mx-kv">
          <dt>Project</dt>
          <dd>{task.project}</dd>
          <dt>Due</dt>
          <dd>{task.dueAt ? formatDateTime(task.dueAt) : "No due date"}</dd>
          <dt>Latest note</dt>
          <dd>{task.progressNote || "No progress recorded yet."}</dd>
        </dl>
        <Field label="Progress note (recorded with the status change)">
          <textarea
            className="mx-textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What changed?"
          />
        </Field>
      </div>
      <div className="mx-surface-foot">
        {(["in_progress", "blocked", "done"] as const).map((status) => (
          <button
            key={status}
            className={`mx-btn ${status === "done" ? "mx-btn--success" : status === "blocked" ? "mx-btn--danger" : "mx-btn--primary"}`}
            onClick={() =>
              act(
                { type: "task.status", taskId: task.id, status, progressNote: note.trim() },
                { success: `Task marked ${status.replace("_", " ")}.` },
              )
            }
          >
            {status === "in_progress" ? "Start" : status === "blocked" ? "Block" : "Complete"}
          </button>
        ))}
      </div>
    </>
  );
}

function ApprovalSurface({ item }: { item: WorkItem }) {
  const state = useCommandState();
  const act = useAction();
  const approval = state.approvals.find((entry) => entry.id === item.targetId);
  const user = activeUser(state);
  const [note, setNote] = useDraft(`home.approval.${item.targetId}.note`, "");

  if (!approval) return <div className="mx-surface-body">This approval is no longer pending.</div>;
  const allowed = canDecideApproval(approval, user);

  return (
    <>
      <div className="mx-surface-body">
        <Head
          title={approval.title}
          chips={
            <>
              <Chip tone="warning">Level {approval.level}</Chip>
              {approval.amountUsd !== null ? (
                <Chip tone="info">{formatUsd(approval.amountUsd)}</Chip>
              ) : null}
              <Chip tone={approval.status === "escalated" ? "danger" : "neutral"}>
                {approval.status}
              </Chip>
            </>
          }
        />
        <p style={{ fontSize: 10, color: "#2c4f6e", lineHeight: 1.5 }}>{approval.summary}</p>
        <dl className="mx-kv">
          <dt>Requester</dt>
          <dd>
            {approval.requesterName} · {approval.requesterDepartment}
          </dd>
          <dt>Approver</dt>
          <dd>{approval.requiredApprover}</dd>
          <dt>Due</dt>
          <dd>{approval.dueAt ? formatDateTime(approval.dueAt) : "No due date"}</dd>
        </dl>
        {allowed ? (
          <Field label="Rationale (required, recorded in the decision history)">
            <textarea
              className="mx-textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why are you deciding this way?"
            />
          </Field>
        ) : (
          <Note tone="warning">
            <ShieldAlert style={{ width: 11, height: 11, verticalAlign: "-1px", marginRight: 4 }} />
            This decision belongs to {approval.requiredApprover}. You can read it and escalate it,
            but you cannot approve or reject it.
          </Note>
        )}
      </div>
      <div className="mx-surface-foot">
        <button
          className="mx-btn mx-btn--success"
          disabled={!allowed || note.trim().length < 4}
          onClick={() =>
            act(
              {
                type: "approval.decide",
                approvalId: approval.id,
                decision: "approve",
                note: note.trim(),
              },
              { success: "Approval recorded." },
            )
          }
        >
          Approve
        </button>
        <button
          className="mx-btn mx-btn--danger"
          disabled={!allowed || note.trim().length < 4}
          onClick={() =>
            act(
              {
                type: "approval.decide",
                approvalId: approval.id,
                decision: "reject",
                note: note.trim(),
              },
              { success: "Rejection recorded." },
            )
          }
        >
          Reject
        </button>
        <button
          className="mx-btn"
          disabled={note.trim().length < 4}
          onClick={() =>
            act(
              {
                type: "approval.decide",
                approvalId: approval.id,
                decision: "escalate",
                note: note.trim(),
              },
              { success: "Approval escalated." },
            )
          }
        >
          Escalate
        </button>
        <Link to="/help-buddy" className="mx-btn mx-btn--sm" style={{ marginLeft: "auto" }}>
          All approvals <ArrowUpRight style={{ width: 9, height: 9 }} />
        </Link>
      </div>
    </>
  );
}

function SignatureSurface({ item }: { item: WorkItem }) {
  const state = useCommandState();
  const act = useAction();
  const signature = state.signatures.find((entry) => entry.id === item.targetId);
  const [profileId, setProfileId] = useState(state.signatureProfiles[0]?.id ?? "");
  const [note, setNote] = useDraft(`home.signature.${item.targetId}.note`, "");

  if (!signature)
    return <div className="mx-surface-body">This signature request is no longer active.</div>;

  const signed = signature.status === "signed";

  return (
    <>
      <div className="mx-surface-body">
        <Head
          title={signature.documentName}
          chips={
            <Chip tone={signed ? "success" : "info"}>{signature.status.replace("_", " ")}</Chip>
          }
        />
        <p style={{ fontSize: 10, color: "#2c4f6e", lineHeight: 1.5 }}>{signature.note}</p>
        <dl className="mx-kv">
          <dt>Requested by</dt>
          <dd>{signature.requestedBy}</dd>
          <dt>Requested</dt>
          <dd>{formatDateTime(signature.requestedAt)}</dd>
          <dt>Due</dt>
          <dd>{signature.dueAt ? formatDateTime(signature.dueAt) : "No due date"}</dd>
        </dl>
        {signed ? (
          <Note tone="success">
            Signed with{" "}
            {state.signatureProfiles.find((profile) => profile.id === signature.profileId)?.label ??
              "your saved profile"}{" "}
            on {signature.signedAt ? formatDateTime(signature.signedAt) : "record"}. Audit hash{" "}
            {signature.auditHash ?? "—"}.
          </Note>
        ) : (
          <>
            <Field label="Signature profile">
              <select
                className="mx-select"
                value={profileId}
                onChange={(event) => setProfileId(event.target.value)}
              >
                {state.signatureProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label} · {profile.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Decline reason (only needed to decline)">
              <textarea
                className="mx-textarea"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Reason for declining…"
              />
            </Field>
          </>
        )}
      </div>
      <div className="mx-surface-foot">
        {signed ? null : (
          <>
            <button
              className="mx-btn mx-btn--primary"
              onClick={() =>
                act(
                  { type: "signature.sign", signatureId: signature.id, profileId },
                  { success: "Signature recorded with an audit hash." },
                )
              }
            >
              Sign document
            </button>
            <button
              className="mx-btn mx-btn--danger"
              disabled={note.trim().length < 4}
              onClick={() =>
                act(
                  { type: "signature.decline", signatureId: signature.id, note: note.trim() },
                  { success: "Signature declined." },
                )
              }
            >
              Decline
            </button>
          </>
        )}
        <Link to="/help-buddy" className="mx-btn mx-btn--sm" style={{ marginLeft: "auto" }}>
          Signatures <ArrowUpRight style={{ width: 9, height: 9 }} />
        </Link>
      </div>
    </>
  );
}

export type { CommandAction };
