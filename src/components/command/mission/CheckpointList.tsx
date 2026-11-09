import { useState } from "react";
import {
  AlertTriangle,
  CheckCheck,
  Paperclip,
  Play,
  SkipForward,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { Checkpoint, CheckpointState, EvidenceRef, Mission } from "@/lib/domain/types";
import { CHECKPOINT_LABEL, CHECKPOINT_TONE, formatDateTime } from "@/lib/domain/format";
import { STAR_RULES } from "@/lib/domain/recognition";
import { useAction, useDraft } from "@/lib/domain/store";
import { Chip, Field, Note } from "@/components/command/ui";
import { CheckpointAwardTag } from "./MissionCommon";

const EVIDENCE_KINDS = ["note", "file", "log", "screenshot"] as const;

export function CheckpointList({
  mission,
  editable,
  lockReason,
}: {
  mission: Mission;
  editable: boolean;
  lockReason: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {!editable ? <Note tone="warning">{lockReason}</Note> : null}
      {mission.checkpoints.map((checkpoint) => (
        <CheckpointCard
          key={checkpoint.id}
          mission={mission}
          checkpoint={checkpoint}
          editable={editable}
        />
      ))}
    </div>
  );
}

function CheckpointCard({
  mission,
  checkpoint,
  editable,
}: {
  mission: Mission;
  checkpoint: Checkpoint;
  editable: boolean;
}) {
  const act = useAction();
  const [result, setResult] = useDraft(
    `mission.${mission.id}.${checkpoint.id}.result`,
    checkpoint.actualResult,
  );
  const [skipReason, setSkipReason] = useDraft(
    `mission.${mission.id}.${checkpoint.id}.skip`,
    checkpoint.skipReason,
  );
  const [evidenceLabel, setEvidenceLabel] = useDraft(
    `mission.${mission.id}.${checkpoint.id}.evidence`,
    "",
  );
  const [evidenceKind, setEvidenceKind] = useState<EvidenceRef["kind"]>("note");
  const [override, setOverride] = useState<boolean | null>(null);

  const resultReady = result.trim().length >= 4;
  const skipReady = skipReason.trim().length >= 4;
  const evidenceReady = evidenceLabel.trim().length >= 3;
  const isTerminal =
    checkpoint.state === "completed" ||
    checkpoint.state === "skipped" ||
    checkpoint.state === "unsuccessful";
  const open =
    override ?? (checkpoint.state === "in_progress" || checkpoint.state === "escalation_required");

  function update(state: CheckpointState) {
    const verb = CHECKPOINT_LABEL[state].toLowerCase();
    const award = STAR_RULES[checkpoint.starRule];
    act(
      {
        type: "checkpoint.update",
        missionId: mission.id,
        checkpointId: checkpoint.id,
        state,
        actualResult: result,
        skipReason,
      },
      {
        success:
          state === "completed"
            ? `Checkpoint recorded as ${verb} · +${award.stars} stars, +${award.xp} XP`
            : `Checkpoint recorded as ${verb}`,
      },
    );
  }

  function attachEvidence() {
    const outcome = act(
      {
        type: "checkpoint.evidence",
        missionId: mission.id,
        checkpointId: checkpoint.id,
        label: evidenceLabel,
        kind: evidenceKind,
        documentId: null,
      },
      { success: "Evidence recorded against this checkpoint with a timestamp" },
    );
    if (outcome.ok) setEvidenceLabel("");
  }

  return (
    <div
      className="mx-row"
      style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: 5, alignItems: "start" }}
    >
      <div className="mx-inline" style={{ gap: 5, alignItems: "flex-start" }}>
        <span className="mx-tiny mx-muted" style={{ paddingTop: 1 }}>
          {String(checkpoint.order).padStart(2, "0")}
        </span>
        <span className="mx-row-title" style={{ minWidth: 0, flex: 1, overflowWrap: "anywhere" }}>
          {checkpoint.title}
        </span>
        <Chip tone={CHECKPOINT_TONE[checkpoint.state]}>{CHECKPOINT_LABEL[checkpoint.state]}</Chip>
      </div>

      <div className="mx-row-desc" style={{ marginTop: 0, overflowWrap: "anywhere" }}>
        {checkpoint.why}
      </div>
      <div className="mx-tiny mx-muted" style={{ overflowWrap: "anywhere" }}>
        Expected result · {checkpoint.expectedResult}
      </div>

      <div className="mx-inline" style={{ gap: 4 }}>
        <CheckpointAwardTag checkpoint={checkpoint} />
        {checkpoint.state === "completed" ? (
          <Chip tone="success" icon={Sparkles}>
            Award recorded
          </Chip>
        ) : null}
        {checkpoint.startedAt ? (
          <span className="mx-tiny mx-muted">Started {formatDateTime(checkpoint.startedAt)}</span>
        ) : null}
        {checkpoint.completedAt ? (
          <span className="mx-tiny mx-muted">Closed {formatDateTime(checkpoint.completedAt)}</span>
        ) : null}
      </div>

      {checkpoint.actualResult ? (
        <div className="mx-note" style={{ padding: "5px 7px", overflowWrap: "anywhere" }}>
          <span className="mx-label">Recorded result</span>
          <div style={{ marginTop: 3 }}>{checkpoint.actualResult}</div>
        </div>
      ) : null}
      {checkpoint.skipReason ? (
        <div
          className="mx-note mx-note--warning"
          style={{ padding: "5px 7px", overflowWrap: "anywhere" }}
        >
          <span className="mx-label">Skip reason</span>
          <div style={{ marginTop: 3 }}>{checkpoint.skipReason}</div>
        </div>
      ) : null}

      {checkpoint.evidence.length > 0 ? (
        <div style={{ display: "grid", gap: 3 }}>
          <span className="mx-label">Evidence</span>
          {checkpoint.evidence.map((evidence) => (
            <div key={evidence.id} className="mx-inline" style={{ gap: 4 }}>
              <span className="mx-tag">{evidence.kind}</span>
              <span style={{ fontSize: 9.5, overflowWrap: "anywhere" }}>{evidence.label}</span>
              <span className="mx-tiny mx-muted">{formatDateTime(evidence.addedAt)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {editable ? (
        <div className="mx-btn-row">
          <button
            type="button"
            className="mx-btn mx-btn--sm mx-btn--ghost"
            onClick={() => setOverride(!open)}
            aria-expanded={open}
          >
            {open ? "Hide controls" : isTerminal ? "Record a different outcome" : "Record outcome"}
          </button>
          {!open ? (
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--success"
              onClick={() => update("completed")}
              disabled={!resultReady}
              title={
                resultReady
                  ? "Record this checkpoint as completed"
                  : "Record the actual result first (4+ characters)"
              }
            >
              <CheckCheck /> Complete
            </button>
          ) : null}
        </div>
      ) : null}

      {editable && open ? (
        <div style={{ display: "grid", gap: 6 }}>
          <Field
            label="Actual result (required to complete)"
            hint="Saved as a draft immediately — switching missions never loses it."
          >
            <textarea
              className="mx-textarea"
              value={result}
              onChange={(event) => setResult(event.target.value)}
              placeholder="What did you actually observe or do?"
              aria-label={`Actual result for ${checkpoint.title}`}
            />
          </Field>
          <Field label="Skip reason (only for a skipped checkpoint)">
            <input
              className="mx-input"
              value={skipReason}
              onChange={(event) => setSkipReason(event.target.value)}
              placeholder="Why was this checkpoint skipped?"
              aria-label={`Skip reason for ${checkpoint.title}`}
            />
          </Field>
          <div className="mx-btn-row">
            {checkpoint.state !== "in_progress" ? (
              <button
                type="button"
                className="mx-btn mx-btn--sm"
                onClick={() => update("in_progress")}
              >
                <Play /> Start
              </button>
            ) : null}
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--success"
              onClick={() => update("completed")}
              disabled={!resultReady}
            >
              <CheckCheck /> Complete
            </button>
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--danger"
              onClick={() => update("unsuccessful")}
              disabled={!resultReady}
            >
              <XCircle /> Unsuccessful
            </button>
            <button
              type="button"
              className="mx-btn mx-btn--sm"
              onClick={() => update("skipped")}
              disabled={!skipReady}
            >
              <SkipForward /> Skip
            </button>
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--danger"
              onClick={() => update("escalation_required")}
              disabled={!resultReady}
            >
              <AlertTriangle /> Needs escalation
            </button>
          </div>
          <span className="mx-tiny mx-muted">
            {resultReady
              ? "Result recorded in the field above."
              : "Complete, Unsuccessful and Needs escalation require a recorded result of at least 4 characters."}
            {skipReady ? "" : " Skip requires a recorded reason."}
          </span>

          <div className="mx-divider" />
          <span className="mx-label">Attach evidence</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(84px, auto)",
              gap: 5,
            }}
          >
            <input
              className="mx-input"
              value={evidenceLabel}
              onChange={(event) => setEvidenceLabel(event.target.value)}
              placeholder="Evidence label — log excerpt, screenshot, note"
              aria-label={`Evidence label for ${checkpoint.title}`}
            />
            <select
              className="mx-select"
              value={evidenceKind}
              onChange={(event) => {
                const next = EVIDENCE_KINDS.find((entry) => entry === event.target.value);
                if (next) setEvidenceKind(next);
              }}
              aria-label="Evidence kind"
            >
              {EVIDENCE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </div>
          <div className="mx-btn-row">
            <button
              type="button"
              className="mx-btn mx-btn--sm"
              onClick={attachEvidence}
              disabled={!evidenceReady}
            >
              <Paperclip /> Attach evidence
            </button>
            <span className="mx-tiny mx-muted">
              Each recorded evidence item earns +{STAR_RULES.evidence_captured.stars} stars, +
              {STAR_RULES.evidence_captured.xp} XP.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
