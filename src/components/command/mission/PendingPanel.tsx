import { useState } from "react";
import { PauseCircle, Play } from "lucide-react";
import type { Mission, MissionPendingReason } from "@/lib/domain/types";
import { PENDING_REASON_LABEL, formatDateTime, relativeTime } from "@/lib/domain/format";
import { useAction, useDraft } from "@/lib/domain/store";
import { Chip, Field, Panel } from "@/components/command/ui";
import { FactGrid } from "./MissionCommon";
import { isoFromDateInput } from "./missionMeta";

const PENDING_REASONS = [
  "awaiting_requester",
  "awaiting_provider",
  "awaiting_action",
  "awaiting_approval",
  "scheduled",
  "other",
] as const satisfies readonly MissionPendingReason[];

export function PendingPanel({ mission }: { mission: Mission }) {
  const act = useAction();
  const [reason, setReason] = useState<MissionPendingReason>("awaiting_requester");
  const [note, setNote] = useDraft(`mission.${mission.id}.pending.note`, "");
  const [nextActionDate, setNextActionDate] = useState("");

  const isPending = mission.status === "pending" && mission.pending !== null;
  const canSetPending = mission.status === "accepted" || mission.status === "in_progress";
  const noteReady = note.trim().length >= 4;

  function setPending() {
    const outcome = act(
      {
        type: "mission.pending",
        missionId: mission.id,
        reason,
        note: note.trim(),
        nextActionAt: isoFromDateInput(nextActionDate),
      },
      { success: "Mission marked pending — this is a dependency, not an accomplishment" },
    );
    if (outcome.ok) {
      setNote("");
      setNextActionDate("");
    }
  }

  return (
    <Panel
      title="Dependency"
      icon={PauseCircle}
      note={
        isPending
          ? "Mission is waiting on a recorded dependency"
          : "Record a dependency instead of stalling"
      }
      actions={isPending ? <Chip tone="warning">Pending</Chip> : null}
    >
      {isPending && mission.pending ? (
        <div style={{ display: "grid", gap: 6 }}>
          <FactGrid
            rows={[
              {
                label: "Reason",
                value: PENDING_REASON_LABEL[mission.pending.reason] ?? mission.pending.reason,
              },
              { label: "Note", value: mission.pending.note },
              {
                label: "Pending since",
                value: `${formatDateTime(mission.pending.since)} · ${relativeTime(mission.pending.since)}`,
              },
              {
                label: "Next action",
                value: mission.pending.nextActionAt
                  ? formatDateTime(mission.pending.nextActionAt)
                  : "No date recorded",
              },
            ]}
          />
          <div className="mx-note mx-note--warning">
            A pending mission is still open work. It is not started work in progress, and it is not
            resolved.
          </div>
          <div className="mx-btn-row">
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--primary"
              onClick={() =>
                act(
                  { type: "mission.resume", missionId: mission.id },
                  { success: `${mission.number} resumed as its own recorded event` },
                )
              }
            >
              <Play /> Resume work
            </button>
            <span className="mx-tiny mx-muted">
              Resuming is recorded separately from the dependency that was cleared.
            </span>
          </div>
        </div>
      ) : canSetPending ? (
        <div style={{ display: "grid", gap: 6 }}>
          <Field label="Reason">
            <select
              className="mx-select"
              value={reason}
              onChange={(event) => {
                const next = PENDING_REASONS.find((entry) => entry === event.target.value);
                if (next) setReason(next);
              }}
              aria-label="Pending reason"
            >
              {PENDING_REASONS.map((entry) => (
                <option key={entry} value={entry}>
                  {PENDING_REASON_LABEL[entry] ?? entry}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="What is the mission waiting on? (required)"
            hint="At least 4 characters. Saved as a draft."
          >
            <textarea
              className="mx-textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Name the person, provider or approval the mission is waiting on."
              aria-label="Pending note"
            />
          </Field>
          <Field label="Next action date (optional)">
            <input
              className="mx-input"
              type="date"
              value={nextActionDate}
              onChange={(event) => setNextActionDate(event.target.value)}
              aria-label="Next action date"
            />
          </Field>
          <div className="mx-btn-row">
            <button
              type="button"
              className="mx-btn mx-btn--sm"
              onClick={setPending}
              disabled={!noteReady}
            >
              <PauseCircle /> Record dependency
            </button>
            <span className="mx-tiny mx-muted">{note.trim().length} characters</span>
          </div>
        </div>
      ) : (
        <span className="mx-tiny mx-muted">
          Only accepted or in-progress work can be marked pending.
        </span>
      )}
    </Panel>
  );
}
