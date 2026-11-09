import type { ComponentType } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  CloudOff,
  KeyRound,
  Plug,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { Connector, ConnectorStatus } from "@/lib/domain/types";
import { useCommandState } from "@/lib/domain/store";
import { formatDateTime, relativeTime } from "@/lib/domain/format";
import { Chip, Empty, Note, type Tone } from "@/components/command/ui";

/** Status wording and tone shared by the catalog rows, the detail panel and the workspace header. */
export const CONNECTOR_STATUS_LABEL: Record<ConnectorStatus, string> = {
  available: "Available",
  connected: "Connected",
  syncing: "Syncing",
  attention: "Attention needed",
  disconnected: "Disconnected",
};

export const CONNECTOR_STATUS_TONE: Record<ConnectorStatus, Tone> = {
  available: "neutral",
  connected: "success",
  syncing: "info",
  attention: "danger",
  disconnected: "warning",
};

const STATUS_ICON: Record<ConnectorStatus, ComponentType<{ className?: string }>> = {
  available: CircleDashed,
  connected: CheckCircle2,
  syncing: RefreshCw,
  attention: AlertTriangle,
  disconnected: CloudOff,
};

export function ConnectorStatusChip({ status }: { status: ConnectorStatus }) {
  return (
    <Chip tone={CONNECTOR_STATUS_TONE[status]} icon={STATUS_ICON[status]}>
      {CONNECTOR_STATUS_LABEL[status]}
    </Chip>
  );
}

const PROVIDER_LABEL: Record<Connector["provider"], string> = {
  microsoft: "Microsoft 365 · Microsoft Graph",
  local: "Local workspace storage",
  external: "External service",
};

/**
 * Read-only inspection of one connector. Every value comes from the record itself, so the panel
 * cannot claim a connection, a scope or a synchronization that the state does not hold.
 */
export function ConnectorDetail({ connectorId }: { connectorId: string | null }) {
  const state = useCommandState();
  const connector = connectorId
    ? state.connectors.find((item) => item.id === connectorId)
    : undefined;

  if (!connector) {
    return (
      <Empty
        title="No connector selected"
        description="Choose a connector to inspect its authorization, scopes, capabilities and outstanding requirement."
        icon={Plug}
      />
    );
  }

  const actions = state.documentActions.filter((action) => action.connectorId === connector.id);
  const documents = state.library.filter((document) => document.connectorId === connector.id);
  const connected = connector.status === "connected";

  const canDoHere: string[] = [
    `Open ${connector.name} in the connector workspace to browse the documents it can currently reach.`,
    connected
      ? "Link an original, import a managed copy or attach a document to a real mission or task."
      : "Document actions stay disabled until the connector is connected, so nothing is claimed on its behalf.",
    connector.browserEnabled
      ? "Browsing happens inside this workspace; no external browser session is started."
      : "This connector does not support in-workspace browsing; its records are read through the sync trail.",
    connector.capabilities.length > 0
      ? `Provider-declared capabilities: ${connector.capabilities.join(", ")}.`
      : "The provider declares no capabilities for this connector.",
  ];

  return (
    <div className="mx-col" style={{ gap: 6, minHeight: 0 }}>
      <div className="mx-inline" style={{ gap: 5 }}>
        <span className="mx-panel-title" style={{ fontSize: 11 }}>
          <Plug /> {connector.name}
        </span>
        <ConnectorStatusChip status={connector.status} />
        <span className="mx-tag">{connector.category}</span>
      </div>

      <dl className="mx-kv">
        <dt>Provider</dt>
        <dd>{PROVIDER_LABEL[connector.provider]}</dd>
        <dt>Account</dt>
        <dd>{connector.account ?? "No account authorized"}</dd>
        <dt>Tenant</dt>
        <dd>{connector.tenant ?? "Not applicable"}</dd>
        <dt>Items</dt>
        <dd>
          {connector.itemCount} reported
          {connector.id === "workspace-library"
            ? ` · ${documents.length} documents in the library`
            : ""}
        </dd>
        <dt>Last sync</dt>
        <dd>
          {connector.lastSyncAt
            ? `${formatDateTime(connector.lastSyncAt)} · ${relativeTime(connector.lastSyncAt)}`
            : "No synchronization recorded"}
        </dd>
        <dt>Credentials</dt>
        <dd>{connector.configured ? "App configuration present" : "App configuration missing"}</dd>
      </dl>

      <div className="mx-divider" />

      <span className="mx-label">Granted scopes</span>
      <div className="mx-inline" style={{ gap: 4 }}>
        {connector.scopes.length === 0 ? (
          <span className="mx-tiny mx-muted">No scopes granted.</span>
        ) : (
          connector.scopes.map((scope) => (
            <span className="mx-tag" key={scope}>
              <KeyRound style={{ width: 8, height: 8, marginRight: 3 }} />
              {scope}
            </span>
          ))
        )}
      </div>

      <span className="mx-label" style={{ marginTop: 2 }}>
        Capabilities
      </span>
      <div className="mx-inline" style={{ gap: 4 }}>
        {connector.capabilities.length === 0 ? (
          <span className="mx-tiny mx-muted">No capabilities declared.</span>
        ) : (
          connector.capabilities.map((capability) => (
            <Chip tone="info" key={capability}>
              {capability}
            </Chip>
          ))
        )}
      </div>

      <div className="mx-divider" />

      <span className="mx-label">Health</span>
      <div className="mx-row-desc" style={{ marginTop: 0 }}>
        <Clock style={{ width: 9, height: 9, verticalAlign: "-1px", marginRight: 4 }} />
        {connector.healthMessage}
      </div>
      <div className="mx-tiny mx-muted">
        {actions.length} document action{actions.length === 1 ? "" : "s"} recorded against this
        connector.
      </div>

      {connector.requirement ? (
        <Note tone="warning">
          <strong>Requirement before this connector can be used: </strong>
          {connector.requirement}
        </Note>
      ) : (
        <Note tone="success">No outstanding requirement is recorded for this connector.</Note>
      )}

      <div className="mx-divider" />

      <span className="mx-label">What this connector can do here</span>
      <div style={{ display: "grid", gap: 3 }}>
        {canDoHere.map((line) => (
          <div
            key={line}
            style={{ display: "grid", gridTemplateColumns: "8px minmax(0, 1fr)", gap: 4 }}
          >
            <span style={{ color: "#2a6eb0", fontSize: 9, lineHeight: "1.5" }}>·</span>
            <span className="mx-row-desc" style={{ marginTop: 0, fontSize: 9 }}>
              {line}
            </span>
          </div>
        ))}
      </div>

      <div
        className="mx-tiny mx-muted"
        style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}
      >
        <ShieldCheck style={{ width: 9, height: 9 }} />
        Status, scopes and health are read from the connector record, not generated in the
        interface.
      </div>
    </div>
  );
}
