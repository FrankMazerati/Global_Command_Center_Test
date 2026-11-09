import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Cable, Sparkles, Trophy, Workflow } from "lucide-react";
import { Chip, Empty, Kpi, Note, Panel } from "@/components/command/ui";
import { useCommandState } from "@/lib/domain/store";
import { connectorSummary, missionShell, recognitionSummary } from "@/lib/domain/selectors";
import { formatRelative } from "@/components/command/ui";

/**
 * A module added to Help Buddy renders live data from that module — never an empty decorative
 * panel. Each one also links to the full workspace where the work is actually done.
 */
export function ModuleTab({ moduleId }: { moduleId: string }) {
  const state = useCommandState();
  const module = state.modules.find((item) => item.id === moduleId);
  if (!module) {
    return (
      <Empty
        title="Module not found"
        description="This module is no longer installed for your workspace."
      />
    );
  }

  if (!module.operational) {
    return (
      <Empty
        title={`${module.name} is not operational`}
        description={module.unavailableReason ?? "The module has no live functionality yet."}
      />
    );
  }

  if (module.id === "mod-mission-control") {
    const shell = missionShell(state, state.activeUserId);
    return (
      <div className="mx-grid-2">
        <Panel
          title="Live mission queues"
          icon={Workflow}
          actions={
            <Link className="mx-btn mx-btn--sm" to="/mission-control">
              Open
              <ArrowUpRight style={{ width: 10, height: 10 }} />
            </Link>
          }
        >
          <div className="mx-kpis">
            <Kpi
              value={shell.available.length + shell.assigned.length}
              label="To review"
              tone="warning"
            />
            <Kpi value={shell.accepted.length + shell.in_progress.length} label="Active" />
            <Kpi value={shell.pending.length} label="Pending" />
            <Kpi
              value={shell.completed.length + shell.closed.length}
              label="Completed"
              tone="success"
            />
          </div>
          <Note>
            Counts come from the same ticket records Mission Control writes to. Accepting here or
            there is the same event.
          </Note>
        </Panel>
        <Panel title="Newest incoming" icon={Workflow}>
          {shell.available.length === 0 ? (
            <Empty title="No new missions" description="Nothing is waiting in admission control." />
          ) : (
            shell.available.slice(0, 3).map((mission) => (
              <div className="mx-row" key={mission.id}>
                <div>
                  <div className="mx-row-title">
                    {mission.number} · {mission.title}
                  </div>
                  <div className="mx-row-meta">
                    <Chip tone="danger">{mission.priority}</Chip>
                    <span>{mission.assignedTeam}</span>
                  </div>
                </div>
                <Link className="mx-btn mx-btn--sm" to="/mission-control">
                  Review
                </Link>
              </div>
            ))
          )}
        </Panel>
      </div>
    );
  }

  if (module.id === "mod-connectors") {
    const summary = connectorSummary(state);
    return (
      <div className="mx-grid-2">
        <Panel
          title="Connection health"
          icon={Cable}
          actions={
            <Link className="mx-btn mx-btn--sm" to="/connectors">
              Open
              <ArrowUpRight style={{ width: 10, height: 10 }} />
            </Link>
          }
        >
          <div className="mx-kpis">
            <Kpi value={summary.connected} label="Connected" tone="success" />
            <Kpi value={summary.attention} label="Attention" tone="danger" />
            <Kpi value={summary.syncing} label="Syncing" />
            <Kpi value={summary.available} label="Available" />
          </div>
          <Note>Only connectors with a confirmed authorization show as connected.</Note>
        </Panel>
        <Panel title="Recent connector events" icon={Cable}>
          {state.syncEvents.slice(0, 4).map((event) => (
            <div className="mx-row" key={event.id} style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
              <div>
                <div className="mx-row-title">{event.summary}</div>
                <div className="mx-row-meta">
                  <span>{formatRelative(event.at)}</span>
                  <span>·</span>
                  <span>{event.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </Panel>
      </div>
    );
  }

  if (module.id === "mod-intellisync") {
    return (
      <Panel
        title="IntelliSync events"
        icon={Workflow}
        actions={
          <Link className="mx-btn mx-btn--sm" to="/intellisync">
            Open
            <ArrowUpRight style={{ width: 10, height: 10 }} />
          </Link>
        }
      >
        {state.syncEvents.slice(0, 8).map((event) => (
          <div className="mx-row" key={event.id}>
            <div>
              <div className="mx-row-title">{event.summary}</div>
              <div className="mx-row-meta">
                <Chip
                  tone={
                    event.type.includes("attention") || event.type.includes("retried")
                      ? "warning"
                      : "success"
                  }
                >
                  {event.type}
                </Chip>
                <span>{formatRelative(event.at)}</span>
                <span>{event.detail}</span>
              </div>
            </div>
            <span className="mx-tiny mx-muted">{event.connectorId}</span>
          </div>
        ))}
      </Panel>
    );
  }

  if (module.id === "mod-recognition") {
    const summary = recognitionSummary(state, state.activeUserId);
    return (
      <Panel
        title="Recognition summary"
        icon={Trophy}
        actions={
          <Link className="mx-btn mx-btn--sm" to="/help-buddy">
            Open ledger
            <ArrowUpRight style={{ width: 10, height: 10 }} />
          </Link>
        }
      >
        <div className="mx-kpis">
          <Kpi value={summary.stars} label="Stars" tone="warning" />
          <Kpi value={summary.xp} label="XP" />
          <Kpi value={`L${summary.level}`} label={summary.levelName} tone="success" />
          <Kpi value={summary.badges.length} label="Badges" />
        </div>
        <Note>
          Stars come from checkpoints with a recorded result. XP comes from completion and
          complexity, weighted by priority.
        </Note>
      </Panel>
    );
  }

  if (module.id === "mod-character") {
    const character = state.characters.find((item) => item.id === state.activeCharacterId);
    return (
      <Panel
        title="Character configuration"
        icon={Sparkles}
        actions={
          <Link className="mx-btn mx-btn--sm" to="/character-studio">
            Open studio
            <ArrowUpRight style={{ width: 10, height: 10 }} />
          </Link>
        }
      >
        <dl className="mx-kv">
          <dt>Character</dt>
          <dd>{character?.name}</dd>
          <dt>Voice</dt>
          <dd>
            {character?.voice} · {character?.accent}
          </dd>
          <dt>Personality</dt>
          <dd>{character?.personality}</dd>
          <dt>Speaking style</dt>
          <dd>{character?.speakingStyle}</dd>
        </dl>
        <Note>
          Help Buddy uses this configuration directly. Changing it in the studio changes this
          conversation.
        </Note>
      </Panel>
    );
  }

  return (
    <Empty
      title={module.name}
      description={`${module.description} ${module.category} · entitlement level ${module.entitlement}.`}
    />
  );
}
