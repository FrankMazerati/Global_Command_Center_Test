import { CheckCheck, Play } from "lucide-react";
import type { Mission } from "@/lib/domain/types";
import { STATUS_LABEL, formatDateTime, slaRemaining } from "@/lib/domain/format";
import { useAction, useCommandState } from "@/lib/domain/store";
import { Chip, Panel } from "@/components/command/ui";
import { FactGrid, MissionHeader, ReadOnlyCheckpoints, StageStrip } from "./MissionCommon";
import { nextRecommendedAction } from "./missionMeta";

export function MissionAccepted({ mission }: { mission: Mission }) {
  const state = useCommandState();
  const act = useAction();
  const sla = slaRemaining(mission.slaDueAt);
  const acceptedBy = state.users.find((user) => user.id === mission.acceptedBy)?.name ?? "You";
  const recommendation = nextRecommendedAction(mission);

  function start() {
    act(
      { type: "mission.start", missionId: mission.id },
      { success: `${mission.number} · work started recorded — the first checkpoint is now open` },
    );
  }

  return (
    <>
      <Panel
        title="Accepted mission"
        icon={CheckCheck}
        note={`Accepted ${mission.acceptedAt ? formatDateTime(mission.acceptedAt) : ""}`}
      >
        <MissionHeader
          mission={mission}
          note="Accepted, not started. Starting is a separate recorded event."
        />
        <div className="mx-note mx-note--success">
          <strong>
            Accepted {mission.acceptedAt ? formatDateTime(mission.acceptedAt) : "just now"} by{" "}
            {acceptedBy}.
          </strong>{" "}
          Acceptance records ownership and starts the response clock. It is not work started, and it
          is not accomplishment.
        </div>
        <StageStrip mission={mission} />
        <FactGrid
          rows={[
            { label: "Number", value: mission.number },
            { label: "Objectives", value: `${mission.checkpoints.length} checkpoints configured` },
            { label: "Priority", value: <Chip tone="warning">{mission.priority}</Chip> },
            { label: "SLA", value: `${formatDateTime(mission.slaDueAt)} · ${sla.label}` },
            { label: "Current status", value: STATUS_LABEL[mission.status] },
            { label: "Next required action", value: recommendation.label },
          ]}
        />
        <div className="mx-btn-row">
          <button type="button" className="mx-btn mx-btn--sm mx-btn--primary" onClick={start}>
            <Play /> Start work
          </button>
        </div>
        <span className="mx-tiny mx-muted">
          Starting work writes its own trail event and timestamp, and opens checkpoint 1. No
          checkpoint is marked accomplished by starting.
        </span>
      </Panel>

      <Panel title="Objectives" icon={CheckCheck} note="Opened by work started">
        <ReadOnlyCheckpoints mission={mission} />
      </Panel>
    </>
  );
}
