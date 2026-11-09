import { ListChecks, Workflow } from "lucide-react";
import type { Mission } from "@/lib/domain/types";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/domain/format";
import { missionProgress } from "@/lib/domain/selectors";
import { Chip, Panel } from "@/components/command/ui";
import { MissionHeader, StageStrip } from "./MissionCommon";
import { CheckpointList } from "./CheckpointList";
import { PendingPanel } from "./PendingPanel";
import { EscalationPanel } from "./EscalationPanel";
import { ResolutionPanel } from "./ResolutionPanel";
import { CompletionPanel } from "./CompletionPanel";
import { NotesPanel } from "./NotesPanel";

function lockReasonFor(mission: Mission): string {
  if (mission.status === "escalated") {
    return "This mission is escalated. Checkpoint outcomes are locked by the workflow so the receiving team sees exactly what was recorded before handover.";
  }
  if (mission.status === "resolved") {
    return "The resolution is recorded and the mission is awaiting completion. Checkpoint records are read-only at this stage; the completion requirements below show anything still missing.";
  }
  return "This mission is closed to checkpoint changes.";
}

export function MissionWorkspace({ mission }: { mission: Mission }) {
  const editable =
    mission.status === "accepted" ||
    mission.status === "in_progress" ||
    mission.status === "pending";
  const progress = missionProgress(mission);
  const showPending =
    mission.status === "accepted" ||
    mission.status === "in_progress" ||
    mission.status === "pending";
  const showEscalation = showPending || mission.status === "escalated";

  return (
    <>
      <Panel
        title="Mission workspace"
        icon={Workflow}
        note={mission.number}
        actions={<Chip tone={STATUS_TONE[mission.status]}>{STATUS_LABEL[mission.status]}</Chip>}
      >
        <MissionHeader
          mission={mission}
          note="Execution and resolution. Every recorded change below is its own event."
        />
        <StageStrip mission={mission} />
      </Panel>

      {showPending ? <PendingPanel mission={mission} /> : null}
      {showEscalation ? <EscalationPanel mission={mission} /> : null}

      <Panel
        title="Objectives"
        icon={ListChecks}
        note={`${progress.done} of ${progress.total} recorded`}
        actions={<Chip tone="neutral">{progress.open} open</Chip>}
      >
        <CheckpointList mission={mission} editable={editable} lockReason={lockReasonFor(mission)} />
      </Panel>

      <ResolutionPanel mission={mission} />
      <CompletionPanel mission={mission} />
      <NotesPanel mission={mission} />
    </>
  );
}
