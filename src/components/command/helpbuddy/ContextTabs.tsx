import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Download,
  History,
  Layers,
  Lock,
  Plug,
  RefreshCw,
  Route,
  Sparkles,
  Star,
} from "lucide-react";
import type {
  ActivityEvent,
  ActivitySurface,
  Connector,
  ConnectorStatus,
  LedgerEntry,
  Mission,
  MissionEventType,
  ModuleDefinition,
} from "@/lib/domain/types";
import { useAction, useCommandState } from "@/lib/domain/store";
import { activeUser, connectorSummary, missionProgress, newestFirst } from "@/lib/domain/selectors";
import {
  DECLINE_REASON_LABEL,
  PENDING_REASON_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  formatDate,
  formatDateTime,
  formatTime,
  relativeTime,
} from "@/lib/domain/format";
import { Chip, Empty, Kpi, Note, Panel, Progress, type Tone } from "@/components/command/ui";

type ContextTabProps = { onOpenTab?: ((tab: string) => void) | undefined };

/* ------------------------------------------------------------------ activity */

const SURFACE_META: Record<ActivitySurface, { label: string; tone: Tone }> = {
  mission: { label: "Mission", tone: "info" },
  connector: { label: "Connector", tone: "accent" },
  recognition: { label: "Recognition", tone: "warning" },
  approval: { label: "Approval", tone: "info" },
  signature: { label: "Signature", tone: "accent" },
  task: { label: "Task", tone: "neutral" },
  checklist: { label: "Checklist", tone: "neutral" },
  knowledge: { label: "Knowledge", tone: "success" },
  note: { label: "Note", tone: "neutral" },
  help_buddy: { label: "Help Buddy", tone: "accent" },
  identity: { label: "Identity", tone: "warning" },
  module: { label: "Module", tone: "success" },
};

const SURFACE_FILTERS: ActivitySurface[] = [
  "mission",
  "connector",
  "recognition",
  "approval",
  "signature",
  "task",
  "checklist",
  "knowledge",
  "note",
  "help_buddy",
  "module",
];

/** Activity targets that live inside this workspace as a Help Buddy tab. */
const TAB_TARGETS: Partial<
  Record<NonNullable<ActivityEvent["targetType"]>, { tab: string; label: string }>
> = {
  approval: { tab: "approvals", label: "Approvals" },
  signature: { tab: "signatures", label: "Signatures" },
  note: { tab: "notes", label: "Notes" },
  task: { tab: "tasks", label: "Tasks" },
  checklist: { tab: "checklists", label: "Checklists" },
  knowledge: { tab: "knowledge", label: "Knowledge" },
  module: { tab: "add-modules", label: "Add modules" },
};

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function dayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string): string {
  const date = new Date(value);
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  return `${weekday} · ${formatDate(value)}`;
}

interface DayGroup {
  key: string;
  label: string;
  rows: ActivityEvent[];
}

function groupByDay(rows: ActivityEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const row of rows) {
    const key = dayKey(row.at);
    const current = groups[groups.length - 1];
    if (current && current.key === key) current.rows.push(row);
    else groups.push({ key, label: dayLabel(row.at), rows: [row] });
  }
  return groups;
}

function pressedStyle(active: boolean) {
  if (!active) return undefined;
  return {
    borderColor: "rgba(32, 92, 152, 0.7)",
    background: "linear-gradient(150deg, #3a80c4, #215b96)",
    color: "#fff",
  };
}

function ActivityTargetLink({
  event,
  onOpenTab,
}: {
  event: ActivityEvent;
  onOpenTab?: ((tab: string) => void) | undefined;
}) {
  const target = event.targetType;
  if (!target || !event.targetId) return null;
  const targetLabel = event.targetLabel || event.targetId;
  const openTab = onOpenTab;

  if (target === "mission") {
    return (
      <Link
        className="mx-btn mx-btn--sm"
        to="/mission-control"
        title={`Open ${targetLabel} in Mission Control`}
      >
        Mission Control <ArrowUpRight style={{ width: 10, height: 10 }} />
      </Link>
    );
  }

  if (target === "connector") {
    return (
      <Link
        className="mx-btn mx-btn--sm"
        to="/connectors"
        title={`Open ${targetLabel} in Platform Connectors`}
      >
        Connectors <ArrowUpRight style={{ width: 10, height: 10 }} />
      </Link>
    );
  }

  const destination = TAB_TARGETS[target];
  if (!destination) return null;
  if (!openTab) {
    return (
      <span className="mx-tag" title={`${targetLabel} is listed in the ${destination.label} tab`}>
        {destination.label} tab
      </span>
    );
  }
  return (
    <button
      className="mx-btn mx-btn--sm"
      onClick={() => openTab(destination.tab)}
      title={`Open ${targetLabel} in the ${destination.label} tab`}
    >
      Open {destination.label.toLowerCase()}
    </button>
  );
}

export function ActivityTab({ onOpenTab }: ContextTabProps = {}) {
  const state = useCommandState();
  const [filter, setFilter] = useState<ActivitySurface | "all">("all");

  const rows = useMemo(() => newestFirst(state.activity), [state.activity]);
  const counts = useMemo(() => {
    const map: Partial<Record<ActivitySurface, number>> = {};
    for (const row of rows) map[row.surface] = (map[row.surface] ?? 0) + 1;
    return map;
  }, [rows]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((row) => row.surface === filter)),
    [rows, filter],
  );
  const groups = useMemo(() => groupByDay(visible), [visible]);
  const emptyTitle =
    filter === "all"
      ? "No activity recorded"
      : `No ${SURFACE_META[filter].label.toLowerCase()} activity`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
      <div className="mx-btn-row" role="group" aria-label="Filter activity by surface">
        <button
          className="mx-btn mx-btn--sm"
          aria-pressed={filter === "all"}
          style={pressedStyle(filter === "all")}
          onClick={() => setFilter("all")}
        >
          All <span style={{ opacity: 0.72 }}>{rows.length}</span>
        </button>
        {SURFACE_FILTERS.map((surface) => (
          <button
            key={surface}
            className="mx-btn mx-btn--sm"
            aria-pressed={filter === surface}
            style={pressedStyle(filter === surface)}
            onClick={() => setFilter(surface)}
          >
            {SURFACE_META[surface].label}{" "}
            <span style={{ opacity: 0.72 }}>{counts[surface] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mx-inline" style={{ justifyContent: "space-between", gap: 8 }}>
        <span className="mx-tiny mx-muted">
          {visible.length} of {rows.length} audit records · newest first
        </span>
        <span className="mx-tiny mx-muted">Written by the action that changed the record</span>
      </div>

      <div
        className="mx-scroll"
        style={{ flex: 1, minHeight: 0, display: "grid", gap: 8, alignContent: "start" }}
      >
        {groups.length === 0 ? (
          <Empty
            title={emptyTitle}
            description="No audit record matches this filter yet. An entry appears as soon as a real action changes a record."
            icon={Activity}
          />
        ) : (
          groups.map((group) => (
            <section key={group.key} style={{ display: "grid", gap: 2, minWidth: 0 }}>
              <div
                className="mx-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>{group.label}</span>
                <span
                  className="mx-tiny"
                  style={{ letterSpacing: 0, textTransform: "none", fontWeight: 600 }}
                >
                  {group.rows.length} {group.rows.length === 1 ? "record" : "records"}
                </span>
              </div>
              <div className="mx-timeline">
                {group.rows.map((event) => (
                  <div
                    className="mx-timeline-item"
                    key={event.id}
                    data-tone={SURFACE_META[event.surface].tone}
                  >
                    <div className="mx-timeline-summary" style={{ overflowWrap: "anywhere" }}>
                      {event.summary}
                    </div>
                    <div className="mx-timeline-detail" style={{ overflowWrap: "anywhere" }}>
                      {event.detail}
                    </div>
                    <div
                      className="mx-timeline-meta"
                      style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}
                    >
                      <span>{event.actorName}</span>
                      <span>·</span>
                      <span title={formatDateTime(event.at)}>{formatTime(event.at)}</span>
                      <span>·</span>
                      <span>{relativeTime(event.at)}</span>
                      <Chip tone={SURFACE_META[event.surface].tone}>
                        {SURFACE_META[event.surface].label}
                      </Chip>
                      <span style={{ marginLeft: "auto" }}>
                        <ActivityTargetLink event={event} onOpenTab={onOpenTab} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- ticket trail */

const DECLINE_MATCH_WINDOW_MS = 10 * 60_000;

interface TrailRow {
  id: string;
  time: number;
  at: string;
  type: string;
  summary: string;
  detail: string;
  actor: string;
  tone: Tone;
}

function trailTone(type: MissionEventType): Tone {
  switch (type) {
    case "mission.declined":
    case "mission.escalated":
      return "danger";
    case "mission.pending":
      return "warning";
    case "mission.completed":
    case "mission.closed":
    case "mission.resolved":
      return "success";
    default:
      return "info";
  }
}

function trailTypeLabel(type: string): string {
  const parts = type.split(".");
  const suffix = parts.length > 1 ? parts.slice(1).join(".") : type;
  return suffix.replace(/_/g, " ");
}

/**
 * The trail as recorded, with the structured decline records folded in so every refusal keeps the
 * reason label the technician chose. Nothing is invented: unmatched decline records are appended.
 */
function missionTrailRows(mission: Mission): TrailRow[] {
  const rows: TrailRow[] = [];
  const matched = new Set<string>();

  for (const event of mission.trail) {
    if (event.type === "mission.declined") {
      const record = mission.declines.find(
        (decline) =>
          !matched.has(decline.id) &&
          Math.abs(new Date(decline.at).getTime() - new Date(event.at).getTime()) <=
            DECLINE_MATCH_WINDOW_MS,
      );
      if (record) {
        matched.add(record.id);
        rows.push({
          id: event.id,
          time: new Date(record.at).getTime(),
          at: record.at,
          type: event.type,
          summary: `Declined · ${DECLINE_REASON_LABEL[record.reason] ?? record.reason}`,
          detail: record.note,
          actor: record.technicianName,
          tone: "warning",
        });
        continue;
      }
    }
    rows.push({
      id: event.id,
      time: new Date(event.at).getTime(),
      at: event.at,
      type: event.type,
      summary: event.summary,
      detail: event.detail,
      actor: event.actorName,
      tone: trailTone(event.type),
    });
  }

  for (const decline of mission.declines) {
    if (matched.has(decline.id)) continue;
    rows.push({
      id: decline.id,
      time: new Date(decline.at).getTime(),
      at: decline.at,
      type: "mission.declined",
      summary: `Declined · ${DECLINE_REASON_LABEL[decline.reason] ?? decline.reason}`,
      detail: decline.note,
      actor: decline.technicianName,
      tone: "warning",
    });
  }

  return rows.sort((a, b) => b.time - a.time);
}

function lastTouchedAt(mission: Mission): string {
  let best = mission.statusChangedAt;
  let bestTime = new Date(best).getTime();
  const consider = (value: string) => {
    const time = new Date(value).getTime();
    if (time > bestTime) {
      bestTime = time;
      best = value;
    }
  };
  mission.trail.forEach((event) => consider(event.at));
  mission.declines.forEach((decline) => consider(decline.at));
  return best;
}

function starsForMission(ledger: LedgerEntry[], missionId: string): number {
  return ledger.reduce((sum, entry) => {
    const matches = entry.sourceId === missionId || entry.sourceId.startsWith(`cp-${missionId}-`);
    return matches ? sum + entry.stars : sum;
  }, 0);
}

export function TicketTrailTab({ onOpenTab }: ContextTabProps = {}) {
  const state = useCommandState();
  const user = activeUser(state);
  const openTab = onOpenTab;
  const [openId, setOpenId] = useState<string | null>(null);

  const missions = useMemo(() => {
    const mine = state.missions.filter(
      (mission) =>
        mission.offeredTo === user.id ||
        mission.acceptedBy === user.id ||
        mission.declines.some((decline) => decline.technicianId === user.id),
    );
    return [...mine].sort(
      (a, b) => new Date(lastTouchedAt(b)).getTime() - new Date(lastTouchedAt(a)).getTime(),
    );
  }, [state.missions, user.id]);

  const returned = useMemo(
    () =>
      state.missions.filter(
        (mission) =>
          mission.status === "available" &&
          mission.offeredTo !== user.id &&
          mission.declines.some((decline) => decline.technicianId === user.id),
      ),
    [state.missions, user.id],
  );

  const active = missions.filter((mission) =>
    ["accepted", "in_progress", "pending", "escalated"].includes(mission.status),
  ).length;
  const completed = missions.filter((mission) =>
    ["resolved", "completed", "closed"].includes(mission.status),
  ).length;
  const stars = missions.reduce(
    (sum, mission) => sum + starsForMission(state.ledger, mission.id),
    0,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
      <div className="mx-kpis">
        <Kpi value={missions.length} label="Missions on record" />
        <Kpi value={active} label="Active" tone="warning" />
        <Kpi value={completed} label="Completed" tone="success" />
        <Kpi value={stars} label="Stars earned" />
      </div>

      <div
        className="mx-scroll"
        style={{ flex: 1, minHeight: 0, display: "grid", gap: 7, alignContent: "start" }}
      >
        {missions.length === 0 ? (
          <Empty
            title="No mission history yet"
            description="Missions offered to you or accepted by you appear here with their full trail, including anything you declined."
            icon={History}
          />
        ) : (
          missions.map((mission) => {
            const progress = missionProgress(mission);
            const open = openId === mission.id;
            const acceptedByMe = mission.acceptedBy === user.id;
            const declinedByMe = mission.declines.some(
              (decline) => decline.technicianId === user.id,
            );
            const trail = open ? missionTrailRows(mission) : [];
            const lastAt = lastTouchedAt(mission);

            return (
              <div
                className="mx-row"
                key={mission.id}
                style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: 4 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="mx-row-title" style={{ minWidth: 0 }}>
                    <button
                      className="mx-btn mx-btn--ghost mx-btn--sm"
                      style={{ padding: 0, minHeight: 16, width: 14, flex: "none" }}
                      aria-expanded={open}
                      aria-label={
                        open
                          ? `Hide the trail for ${mission.number}`
                          : `Show the trail for ${mission.number}`
                      }
                      onClick={() => setOpenId(open ? null : mission.id)}
                    >
                      {open ? (
                        <ChevronDown style={{ width: 12, height: 12 }} />
                      ) : (
                        <ChevronRight style={{ width: 12, height: 12 }} />
                      )}
                    </button>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {mission.number} · {mission.title}
                    </span>
                    <Link
                      className="mx-btn mx-btn--sm"
                      to="/mission-control"
                      style={{ marginLeft: "auto", flex: "none" }}
                      title={`Open ${mission.number} in Mission Control`}
                    >
                      Open <ArrowUpRight style={{ width: 10, height: 10 }} />
                    </Link>
                  </div>

                  <div className="mx-row-meta" style={{ marginTop: 3 }}>
                    <Chip tone={PRIORITY_TONE[mission.priority]}>{mission.priority}</Chip>
                    <Chip tone={STATUS_TONE[mission.status]}>{STATUS_LABEL[mission.status]}</Chip>
                    {acceptedByMe ? <Chip tone="info">Accepted by you</Chip> : null}
                    {declinedByMe ? (
                      <Chip tone="warning" icon={AlertTriangle}>
                        Declined by you
                      </Chip>
                    ) : null}
                    {!acceptedByMe && !declinedByMe ? (
                      <Chip tone="accent">Awaiting your decision</Chip>
                    ) : null}
                    <span>
                      {progress.done} of {progress.total} checkpoints
                    </span>
                    <span>·</span>
                    <span>
                      <Star
                        style={{ width: 9, height: 9, verticalAlign: "-1px" }}
                        className="mx-star"
                      />{" "}
                      {starsForMission(state.ledger, mission.id)} stars
                    </span>
                    <span>·</span>
                    <span title={formatDateTime(lastAt)}>Last event {relativeTime(lastAt)}</span>
                  </div>

                  <div style={{ marginTop: 4 }}>
                    <Progress
                      value={progress.percent}
                      tone={progress.percent === 100 ? "success" : "warning"}
                    />
                    <div className="mx-tiny mx-muted" style={{ marginTop: 2 }}>
                      {progress.open} checkpoint{progress.open === 1 ? "" : "s"} still open ·{" "}
                      {mission.trail.length + mission.declines.length} events recorded
                    </div>
                  </div>

                  {open ? (
                    <div style={{ display: "grid", gap: 6, marginTop: 6, minWidth: 0 }}>
                      {mission.pending ? (
                        <div className="mx-note mx-note--warning">
                          <strong>
                            Pending ·{" "}
                            {PENDING_REASON_LABEL[mission.pending.reason] ?? mission.pending.reason}
                          </strong>{" "}
                          — {mission.pending.note} Since {formatDateTime(mission.pending.since)}
                          {mission.pending.nextActionAt
                            ? ` · next action ${formatDateTime(mission.pending.nextActionAt)}`
                            : ""}
                          .
                          {mission.pending.reason === "awaiting_approval" && openTab ? (
                            <button
                              className="mx-btn mx-btn--sm"
                              style={{
                                marginLeft: 6,
                                minHeight: 18,
                                padding: "0 6px",
                                fontSize: 8.5,
                              }}
                              onClick={() => openTab("approvals")}
                            >
                              Open approvals
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      {mission.escalation ? (
                        <div className="mx-note mx-note--danger">
                          <strong>Escalated to {mission.escalation.receivingTeam}</strong> —{" "}
                          {mission.escalation.reason}. Expertise: {mission.escalation.expertise}.{" "}
                          {mission.escalation.acknowledgedAt
                            ? `Acknowledged ${formatDateTime(mission.escalation.acknowledgedAt)}.`
                            : "Not yet acknowledged."}
                        </div>
                      ) : null}

                      <div
                        className="mx-label"
                        style={{ display: "flex", justifyContent: "space-between" }}
                      >
                        <span>Trail · newest first</span>
                        <span
                          className="mx-tiny"
                          style={{ textTransform: "none", letterSpacing: 0 }}
                        >
                          {trail.length} entries
                        </span>
                      </div>
                      <div className="mx-timeline">
                        {trail.map((row) => (
                          <div className="mx-timeline-item" key={row.id} data-tone={row.tone}>
                            <div
                              className="mx-timeline-summary"
                              style={{ overflowWrap: "anywhere" }}
                            >
                              {row.summary}
                            </div>
                            <div
                              className="mx-timeline-detail"
                              style={{ overflowWrap: "anywhere" }}
                            >
                              {row.detail}
                            </div>
                            <div
                              className="mx-timeline-meta"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                flexWrap: "wrap",
                              }}
                            >
                              <span className="mx-tag">{trailTypeLabel(row.type)}</span>
                              <span>{row.actor}</span>
                              <span>·</span>
                              <span title={formatDateTime(row.at)}>{formatTime(row.at)}</span>
                              <span>·</span>
                              <span>{relativeTime(row.at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}

        <Panel
          title="Returned to routing"
          icon={Route}
          note={
            returned.length === 0
              ? "Nothing you declined is back in routing"
              : `${returned.length} still open`
          }
        >
          <Note tone="warning">
            Declining a mission returned the ticket to routing. Declining did not resolve the ticket
            and did not delete it — it stays open, keeps its SLA clock and is re-offered to another
            technician.
          </Note>
          {returned.length === 0 ? (
            <div className="mx-tiny mx-muted">
              No declined ticket is currently waiting in routing.
            </div>
          ) : (
            returned.map((mission) => {
              const decline = mission.declines
                .filter((item) => item.technicianId === user.id)
                .slice(-1)[0];
              return (
                <div
                  className="mx-row"
                  key={mission.id}
                  style={{ gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="mx-row-title" style={{ minWidth: 0 }}>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {mission.number} · {mission.title}
                      </span>
                    </div>
                    <div className="mx-row-meta">
                      <Chip tone={PRIORITY_TONE[mission.priority]}>{mission.priority}</Chip>
                      <span>Back in routing</span>
                      {decline ? (
                        <span>
                          · declined {DECLINE_REASON_LABEL[decline.reason] ?? decline.reason}
                        </span>
                      ) : null}
                      {decline ? <span>· {relativeTime(decline.at)}</span> : null}
                    </div>
                  </div>
                  <Link className="mx-btn mx-btn--sm" to="/mission-control">
                    View <ArrowUpRight style={{ width: 10, height: 10 }} />
                  </Link>
                </div>
              );
            })
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- connectors */

const CONNECTOR_STATUS: Record<ConnectorStatus, { label: string; tone: Tone }> = {
  connected: { label: "Connected", tone: "success" },
  syncing: { label: "Syncing", tone: "info" },
  attention: { label: "Attention", tone: "danger" },
  available: { label: "Available", tone: "neutral" },
  disconnected: { label: "Disconnected", tone: "warning" },
};

const CONNECTOR_ORDER: Record<ConnectorStatus, number> = {
  attention: 0,
  connected: 1,
  syncing: 2,
  disconnected: 3,
  available: 4,
};

function connectorHealth(connector: Connector): string {
  return connector.lastSyncAt
    ? `Last sync ${relativeTime(connector.lastSyncAt)}`
    : "Never synchronized";
}

export function ConnectorTab({ onOpenTab }: ContextTabProps = {}) {
  const state = useCommandState();
  const openTab = onOpenTab;
  const summary = connectorSummary(state);
  const connectors = useMemo(
    () =>
      [...state.connectors].sort((a, b) => CONNECTOR_ORDER[a.status] - CONNECTOR_ORDER[b.status]),
    [state.connectors],
  );
  const recent = useMemo(() => newestFirst(state.syncEvents).slice(0, 5), [state.syncEvents]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
      <Panel title="What Help Buddy can read" icon={Plug}>
        <div className="mx-tiny" style={{ color: "var(--mx-ink-soft)", lineHeight: 1.45 }}>
          This tab shows which authorized connections Help Buddy can read from; connecting,
          reauthorizing or disconnecting a provider happens in Platform Connectors.
        </div>
        <div className="mx-kpis">
          <Kpi value={summary.connected} label="Connected" tone="success" />
          <Kpi value={summary.attention} label="Need attention" tone="danger" />
          <Kpi value={summary.available} label="Available" />
          <Kpi value={summary.syncing} label="Syncing" />
        </div>
        <div className="mx-btn-row">
          <Link to="/connectors" className="mx-btn mx-btn--sm mx-btn--primary">
            Open Platform Connectors <ArrowUpRight style={{ width: 10, height: 10 }} />
          </Link>
          <span className="mx-tiny mx-muted">
            Read-only here: scopes and authorization are managed in the catalog.
          </span>
        </div>
      </Panel>

      <div
        className="mx-grid-2"
        style={{ flex: 1, minHeight: 0, gridTemplateRows: "minmax(0, 1fr)" }}
      >
        <Panel
          title="Authorized sources"
          icon={Plug}
          note={`${connectors.length} connectors`}
          scroll
        >
          {connectors.map((connector) => {
            const status = CONNECTOR_STATUS[connector.status];
            return (
              <div
                className="mx-row"
                key={connector.id}
                style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: 3, padding: "6px 8px" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="mx-row-title" style={{ minWidth: 0, fontSize: 10 }}>
                    <span
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {connector.name}
                    </span>
                    <Chip tone={status.tone}>{status.label}</Chip>
                  </div>
                  <div className="mx-inline" style={{ marginTop: 2, gap: 3 }}>
                    {connector.capabilities.map((capability) => (
                      <span className="mx-tag" key={`${connector.id}-${capability}`}>
                        {capability}
                      </span>
                    ))}
                  </div>
                  <div className="mx-row-meta" style={{ marginTop: 2, fontSize: 8.5, gap: 5 }}>
                    <span>{connectorHealth(connector)}</span>
                    <span>·</span>
                    <span className="mx-clamp-2" style={{ flex: 1, minWidth: 0 }}>
                      {connector.healthMessage}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </Panel>

        <Panel
          title="Recent connector events"
          icon={RefreshCw}
          actions={
            openTab ? (
              <button
                className="mx-btn mx-btn--sm mx-btn--ghost"
                onClick={() => openTab("activity")}
              >
                Activity log
              </button>
            ) : null
          }
          scroll
        >
          {recent.length === 0 ? (
            <Empty
              title="No synchronization yet"
              description="Connector and sync events appear here as soon as a provider is authorized and used."
              icon={RefreshCw}
            />
          ) : (
            recent.map((event) => {
              const connector = state.connectors.find((item) => item.id === event.connectorId);
              return (
                <div
                  className="mx-row"
                  key={event.id}
                  style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: 2, padding: "5px 7px" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="mx-row-title" style={{ fontSize: 9.5 }}>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {event.summary}
                      </span>
                    </div>
                    <div className="mx-row-meta" style={{ marginTop: 1, fontSize: 8.5 }}>
                      <span className="mx-tag">{connector?.name ?? event.connectorId}</span>
                      <span>{relativeTime(event.at)}</span>
                    </div>
                    <div className="mx-row-desc mx-clamp-2" style={{ marginTop: 1, fontSize: 8.5 }}>
                      {event.detail}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </Panel>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- add modules */

/** The reducer installs any module up to this entitlement level and refuses the rest. */
const ENTITLED_LEVEL = 3;

function moduleStatus(module: ModuleDefinition): { label: string; tone: Tone } {
  if (module.installed)
    return module.operational
      ? { label: "Installed", tone: "success" }
      : { label: "Not operational", tone: "warning" };
  if (!module.operational)
    return module.entitlement > ENTITLED_LEVEL
      ? { label: "Locked", tone: "neutral" }
      : { label: "Not operational", tone: "warning" };
  return { label: "Available", tone: "accent" };
}

export function AddModulesTab({ onOpenTab }: ContextTabProps = {}) {
  const state = useCommandState();
  const act = useAction();
  const openTab = onOpenTab;

  const installed = state.modules.filter((module) => module.installed).length;
  const live = state.modules.filter((module) => module.inHelpBuddy).length;
  const available = state.modules.filter(
    (module) => !module.installed && module.operational,
  ).length;
  const locked = state.modules.filter(
    (module) => !module.installed && module.entitlement > ENTITLED_LEVEL,
  ).length;

  const install = (module: ModuleDefinition) => {
    act({ type: "module.install", moduleId: module.id }, { success: `${module.name} installed.` });
  };

  const toggleHelpBuddy = (module: ModuleDefinition) => {
    if (module.inHelpBuddy) {
      act(
        { type: "module.removeFromHelpBuddy", moduleId: module.id },
        { success: `${module.name} removed from Help Buddy.` },
      );
      return;
    }
    act(
      { type: "module.addToHelpBuddy", moduleId: module.id },
      { success: `${module.name} added to Help Buddy as a live tab.` },
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
      <Panel title="Add real capability to Help Buddy" icon={Layers} note={`${live} live tabs`}>
        <div className="mx-kpis">
          <Kpi value={installed} label="Installed" tone="success" />
          <Kpi value={live} label="In Help Buddy" />
          <Kpi value={available} label="Available" />
          <Kpi value={locked} label="Locked by level" tone="warning" />
        </div>
        <div className="mx-tiny" style={{ color: "var(--mx-ink-soft)", lineHeight: 1.45 }}>
          Adding a module creates a live Help Buddy tab backed by that module&apos;s real records —
          it appears in the tab strip above immediately. A locked module names the entitlement level
          it needs, and a module that is not operational explains what is missing.
        </div>
      </Panel>

      <div
        className="mx-grid-2 mx-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          alignContent: "start",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        }}
      >
        {state.modules.map((module) => {
          const status = moduleStatus(module);
          const dependencyNames = module.requires.map(
            (id) => state.modules.find((item) => item.id === id)?.name ?? id,
          );
          const missing = module.requires.filter(
            (id) => !state.modules.find((item) => item.id === id)?.installed,
          );
          const blockedReason =
            module.unavailableReason ?? "This module has no live functionality yet.";
          const canAdd = module.installed && module.operational;
          const addTitle = !module.installed
            ? "Install the module before adding it to Help Buddy."
            : !module.operational
              ? blockedReason
              : module.inHelpBuddy
                ? `Remove ${module.name} from Help Buddy`
                : `Add ${module.name} to Help Buddy`;

          return (
            <div
              className="mx-row"
              key={module.id}
              style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: 3 }}
            >
              <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
                <div className="mx-row-title" style={{ minWidth: 0 }}>
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {module.name}
                  </span>
                  {status.label === "Locked" ? (
                    <Chip tone="neutral" icon={Lock}>
                      Locked
                    </Chip>
                  ) : (
                    <Chip tone={status.tone}>{status.label}</Chip>
                  )}
                  {module.inHelpBuddy ? (
                    <Chip tone="accent" icon={Sparkles}>
                      In Help Buddy
                    </Chip>
                  ) : null}
                </div>

                <div className="mx-row-meta" style={{ marginTop: 0, gap: 4 }}>
                  <span className="mx-tag">{module.category}</span>
                  <span className="mx-tag">
                    {module.operational ? "Entitlement" : "Requires entitlement"} L
                    {module.entitlement}
                  </span>
                  {dependencyNames.length === 0 ? (
                    <span className="mx-tiny mx-muted">No dependencies</span>
                  ) : (
                    <span className="mx-tiny mx-muted">Requires {dependencyNames.join(", ")}</span>
                  )}
                </div>

                <div className="mx-row-desc" style={{ marginTop: 0, fontSize: 9 }}>
                  {module.description}
                </div>

                {!module.operational ? (
                  <div className="mx-note mx-note--warning" style={{ padding: "4px 6px" }}>
                    {blockedReason}
                  </div>
                ) : null}

                {missing.length > 0 ? (
                  <div className="mx-tiny" style={{ color: "#9d6f14" }}>
                    Missing dependency:{" "}
                    {missing
                      .map((id) => state.modules.find((item) => item.id === id)?.name ?? id)
                      .join(", ")}
                    .
                  </div>
                ) : null}

                <div className="mx-btn-row" style={{ marginTop: 1 }}>
                  {module.installed ? null : (
                    <button
                      className="mx-btn mx-btn--sm"
                      disabled={!module.operational}
                      title={module.operational ? `Install ${module.name}` : blockedReason}
                      onClick={() => install(module)}
                    >
                      <Download /> Install
                    </button>
                  )}
                  <button
                    className={`mx-btn mx-btn--sm${module.inHelpBuddy ? " mx-btn--ghost" : ""}`}
                    disabled={!canAdd}
                    title={addTitle}
                    onClick={() => toggleHelpBuddy(module)}
                  >
                    {module.inHelpBuddy ? (
                      "Remove from Help Buddy"
                    ) : (
                      <>
                        <Sparkles /> Add to Help Buddy
                      </>
                    )}
                  </button>
                  {module.inHelpBuddy && openTab ? (
                    <button
                      className="mx-btn mx-btn--sm mx-btn--ghost"
                      onClick={() => openTab?.(`module-${module.id}`)}
                    >
                      Open tab
                    </button>
                  ) : null}
                </div>

                {!module.installed ? (
                  <span className="mx-tiny mx-muted">
                    Install first — adding needs an installed, operational module.
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
