import { useState } from "react";
import { ChevronDown, ChevronRight, ListTodo } from "lucide-react";
import type { Mission, MissionStatus } from "@/lib/domain/types";
import {
  DECLINE_REASON_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  relativeTime,
  slaRemaining,
} from "@/lib/domain/format";
import { missionProgress } from "@/lib/domain/selectors";
import { Chip, Panel, Progress, type Tone } from "@/components/command/ui";

interface QueueSection {
  key: string;
  label: string;
  rows: Mission[];
  tone: Tone;
}

const SECTION_ORDER: { key: string; label: string; status: MissionStatus; tone: Tone }[] = [
  { key: "available", label: "New available", status: "available", tone: "accent" },
  { key: "assigned", label: "Assigned", status: "assigned", tone: "info" },
  { key: "accepted", label: "Accepted", status: "accepted", tone: "info" },
  { key: "in_progress", label: "In progress", status: "in_progress", tone: "info" },
  { key: "pending", label: "Pending", status: "pending", tone: "warning" },
  { key: "escalated", label: "Escalated", status: "escalated", tone: "danger" },
];

export function MissionQueue({
  shell,
  selectedId,
  onSelect,
}: {
  shell: Record<MissionStatus, Mission[]>;
  selectedId: string | null;
  onSelect: (missionId: string) => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const returned = shell.available.filter((mission) => mission.declines.length > 0);
  const sections: QueueSection[] = SECTION_ORDER.map((definition) => ({
    key: definition.key,
    label: definition.label,
    tone: definition.tone,
    rows:
      definition.status === "available"
        ? shell.available.filter((mission) => mission.declines.length === 0)
        : shell[definition.status],
  }));
  const finished = [...shell.completed, ...shell.closed].sort(
    (a, b) => new Date(b.statusChangedAt).getTime() - new Date(a.statusChangedAt).getTime(),
  );
  const total =
    sections.reduce((sum, section) => sum + section.rows.length, 0) +
    returned.length +
    finished.length;

  return (
    <div className="mx-col" style={{ minHeight: 0, maxHeight: "calc(100dvh - 208px)" }}>
      <Panel
        title="Mission queue"
        icon={ListTodo}
        note={`${total} in view`}
        scroll
        bodyClassName="mx-scroll"
        actions={<Chip tone="neutral">Newest first</Chip>}
      >
        {sections.map((section) => (
          <div key={section.key} style={{ display: "grid", gap: 4 }}>
            <SectionHeading label={section.label} count={section.rows.length} tone={section.tone} />
            {section.rows.length === 0 ? (
              <span className="mx-tiny mx-muted" style={{ paddingLeft: 2 }}>
                No missions in this stage
              </span>
            ) : (
              section.rows.map((mission) => (
                <MissionRow
                  key={mission.id}
                  mission={mission}
                  selected={mission.id === selectedId}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>
        ))}

        {returned.length > 0 ? (
          <div style={{ display: "grid", gap: 4 }}>
            <SectionHeading label="Returned to routing" count={returned.length} tone="warning" />
            <span className="mx-tiny mx-muted" style={{ paddingLeft: 2 }}>
              Declined by you. Still open, unassigned and unresolved.
            </span>
            {returned.map((mission) => {
              const decline = mission.declines[mission.declines.length - 1];
              return (
                <div key={mission.id} style={{ display: "grid", gap: 3 }}>
                  <MissionRow
                    mission={mission}
                    selected={mission.id === selectedId}
                    onSelect={onSelect}
                  />
                  {decline ? (
                    <span className="mx-tiny mx-muted" style={{ paddingLeft: 4 }}>
                      {DECLINE_REASON_LABEL[decline.reason] ?? decline.reason} ·{" "}
                      {relativeTime(decline.at)} — {decline.note}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 4 }}>
          <button
            type="button"
            className="mx-btn mx-btn--sm mx-btn--ghost"
            style={{ justifyContent: "flex-start", paddingLeft: 2 }}
            onClick={() => setShowCompleted(!showCompleted)}
            aria-expanded={showCompleted}
          >
            {showCompleted ? <ChevronDown /> : <ChevronRight />}
            Completed / Closed
            <span className="mx-tag" style={{ marginLeft: "auto" }}>
              {finished.length}
            </span>
          </button>
          {showCompleted ? (
            finished.length === 0 ? (
              <span className="mx-tiny mx-muted" style={{ paddingLeft: 2 }}>
                No missions in this stage
              </span>
            ) : (
              finished.map((mission) => (
                <MissionRow
                  key={mission.id}
                  mission={mission}
                  selected={mission.id === selectedId}
                  onSelect={onSelect}
                />
              ))
            )
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function SectionHeading({ label, count, tone }: { label: string; count: number; tone: Tone }) {
  return (
    <div className="mx-inline" style={{ gap: 5, paddingTop: 2 }}>
      <span className="mx-label" style={{ letterSpacing: "0.1em" }}>
        {label}
      </span>
      <Chip tone={count === 0 ? "neutral" : tone}>{count}</Chip>
    </div>
  );
}

function MissionRow({
  mission,
  selected,
  onSelect,
}: {
  mission: Mission;
  selected: boolean;
  onSelect: (missionId: string) => void;
}) {
  const progress = missionProgress(mission);
  const sla = slaRemaining(mission.slaDueAt);
  const last = mission.trail[mission.trail.length - 1];
  return (
    <button
      type="button"
      className={`mx-row${selected ? " is-selected" : ""}`}
      style={{
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 4,
        textAlign: "left",
        cursor: "pointer",
        overflowWrap: "anywhere",
      }}
      onClick={() => onSelect(mission.id)}
      aria-pressed={selected}
      title={`${mission.number} · ${mission.title}`}
    >
      <span className="mx-inline" style={{ gap: 4 }}>
        <span className="mx-tiny mx-muted">{mission.number}</span>
        <Chip tone={PRIORITY_TONE[mission.priority]}>{mission.priority}</Chip>
        <Chip tone={STATUS_TONE[mission.status]}>{STATUS_LABEL[mission.status]}</Chip>
        <Chip tone={sla.tone === "ok" ? "success" : sla.tone}>{sla.label}</Chip>
      </span>
      <span className="mx-row-title" style={{ display: "block", lineHeight: 1.3 }}>
        {mission.title}
      </span>
      {progress.percent >= 100 ? (
        <Progress value={100} tone="success" />
      ) : (
        <Progress value={progress.percent} />
      )}
      <span className="mx-row-meta" style={{ marginTop: 0 }}>
        <span>
          {progress.done}/{progress.total} checkpoints
        </span>
        <span>·</span>
        <span>{last ? `${relativeTime(last.at)} · ${last.summary}` : "No trail events"}</span>
      </span>
    </button>
  );
}
