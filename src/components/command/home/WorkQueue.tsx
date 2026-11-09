import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ClipboardCheck,
  FileStack,
  ShieldCheck,
} from "lucide-react";
import { useCommandState } from "@/lib/domain/store";
import { dueLabelFor, workQueue, workSummary, type WorkItem } from "@/lib/domain/selectors";
import { Chip } from "@/components/command/ui";

const SECTION_ORDER: {
  key: WorkItem["section"];
  label: string;
  icon: typeof BriefcaseBusiness;
  limit: number;
}[] = [
  { key: "new", label: "Admission control", icon: BriefcaseBusiness, limit: 3 },
  { key: "approvals", label: "Decisions waiting on you", icon: ShieldCheck, limit: 2 },
  { key: "accepted", label: "Missions in your hands", icon: ClipboardCheck, limit: 3 },
  { key: "tasks", label: "Tasks due", icon: ClipboardCheck, limit: 3 },
  { key: "followups", label: "Waiting on others", icon: FileStack, limit: 2 },
  { key: "documents", label: "Documents and signatures", icon: FileStack, limit: 2 },
];

export function WorkQueue({
  activeId,
  onOpen,
}: {
  activeId: string | null;
  onOpen: (item: WorkItem) => void;
}) {
  const state = useCommandState();
  const userId = state.activeUserId;
  const items = workQueue(state, userId);
  const summary = workSummary(state, userId);

  return (
    <div className="mx-scope mx-queue">
      <div className="mx-queue-bar">
        <span>Live queue · recorded work</span>
        <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <strong>{summary.newCount}</strong>
          <span>new</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <strong>{summary.approvals}</strong>
          <span>decisions</span>
        </span>
      </div>

      {SECTION_ORDER.map((section) => {
        const rows = items.filter((item) => item.section === section.key).slice(0, section.limit);
        if (rows.length === 0) return null;
        const Icon = section.icon;
        const total = items.filter((item) => item.section === section.key).length;
        return (
          <div className="mx-queue-group" key={section.key}>
            <div className="mx-queue-grouphead">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon style={{ width: 10, height: 10 }} /> {section.label}
              </span>
              <span>{total}</span>
            </div>
            {rows.map((item) => (
              <button
                key={item.id}
                className={`mx-queue-item${item.overdue ? " is-overdue" : ""}${activeId === item.id ? " is-active" : ""}`}
                onClick={() => onOpen(item)}
                aria-label={`${item.requiredAction}: ${item.title}`}
              >
                <span style={{ minWidth: 0 }}>
                  <span className="mx-queue-title">{item.title}</span>
                  <span className="mx-queue-meta">
                    {item.priority ? (
                      <Chip tone={item.overdue ? "danger" : "neutral"}>{item.priority}</Chip>
                    ) : null}
                    <span>{item.statusLabel}</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{dueLabelFor(item)}</span>
                  </span>
                </span>
                <span className="mx-queue-cta">{item.requiredAction.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        );
      })}

      {items.length === 0 ? (
        <div className="mx-empty" style={{ marginTop: 6 }}>
          <ShieldCheck />
          <strong>Your queue is clear</strong>
          <span>
            Nothing is waiting for a decision, a signature or a checkpoint. New work appears here
            the moment it is routed to you.
          </span>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingTop: 2 }}>
        <Link to="/mission-control" className="mx-btn mx-btn--sm">
          Mission Control <ArrowUpRight style={{ width: 9, height: 9 }} />
        </Link>
        <Link to="/help-buddy" className="mx-btn mx-btn--sm">
          Help Buddy <ArrowUpRight style={{ width: 9, height: 9 }} />
        </Link>
        <Link to="/connectors" className="mx-btn mx-btn--sm">
          Connectors <ArrowUpRight style={{ width: 9, height: 9 }} />
        </Link>
      </div>
    </div>
  );
}
