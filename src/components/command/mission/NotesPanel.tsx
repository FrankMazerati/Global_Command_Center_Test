import { useState } from "react";
import { NotebookPen, Send } from "lucide-react";
import type { Mission } from "@/lib/domain/types";
import { useAction, useDraft } from "@/lib/domain/store";
import { Panel } from "@/components/command/ui";
import { NotesList } from "./MissionCommon";

const VISIBILITIES = ["internal", "requester"] as const;

export function NotesPanel({ mission }: { mission: Mission }) {
  const act = useAction();
  const [body, setBody] = useDraft(`mission.${mission.id}.note`, "");
  const [visibility, setVisibility] = useState<"internal" | "requester">("internal");
  const ready = body.trim().length >= 3;

  function save() {
    const outcome = act(
      { type: "mission.note", missionId: mission.id, body: body.trim(), visibility },
      {
        success:
          visibility === "internal"
            ? "Internal note recorded — it is never requester-visible"
            : "Requester-visible note recorded on the ticket",
      },
    );
    if (outcome.ok) setBody("");
  }

  return (
    <Panel title="Notes" icon={NotebookPen} note={`${mission.internalNotes.length} recorded`}>
      <div style={{ display: "grid", gap: 6 }}>
        <textarea
          className="mx-textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Working note for this ticket. Saved as a draft until you add it."
          aria-label="Mission note"
        />
        <div className="mx-btn-row">
          <select
            className="mx-select"
            style={{ width: "auto", maxWidth: 150 }}
            value={visibility}
            onChange={(event) => {
              const next = VISIBILITIES.find((entry) => entry === event.target.value);
              if (next) setVisibility(next);
            }}
            aria-label="Note visibility"
          >
            <option value="internal">Internal only</option>
            <option value="requester">Requester visible</option>
          </select>
          <button type="button" className="mx-btn mx-btn--sm" onClick={save} disabled={!ready}>
            <Send /> Add note
          </button>
          <span className="mx-tiny mx-muted">
            {body.trim().length} characters ·{" "}
            {visibility === "internal" ? "not sent to the requester" : "sent to the requester"}
          </span>
        </div>
        <span className="mx-tiny mx-muted">
          Internal notes are never requester-visible. Only notes recorded with requester visibility
          leave the service desk.
        </span>
        <div className="mx-divider" />
        <NotesList notes={mission.internalNotes} />
      </div>
    </Panel>
  );
}
