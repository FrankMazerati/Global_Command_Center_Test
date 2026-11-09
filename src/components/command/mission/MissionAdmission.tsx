import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCheck, Eye, EyeOff, FileText, ShieldQuestion, XCircle } from "lucide-react";
import type { DeclineReason, Mission } from "@/lib/domain/types";
import {
  DECLINE_REASON_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  formatDateTime,
  relativeTime,
  slaRemaining,
} from "@/lib/domain/format";
import { useAction, useCommandState, useDraft } from "@/lib/domain/store";
import { Chip, Field, Note, Panel } from "@/components/command/ui";
import { FactGrid, MissionHeader, slaToneOf } from "./MissionCommon";

const DECLINE_REASONS = [
  "outside_skill_set",
  "incorrect_assignment",
  "access_unavailable",
  "workload_conflict",
  "another_department",
  "other",
] as const satisfies readonly DeclineReason[];

export function MissionAdmission({ mission }: { mission: Mission }) {
  const state = useCommandState();
  const act = useAction();
  const [showDetails, setShowDetails] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<DeclineReason>("outside_skill_set");
  const [note, setNote] = useDraft(`mission.${mission.id}.decline`, "");

  const sla = slaRemaining(mission.slaDueAt);
  const noteReady = note.trim().length >= 4;
  const offeredTo = mission.offeredTo
    ? (state.users.find((user) => user.id === mission.offeredTo)?.name ?? mission.offeredTo)
    : "Routing queue";
  const documents = mission.documentIds.map((documentId) => ({
    documentId,
    document: state.library.find((entry) => entry.id === documentId) ?? null,
  }));

  function toggleDetails() {
    const next = !showDetails;
    if (next) {
      const alreadyViewed = mission.trail.some((event) => event.type === "mission.viewed");
      act(
        { type: "mission.view", missionId: mission.id },
        alreadyViewed
          ? { silent: true }
          : { success: "Briefing reviewed — the mission is still unaccepted" },
      );
    }
    setShowDetails(next);
  }

  function accept() {
    act(
      { type: "mission.accept", missionId: mission.id },
      { success: `Accepted ${mission.number} — acceptance is recorded. Work has not started.` },
    );
  }

  function decline() {
    const result = act(
      { type: "mission.decline", missionId: mission.id, reason, note: note.trim() },
      { success: `Returned ${mission.number} to routing — the ticket stays open` },
    );
    if (result.ok) {
      setDeclining(false);
      setNote("");
    }
  }

  return (
    <Panel
      title="Admission control"
      icon={ShieldQuestion}
      note="Assignment is not acceptance"
      actions={<Chip tone="accent">Decision required</Chip>}
    >
      <MissionHeader
        mission={mission}
        note="Reviewing the briefing records a view. Viewing never accepts the mission."
      />

      <FactGrid
        rows={[
          { label: "Number", value: mission.number },
          {
            label: "Requester",
            value: (
              <span
                style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}
              >
                <span>{mission.requester.name}</span>
                <span className="mx-muted">· {mission.requester.department}</span>
                <a href={`mailto:${mission.requester.email}`} className="mx-tag">
                  {mission.requester.email}
                </a>
              </span>
            ),
          },
          {
            label: "Priority",
            value: <Chip tone={PRIORITY_TONE[mission.priority]}>{mission.priority}</Chip>,
          },
          { label: "Status", value: STATUS_LABEL[mission.status] },
          { label: "Submitted", value: formatDateTime(mission.submittedAt) },
          {
            label: "SLA",
            value: (
              <span className="mx-inline" style={{ gap: 4 }}>
                <span>{formatDateTime(mission.slaDueAt)}</span>
                <Chip tone={slaToneOf(mission)}>{sla.label}</Chip>
              </span>
            ),
          },
          { label: "Affected", value: `${mission.affected.type} · ${mission.affected.name}` },
          { label: "Offered to", value: offeredTo },
        ]}
      />

      <div
        className={`mx-row-desc${showDetails ? "" : " mx-clamp-3"}`}
        style={{ marginTop: 0, overflowWrap: "anywhere", whiteSpace: "pre-line" }}
      >
        {mission.description}
      </div>

      <div className="mx-btn-row mx-sticky-actions">
        <button
          type="button"
          className="mx-btn mx-btn--sm"
          onClick={toggleDetails}
          aria-expanded={showDetails}
        >
          {showDetails ? <EyeOff /> : <Eye />} {showDetails ? "HIDE DETAILS" : "VIEW DETAILS"}
        </button>
        <button type="button" className="mx-btn mx-btn--sm mx-btn--primary" onClick={accept}>
          <CheckCheck /> ACCEPT MISSION
        </button>
        <button
          type="button"
          className="mx-btn mx-btn--sm mx-btn--danger"
          onClick={() => setDeclining(!declining)}
          aria-expanded={declining}
        >
          <XCircle /> DECLINE MISSION
        </button>
      </div>

      {showDetails ? (
        <div style={{ display: "grid", gap: 7 }}>
          <div className="mx-divider" />
          <span className="mx-label">Full briefing</span>
          <FactGrid
            rows={[
              { label: "Tenant", value: mission.tenant },
              { label: "Severity", value: mission.severity },
              { label: "Affected detail", value: mission.affected.detail },
              { label: "Assigned team", value: mission.assignedTeam },
              { label: "Offered to", value: offeredTo },
              {
                label: "Requested tools",
                value:
                  mission.requestedTools.length > 0 ? (
                    <span className="mx-inline" style={{ gap: 4 }}>
                      {mission.requestedTools.map((tool) => (
                        <span key={tool} className="mx-tag">
                          {tool}
                        </span>
                      ))}
                    </span>
                  ) : (
                    "None requested"
                  ),
              },
            ]}
          />
          <span className="mx-label">Attachments</span>
          {documents.length === 0 ? (
            <span className="mx-tiny mx-muted">No documents were attached by the requester.</span>
          ) : (
            <div style={{ display: "grid", gap: 4 }}>
              {documents.map((entry) =>
                entry.document ? (
                  <Link
                    key={entry.documentId}
                    to="/connectors"
                    search={{ doc: entry.document.id }}
                    className="mx-tag"
                    style={{ display: "inline-flex", gap: 4, alignItems: "center" }}
                  >
                    <FileText style={{ width: 10, height: 10 }} />
                    {entry.document.name} · {entry.document.extension.toUpperCase()}
                  </Link>
                ) : (
                  <span key={entry.documentId} className="mx-tag" style={{ color: "#8a6110" }}>
                    {entry.documentId} · not present in the document library
                  </span>
                ),
              )}
            </div>
          )}
          <Note>
            Only the requester-visible description is shown here. Other technicians&rsquo; internal
            notes are never displayed on an unaccepted mission.
          </Note>
          <span className="mx-tiny mx-muted">
            Received {relativeTime(mission.submittedAt)} · SLA {sla.label} ·{" "}
            {mission.checkpoints.length} objectives will open once work starts.
          </span>
        </div>
      ) : null}

      {declining ? (
        <div className="mx-note mx-note--warning" style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 10 }}>
            Declining returns the ticket to routing. It stays open — declining is not resolution.
          </strong>
          <Field label="Reason">
            <select
              className="mx-select"
              value={reason}
              onChange={(event) => {
                const next = DECLINE_REASONS.find((entry) => entry === event.target.value);
                if (next) setReason(next);
              }}
              aria-label="Decline reason"
            >
              {DECLINE_REASONS.map((entry) => (
                <option key={entry} value={entry}>
                  {DECLINE_REASON_LABEL[entry] ?? entry}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Note (required)"
            hint="At least 4 characters — the routing team reads this. It is recorded against your name."
          >
            <textarea
              className="mx-textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Explain what the routing team needs to do next."
              aria-label="Decline note"
            />
          </Field>
          <div className="mx-btn-row">
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--danger"
              onClick={decline}
              disabled={!noteReady}
            >
              <XCircle /> Return to routing
            </button>
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--ghost"
              onClick={() => setDeclining(false)}
            >
              Keep the mission
            </button>
            <span className="mx-tiny mx-muted">{note.trim().length} characters · draft saved</span>
          </div>
          <span className="mx-tiny mx-muted">
            The ticket is not deleted, not resolved and not closed. It becomes available to the
            routing queue again.
          </span>
        </div>
      ) : null}
    </Panel>
  );
}
