import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowUpRight,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  Ticket,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TicketCreateForm } from "@/components/workspace/TicketCreateForm";
import { TICKET_STATUS_LABELS } from "@/lib/ticket-workflow";
import {
  listTicketsForPage,
  loadCurrentTicketProfile,
  type TicketProfile,
  type TicketRecord,
} from "@/lib/tickets";
import { useWork } from "@/lib/work-context";

const FINAL_STATUSES = new Set(["resolved", "closed", "cancelled"]);

function ticketReference(ticket: TicketRecord) {
  return `TKT-${ticket.ticket_number}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function priorityClass(priority: string) {
  if (priority === "critical") return "border-rose-300/40 bg-rose-400/10 text-rose-100";
  if (priority === "high") return "border-amber-300/40 bg-amber-400/10 text-amber-100";
  if (priority === "low") return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100";
  return "border-white/15 bg-white/5 text-slate-200";
}

export function TicketManagementWorkspace({
  title,
  pageSlug,
}: {
  title: string;
  pageSlug: string;
}) {
  const work = useWork();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TicketProfile | null>(null);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const currentProfile = await loadCurrentTicketProfile();
        const rows = await listTicketsForPage(pageSlug, currentProfile);
        if (!live) return;
        setProfile(currentProfile);
        setTickets(rows);
      } catch (cause) {
        if (!live) return;
        setError(cause instanceof Error ? cause.message : "Unable to load ticket records.");
        setTickets([]);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [pageSlug, reloadKey]);

  const visibleTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((ticket) =>
      [
        ticketReference(ticket),
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.status,
        ticket.priority,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(needle),
      ),
    );
  }, [tickets, search]);

  const activeCount = tickets.filter((ticket) => !FINAL_STATUSES.has(ticket.status)).length;
  const criticalCount = tickets.filter(
    (ticket) => ticket.priority === "critical" && !FINAL_STATUSES.has(ticket.status),
  ).length;
  const completedCount = tickets.filter(
    (ticket) => ticket.status === "resolved" || ticket.status === "closed",
  ).length;

  const openTicket = async (ticket: TicketRecord) => {
    work.setActiveTicketId(ticket.id);
    await navigate({
      to: "/m/$section/$group/$page",
      params: {
        section: "intellidesk-command-center",
        group: "technician-workspace",
        page: "work-queue",
      },
    });
  };

  const ticketCreated = async (ticket: TicketRecord) => {
    setShowCreate(false);
    work.setActiveTicketId(ticket.id);
    await navigate({
      to: "/m/$section/$group/$page",
      params: {
        section: "intellidesk-command-center",
        group: "technician-workspace",
        page: "work-queue",
      },
    });
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-950/70 shadow-[0_18px_70px_rgba(0,0,0,.28)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-gradient-to-r from-cyan-400/[.08] via-blue-500/[.04] to-violet-400/[.08] px-4 py-4 sm:px-5">
          <span className="grid size-11 place-items-center rounded-xl border border-cyan-200/30 bg-cyan-400/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_0_22px_rgba(34,211,238,.12)]">
            <Ticket className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-xs text-slate-300/75">
              Recent ticket records visible to your signed-in role; row-level security remains
              authoritative.
            </p>
          </div>
          <Button
            variant="outline"
            className="min-h-11 border-cyan-100/20 bg-white/[.04] text-slate-100 hover:bg-cyan-300/10"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            className="min-h-11 border border-cyan-100/30 bg-gradient-to-br from-cyan-300/90 via-blue-400/90 to-violet-400/90 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,.16)] hover:brightness-110"
            onClick={() => setShowCreate((value) => !value)}
          >
            <Plus className="mr-2 size-4" /> New ticket
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-3">
          <div className="bg-slate-950/70 p-3 sm:p-4">
            <div className="text-[10px] uppercase tracking-[.18em] text-slate-400">
              Accessible records
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {loading ? "—" : tickets.length}
            </div>
          </div>
          <div className="bg-slate-950/70 p-3 sm:p-4">
            <div className="text-[10px] uppercase tracking-[.18em] text-cyan-200/65">Open work</div>
            <div className="mt-1 text-xl font-semibold text-cyan-100">
              {loading ? "—" : activeCount}
            </div>
          </div>
          <div className="col-span-2 bg-slate-950/70 p-3 sm:col-span-1 sm:p-4">
            <div className="text-[10px] uppercase tracking-[.18em] text-rose-200/65">
              Critical open
            </div>
            <div className="mt-1 text-xl font-semibold text-rose-100">
              {loading ? "—" : criticalCount}
            </div>
          </div>
        </div>

        {showCreate && (
          <div className="border-b border-white/10 bg-white/[.025] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Create a ticket</h3>
                <p className="text-xs text-slate-400">
                  The requester and tenant are taken from your authenticated profile.
                </p>
              </div>
              <Button
                variant="ghost"
                className="min-h-10 text-slate-300"
                onClick={() => setShowCreate(false)}
              >
                Close
              </Button>
            </div>
            <TicketCreateForm onCreated={(ticket) => void ticketCreated(ticket)} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-3 sm:p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 border-white/10 bg-slate-900/80 pl-9 text-slate-100 placeholder:text-slate-500"
              placeholder="Search ticket number, subject, category…"
              aria-label="Search visible tickets"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ListFilter className="size-4" />{" "}
            {pageSlug === "team-tickets" && !profile?.department_id
              ? "No department is assigned to your profile"
              : "Latest 200 records returned by your authorized query"}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="m-4 flex items-start gap-2 rounded-xl border border-rose-300/25 bg-rose-400/[.08] p-3 text-sm text-rose-100"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Loading tickets visible to your account…
          </div>
        ) : !error && visibleTickets.length === 0 ? (
          <div className="p-8 text-center">
            <Ticket className="mx-auto mb-2 size-7 text-cyan-200/50" />
            <p className="font-medium text-slate-100">No matching tickets</p>
            <p className="mt-1 text-sm text-slate-400">
              This view contains no records matching your search and current access scope.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[.07]">
            {visibleTickets.map((ticket) => (
              <article
                key={ticket.id}
                className="grid gap-3 px-4 py-4 transition-colors hover:bg-white/[.025] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-cyan-200">
                      {ticketReference(ticket)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityClass(ticket.priority)}`}
                    >
                      {ticket.priority}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] text-slate-300">
                      {TICKET_STATUS_LABELS[ticket.status as keyof typeof TICKET_STATUS_LABELS] ??
                        ticket.status}
                    </span>
                  </div>
                  <h3 className="mt-1 truncate font-medium text-white">{ticket.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{ticket.description}</p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {ticket.category} · Updated {formatDate(ticket.updated_at)} ·{" "}
                    {ticket.department_id ? "Department scoped" : "Organization scoped"}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  {(ticket.status === "resolved" || ticket.status === "closed") && (
                    <span className="hidden text-[11px] text-emerald-200/75 md:inline">
                      Completed
                    </span>
                  )}
                  <Button
                    variant="outline"
                    className="min-h-11 w-full border-white/15 bg-white/[.035] text-slate-100 hover:border-cyan-200/40 hover:bg-cyan-300/[.08] sm:w-auto"
                    onClick={() => void openTicket(ticket)}
                  >
                    Open record <ArrowUpRight className="ml-2 size-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && completedCount > 0 && (
          <p className="border-t border-white/10 px-4 py-3 text-xs text-slate-400">
            {completedCount} resolved or closed ticket(s) remain visible in this result set.
          </p>
        )}
      </section>
      <p className="px-1 text-[11px] text-slate-500">
        Tickets not returned by Supabase row-level security are never exposed here. Counts represent
        only the records returned for this view.
      </p>
      <Link
        className="sr-only"
        to="/m/$section/$group/$page"
        params={{
          section: "service-desk-and-enterprise-operations",
          group: "ticket-management",
          page: "active-ticket-workspace",
        }}
      >
        Open the active ticket workspace
      </Link>
    </div>
  );
}
