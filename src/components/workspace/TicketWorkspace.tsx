import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  History,
  MessageSquare,
  Pencil,
  RefreshCw,
  Save,
  Send,
  Ticket,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TicketCreateForm } from "@/components/workspace/TicketCreateForm";
import {
  getTicketActions,
  TICKET_ACTION_LABELS,
  TICKET_STATUS_LABELS,
  ticketActionNeedsReason,
  validateTicketAction,
  validateTicketDetails,
  type TicketAction,
  type TicketPriority,
} from "@/lib/ticket-workflow";
import {
  addTicketMessage,
  applyTicketTransition,
  findTicketByReference,
  listAssignableProfiles,
  loadCurrentTicketProfile,
  loadTicketAudit,
  loadTicketMessages,
  updateTicketDetails,
  type TicketAuditEvent,
  type TicketMessage,
  type TicketProfile,
  type TicketRecord,
} from "@/lib/tickets";
import { useWork } from "@/lib/work-context";

function ticketReference(ticket: TicketRecord) {
  return `TKT-${ticket.ticket_number}`;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "No deadline recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid deadline value";
  const deltaMs = date.getTime() - Date.now();
  const deltaHours = Math.ceil(Math.abs(deltaMs) / 3_600_000);
  const remaining =
    deltaMs >= 0 ? `Due in ${deltaHours} hour(s)` : `Overdue by ${deltaHours} hour(s)`;
  return `${date.toLocaleString()} · ${remaining}`;
}

function shortId(value: string | null | undefined) {
  return value ? `${value.slice(0, 8)}…` : "Unassigned";
}

function priorityTone(priority: string) {
  if (priority === "critical") return "text-rose-100 border-rose-300/35 bg-rose-400/10";
  if (priority === "high") return "text-amber-100 border-amber-300/35 bg-amber-400/10";
  if (priority === "low") return "text-cyan-100 border-cyan-300/30 bg-cyan-400/10";
  return "text-slate-100 border-white/15 bg-white/[.04]";
}

function auditDescription(event: TicketAuditEvent) {
  const details = event.event_data ?? {};
  if (details["message_content_recorded"] === false) {
    const operation = String(details["operation"] ?? "change").toLowerCase();
    return `Conversation ${operation.toLowerCase()} · ${String(details["visibility"] ?? "visibility not recorded")} · message body excluded from audit`;
  }
  const changedFields = Array.isArray(details["changed_fields"])
    ? details["changed_fields"].map(String)
    : [];
  const before =
    details["before"] && typeof details["before"] === "object"
      ? (details["before"] as Record<string, unknown>)
      : {};
  const after =
    details["after"] && typeof details["after"] === "object"
      ? (details["after"] as Record<string, unknown>)
      : {};
  if (changedFields.includes("status")) {
    const from = String(before["status"] ?? "unknown");
    const to = String(after["status"] ?? "unknown");
    return `Status changed: ${TICKET_STATUS_LABELS[from as keyof typeof TICKET_STATUS_LABELS] ?? from} → ${TICKET_STATUS_LABELS[to as keyof typeof TICKET_STATUS_LABELS] ?? to}`;
  }
  if (changedFields.length) return `Updated fields: ${changedFields.join(", ")}`;
  if (event.action === "ticket.created") return "Ticket created";
  return event.action.replaceAll(".", " ");
}

export function TicketWorkspace() {
  const work = useWork();
  const activeTicketId = work.activeTicketId;
  const setActiveTicketId = work.setActiveTicketId;
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [profile, setProfile] = useState<TicketProfile | null>(null);
  const [assignees, setAssignees] = useState<TicketProfile[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [audit, setAudit] = useState<TicketAuditEvent[]>([]);
  const [ticketRef, setTicketRef] = useState("");
  const [reason, setReason] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageVisibility, setMessageVisibility] = useState<"public" | "internal">("public");
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    void loadCurrentTicketProfile()
      .then((current) => {
        if (live) setProfile(current);
      })
      .catch(() => {
        if (live) setProfile(null);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    if (!activeTicketId) {
      setTicket(null);
      setError(null);
      setLoading(false);
      return () => {
        live = false;
      };
    }
    setLoading(true);
    setError(null);
    void findTicketByReference(activeTicketId)
      .then((row) => {
        if (!live) return;
        if (!row) {
          setTicket(null);
          setError(
            "No ticket matching that ID is visible to your account. Check the reference or choose a record you are authorized to access.",
          );
        } else {
          setTicket(row);
          if (activeTicketId !== row.id) setActiveTicketId(row.id);
        }
      })
      .catch((cause) => {
        if (!live) return;
        setTicket(null);
        setError(cause instanceof Error ? cause.message : "Unable to load this ticket.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [activeTicketId, reloadKey, setActiveTicketId]);

  useEffect(() => {
    let live = true;
    if (!ticket) {
      setMessages([]);
      setAudit([]);
      setAssignees([]);
      return () => {
        live = false;
      };
    }
    setMessageError(null);
    setAuditError(null);
    void Promise.all([
      loadTicketMessages(ticket.id)
        .then((rows) => {
          if (live) setMessages(rows);
        })
        .catch((cause) => {
          if (live)
            setMessageError(
              cause instanceof Error ? cause.message : "Unable to load ticket conversation.",
            );
        }),
      loadTicketAudit(ticket.id)
        .then((rows) => {
          if (live) setAudit(rows);
        })
        .catch((cause) => {
          if (live)
            setAuditError(
              cause instanceof Error ? cause.message : "Unable to load the audit record.",
            );
        }),
      listAssignableProfiles(ticket)
        .then((rows) => {
          if (live) setAssignees(rows);
        })
        .catch(() => {
          if (live) setAssignees([]);
        }),
    ]).then(() => undefined);
    return () => {
      live = false;
    };
  }, [ticket, reloadKey]);

  const availableActions = useMemo(() => (ticket ? getTicketActions(ticket.status) : []), [ticket]);

  const performAction = async (
    action: TicketAction,
    extra?: { assigneeProfileId?: string; priority?: TicketPriority },
  ) => {
    if (!ticket) return;
    const validation = validateTicketAction(ticket.status, action, reason);
    if (validation) {
      setError(validation);
      return;
    }
    if (["resolve", "close", "cancel", "reopen", "escalate"].includes(action)) {
      const prompt = `${TICKET_ACTION_LABELS[action]} for ${ticketReference(ticket)}? This change will be recorded in the ticket audit trail.`;
      if (!window.confirm(prompt)) return;
    }
    setUpdating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await applyTicketTransition({
        ticketId: ticket.id,
        action,
        reason,
        ...(extra?.assigneeProfileId !== undefined
          ? { assigneeProfileId: extra.assigneeProfileId }
          : {}),
        ...(extra?.priority !== undefined ? { priority: extra.priority } : {}),
      });
      setTicket(updated);
      setReason("");
      setSuccessMessage(
        `${TICKET_ACTION_LABELS[action]} applied. The database audit trigger records the change.`,
      );
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The ticket action failed.");
    } finally {
      setUpdating(false);
    }
  };

  const openReference = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = ticketRef.trim();
    if (!value) return;
    setError(null);
    setLoading(true);
    try {
      const row = await findTicketByReference(value);
      if (!row) throw new Error("No matching ticket is visible to your account.");
      work.setActiveTicketId(row.id);
      setTicket(row);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to find that ticket.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket || !profile) {
      setMessageError("Your signed-in profile is not available for this action.");
      return;
    }
    if (messageBody.trim().length < 2) {
      setMessageError("Enter a message before sending.");
      return;
    }
    setSending(true);
    setMessageError(null);
    try {
      await addTicketMessage({
        ticket,
        profileId: profile.id,
        body: messageBody,
        visibility: messageVisibility,
      });
      setMessageBody("");
      setSuccessMessage("Message saved to the ticket conversation and audit trail.");
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setMessageError(cause instanceof Error ? cause.message : "Unable to save the message.");
    } finally {
      setSending(false);
    }
  };

  const saveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket) return;
    const validation = validateTicketDetails({
      title: titleDraft,
      description: descriptionDraft,
      category: categoryDraft,
    });
    if (validation) {
      setError(validation);
      return;
    }
    const unchanged =
      titleDraft.trim() === ticket.title &&
      descriptionDraft.trim() === ticket.description &&
      categoryDraft.trim() === ticket.category;
    if (unchanged) {
      setEditingDetails(false);
      return;
    }

    setSavingDetails(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateTicketDetails({
        ticketId: ticket.id,
        title: titleDraft,
        description: descriptionDraft,
        category: categoryDraft,
      });
      setTicket(updated);
      setEditingDetails(false);
      setSuccessMessage(
        "Ticket details updated. The database audit records changed field names without copying the request content.",
      );
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update ticket details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const assignedName = assignees.find(
    (person) => person.id === ticket?.assigned_profile_id,
  )?.display_name;
  const requesterName = assignees.find(
    (person) => person.id === ticket?.requester_profile_id,
  )?.display_name;

  if (!work.activeTicketId) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-cyan-200/15 bg-slate-950/70 p-4 shadow-[0_18px_70px_rgba(0,0,0,.25)] backdrop-blur-xl sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
              <Ticket className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Open a real ticket record</h2>
              <p className="text-sm text-slate-400">
                Enter a ticket number or UUID, or create a new request.
              </p>
            </div>
          </div>
          <form
            className="flex max-w-xl flex-wrap gap-2"
            onSubmit={(event) => void openReference(event)}
          >
            <Input
              value={ticketRef}
              onChange={(event) => setTicketRef(event.target.value)}
              className="h-11 min-w-[220px] flex-1 border-white/10 bg-slate-900/80 text-slate-100"
              placeholder="TKT-1042 or ticket UUID"
              aria-label="Ticket number or UUID"
            />
            <Button type="submit" disabled={loading} className="min-h-11">
              <SearchIcon />
              Open ticket
            </Button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            The lookup runs against your authorized Supabase ticket records. It does not display
            sample tickets.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-300/25 bg-rose-400/[.08] p-3 text-sm text-rose-100"
            >
              {error}
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-6">
          <h3 className="mb-3 font-semibold text-white">Create a ticket</h3>
          <TicketCreateForm
            onCreated={(created) => {
              work.setActiveTicketId(created.id);
              setTicket(created);
            }}
          />
        </section>
        <Link
          to="/m/$section/$group/$page"
          params={{
            section: "service-desk-and-enterprise-operations",
            group: "ticket-management",
            page: "all-tickets",
          }}
          className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm text-slate-200 hover:border-cyan-200/40 hover:bg-cyan-300/[.06]"
        >
          Browse accessible tickets
        </Link>
      </div>
    );
  }

  if (loading && !ticket)
    return (
      <div className="rounded-xl border border-white/10 bg-slate-950/65 p-6 text-sm text-slate-300">
        Loading ticket from Supabase…
      </div>
    );
  if (!ticket)
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-300/25 bg-rose-400/[.08] p-5 text-sm text-rose-100"
      >
        {error ?? "Ticket record unavailable."}
      </div>
    );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-950/75 shadow-[0_18px_70px_rgba(0,0,0,.3)] backdrop-blur-xl">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-gradient-to-r from-cyan-300/[.11] via-blue-400/[.05] to-violet-400/[.1] px-4 py-4 sm:px-5">
          <span className="grid size-11 place-items-center rounded-xl border border-cyan-200/30 bg-cyan-300/10 text-cyan-100">
            <Ticket className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[.2em] text-cyan-100/60">
              Live ticket record
            </p>
            <h2 className="truncate font-mono text-lg font-semibold text-white">
              {ticketReference(ticket)}
            </h2>
            <p className="truncate text-sm text-slate-300">{ticket.title}</p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/[.04] px-3 py-1.5 text-xs text-slate-100">
            {TICKET_STATUS_LABELS[ticket.status as keyof typeof TICKET_STATUS_LABELS] ??
              ticket.status}
          </span>
          {!editingDetails && !["resolved", "closed", "cancelled"].includes(ticket.status) && (
            <Button
              variant="outline"
              className="min-h-11 border-violet-200/20 bg-violet-300/[.05] text-violet-50 hover:bg-violet-300/10"
              onClick={() => {
                setTitleDraft(ticket.title);
                setDescriptionDraft(ticket.description);
                setCategoryDraft(ticket.category);
                setEditingDetails(true);
                setError(null);
              }}
              disabled={savingDetails || updating}
            >
              <Pencil className="mr-2 size-4" /> Edit details
            </Button>
          )}
          <Button
            variant="outline"
            className="min-h-11 border-white/15 bg-white/[.04] text-slate-100"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </header>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
          <Info
            label="Requester"
            value={requesterName ?? shortId(ticket.requester_profile_id)}
            icon={<UserRound className="size-4" />}
          />
          <Info label="Category" value={ticket.category} />
          <Info label="Source" value={ticket.source ?? "Not recorded"} />
          <Info
            label="Response SLA"
            value={
              ticket.first_response_at
                ? `Responded ${new Date(ticket.first_response_at).toLocaleString()}`
                : dateLabel(ticket.response_due_at)
            }
            icon={<Clock3 className="size-4" />}
          />
          <Info
            label="Resolution SLA"
            value={
              ticket.resolved_at
                ? `Resolved ${new Date(ticket.resolved_at).toLocaleString()}`
                : dateLabel(ticket.resolution_due_at)
            }
            icon={<Clock3 className="size-4" />}
          />
          <Info
            label="Assignee"
            value={assignedName ?? shortId(ticket.assigned_profile_id)}
            icon={<UserRound className="size-4" />}
          />
        </div>

        <div className="grid gap-4 border-t border-white/10 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)] sm:p-5">
          <div className="space-y-4">
            {editingDetails ? (
              <form
                className="space-y-3 rounded-xl border border-violet-200/20 bg-violet-300/[.035] p-3"
                onSubmit={(event) => void saveDetails(event)}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-slate-300">
                    <span>Ticket title</span>
                    <Input
                      value={titleDraft}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      minLength={5}
                      maxLength={240}
                      required
                      className="h-11 border-white/15 bg-slate-950 text-slate-100"
                      aria-label="Ticket title"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-300">
                    <span>Category</span>
                    <Input
                      value={categoryDraft}
                      onChange={(event) => setCategoryDraft(event.target.value)}
                      minLength={2}
                      maxLength={100}
                      required
                      className="h-11 border-white/15 bg-slate-950 text-slate-100"
                      aria-label="Ticket category"
                    />
                  </label>
                </div>
                <label className="block space-y-1 text-xs text-slate-300">
                  <span>Request details</span>
                  <textarea
                    value={descriptionDraft}
                    onChange={(event) => setDescriptionDraft(event.target.value)}
                    minLength={10}
                    maxLength={10000}
                    required
                    rows={6}
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60"
                    aria-label="Ticket details"
                  />
                </label>
                <p className="text-[11px] text-slate-400">
                  Changes are saved through the tenant-scoped ticket API. Audit history records the
                  changed field names, not the title or description text.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" className="min-h-11" disabled={savingDetails}>
                    <Save className="mr-2 size-4" />
                    {savingDetails ? "Saving…" : "Save details"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 border-white/15 text-slate-200"
                    onClick={() => setEditingDetails(false)}
                    disabled={savingDetails}
                  >
                    <X className="mr-2 size-4" /> Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <h3 className="mb-1 text-sm font-semibold text-cyan-100">Request details</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                  {ticket.description}
                </p>
              </div>
            )}
            {ticket.current_step != null &&
              ticket.total_steps != null &&
              ticket.total_steps > 0 && (
                <div className="rounded-lg border border-cyan-200/15 bg-cyan-300/[.04] p-3">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Recorded workflow progress</span>
                    <span>
                      {ticket.current_step}/{ticket.total_steps}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, (ticket.current_step / ticket.total_steps) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            {ticket.resolution_summary && (
              <div className="rounded-lg border border-emerald-200/15 bg-emerald-300/[.04] p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-emerald-100">
                  <CheckCircle2 className="size-4" /> Recorded resolution / disposition
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-200">
                  {ticket.resolution_summary}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="min-h-11 border-cyan-200/20 bg-cyan-300/[.05] text-cyan-50 hover:bg-cyan-300/10"
                onClick={() => work.openHelpBuddy("knowledge")}
              >
                <BookOpen className="mr-2 size-4" />
                Search Knowledge Base
              </Button>
              <Button
                variant="outline"
                className="min-h-11 border-violet-200/20 bg-violet-300/[.05] text-violet-50 hover:bg-violet-300/10"
                onClick={() => work.openHelpBuddy("workflow")}
              >
                <Workflow className="mr-2 size-4" />
                Workflow Companion
              </Button>
            </div>
          </div>

          <aside className="rounded-xl border border-white/10 bg-white/[.025] p-3 sm:p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Authorized ticket actions</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-300">
                <span>Priority</span>
                <select
                  value={ticket.priority}
                  onChange={(event) =>
                    void performAction("set_priority", {
                      priority: event.target.value as TicketPriority,
                    })
                  }
                  disabled={updating}
                  className={`h-11 w-full rounded-lg border px-3 text-sm ${priorityTone(ticket.priority)} bg-slate-950`}
                  aria-label="Change ticket priority"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-slate-300">
                <span>Assign to visible user</span>
                <select
                  value={ticket.assigned_profile_id ?? ""}
                  onChange={(event) =>
                    event.target.value &&
                    void performAction("assign", { assigneeProfileId: event.target.value })
                  }
                  disabled={updating || !assignees.length}
                  className="h-11 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-slate-100"
                  aria-label="Assign ticket to a visible user"
                >
                  <option value="">
                    {ticket.assigned_profile_id ? "Current assignee" : "Select a user"}
                  </option>
                  {assignees.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.display_name || shortId(person.id)}
                      {person.job_title ? ` · ${person.job_title}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block space-y-1 text-xs text-slate-300">
              <span>
                Reason / resolution details (required for wait, escalation, resolve, reopen, or
                cancel)
              </span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {availableActions
                .filter((action) => action !== "assign" && action !== "set_priority")
                .map((action) => {
                  const needsReason = ticketActionNeedsReason(action);
                  return (
                    <Button
                      key={action}
                      type="button"
                      variant="outline"
                      className="min-h-11 border-white/15 bg-white/[.035] text-slate-100 hover:border-cyan-200/35 hover:bg-cyan-300/[.07]"
                      disabled={updating || (needsReason && reason.trim().length < 20)}
                      onClick={() => void performAction(action)}
                    >
                      {TICKET_ACTION_LABELS[action]}
                    </Button>
                  );
                })}
            </div>
            {successMessage && (
              <p role="status" className="mt-3 text-xs text-emerald-200">
                {successMessage}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-rose-300/25 bg-rose-400/[.08] p-2 text-xs text-rose-100"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
          </aside>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_16px_50px_rgba(0,0,0,.2)] backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="size-4 text-cyan-200" />
            <h3 className="font-semibold text-white">Ticket conversation</h3>
            <span className="ml-auto text-[10px] text-slate-500">
              {messages.length} visible message(s)
            </span>
          </div>
          {messageError && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-rose-300/20 bg-rose-400/[.07] p-2 text-xs text-rose-100"
            >
              Conversation could not be loaded: {messageError}
            </p>
          )}
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {messages.map((message) => (
              <article
                key={message.id}
                className="rounded-xl border border-white/[.08] bg-white/[.025] p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span>{shortId(message.author_profile_id)}</span>
                  <span>·</span>
                  <span>{new Date(message.created_at).toLocaleString()}</span>
                  <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 uppercase tracking-wide">
                    {message.visibility}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{message.body}</p>
              </article>
            ))}
            {!messages.length && !messageError && (
              <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-slate-400">
                No conversation messages are visible for this ticket yet.
              </p>
            )}
          </div>
          <form
            className="mt-4 space-y-2 border-t border-white/10 pt-4"
            onSubmit={(event) => void sendMessage(event)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-300" htmlFor="ticket-message-visibility">
                Visibility
              </label>
              <select
                id="ticket-message-visibility"
                value={messageVisibility}
                onChange={(event) =>
                  setMessageVisibility(event.target.value as "public" | "internal")
                }
                className="h-10 rounded-lg border border-white/15 bg-slate-950 px-3 text-xs text-slate-100"
              >
                <option value="public">Requester-visible reply</option>
                <option value="internal">Internal note (role policy enforced by Supabase)</option>
              </select>
            </div>
            <textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              rows={3}
              maxLength={12000}
              className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
              placeholder="Add a troubleshooting update, question, or resolution step…"
              aria-label="Ticket message"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-slate-500">
                Saved with tenant metadata; the audit log records the action but not message
                content.
              </p>
              <Button
                type="submit"
                disabled={sending || messageBody.trim().length < 2}
                className="min-h-11"
              >
                <Send className="mr-2 size-4" />
                {sending ? "Sending…" : "Send update"}
              </Button>
            </div>
            {messageError && (
              <p role="alert" className="text-xs text-rose-200">
                {messageError}
              </p>
            )}
          </form>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_16px_50px_rgba(0,0,0,.2)] backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <History className="size-4 text-violet-200" />
            <h3 className="font-semibold text-white">Ticket history</h3>
            <span className="ml-auto text-[10px] text-slate-500">{audit.length} event(s)</span>
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Database-generated audit history; ticket descriptions and conversation bodies are not
            copied into audit metadata.
          </p>
          {auditError && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-rose-300/20 bg-rose-400/[.07] p-2 text-xs text-rose-100"
            >
              Audit data is unavailable to this account: {auditError}
            </p>
          )}
          <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            {audit.map((event) => (
              <article
                key={event.id}
                className="rounded-xl border border-white/[.08] bg-white/[.025] p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 shadow-[0_0_10px_rgba(125,211,252,.55)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100">
                        {auditDescription(event)}
                      </span>
                      <span className="ml-auto text-[10px] text-slate-500">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {event.action} · actor {shortId(event.actor_profile_id)} · {event.outcome}
                    </p>
                  </div>
                </div>
              </article>
            ))}
            {!audit.length && !auditError && (
              <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-slate-400">
                No audit events are currently visible for this ticket.
              </p>
            )}
          </div>
        </div>
      </section>
      <Link
        to="/m/$section/$group/$page"
        params={{
          section: "intellidesk-command-center",
          group: "tickets",
          page: "incidents",
        }}
        className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm text-slate-200 hover:border-violet-200/40 hover:bg-violet-300/[.06]"
      >
        <Clock3 className="mr-2 size-4" />
        Ticket history
      </Link>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[.08] bg-white/[.025] p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 break-words text-sm text-slate-100">{value}</div>
    </div>
  );
}

function SearchIcon() {
  return <Ticket className="mr-2 size-4" />;
}
