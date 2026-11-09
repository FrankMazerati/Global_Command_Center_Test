import { useState, type CSSProperties } from "react";
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  Gavel,
  History,
  Lock,
  MessageSquare,
  PenLine,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  Star,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import type {
  ActivityEvent,
  Approval,
  ApprovalDecision,
  ApprovalStatus,
  LedgerKind,
  SignatureProfile,
  SignatureRequest,
  SignatureStatus,
} from "@/lib/domain/types";
import { BADGES, LEVELS } from "@/lib/domain/recognition";
import { activeUser, recognitionSummary } from "@/lib/domain/selectors";
import {
  dueLabel,
  formatDateTime,
  formatUsd,
  initialsOf,
  isOverdue,
  relativeTime,
} from "@/lib/domain/format";
import { useAction, useCommandState, useDraft } from "@/lib/domain/store";
import { canDecideApproval } from "@/lib/domain/reducer";
import { Chip, Empty, Field, Kpi, Note, Panel, Progress, type Tone } from "@/components/command/ui";

/* ------------------------------------------------------------------ shared */

const ROOT: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flex: 1,
  minHeight: 0,
};

const DANGER_INK = "#ae3d34";

function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}

function overdueClass(overdue: boolean): string {
  return overdue ? " is-overdue" : "";
}

/* --------------------------------------------------------------- approvals */

const APPROVAL_FILTERS: { id: ApprovalStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "escalated", label: "Escalated" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pending",
  escalated: "Escalated",
  approved: "Approved",
  rejected: "Rejected",
};

const APPROVAL_STATUS_TONE: Record<ApprovalStatus, Tone> = {
  pending: "warning",
  escalated: "danger",
  approved: "success",
  rejected: "danger",
};

const APPROVAL_LEVEL_TONE: Record<Approval["level"], Tone> = {
  1: "info",
  2: "warning",
  3: "danger",
};

/** What each authorization level actually authorises, stated before anyone decides. */
const APPROVAL_LEVEL_EXPLANATION: Record<Approval["level"], string> = {
  1: "Level 1 — standard. A single named owner decides routine operational requests and time-boxed access inside their own scope.",
  2: "Level 2 — normal change or service owner plus the change advisory board. Spend and service-impacting change also need the CAB reference.",
  3: "Level 3 — emergency or global administrator. Reserved for emergency change and global scope; the highest authorization in this workspace.",
};

const APPROVAL_ACTION_LABEL: Record<ApprovalDecision["action"], string> = {
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
  commented: "Comment",
};

function approvalHistoryTone(
  action: ApprovalDecision["action"],
): "success" | "danger" | "warning" | "info" {
  if (action === "approved") return "success";
  if (action === "rejected") return "danger";
  if (action === "escalated") return "warning";
  return "info";
}

function isOpenApproval(approval: Approval): boolean {
  return approval.status === "pending" || approval.status === "escalated";
}

/**
 * Approvals are an authorization workspace of their own: the queue, the level that authorises the
 * request, the identity that owns the decision and the recorded history. A decision is only ever
 * dispatched through the reducer, which re-checks `canDecideApproval` for the signed-in user.
 */
export function ApprovalsTab() {
  const state = useCommandState();
  const act = useAction();
  const user = activeUser(state);

  const [filter, setFilter] = useState<ApprovalStatus>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts: Record<ApprovalStatus, number> = {
    pending: state.approvals.filter((item) => item.status === "pending").length,
    escalated: state.approvals.filter((item) => item.status === "escalated").length,
    approved: state.approvals.filter((item) => item.status === "approved").length,
    rejected: state.approvals.filter((item) => item.status === "rejected").length,
  };

  const rows = state.approvals
    .filter((item) => item.status === filter)
    .sort((left, right) =>
      filter === "approved" || filter === "rejected"
        ? timeOf(right.decidedAt ?? right.dueAt) - timeOf(left.decidedAt ?? left.dueAt)
        : timeOf(left.dueAt) - timeOf(right.dueAt),
    );

  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;
  const ownedCount = rows.filter((item) => canDecideApproval(item, user)).length;

  const [note, setNote] = useDraft(`approvals.decision.${selected?.id ?? "none"}`);
  const [comment, setComment] = useDraft(`approvals.comment.${selected?.id ?? "none"}`);

  const canDecide = selected ? canDecideApproval(selected, user) : false;
  const rationaleReady = note.trim().length >= 4;

  function decide(decision: "approve" | "reject" | "escalate") {
    if (!selected || !canDecide || !rationaleReady) return;
    const result = act(
      { type: "approval.decide", approvalId: selected.id, decision, note: note.trim() },
      {
        success:
          decision === "approve"
            ? `${selected.title} approved`
            : decision === "reject"
              ? `${selected.title} rejected`
              : `${selected.title} escalated`,
      },
    );
    if (!result.ok) return;
    setNote("");
    setSelectedId(selected.id);
    setFilter(
      decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "escalated",
    );
  }

  function addComment() {
    if (!selected || comment.trim().length < 2) return;
    const result = act(
      { type: "approval.comment", approvalId: selected.id, note: comment.trim() },
      { success: "Comment added to the approval history" },
    );
    if (result.ok) setComment("");
  }

  const decisionButtonTitle = !canDecide
    ? selected
      ? `Owned by ${selected.requiredApprover}`
      : "No approval selected"
    : rationaleReady
      ? "Record this decision against the approval history"
      : "Record at least 4 characters of rationale first";

  return (
    <div style={ROOT}>
      <div className="mx-btn-row" style={{ flex: "none" }}>
        {APPROVAL_FILTERS.map((item) => (
          <button
            key={item.id}
            className={`mx-btn mx-btn--sm${filter === item.id ? " mx-btn--primary" : ""}`}
            aria-pressed={filter === item.id}
            onClick={() => {
              setFilter(item.id);
              setSelectedId(null);
            }}
          >
            {item.label}
            <span className="mx-tiny" style={{ opacity: 0.8 }}>
              {counts[item.id]}
            </span>
          </button>
        ))}
        <span className="mx-tiny mx-muted" style={{ marginLeft: "auto" }}>
          Signed in as {user.name} · {user.role}
        </span>
      </div>

      <div
        className="mx-split-row"
        style={{ gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.25fr)", flex: 1, minHeight: 0 }}
      >
        <Panel
          title="Approval queue"
          icon={ShieldCheck}
          note={`${rows.length} ${filter} · ${ownedCount} yours`}
          scroll
        >
          {rows.length === 0 ? (
            <Empty
              icon={ShieldCheck}
              title={`No ${filter} approvals`}
              description="Records only leave this queue when a decision is recorded against them."
            />
          ) : (
            <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
              {rows.map((approval) => {
                const overdue = isOverdue(approval.dueAt) && isOpenApproval(approval);
                const isYours = canDecideApproval(approval, user);
                return (
                  <button
                    key={approval.id}
                    className={`mx-row${selected?.id === approval.id ? " is-selected" : ""}${overdueClass(overdue)}`}
                    style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                    aria-pressed={selected?.id === approval.id}
                    onClick={() => setSelectedId(approval.id)}
                  >
                    <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <span className="mx-row-title" style={{ flexWrap: "wrap" }}>
                        <span>{approval.title}</span>
                        <Chip tone={APPROVAL_LEVEL_TONE[approval.level]}>
                          Level {approval.level}
                        </Chip>
                        {approval.amountUsd !== null ? (
                          <Chip tone="neutral">{formatUsd(approval.amountUsd)}</Chip>
                        ) : null}
                      </span>
                      <span className="mx-row-meta">
                        <span>{approval.type}</span>
                        <span>·</span>
                        <span>
                          {approval.requesterName} · {approval.requesterDepartment}
                        </span>
                      </span>
                      <span className="mx-row-meta" style={{ marginTop: 0 }}>
                        <span
                          style={
                            overdue ? { color: DANGER_INK, fontWeight: 700 } : { fontWeight: 600 }
                          }
                        >
                          {dueLabel(approval.dueAt)}
                        </span>
                        <span>·</span>
                        <span>{approval.requiredApprover}</span>
                      </span>
                    </span>
                    <span
                      className="mx-row-actions"
                      style={{ flexDirection: "column", alignItems: "flex-end", gap: 3 }}
                    >
                      <Chip tone={APPROVAL_STATUS_TONE[approval.status]}>
                        {APPROVAL_STATUS_LABEL[approval.status]}
                      </Chip>
                      {isYours ? <Chip tone="accent">Yours</Chip> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Authorization record"
          icon={Gavel}
          note={selected ? `Approval ${selected.id}` : "Nothing selected"}
          scroll
        >
          {selected === null ? (
            <Empty
              title="No approval selected"
              description="Select a record in the queue to read its authorization detail."
            />
          ) : (
            <div style={{ display: "grid", gap: 7 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <span className="mx-row-title" style={{ flexWrap: "wrap", fontSize: 11.5 }}>
                  {selected.title}
                </span>
                <span className="mx-inline">
                  <Chip tone={APPROVAL_LEVEL_TONE[selected.level]}>Level {selected.level}</Chip>
                  <Chip tone={APPROVAL_STATUS_TONE[selected.status]}>
                    {APPROVAL_STATUS_LABEL[selected.status]}
                  </Chip>
                  <Chip tone="neutral">{selected.type}</Chip>
                  {selected.missionId ? <Chip tone="info">{selected.missionId}</Chip> : null}
                </span>
              </div>

              <span className="mx-row-desc" style={{ marginTop: 0 }}>
                {selected.summary}
              </span>

              <dl className="mx-kv">
                <dt>Requester</dt>
                <dd>
                  {selected.requesterName} · {selected.requesterDepartment}
                </dd>
                <dt>Amount</dt>
                <dd>
                  {selected.amountUsd === null
                    ? "No monetary value"
                    : formatUsd(selected.amountUsd)}
                </dd>
                <dt>Approver</dt>
                <dd>{selected.requiredApprover}</dd>
                <dt>Submitted</dt>
                <dd>{formatDateTime(selected.createdAt)}</dd>
                <dt>Due</dt>
                <dd>
                  {formatDateTime(selected.dueAt)} · {dueLabel(selected.dueAt)}
                </dd>
                {selected.decidedAt ? (
                  <>
                    <dt>Decided</dt>
                    <dd>{formatDateTime(selected.decidedAt)}</dd>
                  </>
                ) : null}
              </dl>

              <Note>{APPROVAL_LEVEL_EXPLANATION[selected.level]}</Note>

              {selected.status === "approved" || selected.status === "rejected" ? (
                <div
                  className={`mx-note${selected.status === "approved" ? " mx-note--success" : " mx-note--danger"}`}
                >
                  <strong>
                    Read-only — {APPROVAL_STATUS_LABEL[selected.status].toLowerCase()}.
                  </strong>{" "}
                  {selected.decisionNote.trim() || "No decision note was recorded."}
                  {selected.decidedAt ? ` · ${formatDateTime(selected.decidedAt)}` : ""}
                </div>
              ) : null}

              <div className="mx-divider" />
              <span className="mx-label">Decision history</span>
              <div className="mx-timeline">
                {selected.history.map((entry) => (
                  <div
                    className="mx-timeline-item"
                    key={entry.id}
                    data-tone={approvalHistoryTone(entry.action)}
                  >
                    <span className="mx-timeline-summary">
                      {APPROVAL_ACTION_LABEL[entry.action]} · {entry.actorName}
                    </span>
                    {entry.note ? <span className="mx-timeline-detail">{entry.note}</span> : null}
                    <span className="mx-timeline-meta">{formatDateTime(entry.at)}</span>
                  </div>
                ))}
              </div>

              {isOpenApproval(selected) ? (
                <>
                  <div className="mx-divider" />
                  <span className="mx-label">Decision</span>
                  {canDecide ? (
                    <Note tone="success">
                      This decision is yours as {user.name} · {user.title}. It is recorded against
                      your identity.
                    </Note>
                  ) : (
                    <div className="mx-note mx-note--warning">
                      Owned by <strong>{selected.requiredApprover}</strong>. Signed in as{" "}
                      {user.name} · {user.title} — this identity cannot decide the record, so the
                      decision buttons stay disabled.
                    </div>
                  )}

                  <Field
                    label="Decision rationale"
                    hint={`Required · ${note.trim().length} of 4 characters recorded`}
                  >
                    <textarea
                      className="mx-textarea"
                      style={{ minHeight: 56 }}
                      value={note}
                      rows={3}
                      placeholder="Record why the request is approved, rejected or escalated. The note is stored on the history."
                      onChange={(event) => setNote(event.target.value)}
                      aria-label="Decision rationale"
                    />
                  </Field>

                  <div className="mx-btn-row mx-sticky-actions">
                    <button
                      className="mx-btn mx-btn--success"
                      onClick={() => decide("approve")}
                      disabled={!canDecide || !rationaleReady}
                      title={decisionButtonTitle}
                    >
                      <CheckCircle2 /> Approve
                    </button>
                    <button
                      className="mx-btn mx-btn--danger"
                      onClick={() => decide("reject")}
                      disabled={!canDecide || !rationaleReady}
                      title={decisionButtonTitle}
                    >
                      <XCircle /> Reject
                    </button>
                    <button
                      className="mx-btn mx-btn--ghost"
                      onClick={() => decide("escalate")}
                      disabled={!canDecide || !rationaleReady}
                      title={decisionButtonTitle}
                    >
                      <ShieldAlert /> Escalate
                    </button>
                  </div>
                </>
              ) : null}

              <div className="mx-divider" />
              <Field
                label="Add a comment"
                hint="Comments append to the history without changing the status."
              >
                <textarea
                  className="mx-textarea"
                  style={{ minHeight: 44 }}
                  value={comment}
                  rows={2}
                  placeholder="Ask the requester a question or record a follow-up."
                  onChange={(event) => setComment(event.target.value)}
                  aria-label="Approval comment"
                />
              </Field>
              <div className="mx-btn-row">
                <button
                  className="mx-btn mx-btn--sm"
                  onClick={addComment}
                  disabled={comment.trim().length < 2}
                >
                  <MessageSquare /> Add comment
                </button>
                <span className="mx-tiny mx-muted">
                  A comment is recorded but never decides the request.
                </span>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- signatures */

const SIGNATURE_STATUS_LABEL: Record<SignatureStatus, string> = {
  awaiting_signature: "Awaiting signature",
  signed: "Signed",
  declined: "Declined",
  expired: "Expired",
};

const SIGNATURE_STATUS_TONE: Record<SignatureStatus, Tone> = {
  awaiting_signature: "warning",
  signed: "success",
  declined: "danger",
  expired: "neutral",
};

const SIGNATURE_FACE: Record<SignatureProfile["style"], CSSProperties> = {
  formal: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontStyle: "italic",
    fontSize: 18,
    letterSpacing: "0.01em",
  },
  initials: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontStyle: "normal",
    fontSize: 20,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
  },
  compact: {
    fontFamily: '"Segoe UI", sans-serif',
    fontStyle: "normal",
    fontSize: 13,
    letterSpacing: "0.02em",
  },
};

interface SignatureMoment {
  id: string;
  label: string;
  detail: string;
  at: string | null;
  tone: "success" | "danger" | "warning" | "info";
}

/**
 * The signing record is the source of truth for the timeline. Activity events only supply a
 * timestamp for an action the record itself does not time-stamp (a decline), never a new status.
 */
function signatureMoments(
  signature: SignatureRequest,
  activity: ActivityEvent[],
): SignatureMoment[] {
  const related = activity.filter(
    (event) => event.surface === "signature" && event.targetId === signature.id,
  );
  const declinedEvent = related.find((event) => event.type === "signature.declined") ?? null;
  const moments: SignatureMoment[] = [
    {
      id: `${signature.id}-requested`,
      label: "Requested",
      detail: `${signature.requestedBy} requested a signature on ${signature.documentName}.`,
      at: signature.requestedAt,
      tone: "info",
    },
  ];

  if (signature.signedAt) {
    moments.push({
      id: `${signature.id}-signed`,
      label: "Signed",
      detail: signature.auditHash
        ? `Signed and sealed. Audit hash ${signature.auditHash}.`
        : "Signed and sealed with an audit reference.",
      at: signature.signedAt,
      tone: "success",
    });
  }
  if (signature.status === "declined") {
    moments.push({
      id: `${signature.id}-declined`,
      label: "Declined",
      detail: signature.note.trim() || "Declined without a recorded reason.",
      at: declinedEvent?.at ?? null,
      tone: "danger",
    });
  }
  if (signature.status === "expired") {
    moments.push({
      id: `${signature.id}-expired`,
      label: "Expired",
      detail: "The signing window closed before a signature was recorded.",
      at: signature.dueAt,
      tone: "warning",
    });
  }
  if (signature.status === "awaiting_signature") {
    moments.push({
      id: `${signature.id}-awaiting`,
      label: "Awaiting signature",
      detail: `The request is still open — ${dueLabel(signature.dueAt)}.`,
      at: null,
      tone: "warning",
    });
  }
  return moments;
}

function SignaturePreview({ profile }: { profile: SignatureProfile | null }) {
  if (!profile) {
    return (
      <div className="mx-note mx-note--warning">
        No signature profile is configured for this identity, so nothing can be signed yet.
      </div>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gap: 3,
        padding: "9px 11px",
        border: "1px solid rgba(74, 127, 186, 0.44)",
        borderRadius: 9,
        background: "rgba(255, 255, 255, 0.94)",
      }}
      aria-label="Signature preview"
    >
      <span style={{ ...SIGNATURE_FACE[profile.style], color: "#16344f", lineHeight: 1.25 }}>
        {profile.style === "initials" ? initialsOf(profile.fullName) : profile.fullName}
      </span>
      {profile.title ? (
        <span style={{ fontSize: 9, color: "#6c8399" }}>{profile.title}</span>
      ) : null}
      <span style={{ height: 1, background: "rgba(74, 127, 186, 0.34)", margin: "2px 0" }} />
      <span
        style={{
          fontSize: 8,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#90a4b8",
        }}
      >
        {profile.label} · {profile.style} profile
      </span>
    </div>
  );
}

/**
 * Signatures are their own record type. Signing dispatches `signature.sign`, which seals the
 * document against the chosen profile and returns an audit hash. Approvals never move from here.
 */
export function SignaturesTab() {
  const state = useCommandState();
  const act = useAction();
  const user = activeUser(state);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileChoice, setProfileChoice] = useState<string>("");

  const awaiting = state.signatures
    .filter((item) => item.status === "awaiting_signature")
    .sort((left, right) => timeOf(left.dueAt) - timeOf(right.dueAt));
  const history = state.signatures
    .filter((item) => item.status !== "awaiting_signature")
    .sort(
      (left, right) => timeOf(right.signedAt ?? right.dueAt) - timeOf(left.signedAt ?? left.dueAt),
    );

  const selected =
    awaiting.find((item) => item.id === selectedId) ??
    history.find((item) => item.id === selectedId) ??
    awaiting[0] ??
    history[0] ??
    null;

  const [declineNote, setDeclineNote] = useDraft(`signatures.decline.${selected?.id ?? "none"}`);

  const profiles = state.signatureProfiles;
  const profileId = profileChoice !== "" ? profileChoice : (selected?.profileId ?? "");
  const selectedProfile =
    profiles.find((profile) => profile.id === profileId) ?? profiles[0] ?? null;
  const recordedProfile =
    profiles.find((profile) => profile.id === (selected?.profileId ?? "")) ?? null;
  const canSign =
    selected !== null && selected.status === "awaiting_signature" && selectedProfile !== null;
  const moments = selected ? signatureMoments(selected, state.activity) : [];

  function sign() {
    if (!selected || !selectedProfile || selected.status !== "awaiting_signature") return;
    const result = act(
      { type: "signature.sign", signatureId: selected.id, profileId: selectedProfile.id },
      { success: `${selected.documentName} signed` },
    );
    if (result.ok) setSelectedId(selected.id);
  }

  function decline() {
    if (!selected || selected.status !== "awaiting_signature" || declineNote.trim().length < 4)
      return;
    const result = act(
      { type: "signature.decline", signatureId: selected.id, note: declineNote.trim() },
      { success: `${selected.documentName} declined` },
    );
    if (!result.ok) return;
    setDeclineNote("");
    setSelectedId(selected.id);
  }

  function renderRow(signature: SignatureRequest) {
    const overdue = isOverdue(signature.dueAt) && signature.status === "awaiting_signature";
    return (
      <button
        key={signature.id}
        className={`mx-row${selected?.id === signature.id ? " is-selected" : ""}${overdueClass(overdue)}`}
        style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
        aria-pressed={selected?.id === signature.id}
        onClick={() => setSelectedId(signature.id)}
      >
        <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <span className="mx-row-title" style={{ flexWrap: "wrap" }}>
            <span>{signature.documentName}</span>
          </span>
          <span className="mx-row-meta">
            <span>Requested by {signature.requestedBy}</span>
            <span>·</span>
            <span>{formatDateTime(signature.requestedAt)}</span>
          </span>
          <span className="mx-row-meta" style={{ marginTop: 0 }}>
            <span style={overdue ? { color: DANGER_INK, fontWeight: 700 } : { fontWeight: 600 }}>
              {dueLabel(signature.dueAt)}
            </span>
          </span>
        </span>
        <span
          className="mx-row-actions"
          style={{ flexDirection: "column", alignItems: "flex-end", gap: 3 }}
        >
          <Chip tone={SIGNATURE_STATUS_TONE[signature.status]}>
            {SIGNATURE_STATUS_LABEL[signature.status]}
          </Chip>
          {signature.auditHash ? (
            <span className="mx-tiny mx-muted">{signature.auditHash}</span>
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <div style={ROOT}>
      <div className="mx-note" style={{ flex: "none" }}>
        Signatures and approvals are separate records. Approving a request records a decision
        against the approval; signing a document records your signature, the profile used and an
        audit hash against the document. Neither substitutes for the other, and signing here never
        changes an approval.
      </div>

      <div
        className="mx-split-row"
        style={{
          gridTemplateColumns: "minmax(0, 0.82fr) minmax(0, 1.2fr) minmax(0, 0.66fr)",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Panel
          title="Signature requests"
          icon={PenLine}
          note={`${awaiting.length} awaiting · ${history.length} in history`}
          scroll
        >
          <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
            <span className="mx-label">Awaiting signature · {awaiting.length}</span>
            {awaiting.length === 0 ? (
              <Empty
                icon={PenLine}
                title="Nothing awaiting your signature"
                description="No document is waiting on this identity right now."
              />
            ) : (
              awaiting.map(renderRow)
            )}

            <div className="mx-divider" />
            <span className="mx-label">History · {history.length}</span>
            {history.length === 0 ? (
              <Empty
                title="No signature history"
                description="Signed, declined and expired requests are listed here."
              />
            ) : (
              history.map(renderRow)
            )}
          </div>
        </Panel>

        <Panel
          title="Signature request"
          icon={Stamp}
          note={selected ? SIGNATURE_STATUS_LABEL[selected.status] : "Nothing selected"}
          scroll
        >
          {selected === null ? (
            <Empty
              title="No signature request"
              description="Select a request to read the document and sign it."
            />
          ) : (
            <div style={{ display: "grid", gap: 7 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <span className="mx-row-title" style={{ flexWrap: "wrap", fontSize: 11.5 }}>
                  {selected.documentName}
                </span>
                <span className="mx-inline">
                  <Chip tone={SIGNATURE_STATUS_TONE[selected.status]}>
                    {SIGNATURE_STATUS_LABEL[selected.status]}
                  </Chip>
                  {selected.documentId ? <Chip tone="neutral">{selected.documentId}</Chip> : null}
                  {selected.auditHash ? <Chip tone="success">Sealed</Chip> : null}
                </span>
              </div>

              <dl className="mx-kv">
                <dt>Requested by</dt>
                <dd>{selected.requestedBy}</dd>
                <dt>Requested</dt>
                <dd>
                  {formatDateTime(selected.requestedAt)} · {relativeTime(selected.requestedAt)}
                </dd>
                <dt>Due</dt>
                <dd>
                  {formatDateTime(selected.dueAt)} · {dueLabel(selected.dueAt)}
                </dd>
                <dt>Signed</dt>
                <dd>{selected.signedAt ? formatDateTime(selected.signedAt) : "Not signed"}</dd>
              </dl>

              <div className={`mx-note${selected.status === "declined" ? " mx-note--danger" : ""}`}>
                <strong>
                  {selected.status === "declined" ? "Decline reason." : "Request note."}
                </strong>{" "}
                {selected.note.trim() || "No note was recorded with this request."}
              </div>

              <div className="mx-divider" />
              <span className="mx-label">Timeline</span>
              <div className="mx-timeline">
                {moments.map((moment) => (
                  <div className="mx-timeline-item" key={moment.id} data-tone={moment.tone}>
                    <span className="mx-timeline-summary">{moment.label}</span>
                    <span className="mx-timeline-detail">{moment.detail}</span>
                    <span className="mx-timeline-meta">
                      {moment.at ? formatDateTime(moment.at) : "No timestamp on the record"}
                    </span>
                  </div>
                ))}
              </div>

              {selected.status === "awaiting_signature" ? (
                <>
                  <div className="mx-divider" />
                  <span className="mx-label">Sign this document</span>
                  <Field
                    label="Signature profile"
                    hint="The chosen profile is stored with the signature and printed on the sealed copy."
                  >
                    <select
                      className="mx-select"
                      value={selectedProfile?.id ?? ""}
                      onChange={(event) => setProfileChoice(event.target.value)}
                      aria-label="Signature profile"
                    >
                      {profiles.length === 0 ? <option value="">No saved profile</option> : null}
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.label} · {profile.fullName}
                          {profile.title ? ` · ${profile.title}` : ""} · {profile.style}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <SignaturePreview profile={selectedProfile} />

                  <div className="mx-btn-row">
                    <button
                      className="mx-btn mx-btn--primary"
                      onClick={sign}
                      disabled={!canSign}
                      title={
                        canSign
                          ? `Sign as ${selectedProfile?.fullName ?? user.name}`
                          : "Select a signature profile first"
                      }
                    >
                      <PenLine /> Sign document
                    </button>
                    <span className="mx-tiny mx-muted">
                      Signing seals this document as {user.name}.
                    </span>
                  </div>

                  <div className="mx-divider" />
                  <Field
                    label="Decline reason"
                    hint={`Required · ${declineNote.trim().length} of 4 characters recorded`}
                  >
                    <textarea
                      className="mx-textarea"
                      style={{ minHeight: 46 }}
                      value={declineNote}
                      rows={2}
                      placeholder="Record why this document cannot be signed."
                      onChange={(event) => setDeclineNote(event.target.value)}
                      aria-label="Decline reason"
                    />
                  </Field>
                  <div className="mx-btn-row">
                    <button
                      className="mx-btn mx-btn--danger mx-btn--sm"
                      onClick={decline}
                      disabled={declineNote.trim().length < 4}
                      title={
                        declineNote.trim().length < 4
                          ? "Record at least 4 characters"
                          : "Decline this signature request"
                      }
                    >
                      <XCircle /> Decline signature
                    </button>
                  </div>
                </>
              ) : null}

              {selected.status === "signed" ? (
                <>
                  <div className="mx-divider" />
                  <span className="mx-label">Signature evidence</span>
                  {recordedProfile ? <SignaturePreview profile={recordedProfile} /> : null}
                  <div className="mx-note mx-note--success" style={{ display: "grid", gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>Signed with the recorded profile</span>
                    <span>
                      {recordedProfile?.label ??
                        selected.profileId ??
                        "Profile recorded on the request"}{" "}
                      ·{" "}
                      {selected.signedAt ? formatDateTime(selected.signedAt) : "timestamp recorded"}
                    </span>
                    <span
                      style={{
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 9,
                        wordBreak: "break-all",
                        color: "#16344f",
                      }}
                    >
                      Audit hash {selected.auditHash ?? "not recorded"}
                    </span>
                  </div>
                </>
              ) : null}

              {selected.status === "declined" ? (
                <div className="mx-note mx-note--danger">
                  This request was declined and cannot be signed from this panel. A new request has
                  to be sent by the document owner.
                </div>
              ) : null}

              {selected.status === "expired" ? (
                <div className="mx-note mx-note--warning">
                  The signing window closed before a signature was recorded, so this request is
                  read-only.
                </div>
              ) : null}
            </div>
          )}
        </Panel>

        <Panel title="Saved profiles" icon={Stamp} note={`${profiles.length} configured`} scroll>
          {profiles.length === 0 ? (
            <Empty
              title="No signature profiles"
              description="A profile is required before any document can be signed."
            />
          ) : (
            <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
              {profiles.map((profile) => {
                const used = state.signatures.filter(
                  (signature) => signature.profileId === profile.id,
                ).length;
                const active = selectedProfile?.id === profile.id;
                return (
                  <button
                    key={profile.id}
                    className={`mx-row${active ? " is-selected" : ""}`}
                    style={{
                      gridTemplateColumns: "minmax(0, 1fr)",
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    aria-pressed={active}
                    onClick={() => setProfileChoice(profile.id)}
                    title="Use this profile for the selected document"
                  >
                    <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <span className="mx-row-title">{profile.label}</span>
                      <span className="mx-row-meta">
                        <span>{profile.fullName}</span>
                      </span>
                      {profile.title ? (
                        <span className="mx-row-meta" style={{ marginTop: 0 }}>
                          <span>{profile.title}</span>
                        </span>
                      ) : null}
                      <span className="mx-row-meta" style={{ marginTop: 0 }}>
                        <span>{profile.style}</span>
                        <span>·</span>
                        <span>
                          used on {used} signature{used === 1 ? "" : "s"}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
              <div className="mx-note">
                A profile only supplies the printed signature. Permission to sign still comes from
                the request itself.
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- recognition */

type LedgerFilter = LedgerKind | "all";

const LEDGER_FILTERS: { id: LedgerFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "star", label: "Stars" },
  { id: "xp", label: "XP" },
  { id: "level", label: "Levels" },
  { id: "badge", label: "Badges" },
];

const LEDGER_KIND_LABEL: Record<LedgerKind, string> = {
  star: "Star",
  xp: "XP",
  level: "Level",
  badge: "Badge",
};

const LEDGER_KIND_TONE: Record<LedgerKind, Tone> = {
  star: "warning",
  xp: "info",
  level: "success",
  badge: "accent",
};

const LEDGER_KIND_ICON = {
  star: Star,
  xp: TrendingUp,
  level: BadgeCheck,
  badge: Award,
};

/** The personal recognition ledger: every star, XP award, level and badge is a recorded entry. */
export function RecognitionTab() {
  const state = useCommandState();
  const user = activeUser(state);
  const summary = recognitionSummary(state, state.activeUserId);

  const [filter, setFilter] = useState<LedgerFilter>("all");

  const mine = state.ledger
    .filter((entry) => entry.actorId === state.activeUserId)
    .sort((left, right) => timeOf(right.at) - timeOf(left.at));

  const counts: Record<LedgerFilter, number> = {
    all: mine.length,
    star: mine.filter((entry) => entry.kind === "star").length,
    xp: mine.filter((entry) => entry.kind === "xp").length,
    level: mine.filter((entry) => entry.kind === "level").length,
    badge: mine.filter((entry) => entry.kind === "badge").length,
  };

  const entries = filter === "all" ? mine : mine.filter((entry) => entry.kind === filter);
  const earnedBadgeIds = new Set(summary.badges.map((badge) => badge.id));

  return (
    <div style={ROOT}>
      <Panel
        title="Recognition ledger"
        icon={Trophy}
        note={`${user.name} · ${mine.length} recorded entr${mine.length === 1 ? "y" : "ies"}`}
      >
        <div className="mx-kpis">
          <Kpi value={summary.stars} label="Stars" tone="warning" />
          <Kpi value={summary.xp} label="XP" />
          <Kpi value={`L${summary.level}`} label={summary.levelName} tone="success" />
          <Kpi value={summary.badges.length} label="Badges earned" />
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <div className="mx-inline" style={{ justifyContent: "space-between", gap: 8 }}>
            <span className="mx-label">
              Level {summary.level} · {summary.levelName}
            </span>
            <span className="mx-tiny mx-muted">
              {summary.nextLevelName !== null && summary.nextLevelXp !== null
                ? `${summary.xp} of ${summary.nextLevelXp} XP · ${summary.xpToNext} XP to ${summary.nextLevelName}`
                : `${summary.xp} XP · highest configured level`}
            </span>
          </div>
          {summary.nextLevelName === null ? (
            <Progress value={100} tone="success" />
          ) : (
            <Progress value={summary.progress} />
          )}
        </div>
        <Note>
          Stars come from checkpoints with a recorded result. XP comes from completion and
          complexity, weighted by the priority actually worked. Levels are progression only — they
          grant no permissions and carry no job title.
        </Note>
      </Panel>

      <div
        className="mx-split-row"
        style={{ gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)", flex: 1, minHeight: 0 }}
      >
        <Panel
          title="Ledger entries"
          icon={History}
          note="Newest first"
          actions={
            <>
              {LEDGER_FILTERS.map((item) => (
                <button
                  key={item.id}
                  className={`mx-btn mx-btn--sm${filter === item.id ? " mx-btn--primary" : ""}`}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                  <span className="mx-tiny" style={{ opacity: 0.8 }}>
                    {counts[item.id]}
                  </span>
                </button>
              ))}
            </>
          }
          scroll
        >
          {entries.length === 0 ? (
            <Empty
              icon={Trophy}
              title="No entries for this filter"
              description="Recognition is written when recorded work produces it — nothing is awarded for merely opening a mission."
            />
          ) : (
            <div className="mx-timeline">
              {entries.map((entry) => {
                const Icon = LEDGER_KIND_ICON[entry.kind];
                const tone = LEDGER_KIND_TONE[entry.kind];
                return (
                  <div
                    className="mx-timeline-item"
                    key={entry.id}
                    data-tone={
                      tone === "success" ? "success" : tone === "warning" ? "warning" : "info"
                    }
                  >
                    <span
                      className="mx-timeline-summary"
                      style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}
                    >
                      <span>{entry.label}</span>
                      <Chip tone={tone} icon={Icon}>
                        {LEDGER_KIND_LABEL[entry.kind]}
                      </Chip>
                    </span>
                    <span className="mx-timeline-detail">
                      {entry.sourceLabel}
                      {entry.evidence ? ` — ${entry.evidence}` : ""}
                    </span>
                    <span
                      className="mx-timeline-meta"
                      style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                    >
                      {entry.stars > 0 ? (
                        <span className="mx-star" style={{ fontWeight: 700 }}>
                          +{entry.stars} star{entry.stars === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {entry.xp > 0 ? (
                        <span style={{ fontWeight: 700 }}>+{entry.xp} XP</span>
                      ) : null}
                      {entry.stars === 0 && entry.xp === 0 ? (
                        <span>No points — progression record</span>
                      ) : null}
                      <span>·</span>
                      <span>{formatDateTime(entry.at)}</span>
                      <span>·</span>
                      <span>{entry.sourceType}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Progression" icon={TrendingUp} note="Thresholds from configuration" scroll>
          <div style={{ display: "grid", gap: 5, alignContent: "start" }}>
            <span className="mx-label">Level ladder</span>
            {LEVELS.map((definition) => {
              const current = definition.level === summary.level;
              const achieved = definition.level < summary.level;
              const next = definition.level === summary.level + 1;
              const reached =
                summary.levelHistory.find((entry) => entry.level === definition.level) ?? null;
              return (
                <div
                  key={definition.level}
                  className={`mx-row${current ? " is-selected" : ""}`}
                  style={{ padding: "5px 7px", gridTemplateColumns: "minmax(0, 1fr) auto" }}
                >
                  <span className="mx-row-title" style={{ flexWrap: "wrap" }}>
                    <span>
                      L{definition.level} · {definition.name}
                    </span>
                  </span>
                  <span className="mx-row-actions" style={{ gap: 4 }}>
                    <span className="mx-tiny mx-muted">{definition.minXp} XP</span>
                    {current ? (
                      <Chip tone="accent">Current</Chip>
                    ) : achieved ? (
                      <Chip tone="success">
                        {reached ? `Reached ${relativeTime(reached.at)}` : "Achieved"}
                      </Chip>
                    ) : next ? (
                      <Chip tone="warning">Next</Chip>
                    ) : (
                      <span className="mx-tiny mx-muted">Locked</span>
                    )}
                  </span>
                </div>
              );
            })}

            <div className="mx-divider" />
            <span className="mx-label">
              Badges · {summary.badges.length} of {BADGES.length}
            </span>
            <div className="mx-badge-grid">
              {BADGES.map((badge) => {
                const earned = summary.badges.find((item) => item.id === badge.id) ?? null;
                const isEarned = earnedBadgeIds.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`mx-badge${isEarned ? "" : " mx-badge--locked"}`}
                    title={`${badge.description} — ${badge.criteria}`}
                  >
                    {isEarned ? (
                      <Award
                        style={{ width: 13, height: 13, color: "#6a58b3", margin: "0 auto" }}
                      />
                    ) : (
                      <Lock style={{ width: 13, height: 13, color: "#90a4b8", margin: "0 auto" }} />
                    )}
                    <strong>{badge.name}</strong>
                    <span>{badge.criteria}</span>
                    <span>
                      {isEarned && earned
                        ? `Earned ${relativeTime(earned.earnedAt)} · ${badge.stage}`
                        : `${badge.stage} · ${badge.category}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
