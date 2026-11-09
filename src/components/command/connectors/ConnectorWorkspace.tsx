import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronsDownUp,
  Copy,
  Files,
  Link2,
  Maximize2,
  Minimize2,
  Paperclip,
  Plug,
  Search,
  X,
} from "lucide-react";
import type {
  DocumentActionMode,
  DocumentKind,
  LibraryDocument,
  WorkTarget,
} from "@/lib/domain/types";
import { documentsFor } from "@/lib/domain/selectors";
import { useAction, useCommandState } from "@/lib/domain/store";
import { formatBytes, formatDateTime, relativeTime } from "@/lib/domain/format";
import { Chip, Empty, Note } from "@/components/command/ui";
import { DocumentPreview } from "./DocumentPreview";
import { CONNECTOR_STATUS_LABEL, ConnectorStatusChip } from "./ConnectorDetail";

const KIND_LABEL: Record<DocumentKind, string> = {
  word: "Word",
  excel: "Excel",
  powerpoint: "PowerPoint",
  pdf: "PDF",
  image: "Image",
  text: "Text",
  data: "Data",
  archive: "Archive",
  audio: "Audio",
  video: "Video",
};

const ACTION_LABEL: Record<DocumentActionMode, string> = {
  linked: "Linked original",
  imported: "Imported copy",
  attached: "Attached",
};

const ACTION_TONE: Record<DocumentActionMode, "info" | "accent" | "neutral"> = {
  linked: "info",
  imported: "accent",
  attached: "neutral",
};

function targetKeyOf(target: WorkTarget): string {
  return `${target.type}:${target.id}`;
}

function matchesQuery(document: LibraryDocument, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [document.name, document.folder, document.owner].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

function iconLabel(document: LibraryDocument): string {
  return document.extension.slice(0, 4).toUpperCase();
}

/**
 * The connector browse/preview/act surface. It is absolutely positioned inside its caller
 * (`.mx-overlay` fills the nearest positioned ancestor), never mutates records on open and keeps
 * its selection while document actions are recorded.
 */
export function ConnectorWorkspace(props: {
  connectorId: string;
  initialDocumentId?: string | null;
  onClose: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const state = useCommandState();
  const act = useAction();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<DocumentKind | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(props.initialDocumentId ?? null);

  const connector = state.connectors.find((item) => item.id === props.connectorId);
  const documents = documentsFor(props.connectorId, state);

  const missionTargets: WorkTarget[] = state.missions
    .filter((mission) => mission.status !== "completed" && mission.status !== "closed")
    .map((mission) => ({
      type: "mission",
      id: mission.id,
      label: `${mission.number} · ${mission.title}`,
    }));
  const taskTargets: WorkTarget[] = state.tasks
    .filter((task) => task.status !== "done")
    .map((task) => ({ type: "task", id: task.id, label: task.title }));
  const targets: WorkTarget[] = [...missionTargets, ...taskTargets];
  const [targetKey, setTargetKey] = useState<string>(() => {
    const first = targets[0];
    return first ? targetKeyOf(first) : "";
  });

  const selected = documents.find((document) => document.id === selectedId) ?? documents[0];
  const activeTarget = targets.find((target) => targetKeyOf(target) === targetKey) ?? targets[0];
  const connected = connector?.status === "connected";
  const actions = selected
    ? state.documentActions.filter((action) => action.documentId === selected.id)
    : [];

  const kindCounts = useMemo(() => {
    const counts = new Map<DocumentKind, number>();
    for (const document of documents)
      counts.set(document.kind, (counts.get(document.kind) ?? 0) + 1);
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [documents]);

  const visible = documents.filter(
    (document) => (kind === "all" || document.kind === kind) && matchesQuery(document, query),
  );
  const canAct = connected && selected !== undefined && activeTarget !== undefined;

  function runAction(mode: DocumentActionMode) {
    if (!selected || !activeTarget) return;
    act(
      { type: "document.action", documentId: selected.id, mode, target: activeTarget },
      { success: `${selected.name} · ${ACTION_LABEL[mode]} → ${activeTarget.label}` },
    );
  }

  if (!connector) {
    return (
      <section className="mx-overlay" role="dialog" aria-label="Connector workspace">
        <div className="mx-overlay-head">
          <span className="mx-overlay-title">
            <Plug /> Connector workspace
          </span>
          <button
            className="mx-icon-btn"
            style={{ marginLeft: "auto" }}
            onClick={props.onClose}
            aria-label="Close the connector workspace"
          >
            <X />
          </button>
        </div>
        <div className="mx-overlay-body is-single">
          <Empty
            title="Connector not found"
            description="This identifier is not part of the current workspace state."
            icon={AlertTriangle}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`mx-overlay${props.expanded ? " is-expanded" : ""}`}
      role="dialog"
      aria-label={`${connector.name} workspace`}
    >
      <div className="mx-overlay-head" style={{ flexWrap: "wrap" }}>
        <span className="mx-overlay-title" style={{ minWidth: 0, flex: "0 1 auto" }}>
          <Plug />
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {connector.name}
          </span>
        </span>
        <ConnectorStatusChip status={connector.status} />
        <span className="mx-tiny mx-muted" style={{ flex: "none" }}>
          {documents.length} file{documents.length === 1 ? "" : "s"}
        </span>
        <div
          className="mx-search"
          style={{ flex: "1 1 150px", minWidth: 118, maxWidth: 250, marginLeft: "auto" }}
        >
          <Search style={{ width: 11, height: 11 }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, folder or owner"
            aria-label="Search documents in this workspace"
          />
        </div>
        <button
          className="mx-icon-btn"
          onClick={props.onToggleExpand}
          aria-label={props.expanded ? "Restore the inline size" : "Expand the connector workspace"}
          title={props.expanded ? "Restore the inline size" : "Expand"}
        >
          {props.expanded ? <Minimize2 /> : <Maximize2 />}
        </button>
        <button
          className="mx-icon-btn"
          onClick={props.onToggleExpand}
          disabled={!props.expanded}
          aria-label="Collapse to the inline size"
          title="Collapse to the inline size"
        >
          <ChevronsDownUp />
        </button>
        <button
          className="mx-icon-btn"
          onClick={props.onClose}
          aria-label="Close the connector workspace"
          title="Close"
        >
          <X />
        </button>
      </div>

      <div
        className="mx-overlay-body is-single"
        style={{ gridTemplateRows: "auto minmax(0, 1fr)" }}
      >
        <div style={{ minWidth: 0 }}>
          {connected ? (
            <div className="mx-inline" style={{ gap: 6 }}>
              <Chip tone="success" icon={CheckCircle2}>
                Connected as {connector.account ?? "authorized account"}
              </Chip>
              <span className="mx-tiny mx-muted">
                {connector.lastSyncAt
                  ? `Last synchronization ${relativeTime(connector.lastSyncAt)}`
                  : "No synchronization recorded yet"}
              </span>
              <span className="mx-tiny mx-muted">·</span>
              <span className="mx-tiny mx-muted">
                {connector.itemCount} records reported by the provider
              </span>
            </div>
          ) : (
            <Note tone="warning">
              <strong>{connector.name} is not connected.</strong> You are browsing the shared
              workspace library; these files are not from {connector.name}.
              <span className="mx-tiny" style={{ display: "block", marginTop: 2 }}>
                Recorded status: {CONNECTOR_STATUS_LABEL[connector.status]}.{" "}
                {connector.requirement ?? connector.healthMessage}
              </span>
            </Note>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(148px, 0.62fr) minmax(0, 1.38fr)",
            gap: 8,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <div className="mx-col" style={{ gap: 6, minHeight: 0 }}>
            <div className="mx-inline" style={{ gap: 4 }}>
              <button
                className={`mx-btn mx-btn--sm${kind === "all" ? " mx-btn--primary" : ""}`}
                onClick={() => setKind("all")}
              >
                All · {documents.length}
              </button>
              {kindCounts.map(([value, count]) => (
                <button
                  key={value}
                  className={`mx-btn mx-btn--sm${kind === value ? " mx-btn--primary" : ""}`}
                  onClick={() => setKind(value)}
                >
                  {KIND_LABEL[value]} · {count}
                </button>
              ))}
            </div>

            <div
              className="mx-file-list"
              role="listbox"
              aria-label={`Documents available to ${connector.name}`}
              style={{ flex: 1 }}
            >
              {visible.length === 0 ? (
                <Empty
                  title={documents.length === 0 ? "No documents" : "No document matches"}
                  description={
                    documents.length === 0
                      ? "This connector reports no documents, so there is nothing to link, import or attach."
                      : "Clear the search or choose another file type. Nothing was filtered out of the records."
                  }
                  icon={Files}
                />
              ) : (
                visible.map((document) => {
                  const isSelected = selected?.id === document.id;
                  return (
                    <button
                      key={document.id}
                      className={`mx-file${isSelected ? " is-selected" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => setSelectedId(document.id)}
                      title={`${document.name} · ${document.folder}`}
                    >
                      <span className="mx-file-icon" data-kind={document.kind}>
                        {iconLabel(document)}
                      </span>
                      <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                        <span className="mx-file-name">{document.name}</span>
                        <span className="mx-file-meta">
                          {document.folder} · {formatBytes(document.bytes)} ·{" "}
                          {relativeTime(document.modifiedAt)}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="mx-preview">
            <div className="mx-preview-head" style={{ justifyContent: "space-between" }}>
              <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                {selected ? selected.name : "No document selected"}
              </span>
              {selected ? (
                <span style={{ flex: "none" }}>
                  <Chip tone="info">{KIND_LABEL[selected.kind]}</Chip>
                </span>
              ) : null}
            </div>

            <div className="mx-preview-body">
              {selected ? (
                <DocumentPreview document={selected} />
              ) : (
                <Empty
                  title="Select a document"
                  description="The preview, the actions and the recorded history follow the document you choose."
                  icon={Files}
                />
              )}
            </div>

            <div className="mx-doc-actions">
              <select
                className="mx-select"
                style={{
                  flex: "1 1 145px",
                  width: "auto",
                  minWidth: 118,
                  maxWidth: 235,
                  minHeight: 24,
                  padding: "3px 6px",
                  fontSize: 9,
                }}
                value={activeTarget ? targetKeyOf(activeTarget) : ""}
                onChange={(event) => setTargetKey(event.target.value)}
                aria-label="Work item for the document action"
              >
                {targets.length === 0 ? <option value="">No open work item</option> : null}
                {missionTargets.length > 0 ? (
                  <optgroup label="Missions">
                    {missionTargets.map((target) => (
                      <option key={targetKeyOf(target)} value={targetKeyOf(target)}>
                        {target.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {taskTargets.length > 0 ? (
                  <optgroup label="Tasks">
                    {taskTargets.map((target) => (
                      <option key={targetKeyOf(target)} value={targetKeyOf(target)}>
                        {target.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              <button
                className="mx-btn mx-btn--sm"
                disabled={!canAct}
                onClick={() => runAction("linked")}
                title="Keep a reference to the original"
              >
                <Link2 /> Link original
              </button>
              <button
                className="mx-btn mx-btn--sm"
                disabled={!canAct}
                onClick={() => runAction("imported")}
                title="Store a managed copy in this workspace"
              >
                <Copy /> Import copy
              </button>
              <button
                className="mx-btn mx-btn--sm"
                disabled={!canAct}
                onClick={() => runAction("attached")}
                title="Attach to the work item without copying the file"
              >
                <Paperclip /> Attach to work item
              </button>
              {!connected ? (
                <span className="mx-tiny" style={{ flexBasis: "100%", color: "#9d6f14" }}>
                  <AlertTriangle
                    style={{ width: 9, height: 9, verticalAlign: "-1px", marginRight: 3 }}
                  />
                  {connector.name} is not connected, so linking, importing and attaching are
                  disabled.{" "}
                  {connector.requirement ?? "Authorize the connector in the catalog first."}
                </span>
              ) : null}
            </div>

            <div
              className="mx-scroll"
              style={{
                maxHeight: 116,
                padding: "5px 8px",
                borderTop: "1px solid var(--mx-line)",
                background: "rgba(248, 251, 255, 0.94)",
              }}
            >
              <div
                className="mx-tiny mx-muted"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 6,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <span>Recorded actions</span>
                <span>{actions.length}</span>
              </div>
              {actions.length === 0 ? (
                <div className="mx-tiny mx-muted" style={{ marginTop: 3 }}>
                  No action recorded for this document yet. It stays an unlinked library document.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 3, marginTop: 3 }}>
                  {actions.map((action) => (
                    <div
                      key={action.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto minmax(0, 1fr) auto",
                        gap: 5,
                        alignItems: "center",
                        paddingBottom: 3,
                        borderBottom: "1px dashed rgba(96, 140, 190, 0.22)",
                      }}
                    >
                      <Chip tone={ACTION_TONE[action.mode]}>{ACTION_LABEL[action.mode]}</Chip>
                      <span
                        className="mx-tiny"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={`${action.target.label} · ${action.note}`}
                      >
                        {action.target.label}
                      </span>
                      <span className="mx-tiny mx-muted" title={formatDateTime(action.at)}>
                        {relativeTime(action.at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mx-tiny mx-muted" style={{ marginTop: 4 }}>
                Linked originals keep the source permissions. Imported copies are managed here and
                are NOT synchronized with the source.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
