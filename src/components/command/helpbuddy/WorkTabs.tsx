import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookMarked,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Contact as ContactIcon,
  ExternalLink,
  ListChecks,
  Mail,
  Phone,
  Plus,
  Repeat2,
  Search,
} from "lucide-react";
import type {
  Checklist,
  ChecklistCategory,
  CommandState,
  Contact,
  MissionPriority,
  Task,
  TaskStatus,
} from "@/lib/domain/types";
import { useAction, useCommandState, useDraft } from "@/lib/domain/store";
import { missionById } from "@/lib/domain/selectors";
import {
  PRIORITY_TONE,
  dueLabel,
  formatDate,
  formatTime,
  isOverdue,
  relativeTime,
} from "@/lib/domain/format";
import { Chip, Empty, Field, Note, Progress, type Tone } from "@/components/command/ui";

/* ------------------------------------------------------------------ shared */

const TAB_ROOT: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flex: 1,
  minHeight: 0,
};

const LIST_BUTTON: CSSProperties = {
  gridTemplateColumns: "minmax(0, 1fr)",
  textAlign: "left",
  cursor: "pointer",
};

const PLAIN_BUTTON: CSSProperties = {
  display: "grid",
  gap: 3,
  minWidth: 0,
  padding: 0,
  border: "none",
  background: "none",
  textAlign: "left",
  cursor: "pointer",
  color: "inherit",
};

const SCROLL_STACK: CSSProperties = {
  display: "grid",
  gap: 6,
  alignContent: "start",
  minHeight: 0,
  flex: 1,
};

const CHIP_BUTTON: CSSProperties = {
  padding: 0,
  border: "none",
  background: "none",
  cursor: "pointer",
};

const CHECK_ROW: CSSProperties = {
  gridTemplateColumns: "auto minmax(0, 1fr)",
  alignItems: "start",
  cursor: "pointer",
};

const STEP_ROW: CSSProperties = { gridTemplateColumns: "auto minmax(0, 1fr)", alignItems: "start" };

const STEP_NUMBER: CSSProperties = { minWidth: 18, justifyContent: "center" };

const DONE_ITEM: CSSProperties = { textDecoration: "line-through", color: "var(--mx-muted)" };

const SEARCH_BOX: CSSProperties = { flex: "1 1 190px", maxWidth: 320 };

/** A filter chip that behaves like a button but keeps the chip tone colours. */
function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={CHIP_BUTTON}>
      <Chip tone={active ? "info" : "neutral"}>
        {children}
        {typeof count === "number" ? ` · ${count}` : ""}
      </Chip>
    </button>
  );
}

/** Date inputs are day-precise; the deadline is the end of that chosen day. */
function isoFromDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T23:59:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function missionLabel(state: CommandState, missionId: string | null): string | null {
  if (!missionId) return null;
  return missionById(state, missionId)?.number ?? missionId;
}

function Meter({ value }: { value: number }) {
  if (value >= 100) return <Progress value={100} tone="success" />;
  return <Progress value={value} />;
}

/* -------------------------------------------------------------- checklists */

const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  "personal",
  "troubleshooting",
  "project",
  "task",
  "recurring",
];

const CHECKLIST_CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  personal: "Personal",
  troubleshooting: "Troubleshooting",
  project: "Project",
  task: "Task",
  recurring: "Recurring",
};

const CHECKLIST_CATEGORY_TONE: Record<ChecklistCategory, Tone> = {
  personal: "info",
  troubleshooting: "warning",
  project: "accent",
  task: "success",
  recurring: "neutral",
};

const RECURRING_OPTIONS: Checklist["recurring"][] = ["none", "daily", "weekly", "monthly"];

function asCategory(value: string): ChecklistCategory {
  return CHECKLIST_CATEGORIES.find((category) => category === value) ?? "personal";
}

function asRecurring(value: string): Checklist["recurring"] {
  return RECURRING_OPTIONS.find((option) => option === value) ?? "none";
}

function checklistStats(checklist: Checklist): {
  done: number;
  total: number;
  open: number;
  percent: number;
} {
  const total = checklist.items.length;
  const done = checklist.items.filter((item) => item.done).length;
  return {
    done,
    total,
    open: total - done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function ChecklistsTab() {
  const state = useCommandState();
  const [category, setCategory] = useState<"all" | ChecklistCategory>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.checklists.filter((checklist) => {
      if (category !== "all" && checklist.category !== category) return false;
      if (!needle) return true;
      return (
        checklist.title.toLowerCase().includes(needle) ||
        checklist.items.some((item) => item.text.toLowerCase().includes(needle))
      );
    });
  }, [state.checklists, category, query]);

  const selected = rows.find((checklist) => checklist.id === selectedId) ?? rows[0] ?? null;
  const openItems = rows.reduce(
    (sum, checklist) => sum + checklist.items.filter((item) => !item.done).length,
    0,
  );
  const hasFilters = query.trim().length > 0 || category !== "all";

  return (
    <div style={TAB_ROOT}>
      <div className="mx-inline">
        <div className="mx-search" style={SEARCH_BOX}>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search checklists and items"
            aria-label="Search checklists"
          />
        </div>
        <FilterChip
          active={category === "all"}
          onClick={() => setCategory("all")}
          count={state.checklists.length}
        >
          All
        </FilterChip>
        {CHECKLIST_CATEGORIES.map((id) => (
          <FilterChip
            key={id}
            active={category === id}
            onClick={() => setCategory(id)}
            count={state.checklists.filter((checklist) => checklist.category === id).length}
          >
            {CHECKLIST_CATEGORY_LABEL[id]}
          </FilterChip>
        ))}
        <button
          type="button"
          className="mx-btn mx-btn--sm mx-btn--primary"
          onClick={() => setCreating((value) => !value)}
        >
          <Plus /> {creating ? "Close form" : "New checklist"}
        </button>
      </div>

      <div
        className="mx-split-row"
        style={{
          gridTemplateColumns: "minmax(0, 0.92fr) minmax(0, 1.25fr)",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div className="mx-panel" style={{ minHeight: 0 }}>
          <div className="mx-panel-head">
            <div>
              <span className="mx-panel-title">
                <ListChecks /> Checklists
              </span>
              <span className="mx-panel-note">
                {rows.length} shown · {openItems} open items
              </span>
            </div>
          </div>
          {rows.length === 0 ? (
            <Empty
              title={hasFilters ? "No checklists match" : "No checklists yet"}
              description={
                hasFilters
                  ? "Clear the search or pick another category to see the rest of your checklists."
                  : "Create a checklist to track a procedure, a project or a recurring shift routine."
              }
              icon={ListChecks}
            />
          ) : (
            <div className="mx-scroll" style={SCROLL_STACK}>
              {rows.map((checklist) => {
                const stats = checklistStats(checklist);
                const overdue = isOverdue(checklist.dueAt);
                const mission = missionLabel(state, checklist.missionId);
                return (
                  <button
                    key={checklist.id}
                    type="button"
                    className={`mx-row${selected?.id === checklist.id ? " is-selected" : ""}${overdue ? " is-overdue" : ""}`}
                    style={LIST_BUTTON}
                    onClick={() => {
                      setSelectedId(checklist.id);
                      setCreating(false);
                    }}
                  >
                    <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
                      <span className="mx-row-title">{checklist.title}</span>
                      <span className="mx-row-meta">
                        <Chip tone={CHECKLIST_CATEGORY_TONE[checklist.category]}>
                          {CHECKLIST_CATEGORY_LABEL[checklist.category]}
                        </Chip>
                        <span>
                          {stats.done} of {stats.total} done
                        </span>
                        {overdue ? (
                          <Chip tone="danger" icon={AlertTriangle}>
                            {dueLabel(checklist.dueAt)}
                          </Chip>
                        ) : (
                          <span>{dueLabel(checklist.dueAt)}</span>
                        )}
                        {mission ? <span className="mx-tag">{mission}</span> : null}
                      </span>
                      <Meter value={stats.percent} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mx-panel" style={{ minHeight: 0 }}>
          {creating ? (
            <ChecklistCreator onClose={() => setCreating(false)} />
          ) : selected ? (
            <ChecklistDetail key={selected.id} checklist={selected} />
          ) : (
            <Empty
              title="Select a checklist"
              description="Choose a checklist on the left to work through its items with recorded completion times."
              icon={ListChecks}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistDetail({ checklist }: { checklist: Checklist }) {
  const state = useCommandState();
  const act = useAction();
  const [draft, setDraft] = useDraft(`checklists.newitem.${checklist.id}`);
  const stats = checklistStats(checklist);
  const overdue = isOverdue(checklist.dueAt);
  const mission = missionLabel(state, checklist.missionId);

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    const result = act(
      { type: "checklist.item.add", checklistId: checklist.id, text },
      { success: "Checklist item added." },
    );
    if (result.ok) setDraft("");
  }

  return (
    <>
      <div className="mx-panel-head">
        <div>
          <span className="mx-panel-title">
            <ListChecks /> {checklist.title}
          </span>
          <span className="mx-panel-note">
            {stats.done}/{stats.total} done · {stats.percent}%
          </span>
        </div>
      </div>

      <div className="mx-scroll" style={SCROLL_STACK}>
        <div className="mx-inline">
          <Chip tone={CHECKLIST_CATEGORY_TONE[checklist.category]}>
            {CHECKLIST_CATEGORY_LABEL[checklist.category]}
          </Chip>
          {overdue ? (
            <Chip tone="danger" icon={AlertTriangle}>
              {dueLabel(checklist.dueAt)}
            </Chip>
          ) : (
            <Chip tone="neutral">{dueLabel(checklist.dueAt)}</Chip>
          )}
          {checklist.recurring === "none" ? null : (
            <Chip tone="accent" icon={Repeat2}>
              Repeats {checklist.recurring}
            </Chip>
          )}
          {mission ? (
            <Chip tone="info" icon={ClipboardCheck}>
              Mission {mission}
            </Chip>
          ) : null}
        </div>

        <Meter value={stats.percent} />

        <dl className="mx-kv">
          <dt>Due</dt>
          <dd>
            {checklist.dueAt
              ? `${formatDate(checklist.dueAt)} · ${dueLabel(checklist.dueAt)}`
              : "No deadline"}
          </dd>
          <dt>Items</dt>
          <dd>
            {stats.done} of {stats.total} complete · {stats.open} open
          </dd>
          <dt>Created</dt>
          <dd>{formatDate(checklist.createdAt)}</dd>
          <dt>Updated</dt>
          <dd>{relativeTime(checklist.updatedAt)}</dd>
        </dl>

        {mission ? (
          <div className="mx-btn-row">
            <Link to="/mission-control" className="mx-btn mx-btn--sm">
              <ExternalLink /> Open {mission} in Mission Control
            </Link>
          </div>
        ) : null}

        <div className="mx-divider" />

        {checklist.items.length === 0 ? (
          <Empty
            title="No items yet"
            description="Add the first item below. Completion timestamps are recorded when you tick it off."
            icon={ListChecks}
          />
        ) : (
          checklist.items.map((item) => (
            <label key={item.id} className="mx-row" style={CHECK_ROW}>
              <input
                type="checkbox"
                checked={item.done}
                aria-label={item.text}
                onChange={() =>
                  act(
                    { type: "checklist.toggle", checklistId: checklist.id, itemId: item.id },
                    {
                      success: item.done ? "Checklist item reopened." : "Checklist item completed.",
                    },
                  )
                }
              />
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span className="mx-row-title" style={item.done ? DONE_ITEM : undefined}>
                  {item.text}
                </span>
                {item.done && item.completedAt ? (
                  <span className="mx-tiny mx-muted">
                    Completed {formatDate(item.completedAt)} at {formatTime(item.completedAt)}
                  </span>
                ) : null}
                {item.linkedMissionId ? (
                  <span className="mx-tiny mx-muted">Linked mission {item.linkedMissionId}</span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>

      <div className="mx-divider" />
      <div className="mx-inline">
        <input
          className="mx-input"
          style={{ flex: "1 1 150px" }}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="Add an item…"
          aria-label="New checklist item"
        />
        <button type="button" className="mx-btn mx-btn--sm mx-btn--primary" onClick={addItem}>
          <Plus /> Add item
        </button>
      </div>
    </>
  );
}

function ChecklistCreator({ onClose }: { onClose: () => void }) {
  const act = useAction();
  const [title, setTitle] = useDraft("checklists.create.title");
  const [due, setDue] = useDraft("checklists.create.due");
  const [items, setItems] = useDraft("checklists.create.items");
  const [category, setCategory] = useState<ChecklistCategory>("personal");
  const [recurring, setRecurring] = useState<Checklist["recurring"]>("none");

  function submit() {
    const result = act(
      {
        type: "checklist.create",
        title,
        category,
        dueAt: isoFromDateInput(due),
        recurring,
        items: items
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
      },
      { success: "Checklist created." },
    );
    if (result.ok) {
      setTitle("");
      setDue("");
      setItems("");
      onClose();
    }
  }

  return (
    <>
      <div className="mx-panel-head">
        <div>
          <span className="mx-panel-title">
            <Plus /> New checklist
          </span>
          <span className="mx-panel-note">Your entries are kept as a draft</span>
        </div>
        <div className="mx-btn-row">
          <button type="button" className="mx-btn mx-btn--sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
      <div
        className="mx-scroll"
        style={{ display: "grid", gap: 7, alignContent: "start", minHeight: 0, flex: 1 }}
      >
        <Field label="Title">
          <input
            className="mx-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What is this checklist for?"
          />
        </Field>
        <div className="mx-form-grid">
          <Field label="Category">
            <select
              className="mx-select"
              value={category}
              onChange={(event) => setCategory(asCategory(event.target.value))}
            >
              {CHECKLIST_CATEGORIES.map((id) => (
                <option key={id} value={id}>
                  {CHECKLIST_CATEGORY_LABEL[id]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input
              className="mx-input"
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </Field>
          <Field label="Repeats">
            <select
              className="mx-select"
              value={recurring}
              onChange={(event) => setRecurring(asRecurring(event.target.value))}
            >
              {RECURRING_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "none"
                    ? "Does not repeat"
                    : option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Items" hint="One item per line. Empty lines are ignored.">
          <textarea
            className="mx-textarea"
            value={items}
            onChange={(event) => setItems(event.target.value)}
            placeholder={"Capture the current state\nCompare error counters\nRecord the evidence"}
          />
        </Field>
        <Note>
          Each item records a real completion timestamp when it is ticked off. Progress is only ever
          calculated from the items.
        </Note>
        <div className="mx-btn-row">
          <button type="button" className="mx-btn mx-btn--sm mx-btn--primary" onClick={submit}>
            <Check /> Create checklist
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------- tasks */

const TASK_STATUS_ORDER: TaskStatus[] = ["open", "in_progress", "blocked", "done"];

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  open: "info",
  in_progress: "accent",
  blocked: "danger",
  done: "success",
};

const PRIORITY_OPTIONS: (MissionPriority | "none")[] = ["P1", "P2", "P3", "P4", "none"];

function asPriority(value: string): MissionPriority | "none" {
  return PRIORITY_OPTIONS.find((option) => option === value) ?? "none";
}

type TaskFilter = "all" | "overdue" | "today" | "project";

function dueTime(task: Task): number {
  return task.dueAt ? new Date(task.dueAt).getTime() : Number.POSITIVE_INFINITY;
}

/** Most urgent deadline first; undated work keeps a stable place at the end. */
function sortTasks(a: Task, b: Task): number {
  const left = dueTime(a);
  const right = dueTime(b);
  if (left !== right) return left - right;
  return a.title.localeCompare(b.title);
}

function isDueToday(task: Task): boolean {
  if (!task.dueAt) return false;
  const due = new Date(task.dueAt);
  const today = new Date();
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

function taskSourceLabel(task: Task, missionNumber: string | null): string {
  if (task.source === "assigned") return `assigned by ${task.sourceLabel}`;
  if (task.source === "mission") return `mission ${missionNumber ?? task.sourceLabel}`;
  if (task.source === "connector") return `connector · ${task.sourceLabel}`;
  return task.sourceLabel;
}

export function TasksTab() {
  const state = useCommandState();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [project, setProject] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  const projects = useMemo(
    () =>
      Array.from(new Set(state.tasks.map((task) => task.project))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [state.tasks],
  );

  const filtered = useMemo(() => {
    return state.tasks.filter((task) => {
      if (filter === "overdue") return task.status !== "done" && isOverdue(task.dueAt);
      if (filter === "today") return task.status !== "done" && isDueToday(task);
      if (filter === "project") return project === "all" ? true : task.project === project;
      return true;
    });
  }, [state.tasks, filter, project]);

  const groups = useMemo(
    () =>
      TASK_STATUS_ORDER.map((status) => ({
        status,
        rows: filtered.filter((task) => task.status === status).sort(sortTasks),
      })).filter((group) => group.rows.length > 0),
    [filtered],
  );

  const selected = filtered.find((task) => task.id === selectedId) ?? groups[0]?.rows[0] ?? null;
  const selectedMission = selected ? missionLabel(state, selected.missionId) : null;
  const openCount = filtered.filter((task) => task.status !== "done").length;
  const overdueCount = state.tasks.filter(
    (task) => task.status !== "done" && isOverdue(task.dueAt),
  ).length;
  const todayCount = state.tasks.filter(
    (task) => task.status !== "done" && isDueToday(task),
  ).length;
  const viewOverdue = filtered.filter(
    (task) => task.status !== "done" && isOverdue(task.dueAt),
  ).length;

  return (
    <div style={TAB_ROOT}>
      <div className="mx-inline">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          count={state.tasks.length}
        >
          All
        </FilterChip>
        <FilterChip
          active={filter === "overdue"}
          onClick={() => setFilter("overdue")}
          count={overdueCount}
        >
          Overdue
        </FilterChip>
        <FilterChip
          active={filter === "today"}
          onClick={() => setFilter("today")}
          count={todayCount}
        >
          Due today
        </FilterChip>
        <select
          className="mx-select"
          style={{ width: "auto", maxWidth: 190 }}
          value={filter === "project" ? project : "all"}
          onChange={(event) => {
            const value = event.target.value;
            setProject(value);
            setFilter(value === "all" ? "all" : "project");
          }}
          aria-label="Filter tasks by project"
        >
          <option value="all">All projects</option>
          {projects.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="mx-btn mx-btn--sm mx-btn--primary"
          onClick={() => setCreating((value) => !value)}
        >
          <Plus /> {creating ? "Close form" : "New task"}
        </button>
      </div>

      <div
        className="mx-split-row"
        style={{ gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1.1fr)", flex: 1, minHeight: 0 }}
      >
        <div className="mx-panel" style={{ minHeight: 0 }}>
          <div className="mx-panel-head">
            <div>
              <span className="mx-panel-title">
                <ClipboardCheck /> Tasks
              </span>
              <span className="mx-panel-note">
                {filtered.length} in view · {openCount} open · {viewOverdue} overdue
              </span>
            </div>
          </div>
          {groups.length === 0 ? (
            <Empty
              title="No tasks in this view"
              description={
                filter === "all"
                  ? "Create a task to keep your own work next to the mission queue."
                  : "Change the filter to see the rest of your tasks."
              }
              icon={ClipboardCheck}
            />
          ) : (
            <div className="mx-scroll" style={SCROLL_STACK}>
              {groups.map((group) => {
                const collapsed = group.status === "done" && !doneOpen;
                return (
                  <div key={group.status} style={{ display: "grid", gap: 4 }}>
                    {group.status === "done" ? (
                      <button
                        type="button"
                        className="mx-btn mx-btn--sm mx-btn--ghost"
                        style={{ justifyContent: "flex-start" }}
                        onClick={() => setDoneOpen((value) => !value)}
                        aria-expanded={doneOpen}
                      >
                        {doneOpen ? <ChevronDown /> : <ChevronRight />} Done{" "}
                        <span className="mx-tag">{group.rows.length}</span>
                      </button>
                    ) : (
                      <div className="mx-inline">
                        <span className="mx-label">{TASK_STATUS_LABEL[group.status]}</span>
                        <span className="mx-tag">{group.rows.length}</span>
                      </div>
                    )}
                    {collapsed
                      ? null
                      : group.rows.map((task) => {
                          const overdue = task.status !== "done" && isOverdue(task.dueAt);
                          const mission = missionLabel(state, task.missionId);
                          return (
                            <button
                              key={task.id}
                              type="button"
                              className={`mx-row${selected?.id === task.id ? " is-selected" : ""}${overdue ? " is-overdue" : ""}`}
                              style={LIST_BUTTON}
                              onClick={() => {
                                setSelectedId(task.id);
                                setCreating(false);
                              }}
                            >
                              <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                                <span className="mx-row-title">{task.title}</span>
                                <span className="mx-row-meta">
                                  <span className="mx-tag">{task.project}</span>
                                  <span>{taskSourceLabel(task, mission)}</span>
                                  {task.priority === "none" ? null : (
                                    <Chip tone={PRIORITY_TONE[task.priority]}>{task.priority}</Chip>
                                  )}
                                  {overdue ? (
                                    <Chip tone="danger" icon={AlertTriangle}>
                                      {dueLabel(task.dueAt)}
                                    </Chip>
                                  ) : task.dueAt ? (
                                    <span>{dueLabel(task.dueAt)}</span>
                                  ) : null}
                                </span>
                                {task.progressNote ? (
                                  <span className="mx-row-desc mx-clamp-2">
                                    {task.progressNote}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          );
                        })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mx-panel" style={{ minHeight: 0 }}>
          {creating ? (
            <TaskCreator projects={projects} onClose={() => setCreating(false)} />
          ) : selected ? (
            <TaskDetail key={selected.id} task={selected} missionNumber={selectedMission} />
          ) : (
            <Empty
              title="Select a task"
              description="Choose a task to read its detail, record what changed and move its status."
              icon={ClipboardCheck}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TaskDetail({ task, missionNumber }: { task: Task; missionNumber: string | null }) {
  const act = useAction();
  const [note, setNote] = useState("");
  const overdue = task.status !== "done" && isOverdue(task.dueAt);

  function applyStatus(status: TaskStatus) {
    if (status === task.status) return;
    const result = act(
      { type: "task.status", taskId: task.id, status, progressNote: note },
      { success: `Task moved to ${TASK_STATUS_LABEL[status]}.` },
    );
    if (result.ok) setNote("");
  }

  return (
    <>
      <div className="mx-panel-head">
        <div>
          <span className="mx-panel-title">
            <ClipboardCheck /> Task detail
          </span>
          <span className="mx-panel-note">{task.project}</span>
        </div>
        <div className="mx-btn-row">
          <Chip tone={TASK_STATUS_TONE[task.status]}>{TASK_STATUS_LABEL[task.status]}</Chip>
        </div>
      </div>

      <div
        className="mx-scroll"
        style={{ display: "grid", gap: 7, alignContent: "start", minHeight: 0, flex: 1 }}
      >
        <span className="mx-row-title">{task.title}</span>

        <div className="mx-inline">
          {task.priority === "none" ? (
            <Chip tone="neutral">No priority</Chip>
          ) : (
            <Chip tone={PRIORITY_TONE[task.priority]}>{task.priority} priority</Chip>
          )}
          {overdue ? (
            <Chip tone="danger" icon={AlertTriangle}>
              {dueLabel(task.dueAt)}
            </Chip>
          ) : (
            <Chip tone="neutral">{dueLabel(task.dueAt)}</Chip>
          )}
          <Chip tone="neutral">{taskSourceLabel(task, missionNumber)}</Chip>
          {missionNumber ? (
            <Chip tone="info" icon={ClipboardCheck}>
              Mission {missionNumber}
            </Chip>
          ) : null}
        </div>

        <span className="mx-row-desc" style={{ marginTop: 0 }}>
          {task.detail || "No detail recorded for this task."}
        </span>

        <dl className="mx-kv">
          <dt>Project</dt>
          <dd>{task.project}</dd>
          <dt>Source</dt>
          <dd>{taskSourceLabel(task, missionNumber)}</dd>
          <dt>Due</dt>
          <dd>
            {task.dueAt ? `${formatDate(task.dueAt)} · ${dueLabel(task.dueAt)}` : "No deadline"}
          </dd>
          <dt>Created</dt>
          <dd>{relativeTime(task.createdAt)}</dd>
          <dt>Updated</dt>
          <dd>{relativeTime(task.updatedAt)}</dd>
        </dl>

        <div className="mx-divider" />
        <span className="mx-label">Progress note</span>
        <Note>
          {task.progressNote
            ? task.progressNote
            : "No progress recorded yet. The next status change records what changed."}
        </Note>

        <Field
          label="What changed?"
          hint="Saved with the status change. Leave it blank to keep the existing note."
        >
          <textarea
            className="mx-textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What changed since the last update?"
          />
        </Field>

        <div className="mx-btn-row">
          {TASK_STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              className={`mx-btn mx-btn--sm${status === task.status ? " mx-btn--primary" : ""}`}
              onClick={() => applyStatus(status)}
              disabled={status === task.status}
              aria-pressed={status === task.status}
            >
              {TASK_STATUS_LABEL[status]}
            </button>
          ))}
        </div>

        {task.missionId ? (
          <div className="mx-btn-row">
            <Link to="/mission-control" className="mx-btn mx-btn--sm">
              <ExternalLink /> Open in Mission Control
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}

function TaskCreator({ projects, onClose }: { projects: string[]; onClose: () => void }) {
  const act = useAction();
  const [title, setTitle] = useDraft("tasks.create.title");
  const [detail, setDetail] = useDraft("tasks.create.detail");
  const [project, setProject] = useDraft("tasks.create.project");
  const [due, setDue] = useDraft("tasks.create.due");
  const [priority, setPriority] = useState<MissionPriority | "none">("none");

  function submit() {
    const result = act(
      { type: "task.create", title, detail, priority, dueAt: isoFromDateInput(due), project },
      { success: "Task created." },
    );
    if (result.ok) {
      setTitle("");
      setDetail("");
      setProject("");
      setDue("");
      setPriority("none");
      onClose();
    }
  }

  return (
    <>
      <div className="mx-panel-head">
        <div>
          <span className="mx-panel-title">
            <Plus /> New task
          </span>
          <span className="mx-panel-note">Your entries are kept as a draft</span>
        </div>
        <div className="mx-btn-row">
          <button type="button" className="mx-btn mx-btn--sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
      <div
        className="mx-scroll"
        style={{ display: "grid", gap: 7, alignContent: "start", minHeight: 0, flex: 1 }}
      >
        <Field label="Title">
          <input
            className="mx-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to happen?"
          />
        </Field>
        <Field label="Detail">
          <textarea
            className="mx-textarea"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="Context another person would need."
          />
        </Field>
        <div className="mx-form-grid">
          <Field label="Priority">
            <select
              className="mx-select"
              value={priority}
              onChange={(event) => setPriority(asPriority(event.target.value))}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "none"
                    ? "No priority"
                    : `${option} · ${option === "P1" ? "critical" : option === "P2" ? "high" : option === "P3" ? "normal" : "low"}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input
              className="mx-input"
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </Field>
          <Field
            label="Project"
            {...(projects.length > 0
              ? { hint: `Existing: ${projects.slice(0, 2).join(", ")}` }
              : {})}
          >
            <input
              className="mx-input"
              value={project}
              onChange={(event) => setProject(event.target.value)}
              placeholder="Defaults to Personal"
              list="mx-task-projects"
            />
          </Field>
        </div>
        <datalist id="mx-task-projects">
          {projects.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="mx-btn-row">
          <button type="button" className="mx-btn mx-btn--sm mx-btn--primary" onClick={submit}>
            <Check /> Create task
          </button>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- playbooks */

export function PlaybooksTab() {
  const state = useCommandState();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      Array.from(new Set(state.playbooks.map((playbook) => playbook.category))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [state.playbooks],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.playbooks.filter((playbook) => {
      if (category !== "all" && playbook.category !== category) return false;
      if (!needle) return true;
      return (
        playbook.title.toLowerCase().includes(needle) ||
        playbook.summary.toLowerCase().includes(needle) ||
        playbook.steps.some((step) => step.title.toLowerCase().includes(needle))
      );
    });
  }, [state.playbooks, category, query]);

  const selected = rows.find((playbook) => playbook.id === selectedId) ?? rows[0] ?? null;
  const hasFilters = query.trim().length > 0 || category !== "all";

  return (
    <div style={TAB_ROOT}>
      <div className="mx-inline">
        <div className="mx-search" style={SEARCH_BOX}>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search playbooks and steps"
            aria-label="Search playbooks"
          />
        </div>
        <FilterChip
          active={category === "all"}
          onClick={() => setCategory("all")}
          count={state.playbooks.length}
        >
          All
        </FilterChip>
        {categories.map((name) => (
          <FilterChip
            key={name}
            active={category === name}
            onClick={() => setCategory(name)}
            count={state.playbooks.filter((playbook) => playbook.category === name).length}
          >
            {name}
          </FilterChip>
        ))}
      </div>

      <div
        className="mx-split-row"
        style={{
          gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.35fr)",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div className="mx-panel" style={{ minHeight: 0 }}>
          <div className="mx-panel-head">
            <div>
              <span className="mx-panel-title">
                <BookMarked /> Playbooks
              </span>
              <span className="mx-panel-note">{rows.length} shown</span>
            </div>
          </div>
          {rows.length === 0 ? (
            <Empty
              title={hasFilters ? "No playbooks match" : "No playbooks published"}
              description={
                hasFilters
                  ? "Clear the search or category filter to see the full procedure library."
                  : "Procedures published by your knowledge team appear here."
              }
              icon={BookMarked}
            />
          ) : (
            <div className="mx-scroll" style={SCROLL_STACK}>
              {rows.map((playbook) => (
                <button
                  key={playbook.id}
                  type="button"
                  className={`mx-row${selected?.id === playbook.id ? " is-selected" : ""}`}
                  style={LIST_BUTTON}
                  onClick={() => setSelectedId(playbook.id)}
                >
                  <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                    <span className="mx-row-title">{playbook.title}</span>
                    <span className="mx-row-meta">
                      <Chip tone="accent">{playbook.category}</Chip>
                      <span>v{playbook.version}</span>
                      <span>Updated {formatDate(playbook.updatedAt)}</span>
                      <span>
                        {playbook.steps.length} step{playbook.steps.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mx-panel" style={{ minHeight: 0 }}>
          {selected ? (
            <>
              <div className="mx-panel-head">
                <div>
                  <span className="mx-panel-title">
                    <BookMarked /> {selected.title}
                  </span>
                  <span className="mx-panel-note">
                    v{selected.version} · updated {formatDate(selected.updatedAt)}
                  </span>
                </div>
                <div className="mx-btn-row">
                  <Chip tone="accent">{selected.category}</Chip>
                </div>
              </div>

              <div className="mx-scroll" style={SCROLL_STACK}>
                <span className="mx-row-desc" style={{ marginTop: 0 }}>
                  {selected.summary}
                </span>
                <dl className="mx-kv">
                  <dt>Version</dt>
                  <dd>{selected.version}</dd>
                  <dt>Updated</dt>
                  <dd>
                    {formatDate(selected.updatedAt)} · {relativeTime(selected.updatedAt)}
                  </dd>
                  <dt>Steps</dt>
                  <dd>{selected.steps.length}</dd>
                </dl>
                <div className="mx-divider" />
                {selected.steps.map((step, index) => (
                  <div key={`${selected.id}-step-${index}`} className="mx-row" style={STEP_ROW}>
                    <span className="mx-tag" style={STEP_NUMBER}>
                      {index + 1}
                    </span>
                    <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                      <span className="mx-row-title">{step.title}</span>
                      <span className="mx-row-desc" style={{ marginTop: 0 }}>
                        {step.guidance}
                      </span>
                      <span className="mx-tiny mx-muted">Expected result: {step.expected}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mx-divider" />
              <div className="mx-btn-row">
                <Link to="/mission-control" className="mx-btn mx-btn--sm mx-btn--primary">
                  <ExternalLink /> Use in Mission Control
                </Link>
                <span className="mx-tiny mx-muted">
                  Published procedure · read-only in Help Buddy.
                </span>
              </div>
            </>
          ) : (
            <Empty
              title="Select a playbook"
              description="Choose a procedure on the left to read its steps, the reason behind them and the expected result."
              icon={BookMarked}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- contacts */

const AVAILABILITY_TONE: Record<Contact["availability"], Tone> = {
  Available: "success",
  Busy: "warning",
  "In a meeting": "warning",
  Away: "neutral",
};

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function ContactsTab() {
  const state = useCommandState();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const departments = useMemo(
    () =>
      Array.from(new Set(state.contacts.map((contact) => contact.department))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [state.contacts],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.contacts.filter((contact) => {
      if (department !== "all" && contact.department !== department) return false;
      if (!needle) return true;
      return [contact.name, contact.department, contact.team, contact.location].some((field) =>
        field.toLowerCase().includes(needle),
      );
    });
  }, [state.contacts, query, department]);

  const selected = rows.find((contact) => contact.id === selectedId) ?? rows[0] ?? null;
  const escalationCount = rows.filter((contact) => contact.canEscalateTo).length;
  const hasFilters = query.trim().length > 0 || department !== "all";

  return (
    <div style={TAB_ROOT}>
      <div className="mx-inline">
        <div className="mx-search" style={SEARCH_BOX}>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, department, team or location"
            aria-label="Search contacts"
          />
        </div>
        <FilterChip
          active={department === "all"}
          onClick={() => setDepartment("all")}
          count={state.contacts.length}
        >
          All
        </FilterChip>
        {departments.map((name) => (
          <FilterChip
            key={name}
            active={department === name}
            onClick={() => setDepartment(name)}
            count={state.contacts.filter((contact) => contact.department === name).length}
          >
            {name}
          </FilterChip>
        ))}
      </div>

      <div
        className="mx-split-row"
        style={{ gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 0.9fr)", flex: 1, minHeight: 0 }}
      >
        <div className="mx-panel" style={{ minHeight: 0 }}>
          <div className="mx-panel-head">
            <div>
              <span className="mx-panel-title">
                <ContactIcon /> Directory
              </span>
              <span className="mx-panel-note">
                {rows.length} shown · {escalationCount} escalation contacts
              </span>
            </div>
          </div>
          {rows.length === 0 ? (
            <Empty
              title={hasFilters ? "No contacts match" : "No contacts available"}
              description={
                hasFilters
                  ? "Clear the search or department filter to see the rest of the directory."
                  : "Your authorized directory has no records yet."
              }
              icon={ContactIcon}
            />
          ) : (
            <div className="mx-scroll" style={SCROLL_STACK}>
              {rows.map((contact) => (
                <div
                  key={contact.id}
                  className={`mx-row${selected?.id === contact.id ? " is-selected" : ""}`}
                  style={{ gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "start" }}
                >
                  <button
                    type="button"
                    style={PLAIN_BUTTON}
                    onClick={() => setSelectedId(contact.id)}
                    aria-label={`Open ${contact.name}`}
                  >
                    <span className="mx-row-title">{contact.name}</span>
                    <span className="mx-tiny mx-muted">{contact.title}</span>
                    <span className="mx-row-meta">
                      <Chip tone={AVAILABILITY_TONE[contact.availability]}>
                        {contact.availability}
                      </Chip>
                      {contact.canEscalateTo ? <Chip tone="accent">Escalate</Chip> : null}
                      <span className="mx-tag">{contact.department}</span>
                      <span>
                        {contact.team} · {contact.location}
                      </span>
                    </span>
                  </button>
                  <div className="mx-row-actions">
                    <a
                      className="mx-btn mx-btn--sm"
                      href={`mailto:${contact.email}`}
                      aria-label={`Email ${contact.name}`}
                      title={contact.email}
                    >
                      <Mail />
                    </a>
                    <a
                      className="mx-btn mx-btn--sm"
                      href={telHref(contact.phone)}
                      aria-label={`Call ${contact.name}`}
                      title={contact.phone}
                    >
                      <Phone />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mx-panel" style={{ minHeight: 0 }}>
          {selected ? (
            <>
              <div className="mx-panel-head">
                <div>
                  <span className="mx-panel-title">
                    <ContactIcon /> {selected.name}
                  </span>
                  <span className="mx-panel-note">{selected.department}</span>
                </div>
                <div className="mx-btn-row">
                  <Chip tone={AVAILABILITY_TONE[selected.availability]}>
                    {selected.availability}
                  </Chip>
                </div>
              </div>

              <div
                className="mx-scroll"
                style={{ display: "grid", gap: 7, alignContent: "start", minHeight: 0, flex: 1 }}
              >
                <span className="mx-row-desc" style={{ marginTop: 0 }}>
                  {selected.title}
                </span>
                <dl className="mx-kv">
                  <dt>Department</dt>
                  <dd>{selected.department}</dd>
                  <dt>Team</dt>
                  <dd>{selected.team}</dd>
                  <dt>Location</dt>
                  <dd>{selected.location}</dd>
                  <dt>Email</dt>
                  <dd>
                    <a className="mx-strong" href={`mailto:${selected.email}`}>
                      {selected.email}
                    </a>
                  </dd>
                  <dt>Phone</dt>
                  <dd>
                    <a className="mx-strong" href={telHref(selected.phone)}>
                      {selected.phone}
                    </a>
                  </dd>
                  <dt>Escalation</dt>
                  <dd>
                    {selected.canEscalateTo
                      ? "Approved escalation contact"
                      : "Not an escalation route"}
                  </dd>
                </dl>

                <div className="mx-btn-row">
                  <a
                    className="mx-btn mx-btn--sm mx-btn--primary"
                    href={`mailto:${selected.email}`}
                  >
                    <Mail /> Email {firstName(selected.name)}
                  </a>
                  <a className="mx-btn mx-btn--sm" href={telHref(selected.phone)}>
                    <Phone /> Call
                  </a>
                </div>

                {selected.canEscalateTo ? (
                  <>
                    <Chip tone="accent">Escalate</Chip>
                    <Note tone="warning">
                      This contact is an approved escalation route. Record the escalation in Mission
                      Control so the trail stays complete.
                    </Note>
                  </>
                ) : (
                  <Note>
                    Directory record only. Availability is the value published in the directory — no
                    other presence data is inferred.
                  </Note>
                )}
              </div>
            </>
          ) : (
            <Empty
              title="Select a contact"
              description="Choose a colleague from the directory to see their details and reach them directly."
              icon={ContactIcon}
            />
          )}
        </div>
      </div>
    </div>
  );
}
