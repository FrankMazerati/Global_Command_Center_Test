import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Clock,
  FileText,
  NotebookPen,
  Paperclip,
  Pin,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
} from "lucide-react";
import type {
  DocumentActionMode,
  KnowledgeArticle,
  Mission,
  Note as NoteRecord,
} from "@/lib/domain/types";
import { useAction, useCommandState, useDraft } from "@/lib/domain/store";
import { activeUser } from "@/lib/domain/selectors";
import { dueLabel, formatBytes, formatDate, relativeTime } from "@/lib/domain/format";
import { Chip, Empty, Field, Kpi, Note, Panel } from "@/components/command/ui";

const ROOT: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flex: 1,
  minHeight: 0,
};
const CHIP_BUTTON: CSSProperties = {
  padding: 0,
  border: "none",
  background: "none",
  cursor: "pointer",
};
const SEARCH_ICON: CSSProperties = { width: 12, height: 12, flex: "none" };
const SPLIT_FILL: CSSProperties = { gridTemplateRows: "minmax(0, 1fr)", flex: 1, minHeight: 0 };

const MODE_TONE: Record<DocumentActionMode, "info" | "accent" | "neutral"> = {
  linked: "info",
  imported: "accent",
  attached: "neutral",
};

const MODE_LABEL: Record<DocumentActionMode, string> = {
  linked: "Linked original",
  imported: "Imported copy",
  attached: "Attached",
};

/** A filter chip that behaves like a button while keeping the chip tone colours. */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={CHIP_BUTTON}>
      <Chip tone={active ? "info" : "neutral"}>{children}</Chip>
    </button>
  );
}

function pinnedFirst(notes: NoteRecord[]): NoteRecord[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

/* --------------------------------------------------------------------- notes */

/**
 * Private notes live against the signed-in identity only. Nothing here is ever copied into a
 * ticket note, a requester reply or any requester-visible record.
 */
export function NotesTab() {
  const state = useCommandState();
  const user = activeUser(state);
  const ordered = useMemo(() => pinnedFirst(state.notes), [state.notes]);
  const missionMap = useMemo(
    () => new Map(state.missions.map((mission) => [mission.id, mission])),
    [state.missions],
  );
  const [selectedId, setSelectedId] = useState<string | null>(() => ordered[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const note of state.notes) for (const item of note.tags) set.add(item);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [state.notes]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ordered.filter((note) => {
      if (tag && !note.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) return false;
      if (!needle) return true;
      return `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase().includes(needle);
    });
  }, [ordered, query, tag]);

  const selected = ordered.find((note) => note.id === selectedId) ?? null;

  const ownedMissions = useMemo(
    () =>
      state.missions.filter(
        (mission) => mission.offeredTo === user.id || mission.acceptedBy === user.id,
      ),
    [state.missions, user.id],
  );

  useEffect(() => {
    if (selectedId && !state.notes.some((note) => note.id === selectedId))
      setSelectedId(ordered[0]?.id ?? null);
  }, [state.notes, ordered, selectedId]);

  useEffect(() => {
    if (!pendingTitle) return;
    const created = pinnedFirst(state.notes.filter((note) => note.title === pendingTitle))[0];
    if (created) {
      setSelectedId(created.id);
      setPendingTitle(null);
    }
  }, [pendingTitle, state.notes]);

  return (
    <div style={ROOT}>
      <Note>
        <ShieldCheck style={{ width: 11, height: 11, marginRight: 5, verticalAlign: "-1px" }} />
        Private notes are stored against {user.name}&apos;s identity. They are never copied into
        ticket notes, replies or any requester-visible record.
      </Note>

      <div
        className="mx-split-row"
        style={{ ...SPLIT_FILL, gridTemplateColumns: "minmax(210px, 0.74fr) minmax(0, 1.26fr)" }}
      >
        <Panel
          title="Private notes"
          icon={NotebookPen}
          note={`${filtered.length} of ${state.notes.length}`}
          actions={
            <button
              type="button"
              className="mx-btn mx-btn--sm mx-btn--primary"
              onClick={() => setSelectedId(null)}
            >
              <Plus /> New note
            </button>
          }
        >
          <div className="mx-search">
            <Search style={SEARCH_ICON} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, body or tag…"
              aria-label="Search private notes"
            />
          </div>

          {tags.length > 0 ? (
            <div className="mx-inline" style={{ rowGap: 4 }}>
              <FilterChip active={tag === null} onClick={() => setTag(null)}>
                All tags
              </FilterChip>
              {tags.map((item) => (
                <FilterChip
                  key={item}
                  active={tag === item}
                  onClick={() => setTag(tag === item ? null : item)}
                >
                  #{item}
                </FilterChip>
              ))}
            </div>
          ) : null}

          <div
            className="mx-scroll"
            style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minHeight: 0 }}
          >
            {state.notes.length === 0 ? (
              <Empty
                title="No private notes yet"
                description="Capture a hypothesis, a vendor detail or a handover. Only you can read it."
                icon={NotebookPen}
              />
            ) : filtered.length === 0 ? (
              <Empty
                title="No note matches"
                description={
                  query.trim()
                    ? `Nothing matches “${query.trim()}”${tag ? ` in #${tag}` : ""}.`
                    : `No note is tagged #${tag ?? ""}.`
                }
                icon={Search}
              />
            ) : (
              filtered.map((note) => {
                const mission = note.missionId ? missionMap.get(note.missionId) : undefined;
                const isSelected = note.id === selectedId;
                return (
                  <button
                    key={note.id}
                    type="button"
                    className={`mx-row${isSelected ? " is-selected" : ""}`}
                    style={{
                      gridTemplateColumns: "minmax(0, 1fr)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedId(note.id)}
                    aria-pressed={isSelected}
                  >
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span className="mx-row-title">
                        {note.pinned ? (
                          <Pin style={{ width: 10, height: 10, color: "#9d6f14", flex: "none" }} />
                        ) : null}
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {note.title}
                        </span>
                      </span>
                      <span className="mx-row-meta">
                        <span title={formatDate(note.updatedAt)}>
                          Updated {relativeTime(note.updatedAt)}
                        </span>
                        {note.pinned ? <span>· Pinned</span> : null}
                      </span>
                      <span className="mx-row-desc mx-clamp-2">
                        {note.body.trim() || "No body yet."}
                      </span>
                      <span className="mx-row-meta" style={{ marginTop: 4 }}>
                        {mission ? (
                          <Chip tone="info" title={dueLabel(mission.slaDueAt)}>
                            {mission.number}
                          </Chip>
                        ) : (
                          <Chip tone="neutral">No mission link</Chip>
                        )}
                        {note.tags.slice(0, 3).map((item) => (
                          <span key={item} className="mx-tiny" style={{ color: "#5f7386" }}>
                            #{item}
                          </span>
                        ))}
                        {note.tags.length > 3 ? (
                          <span className="mx-tiny mx-muted">+{note.tags.length - 3}</span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        <NoteEditor
          key={selected?.id ?? "new"}
          note={selected}
          missions={ownedMissions}
          onCreated={(title) => setPendingTitle(title)}
          onDeleted={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}

function NoteEditor({
  note,
  missions,
  onCreated,
  onDeleted,
}: {
  note: NoteRecord | null;
  missions: Mission[];
  onCreated: (title: string) => void;
  onDeleted: () => void;
}) {
  const act = useAction();
  const noteId = note?.id ?? null;
  const base = `notes.draft.${noteId ?? "new"}`;
  const [title, setTitle] = useDraft(`${base}.title`, note?.title ?? "");
  const [body, setBody] = useDraft(base, note?.body ?? "");
  const [tagText, setTagText] = useDraft(`${base}.tags`, note ? note.tags.join(", ") : "");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [missionId, setMissionId] = useState(note?.missionId ?? "");
  const [confirming, setConfirming] = useState(false);

  const linkedMission = missions.find((mission) => mission.id === missionId);
  const titleTooShort = title.trim().length < 2;

  function save() {
    if (titleTooShort) return;
    const isNew = noteId === null;
    const result = act(
      {
        type: "note.save",
        noteId,
        title: title.trim(),
        body,
        tags: parseTags(tagText),
        pinned,
        missionId: missionId === "" ? null : missionId,
      },
      { success: isNew ? "Private note created — visible only to you." : "Private note saved." },
    );
    if (!result.ok) return;
    if (isNew) {
      setTitle("");
      setBody("");
      setTagText("");
      setPinned(false);
      setMissionId("");
      onCreated(title.trim());
    }
  }

  function remove() {
    if (!noteId) return;
    const result = act({ type: "note.delete", noteId }, { success: "Private note deleted." });
    if (!result.ok) return;
    setTitle("");
    setBody("");
    setTagText("");
    setConfirming(false);
    onDeleted();
  }

  return (
    <Panel
      title={note ? "Edit private note" : "New private note"}
      icon={NotebookPen}
      note={
        note
          ? `Updated ${relativeTime(note.updatedAt)} · created ${formatDate(note.createdAt)}`
          : "Not saved yet"
      }
      actions={
        <button
          type="button"
          className="mx-btn mx-btn--sm mx-btn--primary"
          onClick={save}
          disabled={titleTooShort}
        >
          <Save /> Save note
        </button>
      }
    >
      <div
        className="mx-scroll"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          flex: 1,
          minHeight: 0,
          paddingRight: 2,
        }}
      >
        <Field
          label="Title"
          hint={
            titleTooShort
              ? "A title of at least two characters is required before this can be saved."
              : "Shown only in your own notes list."
          }
        >
          <input
            className="mx-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What this note is about"
            aria-label="Note title"
          />
        </Field>

        <Field label="Note">
          <textarea
            className="mx-textarea"
            style={{ minHeight: 132 }}
            rows={7}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Capture what you observed, what you tried and what you would not repeat."
            aria-label="Note body"
          />
        </Field>

        <div className="mx-form-grid">
          <Field label="Tags" hint="Comma separated">
            <input
              className="mx-input"
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              placeholder="vpn, floor42, hypothesis"
              aria-label="Note tags"
            />
          </Field>

          <Field
            label="Linked mission"
            hint={
              linkedMission
                ? `${linkedMission.number} · ${dueLabel(linkedMission.slaDueAt)}`
                : "Optional. The mission never sees this note."
            }
          >
            <select
              className="mx-select"
              value={missionId}
              onChange={(event) => setMissionId(event.target.value)}
              aria-label="Linked mission"
            >
              <option value="">No mission link</option>
              {missionId && !missions.some((mission) => mission.id === missionId) ? (
                <option value={missionId}>{missionId} · outside your queue</option>
              ) : null}
              {missions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.number} · {mission.title.slice(0, 40)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="mx-inline" style={{ gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={pinned}
            onChange={(event) => setPinned(event.target.checked)}
            style={{ width: 12, height: 12, accentColor: "#2a6eb0", margin: 0 }}
            aria-label="Pin this note to the top of the list"
          />
          <span className="mx-label" style={{ margin: 0 }}>
            Pin to top of list
          </span>
        </label>

        <div className="mx-tiny mx-muted">
          Unsaved text is kept as a draft, so switching Help Buddy tabs never discards it. Tags:{" "}
          {parseTags(tagText).length > 0
            ? parseTags(tagText)
                .map((item) => `#${item}`)
                .join(" ")
            : "none yet"}
        </div>
      </div>

      <div
        className="mx-btn-row"
        style={{
          justifyContent: "space-between",
          borderTop: "1px solid rgba(92, 138, 190, 0.22)",
          paddingTop: 6,
        }}
      >
        <div className="mx-inline">
          {note ? (
            confirming ? (
              <>
                <button type="button" className="mx-btn mx-btn--sm mx-btn--danger" onClick={remove}>
                  <Trash2 /> Confirm delete
                </button>
                <button
                  type="button"
                  className="mx-btn mx-btn--sm"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="mx-btn mx-btn--sm"
                onClick={() => setConfirming(true)}
              >
                <Trash2 /> Delete
              </button>
            )
          ) : (
            <span className="mx-tiny mx-muted">Nothing to delete until this note is saved.</span>
          )}
        </div>
        <span className="mx-tiny mx-muted">
          {noteId ? "Private to you" : "New note · not on the ticket"}
        </span>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------------- knowledge */

export function KnowledgeTab() {
  const state = useCommandState();
  const act = useAction();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const missionMap = useMemo(
    () => new Map(state.missions.map((mission) => [mission.id, mission])),
    [state.missions],
  );
  const libraryMap = useMemo(
    () => new Map(state.library.map((document) => [document.id, document])),
    [state.library],
  );

  const categories = useMemo(
    () =>
      [...new Set(state.knowledge.map((article) => article.category))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [state.knowledge],
  );
  const savedCount = state.knowledge.filter((article) => article.savedAt !== null).length;

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.knowledge
      .filter((article) => {
        if (category && article.category !== category) return false;
        if (savedOnly && article.savedAt === null) return false;
        if (!needle) return true;
        return [article.title, article.summary, article.tags.join(" "), article.body.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [state.knowledge, query, category, savedOnly]);

  const selected: KnowledgeArticle | undefined =
    results.find((article) => article.id === selectedId) ?? results[0];
  const linkedDocument = selected?.documentId ? libraryMap.get(selected.documentId) : undefined;

  function toggleSaved(article: KnowledgeArticle) {
    act(
      { type: "knowledge.save", articleId: article.id },
      { success: article.savedAt ? "Removed from saved articles." : "Saved for later." },
    );
  }

  return (
    <div style={ROOT}>
      <div className="mx-inline" style={{ justifyContent: "space-between" }}>
        <div className="mx-search" style={{ flex: 1, minWidth: 160 }}>
          <Search style={SEARCH_ICON} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, summaries, tags and article text…"
            aria-label="Search the knowledge base"
          />
        </div>
        <button
          type="button"
          className={`mx-btn mx-btn--sm${savedOnly ? " mx-btn--primary" : ""}`}
          onClick={() => setSavedOnly(!savedOnly)}
          aria-pressed={savedOnly}
        >
          <Bookmark /> Saved only{savedOnly ? "" : ` · ${savedCount}`}
        </button>
      </div>

      <div className="mx-inline" style={{ rowGap: 4 }}>
        <FilterChip active={category === null} onClick={() => setCategory(null)}>
          All categories
        </FilterChip>
        {categories.map((item) => (
          <FilterChip
            key={item}
            active={category === item}
            onClick={() => setCategory(category === item ? null : item)}
          >
            {item}
          </FilterChip>
        ))}
      </div>

      <div
        className="mx-split-row"
        style={{ ...SPLIT_FILL, gridTemplateColumns: "minmax(220px, 0.86fr) minmax(0, 1.14fr)" }}
      >
        <Panel
          title="Knowledge base"
          icon={BookOpen}
          note={`${results.length} of ${state.knowledge.length} articles`}
        >
          <div
            className="mx-scroll"
            style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minHeight: 0 }}
          >
            {results.length === 0 ? (
              <Empty
                title={
                  query.trim()
                    ? `No article matches “${query.trim()}”`
                    : "No article matches these filters"
                }
                description={
                  query.trim()
                    ? "Try a broader term, clear the category filter, or turn off Saved only. Only articles you are authorised to read are searched."
                    : "Clear the category or Saved only filter to see the rest of the knowledge base."
                }
                icon={Search}
              />
            ) : (
              results.map((article) => {
                const isSelected = article.id === selected?.id;
                return (
                  <button
                    key={article.id}
                    type="button"
                    className={`mx-row${isSelected ? " is-selected" : ""}`}
                    style={{
                      gridTemplateColumns: "minmax(0, 1fr)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedId(article.id)}
                    aria-pressed={isSelected}
                  >
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span className="mx-row-title">
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {article.title}
                        </span>
                        {article.savedAt ? (
                          <BookmarkCheck
                            style={{ width: 11, height: 11, color: "#1b8355", flex: "none" }}
                            aria-label="Saved for later"
                          />
                        ) : null}
                      </span>
                      <span className="mx-row-meta">
                        <span className="mx-tiny" style={{ color: "#2a6eb0", fontWeight: 700 }}>
                          {article.category}
                        </span>
                        <span>· {article.readMinutes} min read</span>
                        <span>· Updated {formatDate(article.updatedAt)}</span>
                      </span>
                      <span className="mx-row-desc mx-clamp-2">{article.summary}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        <Panel
          title={selected ? "Article" : "Knowledge base"}
          icon={BookOpen}
          note={
            selected
              ? `${selected.readMinutes} min read · ${selected.author}`
              : "Authorised articles only"
          }
          actions={
            selected ? (
              <button
                type="button"
                className={`mx-btn mx-btn--sm${selected.savedAt ? "" : " mx-btn--primary"}`}
                onClick={() => toggleSaved(selected)}
              >
                {selected.savedAt ? <BookmarkCheck /> : <Bookmark />}
                {selected.savedAt ? "Saved — remove" : "Save for later"}
              </button>
            ) : null
          }
          scroll
        >
          {!selected ? (
            <Empty
              title="No article to show"
              description="Adjust the search or filters, then select an article to read its procedure, tags and related missions."
              icon={BookOpen}
            />
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <strong style={{ color: "#1b4f80", fontSize: 13, lineHeight: 1.3 }}>
                  {selected.title}
                </strong>
                <div className="mx-inline">
                  <Chip tone="info">{selected.category}</Chip>
                  <Chip tone="neutral" icon={Clock}>
                    {selected.readMinutes} min read
                  </Chip>
                  <Chip tone="neutral">Updated {formatDate(selected.updatedAt)}</Chip>
                  {selected.savedAt ? (
                    <Chip tone="success" icon={BookmarkCheck}>
                      Saved {relativeTime(selected.savedAt)}
                    </Chip>
                  ) : null}
                </div>
              </div>

              <p style={{ margin: 0, color: "#24455f", fontSize: 10, lineHeight: 1.5 }}>
                {selected.summary}
              </p>
              <div className="mx-divider" />

              {selected.body.map((paragraph, index) => (
                <p
                  key={`${selected.id}-body-${index}`}
                  style={{ margin: 0, color: "#24455f", fontSize: 10, lineHeight: 1.55 }}
                >
                  {paragraph}
                </p>
              ))}

              {selected.tags.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span className="mx-label">Tags</span>
                  <div className="mx-inline">
                    {selected.tags.map((item) => (
                      <Chip key={item} tone="neutral" icon={Tags}>
                        {item}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.relatedMissionIds.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span className="mx-label">Related missions</span>
                  <div className="mx-inline">
                    {selected.relatedMissionIds.map((missionId) => {
                      const mission = missionMap.get(missionId);
                      return (
                        <Link
                          key={missionId}
                          to="/mission-control"
                          className="mx-chip mx-chip--info"
                          style={{ color: "#2a6eb0" }}
                          title={
                            mission
                              ? `${mission.title} · ${dueLabel(mission.slaDueAt)}`
                              : "Open Mission Control"
                          }
                        >
                          {mission ? mission.number : missionId}
                          <ArrowUpRight style={{ width: 9, height: 9 }} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {selected.documentId ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span className="mx-label">Linked document</span>
                  <div className="mx-row" style={{ alignItems: "center" }}>
                    <span className="mx-inline" style={{ minWidth: 0 }}>
                      <FileText style={{ width: 13, height: 13, color: "#2a6eb0", flex: "none" }} />
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span className="mx-file-name">
                          {linkedDocument?.name ?? selected.documentId}
                        </span>
                        <span className="mx-file-meta">
                          {linkedDocument
                            ? `${linkedDocument.extension.toUpperCase()} · ${formatBytes(linkedDocument.bytes)} · ${linkedDocument.owner}`
                            : "Not in the workspace library"}
                        </span>
                      </span>
                    </span>
                    <Link
                      className="mx-btn mx-btn--sm"
                      to="/connectors"
                      search={{ doc: selected.documentId }}
                      title="Open this file in the connector workspace"
                    >
                      Open <ArrowUpRight />
                    </Link>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- attachments */

type ModeFilter = "all" | DocumentActionMode;

const MODE_FILTERS: { id: ModeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "linked", label: "Linked" },
  { id: "imported", label: "Imported" },
  { id: "attached", label: "Attached" },
];

/**
 * Every document action taken through Help Buddy, in one place: what was linked, imported or
 * attached, where it went, which connector it came from and who did it.
 */
export function AttachmentsTab() {
  const state = useCommandState();
  const [mode, setMode] = useState<ModeFilter>("all");
  const [query, setQuery] = useState("");

  const connectorMap = useMemo(
    () => new Map(state.connectors.map((connector) => [connector.id, connector])),
    [state.connectors],
  );
  const userMap = useMemo(() => new Map(state.users.map((user) => [user.id, user])), [state.users]);
  const libraryMap = useMemo(
    () => new Map(state.library.map((document) => [document.id, document])),
    [state.library],
  );

  const actions = useMemo(
    () =>
      [...state.documentActions].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      ),
    [state.documentActions],
  );

  const counts = useMemo(() => {
    const next: Record<DocumentActionMode, number> = { linked: 0, imported: 0, attached: 0 };
    for (const action of actions) next[action.mode] += 1;
    return next;
  }, [actions]);

  const represented = useMemo(() => {
    const seen = new Set<string>();
    let bytes = 0;
    let unknown = 0;
    for (const action of actions) {
      if (seen.has(action.documentId)) continue;
      seen.add(action.documentId);
      const document = libraryMap.get(action.documentId);
      if (!document) {
        unknown += 1;
        continue;
      }
      bytes += document.bytes;
    }
    return { bytes, documents: seen.size, unknown };
  }, [actions, libraryMap]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return actions.filter((action) => {
      if (mode !== "all" && action.mode !== mode) return false;
      if (!needle) return true;
      return `${action.documentName} ${action.target.label}`.toLowerCase().includes(needle);
    });
  }, [actions, mode, query]);

  return (
    <div style={ROOT}>
      <div className="mx-kpis">
        <Kpi value={counts.linked} label="Linked originals" />
        <Kpi value={counts.imported} label="Imported copies" />
        <Kpi value={counts.attached} label="Attached" />
        <Kpi
          value={formatBytes(represented.bytes)}
          label={`Bytes · ${represented.documents} document${represented.documents === 1 ? "" : "s"}`}
        />
      </div>

      <Note>
        A <strong>linked original</strong> keeps the source permissions and can change at the source
        — open it to see the current version. An <strong>imported copy</strong> is managed by
        IntelliStack and does not stay synchronised with the original.
        {represented.unknown > 0
          ? ` ${represented.unknown} represented document${represented.unknown === 1 ? " is" : "s are"} no longer in the workspace library, so the byte total excludes ${represented.unknown === 1 ? "it" : "them"}.`
          : ""}
      </Note>

      <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1fr)", flex: 1, minHeight: 0 }}>
        <Panel
          title="Document actions"
          icon={Paperclip}
          note={`${filtered.length} of ${actions.length}`}
        >
          <div className="mx-inline" style={{ justifyContent: "space-between", rowGap: 5 }}>
            <div className="mx-inline">
              {MODE_FILTERS.map((item) => {
                const count = item.id === "all" ? actions.length : counts[item.id];
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`mx-btn mx-btn--sm${active ? " mx-btn--primary" : ""}`}
                    onClick={() => setMode(item.id)}
                    aria-pressed={active}
                  >
                    {item.label} <span style={{ opacity: 0.72 }}>{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="mx-search" style={{ flex: 1, minWidth: 150, maxWidth: 300 }}>
              <Search style={SEARCH_ICON} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search document or target…"
                aria-label="Search document actions"
              />
            </div>
          </div>

          <div
            className="mx-scroll"
            style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minHeight: 0 }}
          >
            {actions.length === 0 ? (
              <Empty
                title="No document actions yet"
                description="Link, import or attach a document from a connector and the action appears here with its target, origin, actor and timestamp."
                icon={Paperclip}
              />
            ) : filtered.length === 0 ? (
              <Empty
                title="No action matches"
                description={
                  query.trim()
                    ? `Nothing matches “${query.trim()}”${mode === "all" ? "" : ` in ${mode} actions`}.`
                    : `No ${mode} document actions recorded.`
                }
                icon={Search}
              />
            ) : (
              filtered.map((action) => {
                const document = libraryMap.get(action.documentId);
                const connector = connectorMap.get(action.connectorId);
                const actor = userMap.get(action.actorId);
                return (
                  <div
                    key={action.id}
                    className="mx-row"
                    style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <div className="mx-row-title">
                        <FileText
                          style={{ width: 11, height: 11, color: "#2a6eb0", flex: "none" }}
                        />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {action.documentName}
                        </span>
                        <Chip tone={MODE_TONE[action.mode]}>{MODE_LABEL[action.mode]}</Chip>
                      </div>
                      <div className="mx-row-meta">
                        <span
                          className="mx-tiny"
                          style={{ color: "#5f7386", fontWeight: 700, textTransform: "capitalize" }}
                        >
                          {action.target.type}
                        </span>
                        {action.target.type === "mission" ? (
                          <Link
                            to="/mission-control"
                            style={{ color: "#2a6eb0", fontWeight: 700 }}
                            title="Open in Mission Control"
                          >
                            {action.target.label}
                          </Link>
                        ) : (
                          <span>{action.target.label}</span>
                        )}
                      </div>
                      <div className="mx-row-meta">
                        <span>{connector ? connector.name : action.connectorId}</span>
                        <span>· {actor ? actor.name : action.actorId}</span>
                        <span title={formatDate(action.at)}>· {relativeTime(action.at)}</span>
                        {document ? (
                          <span>· {formatBytes(document.bytes)}</span>
                        ) : (
                          <span>· size unavailable</span>
                        )}
                      </div>
                      {action.note.trim() ? <div className="mx-row-desc">{action.note}</div> : null}
                    </div>
                    <div className="mx-row-actions">
                      <Link
                        className="mx-btn mx-btn--sm"
                        to="/connectors"
                        search={{ doc: action.documentId }}
                        title="Open this file in the connector workspace"
                      >
                        Open document <ArrowUpRight />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
