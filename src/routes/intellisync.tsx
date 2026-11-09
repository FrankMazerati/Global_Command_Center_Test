import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Cable,
  CircleAlert,
  History,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import {
  Chip,
  Empty,
  Kpi,
  Note,
  Panel,
  WorkspaceShell,
  formatRelative,
} from "@/components/command/ui";
import { ArchitectureStandard, EnginePanel } from "@/components/command/intellisync/EnginePanel";
import { useAction, useCommandState } from "@/lib/domain/store";
import { connectorSummary } from "@/lib/domain/selectors";
import { formatDateTime } from "@/lib/domain/format";
import type { ConnectorStatus, SyncEventType } from "@/lib/domain/types";

export const Route = createFileRoute("/intellisync")({
  head: () => ({
    meta: [
      { title: "IntelliSync — Maximus Optimus" },
      {
        name: "description",
        content:
          "Connection health, synchronization events, retries, duplicate suppression and the audit trail behind every integration.",
      },
    ],
  }),
  component: IntelliSyncPage,
});

const STATUS_TONE: Record<ConnectorStatus, "success" | "info" | "warning" | "danger" | "neutral"> =
  {
    connected: "success",
    syncing: "info",
    attention: "danger",
    available: "neutral",
    disconnected: "neutral",
  };

const EVENT_TONE: Record<SyncEventType, "success" | "info" | "warning" | "danger" | "neutral"> = {
  "connector.connected": "success",
  "connector.disconnected": "neutral",
  "connector.attention": "danger",
  "sync.completed": "success",
  "sync.retried": "warning",
  "document.linked": "info",
  "document.imported": "info",
  "document.attached": "info",
  "event.duplicate_suppressed": "neutral",
};

const EVENT_LABEL: Record<SyncEventType, string> = {
  "connector.connected": "Connector connected",
  "connector.disconnected": "Connector disconnected",
  "connector.attention": "Attention required",
  "sync.completed": "Sync completed",
  "sync.retried": "Sync retried",
  "document.linked": "Document linked",
  "document.imported": "Document imported",
  "document.attached": "Document attached",
  "event.duplicate_suppressed": "Duplicate suppressed",
};

function IntelliSyncPage() {
  const state = useCommandState();
  const act = useAction();
  const summary = connectorSummary(state);
  const [filter, setFilter] = useState<"all" | SyncEventType>("all");

  const events = useMemo(
    () =>
      filter === "all"
        ? state.syncEvents
        : state.syncEvents.filter((event) => event.type === filter),
    [state.syncEvents, filter],
  );

  const connectorName = (id: string) =>
    state.connectors.find((connector) => connector.id === id)?.name ?? id;
  const attention = state.connectors.filter((connector) => connector.status === "attention");
  const duplicates = state.syncEvents.filter(
    (event) => event.type === "event.duplicate_suppressed",
  ).length;
  const retries = state.syncEvents.filter((event) => event.type === "sync.retried").length;
  const connectorAudit = state.activity
    .filter((entry) => entry.surface === "connector")
    .slice(0, 12);

  return (
    <WorkspaceShell
      eyebrow="MAXIMUS OPTIMUS · INTELLISYNC"
      title="IntelliSync"
      subtitle="Every synchronization, retry and suppressed duplicate, recorded once and visible to the people responsible for it."
      moduleLinks
      actions={
        <>
          <Chip
            tone={summary.attention > 0 ? "danger" : "success"}
            icon={summary.attention > 0 ? CircleAlert : ShieldCheck}
          >
            {summary.attention > 0
              ? `${summary.attention} need attention`
              : "All connections healthy"}
          </Chip>
          <Link to="/connectors" className="mx-btn mx-btn--sm">
            Platform Connectors <ArrowUpRight style={{ width: 9, height: 9 }} />
          </Link>
        </>
      }
    >
      <div className="mx-kpis">
        <Kpi value={summary.connected} label="Connected" tone="success" />
        <Kpi value={summary.syncing} label="Syncing" />
        <Kpi value={summary.attention} label="Attention" tone="danger" />
        <Kpi value={state.syncEvents.length} label="Recorded events" />
        <Kpi value={duplicates} label="Duplicates suppressed" />
        <Kpi value={retries} label="Retries" tone="warning" />
      </div>

      <div className="mx-body mx-body--triple" style={{ minHeight: 0 }}>
        <div className="mx-col mx-scroll">
          <EnginePanel state={state} />
          <Panel
            title="Connection health"
            icon={Cable}
            note={`${state.connectors.length} connectors`}
            scroll
          >
            {state.connectors.map((connector) => (
              <div
                className="mx-row"
                key={connector.id}
                style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="mx-row-title">
                    <span
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {connector.name}
                    </span>
                  </div>
                  <div className="mx-row-meta">
                    <Chip tone={STATUS_TONE[connector.status]}>{connector.status}</Chip>
                    <span>
                      {connector.lastSyncAt
                        ? formatRelative(connector.lastSyncAt)
                        : "Never synchronized"}
                    </span>
                  </div>
                  {connector.status === "attention" || connector.status === "available" ? (
                    <div className="mx-row-desc mx-clamp-2">{connector.healthMessage}</div>
                  ) : null}
                </div>
                {connector.status === "attention" ? (
                  <button
                    className="mx-btn mx-btn--sm"
                    onClick={() =>
                      act(
                        { type: "connector.retry", connectorId: connector.id },
                        { success: `Retry queued for ${connector.name}.` },
                      )
                    }
                  >
                    <RefreshCw /> Retry
                  </button>
                ) : (
                  <span className="mx-tiny mx-muted">{connector.itemCount} items</span>
                )}
              </div>
            ))}
          </Panel>
        </div>

        <div className="mx-col">
          <Panel
            title="Synchronization events"
            icon={Workflow}
            note={`${events.length} shown`}
            scroll
            actions={
              <select
                className="mx-select"
                style={{ width: "auto", maxWidth: 150 }}
                value={filter}
                onChange={(event) => setFilter(event.target.value as "all" | SyncEventType)}
                aria-label="Filter events"
              >
                <option value="all">All event types</option>
                {(Object.keys(EVENT_LABEL) as SyncEventType[]).map((type) => (
                  <option key={type} value={type}>
                    {EVENT_LABEL[type]}
                  </option>
                ))}
              </select>
            }
          >
            {events.length === 0 ? (
              <Empty
                title="No events for this filter"
                description="Every synchronization writes an event here. Change the filter to see the rest of the trail."
                icon={History}
              />
            ) : (
              events.map((event) => (
                <div className="mx-row" key={event.id}>
                  <div>
                    <div className="mx-row-title">{event.summary}</div>
                    <div className="mx-row-meta">
                      <Chip tone={EVENT_TONE[event.type]}>{EVENT_LABEL[event.type]}</Chip>
                      <span>{connectorName(event.connectorId)}</span>
                      <span>·</span>
                      <span>{formatRelative(event.at)}</span>
                    </div>
                    <div className="mx-row-desc">{event.detail}</div>
                    {event.dedupeKey ? (
                      <div className="mx-tiny mx-muted">dedupe key · {event.dedupeKey}</div>
                    ) : null}
                  </div>
                  <span className="mx-tiny mx-muted">{formatDateTime(event.at).split(",")[0]}</span>
                </div>
              ))
            )}
          </Panel>
        </div>

        <aside className="mx-col mx-scroll">
          <ArchitectureStandard />
          <Panel title="How synchronization behaves" icon={ShieldCheck}>
            <ul
              style={{
                margin: 0,
                paddingLeft: 14,
                fontSize: 9.5,
                lineHeight: 1.6,
                color: "#3c5f80",
              }}
            >
              <li>Direction is explicit per connector: read-only, or write-back with approval.</li>
              <li>Changes are detected by content hash, not timestamps alone.</li>
              <li>A repeated event with the same dedupe key is suppressed, never applied twice.</li>
              <li>Failed syncs retry with backoff and surface in Connection health.</li>
              <li>Every attempt is recorded, including the ones that changed nothing.</li>
            </ul>
            <Note tone="warning">
              A connector with a missing prerequisite cannot be marked connected. The requirement is
              shown instead of a simulated success.
            </Note>
          </Panel>

          <Panel title="Attention queue" icon={CircleAlert} note={`${attention.length} connectors`}>
            {attention.length === 0 ? (
              <Empty
                title="Nothing needs attention"
                description="All authorized connections are healthy."
                icon={ShieldCheck}
              />
            ) : (
              attention.map((connector) => (
                <div
                  className="mx-row"
                  key={connector.id}
                  style={{ gridTemplateColumns: "minmax(0,1fr)" }}
                >
                  <div>
                    <div className="mx-row-title">{connector.name}</div>
                    <div className="mx-row-desc">{connector.healthMessage}</div>
                  </div>
                </div>
              ))
            )}
            <Link to="/connectors" className="mx-btn mx-btn--sm">
              Open the connection catalog
            </Link>
          </Panel>

          <Panel title="Connector audit trail" icon={History} note="from Activity">
            {connectorAudit.length === 0 ? (
              <Empty
                title="No connector activity yet"
                description="Connecting, importing, linking and attaching are recorded here."
              />
            ) : (
              <div className="mx-timeline">
                {connectorAudit.map((entry) => (
                  <div className="mx-timeline-item" key={entry.id}>
                    <span className="mx-timeline-summary">{entry.summary}</span>
                    <span className="mx-timeline-detail">{entry.detail}</span>
                    <span className="mx-timeline-meta">
                      {entry.actorName} · {formatRelative(entry.at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
