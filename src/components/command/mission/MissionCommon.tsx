import { Fragment, type ReactNode } from "react";
import { CalendarClock, CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { Checkpoint, InternalNote, Mission } from "@/lib/domain/types";
import {
  CHECKPOINT_LABEL,
  CHECKPOINT_TONE,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  formatDateTime,
  formatTime,
  slaRemaining,
} from "@/lib/domain/format";
import { Chip, Progress, type Tone } from "@/components/command/ui";
import { missionProgress } from "@/lib/domain/selectors";
import { awardText, checkpointAward, stageEntries } from "./missionMeta";

export function slaToneOf(mission: Mission): Tone {
  const sla = slaRemaining(mission.slaDueAt);
  return sla.tone === "ok" ? "success" : sla.tone;
}

export function FactGrid({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="mx-kv">
      {rows.map((row) => (
        <Fragment key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** Number, title, chips and progress — used by every mission surface. */
export function MissionHeader({ mission, note }: { mission: Mission; note: string }) {
  const progress = missionProgress(mission);
  const sla = slaRemaining(mission.slaDueAt);
  return (
    <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
      <div className="mx-inline" style={{ gap: 5 }}>
        <span className="mx-eyebrow">{mission.number}</span>
        <Chip tone={PRIORITY_TONE[mission.priority]}>{mission.priority}</Chip>
        <Chip tone={STATUS_TONE[mission.status]}>{STATUS_LABEL[mission.status]}</Chip>
        <Chip tone={slaToneOf(mission)} icon={CalendarClock}>
          {sla.label}
        </Chip>
      </div>
      <h2
        className="mx-panel-title"
        style={{ fontSize: 13, lineHeight: 1.3, overflowWrap: "anywhere" }}
      >
        {mission.title}
      </h2>
      <span className="mx-tiny mx-muted">{note}</span>
      <div style={{ display: "grid", gap: 3 }}>
        {progress.percent >= 100 ? (
          <Progress value={100} tone="success" />
        ) : (
          <Progress value={progress.percent} />
        )}
        <span className="mx-tiny mx-muted">
          {progress.done} of {progress.total} checkpoints have a recorded outcome · SLA due{" "}
          {formatDateTime(mission.slaDueAt)}
        </span>
      </div>
    </div>
  );
}

/**
 * The stages the product never collapses. Each shows its own timestamp from the record, or
 * states plainly that it has not happened.
 */
export function StageStrip({ mission }: { mission: Mission }) {
  const stages = stageEntries(mission);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span className="mx-label">Recorded stages</span>
      <div className="mx-inline" style={{ gap: 4 }}>
        {stages.map((stage) => (
          <span
            key={stage.label}
            className="mx-tag"
            title={stage.at ? formatDateTime(stage.at) : `${stage.label} has no recorded timestamp`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              background: stage.at ? "rgba(227, 244, 235, 0.92)" : "rgba(238, 243, 248, 0.9)",
              color: stage.at ? "#1b8355" : "#7d8fa1",
            }}
          >
            {stage.at ? (
              <CheckCircle2 style={{ width: 9, height: 9 }} />
            ) : (
              <Circle style={{ width: 9, height: 9 }} />
            )}
            {stage.label}
            <span style={{ opacity: 0.8 }}>
              · {stage.at ? formatTime(stage.at) : "not recorded"}
            </span>
          </span>
        ))}
      </div>
      <span className="mx-tiny mx-muted">
        Offered, viewed, accepted, started, resolved, completed and closed are separate events with
        their own identity and timestamp.
      </span>
    </div>
  );
}

export function ReadOnlyCheckpoints({ mission }: { mission: Mission }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {mission.checkpoints.map((checkpoint) => (
        <div
          key={checkpoint.id}
          className="mx-row"
          style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: 4 }}
        >
          <div className="mx-inline" style={{ gap: 5 }}>
            <span className="mx-tiny mx-muted">{String(checkpoint.order).padStart(2, "0")}</span>
            <span className="mx-row-title" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              {checkpoint.title}
            </span>
            <Chip tone={CHECKPOINT_TONE[checkpoint.state]}>
              {CHECKPOINT_LABEL[checkpoint.state]}
            </Chip>
          </div>
          {checkpoint.actualResult ? (
            <div className="mx-row-desc">Recorded result · {checkpoint.actualResult}</div>
          ) : null}
          {checkpoint.skipReason ? (
            <div className="mx-row-desc">Skip reason · {checkpoint.skipReason}</div>
          ) : null}
          <div className="mx-row-meta" style={{ marginTop: 0 }}>
            <span>
              Started {checkpoint.startedAt ? formatDateTime(checkpoint.startedAt) : "not recorded"}
            </span>
            <span>·</span>
            <span>
              Completed{" "}
              {checkpoint.completedAt ? formatDateTime(checkpoint.completedAt) : "not recorded"}
            </span>
            <span>·</span>
            <span className="mx-star">
              <Sparkles style={{ width: 9, height: 9, verticalAlign: "-1px" }} />{" "}
              {awardText(checkpointAward(checkpoint))}
            </span>
          </div>
          {checkpoint.evidence.length > 0 ? (
            <div className="mx-row-meta" style={{ marginTop: 0 }}>
              {checkpoint.evidence.map((evidence) => (
                <span key={evidence.id} className="mx-tag">
                  {evidence.label} · {evidence.kind} · {formatDateTime(evidence.addedAt)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function NotesList({ notes }: { notes: InternalNote[] }) {
  if (notes.length === 0) {
    return <span className="mx-tiny mx-muted">No notes recorded on this ticket.</span>;
  }
  return (
    <div style={{ display: "grid", gap: 5 }}>
      {notes.map((note) => (
        <div
          key={note.id}
          className="mx-row"
          style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: 3 }}
        >
          <div className="mx-inline" style={{ gap: 5 }}>
            <span className="mx-strong" style={{ fontSize: 9.5 }}>
              {note.authorName}
            </span>
            <Chip tone={note.visibility === "internal" ? "neutral" : "info"}>
              {note.visibility === "internal" ? "Internal only" : "Requester visible"}
            </Chip>
            <span className="mx-tiny mx-muted">{formatDateTime(note.at)}</span>
          </div>
          <div className="mx-row-desc" style={{ marginTop: 0, overflowWrap: "anywhere" }}>
            {note.body}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CheckpointAwardTag({ checkpoint }: { checkpoint: Checkpoint }) {
  const award = checkpointAward(checkpoint);
  return (
    <span className="mx-tag" style={{ background: "rgba(251, 240, 218, 0.9)", color: "#8a6110" }}>
      {award.label} · {awardText(award)}
    </span>
  );
}
