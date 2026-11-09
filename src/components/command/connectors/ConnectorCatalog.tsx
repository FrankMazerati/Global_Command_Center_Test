import { useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  Cloud,
  FileText,
  FolderOpen,
  FolderTree,
  HardDrive,
  Landmark,
  ListChecks,
  Maximize2,
  MessagesSquare,
  Plug,
  RefreshCw,
  Search,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import type {
  Connector,
  ConnectorCategory,
  ConnectorStatus,
  SyncEventType,
} from "@/lib/domain/types";
import { connectorSummary, newestFirst } from "@/lib/domain/selectors";
import { useAction, useCommandState } from "@/lib/domain/store";
import { formatDateTime, relativeTime } from "@/lib/domain/format";
import { Chip, Empty, Kpi, type Tone } from "@/components/command/ui";
import { ConnectorDetail, ConnectorStatusChip } from "./ConnectorDetail";
import { ConnectorWorkspace } from "./ConnectorWorkspace";

const CATEGORY_ORDER: ConnectorCategory[] = [
  "Microsoft 365",
  "Cloud storage",
  "Document management",
  "Communication",
  "Calendar and scheduling",
  "Business productivity",
  "Finance and accounting",
  "Project management",
  "Local documents",
  "Approved external services",
];

const CATEGORY_ICON: Record<ConnectorCategory, ComponentType<{ className?: string }>> = {
  "Microsoft 365": Cloud,
  "Cloud storage": HardDrive,
  "Document management": FileText,
  Communication: MessagesSquare,
  "Calendar and scheduling": CalendarClock,
  "Business productivity": Briefcase,
  "Finance and accounting": Landmark,
  "Project management": ListChecks,
  "Local documents": FolderOpen,
  "Approved external services": ShieldCheck,
};

const STATUS_FILTERS: { value: ConnectorStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "syncing", label: "Syncing" },
  { value: "attention", label: "Attention" },
  { value: "available", label: "Available" },
  { value: "disconnected", label: "Disconnected" },
];

const SYNC_LABEL: Record<SyncEventType, string> = {
  "connector.connected": "Connected",
  "connector.disconnected": "Disconnected",
  "connector.attention": "Attention",
  "sync.completed": "Sync completed",
  "sync.retried": "Sync retried",
  "document.linked": "Linked",
  "document.imported": "Imported",
  "document.attached": "Attached",
  "event.duplicate_suppressed": "Duplicate suppressed",
};

const SYNC_TONE: Record<SyncEventType, Tone> = {
  "connector.connected": "success",
  "connector.disconnected": "neutral",
  "connector.attention": "danger",
  "sync.completed": "info",
  "sync.retried": "warning",
  "document.linked": "accent",
  "document.imported": "accent",
  "document.attached": "info",
  "event.duplicate_suppressed": "neutral",
};

const ROW_BUTTON_STYLE = {
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  width: "100%",
  textAlign: "left" as const,
  cursor: "pointer",
};

/**
 * The Platform Connectors catalog: category rail, connector records with real actions, an
 * inspection panel and the IntelliSync trail. The connector workspace opens inline over the
 * main column so the catalog itself is never replaced.
 */
export function ConnectorCatalog(props: { initialDocumentId?: string | null | undefined }) {
  const state = useCommandState();
  const act = useAction();
  const summary = connectorSummary(state);

  const initialDocument = props.initialDocumentId
    ? state.library.find((document) => document.id === props.initialDocumentId)
    : undefined;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ConnectorStatus | "all">("all");
  const [category, setCategory] = useState<ConnectorCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialDocument?.connectorId ?? null);
  const [openId, setOpenId] = useState<string | null>(initialDocument?.connectorId ?? null);
  const [expanded, setExpanded] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ConnectorCategory, number>();
    for (const connector of state.connectors)
      counts.set(connector.category, (counts.get(connector.category) ?? 0) + 1);
    return counts;
  }, [state.connectors]);

  const categoriesPresent = CATEGORY_ORDER.filter((value) => (categoryCounts.get(value) ?? 0) > 0);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.connectors.filter((connector) => {
      if (status !== "all" && connector.status !== status) return false;
      if (category !== "all" && connector.category !== category) return false;
      if (!needle) return true;
      return [
        connector.name,
        connector.category,
        connector.account ?? "",
        connector.healthMessage,
        ...connector.capabilities,
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [state.connectors, status, category, query]);

  const syncEvents = newestFirst(state.syncEvents).slice(0, 8);
  const selected = state.connectors.find((connector) => connector.id === selectedId);

  function connect(connector: Connector) {
    act(
      { type: "connector.connect", connectorId: connector.id },
      { success: `${connector.name} authorized and confirmed.` },
    );
  }

  function disconnect(connector: Connector) {
    act(
      { type: "connector.disconnect", connectorId: connector.id },
      { success: `${connector.name} authorization revoked.` },
    );
  }

  function retry(connector: Connector) {
    act(
      { type: "connector.retry", connectorId: connector.id },
      { success: `${connector.name} synchronized.` },
    );
  }

  function openWorkspace(connectorId: string) {
    setSelectedId(connectorId);
    setOpenId(connectorId);
  }

  return (
    <>
      <div className="mx-kpis">
        <Kpi value={summary.connected} label="Connected" tone="success" />
        <Kpi value={summary.syncing} label="Syncing" />
        <Kpi
          value={summary.attention}
          label="Attention"
          {...(summary.attention > 0 ? { tone: "warning" as const } : {})}
        />
        <Kpi value={summary.available} label="Available" />
      </div>

      <div className="mx-body mx-body--split" style={{ minHeight: 0 }}>
        <aside className="mx-col" style={{ minHeight: 0 }}>
          <section className="mx-panel">
            <div className="mx-panel-head">
              <div>
                <span className="mx-panel-title">
                  <Search /> Find a connector
                </span>
              </div>
              <span className="mx-panel-note">{rows.length} shown</span>
            </div>
            <div className="mx-panel-body" style={{ gap: 6 }}>
              <div className="mx-search">
                <Search style={{ width: 11, height: 11 }} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, account or capability"
                  aria-label="Search connectors"
                />
              </div>
              <div className="mx-inline" style={{ gap: 4 }}>
                {STATUS_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    className={`mx-btn mx-btn--sm${status === option.value ? " mx-btn--primary" : ""}`}
                    onClick={() => setStatus(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-panel">
            <div className="mx-panel-head">
              <div>
                <span className="mx-panel-title">
                  <FolderTree /> Categories
                </span>
              </div>
              <span className="mx-panel-note">{categoriesPresent.length} in state</span>
            </div>
            <div className="mx-panel-body mx-scroll" style={{ gap: 4, maxHeight: 236 }}>
              <button
                className={`mx-row${category === "all" ? " is-selected" : ""}`}
                style={ROW_BUTTON_STYLE}
                onClick={() => setCategory("all")}
                aria-pressed={category === "all"}
              >
                <span className="mx-row-title" style={{ fontSize: 10 }}>
                  <Plug /> All categories
                </span>
                <span className="mx-tag">{state.connectors.length}</span>
              </button>
              {categoriesPresent.map((value) => {
                const Icon = CATEGORY_ICON[value];
                return (
                  <button
                    key={value}
                    className={`mx-row${category === value ? " is-selected" : ""}`}
                    style={ROW_BUTTON_STYLE}
                    onClick={() => setCategory(value)}
                    aria-pressed={category === value}
                  >
                    <span className="mx-row-title" style={{ fontSize: 10 }}>
                      <Icon /> {value}
                    </span>
                    <span className="mx-tag">{categoryCounts.get(value) ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mx-panel" style={{ flex: 1, minHeight: 0 }}>
            <div className="mx-panel-head">
              <div>
                <span className="mx-panel-title">
                  <Activity /> Integration health
                </span>
                <span className="mx-panel-note">IntelliSync trail</span>
              </div>
              <span className="mx-panel-note">{state.syncEvents.length} events</span>
            </div>
            <div className="mx-panel-body mx-scroll" style={{ gap: 0, maxHeight: 260 }}>
              {syncEvents.length === 0 ? (
                <Empty
                  title="No sync events"
                  description="Connector and document activity is recorded here as it happens."
                  icon={Activity}
                />
              ) : (
                <div className="mx-timeline">
                  {syncEvents.map((event) => {
                    const connectorName =
                      state.connectors.find((connector) => connector.id === event.connectorId)
                        ?.name ?? "Workspace";
                    const tone = SYNC_TONE[event.type];
                    return (
                      <div className="mx-timeline-item" key={event.id} data-tone={tone}>
                        <div className="mx-inline" style={{ gap: 4 }}>
                          <Chip tone={tone}>{SYNC_LABEL[event.type]}</Chip>
                          <span className="mx-timeline-summary" style={{ fontSize: 9 }}>
                            {connectorName}
                          </span>
                        </div>
                        <div className="mx-timeline-detail">{event.detail}</div>
                        <div className="mx-timeline-meta" title={formatDateTime(event.at)}>
                          {relativeTime(event.at)} · {event.summary}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </aside>

        <div
          className="mx-col"
          style={{ minHeight: 0, position: "relative", maxHeight: "calc(100dvh - 150px)" }}
        >
          <div
            className="mx-work-base"
            data-hidden={openId !== null ? "true" : "false"}
            style={{ gap: 8 }}
          >
            <section className="mx-panel" style={{ flex: 1.55, minHeight: 0 }}>
              <div className="mx-panel-head">
                <div>
                  <span className="mx-panel-title">
                    <Plug /> Connector catalog
                  </span>
                  <span className="mx-panel-note">
                    {rows.length} of {state.connectors.length} connectors · {state.library.length}{" "}
                    documents · {state.documentActions.length} document actions
                  </span>
                </div>
              </div>
              <div className="mx-panel-body mx-scroll" style={{ gap: 6 }}>
                {rows.length === 0 ? (
                  <Empty
                    title="No connector matches"
                    description="Clear the search or reset the status and category filters."
                    icon={Plug}
                  />
                ) : (
                  rows.map((connector) => {
                    const Icon = CATEGORY_ICON[connector.category];
                    const blocked = !connector.configured;
                    return (
                      <div
                        key={connector.id}
                        className={`mx-row${selectedId === connector.id ? " is-selected" : ""}`}
                        style={{ alignItems: "start", gridTemplateColumns: "minmax(0, 1fr)" }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <button
                            className="mx-row-title"
                            style={{
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              width: "100%",
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                            onClick={() => setSelectedId(connector.id)}
                          >
                            <Icon /> {connector.name}
                            <span className="mx-tag">{connector.category}</span>
                          </button>
                          <div className="mx-row-meta">
                            <ConnectorStatusChip status={connector.status} />
                            <span>{connector.account ?? "No account authorized"}</span>
                            <span>·</span>
                            <span>{connector.itemCount} items</span>
                            <span>·</span>
                            <span>
                              {connector.lastSyncAt
                                ? `Last sync ${relativeTime(connector.lastSyncAt)}`
                                : "Never synchronized"}
                            </span>
                          </div>
                          <div className="mx-row-desc mx-clamp-2">{connector.healthMessage}</div>
                          {blocked ? (
                            <div
                              className="mx-tiny"
                              style={{ display: "flex", gap: 4, marginTop: 3, color: "#9d6f14" }}
                            >
                              <AlertTriangle
                                style={{ width: 9, height: 9, flex: "none", marginTop: 2 }}
                              />
                              <span>
                                {connector.requirement ??
                                  "Credentials are required before this connector can authenticate."}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <div className="mx-row-actions">
                          {connector.status === "connected" ? (
                            <button
                              className="mx-btn mx-btn--sm mx-btn--danger"
                              onClick={() => disconnect(connector)}
                            >
                              <Unplug /> Disconnect
                            </button>
                          ) : (
                            <button
                              className="mx-btn mx-btn--sm mx-btn--primary"
                              onClick={() => connect(connector)}
                              disabled={blocked}
                              {...(blocked
                                ? {
                                    title:
                                      connector.requirement ??
                                      "Credentials are required before this connector can authenticate.",
                                  }
                                : {})}
                            >
                              <Plug /> Connect
                            </button>
                          )}
                          {connector.status === "attention" ? (
                            <button
                              className="mx-btn mx-btn--sm"
                              onClick={() => retry(connector)}
                              title={connector.healthMessage}
                            >
                              <RefreshCw /> Retry sync
                            </button>
                          ) : null}
                          <button
                            className="mx-btn mx-btn--sm"
                            onClick={() => openWorkspace(connector.id)}
                          >
                            <Maximize2 /> Open workspace
                          </button>
                          <a
                            className="mx-btn mx-btn--sm mx-btn--ghost"
                            href={`/?connector=${encodeURIComponent(connector.id)}`}
                            title="Open the same workspace over the Bring the Work to You dashboard"
                          >
                            <ArrowUpRight /> Open over Bring the Work to You
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="mx-panel" style={{ flex: 1, minHeight: 0 }}>
              <div className="mx-panel-head">
                <div>
                  <span className="mx-panel-title">
                    <ShieldCheck /> Connector detail
                  </span>
                </div>
                <span className="mx-panel-note">
                  {selected ? selected.name : "Nothing selected"}
                </span>
              </div>
              <div className="mx-panel-body mx-scroll">
                <ConnectorDetail connectorId={selectedId} />
              </div>
            </section>
          </div>

          {openId ? (
            <ConnectorWorkspace
              key={openId}
              connectorId={openId}
              initialDocumentId={
                initialDocument && initialDocument.connectorId === openId
                  ? initialDocument.id
                  : null
              }
              expanded={expanded}
              onToggleExpand={() => setExpanded((value) => !value)}
              onClose={() => {
                setOpenId(null);
                setExpanded(false);
              }}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
