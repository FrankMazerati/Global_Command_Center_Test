import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCheck,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Chip, Empty, Kpi, WorkspaceShell } from "@/components/command/ui";
import { MissionQueue } from "@/components/command/mission/MissionQueue";
import { MissionAdmission } from "@/components/command/mission/MissionAdmission";
import { MissionAccepted } from "@/components/command/mission/MissionAccepted";
import { MissionWorkspace } from "@/components/command/mission/MissionWorkspace";
import { MissionContextRail } from "@/components/command/mission/MissionContextRail";
import { TicketTrail } from "@/components/command/mission/TicketTrail";
import {
  MissionHeader,
  ReadOnlyCheckpoints,
  NotesList,
} from "@/components/command/mission/MissionCommon";
import { CompletionPanel } from "@/components/command/mission/CompletionPanel";
import { useCommandState } from "@/lib/domain/store";
import { activeUser, missionShell, recognitionSummary } from "@/lib/domain/selectors";
import { STATUS_LABEL } from "@/lib/domain/format";

interface MissionSearch {
  mission?: string;
}

export const Route = createFileRoute("/mission-control")({
  validateSearch: (search: Record<string, unknown>): MissionSearch =>
    typeof search["mission"] === "string" ? { mission: search["mission"] } : {},
  head: () => ({
    meta: [
      { title: "Mission Control — Maximus Optimus Command Center" },
      {
        name: "description",
        content:
          "Technician operations: admission control, checkpoints, escalation, resolution and completion, with every stage recorded separately.",
      },
    ],
  }),
  component: MissionControlPage,
});

function MissionControlPage() {
  const state = useCommandState();
  const user = activeUser(state);
  const search = Route.useSearch();
  const shell = missionShell(state, state.activeUserId);
  const summary = recognitionSummary(state, state.activeUserId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const initialId = useMemo(() => {
    if (search.mission && state.missions.some((mission) => mission.id === search.mission))
      return search.mission;
    const first =
      shell.available[0] ??
      shell.assigned[0] ??
      shell.accepted[0] ??
      shell.in_progress[0] ??
      shell.pending[0] ??
      shell.escalated[0] ??
      shell.resolved[0] ??
      state.missions[0];
    return first?.id ?? null;
  }, [search.mission, state.missions, shell]);

  useEffect(() => {
    setSelectedId((current) => current ?? initialId);
  }, [initialId]);

  const selected = state.missions.find((mission) => mission.id === selectedId) ?? null;
  const openCount = shell.available.length + shell.assigned.length;
  const activeCount = shell.accepted.length + shell.in_progress.length;

  return (
    <WorkspaceShell
      eyebrow="INTELLIDESK · MISSION CONTROL"
      title="Mission Control"
      subtitle="Assignment is not acceptance. Acceptance is not work started. Work started is not accomplishment."
      moduleLinks
      actions={
        <>
          <Chip tone="info" icon={ShieldCheck}>
            {user.name} · {user.role}
          </Chip>
          <Chip tone="warning" icon={Trophy}>
            {summary.stars} stars · L{summary.level}
          </Chip>
          <Link to="/help-buddy" className="mx-btn mx-btn--sm">
            Help Buddy <ArrowUpRight style={{ width: 9, height: 9 }} />
          </Link>
        </>
      }
    >
      <div className="mx-kpis">
        <Kpi
          value={shell.available.length + shell.assigned.length}
          label="To review"
          tone="warning"
        />
        <Kpi value={shell.accepted.length} label="Accepted" />
        <Kpi value={shell.in_progress.length} label="In progress" />
        <Kpi value={shell.pending.length} label="Pending" />
        <Kpi value={shell.escalated.length} label="Escalated" tone="danger" />
        <Kpi value={shell.resolved.length} label="Awaiting completion" />
        <Kpi
          value={shell.completed.length + shell.closed.length}
          label="Completed"
          tone="success"
        />
      </div>

      <div className="mx-body mx-body--triple">
        <div className="mx-col mx-scroll" style={{ paddingRight: 2 }}>
          <MissionQueue shell={shell} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="mx-col mx-scroll" style={{ paddingRight: 2 }}>
          {!selected ? (
            <Empty
              title="Select a mission"
              description="Choose a ticket from the queue to review its briefing, accept or decline it, and record every checkpoint outcome."
              icon={ClipboardList}
            />
          ) : selected.status === "available" || selected.status === "assigned" ? (
            <MissionAdmission mission={selected} />
          ) : selected.status === "accepted" ? (
            <MissionAccepted mission={selected} />
          ) : selected.status === "in_progress" ||
            selected.status === "pending" ||
            selected.status === "escalated" ||
            selected.status === "resolved" ? (
            <MissionWorkspace mission={selected} />
          ) : (
            <>
              <div className="mx-panel">
                <div className="mx-panel-head">
                  <span className="mx-panel-title">
                    <CheckCheck /> Closed record
                  </span>
                  <Chip tone="success">{STATUS_LABEL[selected.status]}</Chip>
                </div>
                <MissionHeader
                  mission={selected}
                  note="Read-only. Every stage below is a recorded event."
                />
                <ReadOnlyCheckpoints mission={selected} />
                <CompletionPanel mission={selected} />
                <NotesList notes={selected.internalNotes} />
              </div>
            </>
          )}
        </div>

        <aside className="mx-col mx-scroll" style={{ paddingRight: 2 }}>
          {selected ? (
            <>
              <MissionContextRail mission={selected} />
              <TicketTrail mission={selected} />
            </>
          ) : (
            <div className="mx-panel">
              <div className="mx-panel-head">
                <span className="mx-panel-title">
                  <Sparkles /> Context
                </span>
              </div>
              <p className="mx-sub">
                The requester, SLA, documents and trail for the selected mission appear here.
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="mx-tiny mx-muted" style={{ padding: "0 4px" }}>
        {openCount} awaiting admission control · {activeCount} in your hands ·{" "}
        {shell.completed.length + shell.closed.length} completed. Every transition is written to the
        ticket trail and to Activity.
      </div>
    </WorkspaceShell>
  );
}
