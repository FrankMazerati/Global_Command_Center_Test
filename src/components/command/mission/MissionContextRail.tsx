import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookMarked,
  CalendarClock,
  FileStack,
  Mail,
  Sparkles,
  Star,
  Trophy,
  UserRound,
} from "lucide-react";
import type { Mission } from "@/lib/domain/types";
import { dueLabel, formatDateTime, slaRemaining } from "@/lib/domain/format";
import { levelForXp } from "@/lib/domain/recognition";
import { missionStars, missionXp, recognitionSummary } from "@/lib/domain/selectors";
import { useCommandState } from "@/lib/domain/store";
import { Chip, Panel, Progress } from "@/components/command/ui";
import { FactGrid, slaToneOf } from "./MissionCommon";
import { nextRecommendedAction } from "./missionMeta";

export function MissionContextRail({ mission }: { mission: Mission }) {
  const state = useCommandState();
  const user = state.users.find((entry) => entry.id === state.activeUserId);
  const summary = recognitionSummary(state, state.activeUserId);
  const playbook = state.playbooks.find((entry) => entry.id === mission.playbookId);
  const sla = slaRemaining(mission.slaDueAt);
  const recommendation = nextRecommendedAction(mission);
  const stars = missionStars(state, mission.id);
  const xp = missionXp(state, mission.id);
  const band = levelForXp(xp);
  const documents = mission.documentIds.map((documentId) => ({
    documentId,
    document: state.library.find((entry) => entry.id === documentId) ?? null,
  }));

  return (
    <>
      <Panel title="Requester" icon={UserRound} note="Ticket contact">
        <FactGrid
          rows={[
            { label: "Name", value: mission.requester.name },
            { label: "Department", value: mission.requester.department },
            {
              label: "Email",
              value: (
                <a
                  href={`mailto:${mission.requester.email}`}
                  className="mx-inline"
                  style={{ gap: 3, color: "#2a6eb0" }}
                >
                  <Mail style={{ width: 10, height: 10 }} />
                  <span style={{ overflowWrap: "anywhere" }}>{mission.requester.email}</span>
                </a>
              ),
            },
            { label: "Tenant", value: mission.tenant },
          ]}
        />
      </Panel>

      <Panel
        title="SLA"
        icon={CalendarClock}
        note={dueLabel(mission.slaDueAt)}
        actions={<Chip tone={slaToneOf(mission)}>{sla.label}</Chip>}
      >
        <FactGrid
          rows={[
            { label: "Remaining", value: <span className="mx-strong">{sla.label}</span> },
            { label: "Due", value: formatDateTime(mission.slaDueAt) },
            { label: "Submitted", value: formatDateTime(mission.submittedAt) },
            { label: "Priority", value: mission.priority },
          ]}
        />
        <span className="mx-tiny mx-muted">
          Remaining time is computed from the recorded SLA due date; the response clock started when
          the mission was accepted.
        </span>
      </Panel>

      <Panel
        title="Playbook"
        icon={BookMarked}
        note={playbook ? `Version ${playbook.version}` : "Not linked"}
      >
        {playbook ? (
          <div style={{ display: "grid", gap: 4 }}>
            <span className="mx-strong" style={{ fontSize: 10, overflowWrap: "anywhere" }}>
              {playbook.title}
            </span>
            <span className="mx-tiny mx-muted">
              {playbook.category} · version {playbook.version} · updated{" "}
              {formatDateTime(playbook.updatedAt)}
            </span>
            <ol style={{ margin: 0, paddingLeft: 15, display: "grid", gap: 3 }}>
              {playbook.steps.slice(0, 3).map((step) => (
                <li key={step.title} style={{ fontSize: 9.5, lineHeight: 1.4 }}>
                  {step.title}
                  <div className="mx-tiny mx-muted">{step.expected}</div>
                </li>
              ))}
            </ol>
            {playbook.steps.length > 3 ? (
              <span className="mx-tiny mx-muted">
                +{playbook.steps.length - 3} further steps in Help Buddy
              </span>
            ) : null}
            <Link to="/help-buddy" className="mx-btn mx-btn--sm">
              Open playbook <ArrowUpRight style={{ width: 10, height: 10 }} />
            </Link>
            <span className="mx-tiny mx-muted">
              Opens Help Buddy — use the Playbooks tab there to read the full procedure.
            </span>
          </div>
        ) : (
          <span className="mx-tiny mx-muted">No playbook is linked to this mission.</span>
        )}
      </Panel>

      <Panel title="Documents" icon={FileStack} note={`${documents.length} linked`}>
        {documents.length === 0 ? (
          <span className="mx-tiny mx-muted">No documents are linked to this mission.</span>
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {documents.map((entry) =>
              entry.document ? (
                <Link
                  key={entry.documentId}
                  to="/connectors"
                  search={{ doc: entry.document.id }}
                  className="mx-tag"
                  style={{
                    display: "inline-flex",
                    gap: 4,
                    alignItems: "center",
                    overflowWrap: "anywhere",
                  }}
                >
                  <FileStack style={{ width: 10, height: 10, flex: "none" }} />
                  {entry.document.name}
                </Link>
              ) : (
                <span
                  key={entry.documentId}
                  className="mx-tag"
                  style={{ color: "#8a6110", overflowWrap: "anywhere" }}
                >
                  {entry.documentId}
                </span>
              ),
            )}
            <span className="mx-tiny mx-muted">
              Documents open in Connectors, where the source and permissions stay visible.
            </span>
          </div>
        )}
      </Panel>

      <Panel title="Help Buddy" icon={Sparkles} note="Suggestion, not an action taken">
        <div style={{ display: "grid", gap: 4 }}>
          <span className="mx-label">Next recommended action</span>
          <span className="mx-strong" style={{ fontSize: 10 }}>
            {recommendation.label}
          </span>
          <span className="mx-tiny" style={{ lineHeight: 1.45 }}>
            {recommendation.detail}
          </span>
          <Link to="/help-buddy" className="mx-btn mx-btn--sm">
            Ask Help Buddy <ArrowUpRight style={{ width: 10, height: 10 }} />
          </Link>
          <span className="mx-tiny mx-muted">
            Nothing above has been recorded. It is derived from the state of {mission.number} and
            only happens when you act.
          </span>
        </div>
      </Panel>

      <Panel title="Recognition" icon={Trophy} note="From recorded work only">
        <FactGrid
          rows={[
            {
              label: "This mission",
              value: (
                <span className="mx-inline" style={{ gap: 4 }}>
                  <Chip tone="success" icon={Star}>
                    {stars} stars
                  </Chip>
                  <Chip tone="accent">{xp} XP</Chip>
                </span>
              ),
            },
            { label: "Mission level band", value: `${band.level} · ${band.name}` },
            { label: "Your level", value: `${summary.level} · ${summary.levelName}` },
            { label: "Stars earned", value: summary.stars },
            { label: "XP total", value: summary.xp },
          ]}
        />
        {summary.nextLevelName ? (
          <div style={{ display: "grid", gap: 3 }}>
            <Progress value={summary.progress} />
            <span className="mx-tiny mx-muted">
              {summary.xpToNext} XP to {summary.nextLevelName}
            </span>
          </div>
        ) : (
          <span className="mx-tiny mx-muted">Highest configured level reached.</span>
        )}
        <span className="mx-tiny mx-muted">
          Mission totals count only ledger entries produced by this ticket&rsquo;s checkpoints and
          evidence.
          {user ? ` Signed in as ${user.name}.` : ""}
        </span>
      </Panel>
    </>
  );
}
