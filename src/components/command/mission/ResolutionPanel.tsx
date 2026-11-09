import { useState } from "react";
import { BookOpen, FileCheck2 } from "lucide-react";
import type { Mission } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/domain/format";
import { useAction, useCommandState, useDraft } from "@/lib/domain/store";
import { Chip, Field, Panel } from "@/components/command/ui";
import { FactGrid } from "./MissionCommon";
import { displayName } from "./missionMeta";

const MIN_FIELD = 8;

export function ResolutionPanel({ mission }: { mission: Mission }) {
  const state = useCommandState();
  const act = useAction();
  const [open, setOpen] = useState(false);
  const [rootCause, setRootCause] = useDraft(`mission.${mission.id}.resolution.rootCause`, "");
  const [workPerformed, setWorkPerformed] = useDraft(
    `mission.${mission.id}.resolution.workPerformed`,
    "",
  );
  const [resolution, setResolution] = useDraft(`mission.${mission.id}.resolution.resolution`, "");
  const [verification, setVerification] = useDraft(
    `mission.${mission.id}.resolution.verification`,
    "",
  );
  const [finalNotes, setFinalNotes] = useDraft(`mission.${mission.id}.resolution.finalNotes`, "");
  const [knowledgeArticleId, setKnowledgeArticleId] = useState("");

  const record = mission.resolution;
  const canRecord =
    !record &&
    (mission.status === "accepted" ||
      mission.status === "in_progress" ||
      mission.status === "pending");
  const ready =
    rootCause.trim().length >= MIN_FIELD &&
    workPerformed.trim().length >= MIN_FIELD &&
    resolution.trim().length >= MIN_FIELD &&
    verification.trim().length >= MIN_FIELD;
  const article = record?.knowledgeArticleId
    ? state.knowledge.find((entry) => entry.id === record.knowledgeArticleId)
    : undefined;

  function submit() {
    const articleId = state.knowledge.some((entry) => entry.id === knowledgeArticleId)
      ? knowledgeArticleId
      : null;
    const outcome = act(
      {
        type: "mission.resolve",
        missionId: mission.id,
        rootCause: rootCause.trim(),
        workPerformed: workPerformed.trim(),
        resolution: resolution.trim(),
        verification: verification.trim(),
        knowledgeArticleId: articleId,
        finalNotes: finalNotes.trim(),
      },
      { success: `${mission.number} resolution recorded — completion is still a separate step` },
    );
    if (outcome.ok) setOpen(false);
  }

  return (
    <Panel
      title="Resolution"
      icon={FileCheck2}
      note="Resolution is separate from completion"
      actions={record ? <Chip tone="warning">Recorded · awaiting completion</Chip> : null}
    >
      {record ? (
        <div style={{ display: "grid", gap: 6 }}>
          <FactGrid
            rows={[
              { label: "Root cause", value: record.rootCause },
              { label: "Work performed", value: record.workPerformed },
              { label: "Resolution", value: record.resolution },
              { label: "Verification", value: record.verification },
              {
                label: "Knowledge article",
                value: article
                  ? `${article.title} · ${article.category}`
                  : (record.knowledgeArticleId ?? "None linked"),
              },
              { label: "Final notes", value: record.finalNotes || "None recorded" },
              {
                label: "Recorded",
                value: `${formatDateTime(record.recordedAt)} · ${displayName(state, record.recordedBy)}`,
              },
            ]}
          />
          <div className="mx-note">
            The resolution record is the account of what was found and fixed. It does not mark the
            mission complete, and completion does not close the ticket.
          </div>
        </div>
      ) : null}

      {canRecord ? (
        <div style={{ display: "grid", gap: 6 }}>
          <button
            type="button"
            className="mx-btn mx-btn--sm mx-btn--ghost"
            style={{ justifyContent: "flex-start", paddingLeft: 2 }}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            {open ? "Hide resolution form" : "Record the resolution"}
          </button>
          {open ? (
            <>
              <Field label="Root cause (required)" hint={`At least ${MIN_FIELD} characters.`}>
                <textarea
                  className="mx-textarea"
                  value={rootCause}
                  onChange={(event) => setRootCause(event.target.value)}
                  placeholder="What actually caused the failure?"
                  aria-label="Root cause"
                />
              </Field>
              <Field label="Work performed (required)" hint={`At least ${MIN_FIELD} characters.`}>
                <textarea
                  className="mx-textarea"
                  value={workPerformed}
                  onChange={(event) => setWorkPerformed(event.target.value)}
                  placeholder="What did you do, in the order you did it?"
                  aria-label="Work performed"
                />
              </Field>
              <Field label="Resolution (required)" hint={`At least ${MIN_FIELD} characters.`}>
                <textarea
                  className="mx-textarea"
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  placeholder="State the outcome plainly."
                  aria-label="Resolution"
                />
              </Field>
              <Field
                label="Verification (required)"
                hint="Who or what confirmed the service works?"
              >
                <textarea
                  className="mx-textarea"
                  value={verification}
                  onChange={(event) => setVerification(event.target.value)}
                  placeholder="e.g. Requester signed in and confirmed access to file services."
                  aria-label="Verification"
                />
              </Field>
              <div className="mx-form-grid">
                <Field label="Knowledge article">
                  <select
                    className="mx-select"
                    value={knowledgeArticleId}
                    onChange={(event) => setKnowledgeArticleId(event.target.value)}
                    aria-label="Knowledge article"
                  >
                    <option value="">No article linked</option>
                    {state.knowledge.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.title.slice(0, 52)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Final notes">
                  <input
                    className="mx-input"
                    value={finalNotes}
                    onChange={(event) => setFinalNotes(event.target.value)}
                    placeholder="Anything the next engineer must know."
                    aria-label="Final notes"
                  />
                </Field>
              </div>
              <div className="mx-btn-row">
                <button
                  type="button"
                  className="mx-btn mx-btn--sm mx-btn--primary"
                  onClick={submit}
                  disabled={!ready}
                >
                  <BookOpen /> Record resolution
                </button>
                <span className="mx-tiny mx-muted">
                  Root cause {rootCause.trim().length}/{MIN_FIELD} · work{" "}
                  {workPerformed.trim().length}/{MIN_FIELD} · resolution {resolution.trim().length}/
                  {MIN_FIELD} · verification {verification.trim().length}/{MIN_FIELD}
                </span>
              </div>
              <span className="mx-tiny mx-muted">
                Fields are saved as drafts. Recording a resolution never completes the mission by
                itself.
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
