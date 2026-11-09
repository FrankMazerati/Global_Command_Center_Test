import { AlertTriangle, CheckCheck, CheckCircle2, Lock, XCircle } from "lucide-react";
import type { Mission } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/domain/format";
import { completionBlockers } from "@/lib/domain/selectors";
import { useAction } from "@/lib/domain/store";
import { Chip, Panel } from "@/components/command/ui";
import { FactGrid } from "./MissionCommon";

interface Requirement {
  key: string;
  label: string;
  met: boolean;
  detail: string;
}

const FIELD_LABEL: Record<string, string> = {
  checkpoints: "Every checkpoint has a recorded outcome",
  resolution: "Resolution recorded",
  rootCause: "Root cause recorded",
  workPerformed: "Work performed recorded",
  verification: "Verification recorded",
};

function requirementsFor(mission: Mission): Requirement[] {
  const blockers = completionBlockers(mission);
  const byField = new Map(blockers.map((blocker) => [blocker.field, blocker.message]));
  const record = mission.resolution;
  const entries: { key: string; label: string; met: boolean }[] = [
    {
      key: "checkpoints",
      label: FIELD_LABEL["checkpoints"] ?? "Checkpoints",
      met: !byField.has("checkpoints"),
    },
    {
      key: "resolution",
      label: FIELD_LABEL["resolution"] ?? "Resolution",
      met: record !== null && !byField.has("resolution"),
    },
    {
      key: "rootCause",
      label: FIELD_LABEL["rootCause"] ?? "Root cause",
      met: record !== null && record.rootCause.trim().length >= 8,
    },
    {
      key: "workPerformed",
      label: FIELD_LABEL["workPerformed"] ?? "Work performed",
      met: record !== null && record.workPerformed.trim().length >= 8,
    },
    {
      key: "verification",
      label: FIELD_LABEL["verification"] ?? "Verification",
      met: record !== null && record.verification.trim().length >= 8,
    },
  ];
  return entries.map((entry) => ({
    ...entry,
    detail: entry.met ? "Recorded" : (byField.get(entry.key) ?? "Still required"),
  }));
}

export function CompletionPanel({ mission }: { mission: Mission }) {
  const act = useAction();
  const requirements = requirementsFor(mission);
  const blockers = completionBlockers(mission);
  const unmet = requirements.filter((requirement) => !requirement.met);
  const canComplete = mission.status === "resolved" && blockers.length === 0;

  return (
    <Panel
      title="Completion"
      icon={CheckCheck}
      note="Completion follows resolution and is recorded on its own"
      actions={
        <Chip tone={blockers.length === 0 ? "success" : "warning"}>
          {blockers.length === 0 ? "Requirements met" : `${blockers.length} blocked`}
        </Chip>
      }
    >
      <div style={{ display: "grid", gap: 3 }}>
        <span className="mx-label">Completion requirements</span>
        {requirements.map((requirement) => (
          <div
            key={requirement.key}
            className="mx-inline"
            style={{ gap: 5, alignItems: "flex-start" }}
          >
            {requirement.met ? (
              <CheckCircle2
                style={{ width: 11, height: 11, color: "#1b8355", flex: "none", marginTop: 1 }}
              />
            ) : (
              <XCircle
                style={{ width: 11, height: 11, color: "#ae3d34", flex: "none", marginTop: 1 }}
              />
            )}
            <span style={{ fontSize: 9.5, lineHeight: 1.4, overflowWrap: "anywhere" }}>
              <span className={requirement.met ? "mx-strong" : ""}>{requirement.label}</span>
              <span className="mx-muted"> — {requirement.detail}</span>
            </span>
          </div>
        ))}
      </div>

      {blockers.length > 0 ? (
        <div className="mx-note mx-note--warning">
          <AlertTriangle style={{ width: 10, height: 10, marginRight: 4, verticalAlign: "-1px" }} />
          Completion is blocked. {blockers.map((blocker) => blocker.message).join(" ")}
        </div>
      ) : null}

      {mission.status === "resolved" ? (
        <div style={{ display: "grid", gap: 6 }}>
          <div className="mx-btn-row">
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--primary"
              onClick={() =>
                act(
                  { type: "mission.complete", missionId: mission.id },
                  { success: `${mission.number} completed — closure is still a separate step` },
                )
              }
              disabled={!canComplete}
              title={
                canComplete
                  ? "Complete the mission"
                  : "Every completion requirement must be satisfied first"
              }
            >
              <CheckCheck /> COMPLETE MISSION
            </button>
            {!canComplete ? (
              <span className="mx-tiny mx-muted">{unmet.length} requirement(s) still unmet</span>
            ) : null}
          </div>
          <span className="mx-tiny mx-muted">
            Completing records the outcome. Closing the ticket is a separate action taken after
            requester confirmation.
          </span>
        </div>
      ) : null}

      {mission.status === "completed" ? (
        <div style={{ display: "grid", gap: 6 }}>
          <FactGrid
            rows={[{ label: "Completed", value: formatDateTime(mission.statusChangedAt) }]}
          />
          <div className="mx-btn-row">
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--success"
              onClick={() =>
                act(
                  { type: "mission.close", missionId: mission.id },
                  { success: `${mission.number} closed as its own recorded step` },
                )
              }
            >
              <Lock /> Close ticket
            </button>
            <span className="mx-tiny mx-muted">
              Closure is the separate final step. It does not change what was resolved.
            </span>
          </div>
        </div>
      ) : null}

      {mission.status === "closed" ? (
        <FactGrid
          rows={[
            { label: "Completed", value: formatDateTime(mission.statusChangedAt) },
            {
              label: "Closed",
              value: mission.closedAt ? formatDateTime(mission.closedAt) : "Not recorded",
            },
          ]}
        />
      ) : null}
    </Panel>
  );
}
