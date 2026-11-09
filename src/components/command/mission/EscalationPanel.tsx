import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Mission } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/domain/format";
import { useAction, useCommandState } from "@/lib/domain/store";
import { Chip, Field, Panel } from "@/components/command/ui";
import { FactGrid } from "./MissionCommon";
import { displayName } from "./missionMeta";

const MIN_REASON = 8;
const MIN_FIELD = 3;

export function EscalationPanel({ mission }: { mission: Mission }) {
  const state = useCommandState();
  const act = useAction();
  const [open, setOpen] = useState(mission.status === "escalated");
  const [reason, setReason] = useState("");
  const [expertise, setExpertise] = useState("");
  const [receivingTeam, setReceivingTeam] = useState("");

  const escalation = mission.escalation;
  const canEscalate =
    mission.status === "accepted" ||
    mission.status === "in_progress" ||
    mission.status === "pending";
  const ready =
    reason.trim().length >= MIN_REASON &&
    expertise.trim().length >= MIN_FIELD &&
    receivingTeam.trim().length >= MIN_FIELD;

  function escalate() {
    const outcome = act(
      {
        type: "mission.escalate",
        missionId: mission.id,
        reason: reason.trim(),
        expertise: expertise.trim(),
        receivingTeam: receivingTeam.trim(),
      },
      { success: `${mission.number} escalated — the complete trail travels with the ticket` },
    );
    if (outcome.ok) {
      setReason("");
      setExpertise("");
      setReceivingTeam("");
      setOpen(false);
    }
  }

  return (
    <Panel
      title="Escalation"
      icon={AlertTriangle}
      note={escalation ? "Escalation recorded" : "Hand over with a complete history"}
      actions={escalation ? <Chip tone="danger">Escalated</Chip> : null}
    >
      {escalation ? (
        <div style={{ display: "grid", gap: 6 }}>
          <FactGrid
            rows={[
              { label: "Reason", value: escalation.reason },
              { label: "Expertise", value: escalation.expertise },
              { label: "Receiving team", value: escalation.receivingTeam },
              { label: "Escalated at", value: formatDateTime(escalation.at) },
              { label: "Escalated by", value: displayName(state, escalation.by) },
              {
                label: "Acknowledgement",
                value: escalation.acknowledgedAt
                  ? formatDateTime(escalation.acknowledgedAt)
                  : "Not yet recorded",
              },
            ]}
          />
          <div className="mx-note mx-note--danger">
            The full history travels with the ticket: every accepted, started, checkpoint, pending,
            evidence and note event below is available to the receiving team. Escalation is not
            completion.
          </div>
        </div>
      ) : null}

      {canEscalate ? (
        <div style={{ display: "grid", gap: 6 }}>
          <button
            type="button"
            className="mx-btn mx-btn--sm mx-btn--ghost"
            style={{ justifyContent: "flex-start", paddingLeft: 2 }}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            {open ? "Hide escalation form" : "Prepare an escalation"}
          </button>
          {open ? (
            <>
              <Field label="Reason (required)" hint={`At least ${MIN_REASON} characters.`}>
                <textarea
                  className="mx-textarea"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why can this not be completed within your scope?"
                  aria-label="Escalation reason"
                />
              </Field>
              <div className="mx-form-grid">
                <Field
                  label="Expertise required (required)"
                  hint={`At least ${MIN_FIELD} characters.`}
                >
                  <input
                    className="mx-input"
                    value={expertise}
                    onChange={(event) => setExpertise(event.target.value)}
                    placeholder="e.g. print driver engineering"
                    aria-label="Expertise required"
                  />
                </Field>
                <Field label="Receiving team (required)" hint={`At least ${MIN_FIELD} characters.`}>
                  <input
                    className="mx-input"
                    value={receivingTeam}
                    onChange={(event) => setReceivingTeam(event.target.value)}
                    placeholder="e.g. Workplace Engineering · Tier 3"
                    aria-label="Receiving team"
                  />
                </Field>
              </div>
              <div className="mx-btn-row">
                <button
                  type="button"
                  className="mx-btn mx-btn--sm mx-btn--danger"
                  onClick={escalate}
                  disabled={!ready}
                >
                  <AlertTriangle /> Escalate mission
                </button>
                <span className="mx-tiny mx-muted">
                  {reason.trim().length}/{MIN_REASON} reason · {expertise.trim().length}/{MIN_FIELD}{" "}
                  expertise · {receivingTeam.trim().length}/{MIN_FIELD} team
                </span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
