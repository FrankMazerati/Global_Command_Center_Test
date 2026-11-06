import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Shell } from "@/components/intellidesk/Shell";
import { PriorityBadge, SlaCountdown, StatusBadge, useNow } from "@/components/intellidesk/bits";
import { applyFilter, FILTERS, type Filter, useStore } from "@/lib/intellidesk/store";
import { cn } from "@/lib/utils";

type Search = { filter?: Filter | undefined; team?: string | undefined };

export const Route = createFileRoute("/missions")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    filter: FILTERS.includes(s["filter"] as Filter) ? (s["filter"] as Filter) : undefined,
    team: typeof s["team"] === "string" ? s["team"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mission Queue — IntelliDesk" },
      { name: "description", content: "Filter, sort and pick up service missions by priority, SLA and team." },
      { property: "og:title", content: "Mission Queue — IntelliDesk" },
      { property: "og:description", content: "Filter, sort and pick up service missions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Queue,
});

const ORDER = { Critical: 0, High: 1, Normal: 2, Low: 3 };

function Queue() {
  const { filter = "Active", team } = Route.useSearch();
  const s = useStore();
  const now = useNow();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"priority" | "sla" | "received">("priority");
  const me = s.technicians.find((t) => t.name === s.me);

  const list = useMemo(() => {
    if (!now) return [];
    let l = applyFilter(s.missions, filter, me, now);
    if (team) l = l.filter((m) => m.team === team);
    if (q) l = l.filter((m) => `${m.id} ${m.title} ${m.requester} ${m.department}`.toLowerCase().includes(q.toLowerCase()));
    return [...l].sort((a, b) => sort === "priority" ? ORDER[a.priority] - ORDER[b.priority] : sort === "sla" ? a.resolutionDue - b.resolutionDue : b.receivedAt - a.receivedAt);
  }, [s.missions, filter, team, q, sort, now, me]);

  return (
    <Shell crumbs={[{ label: "Mission Control", to: "/" }, { label: `Mission Queue · ${filter}${team ? ` · ${team}` : ""}` }]}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link to="/" className="tap inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><ArrowLeft className="h-4 w-4" />Overview</Link>
        <h1 className="text-xl font-bold">Mission Queue</h1>
        <span className="text-sm text-muted-foreground">{list.length} missions</span>
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link key={f} to="/missions" search={{ filter: f, team }} className={cn("tap inline-flex shrink-0 items-center rounded-full border px-3 text-xs", f === filter ? "border-primary bg-primary/25 font-semibold text-glow" : "bg-secondary/50")}>
            {f}
          </Link>
        ))}
        {team && <Link to="/missions" search={{ filter }} className="tap inline-flex shrink-0 items-center rounded-full border border-glow px-3 text-xs">Team: {team} ✕</Link>}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border bg-secondary/50 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mission ID, title, requester…" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-11 rounded-lg border bg-secondary px-3 text-sm" aria-label="Sort">
          <option value="priority">Sort: Priority</option><option value="sla">Sort: SLA due</option><option value="received">Sort: Newest</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="glass hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b">{["Mission ID", "Mission", "Priority", "Severity", "Requester", "Department", "Team", "Technician", "SLA", "Received", "Status"].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="border-b border-border/50 hover:bg-accent/30">
                <td className="p-0"><Link to="/briefing/$id" params={{ id: m.id }} className="block p-3 font-mono text-glow">{m.id}</Link></td>
                <td className="p-0"><Link to="/briefing/$id" params={{ id: m.id }} className="block p-3 font-medium">{m.title}</Link></td>
                <td className="p-3"><PriorityBadge p={m.priority} /></td>
                <td className="p-3">{m.severity}</td>
                <td className="p-3">{m.requester}</td>
                <td className="p-3">{m.department}</td>
                <td className="p-3">{m.team}</td>
                <td className="p-3">{m.technician ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="p-3"><SlaCountdown m={m} now={now} /></td>
                <td className="p-3 text-muted-foreground">{new Date(m.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="p-3"><StatusBadge s={m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="space-y-2 lg:hidden">
        {list.map((m) => (
          <Link key={m.id} to="/briefing/$id" params={{ id: m.id }} className="glass tap block p-3">
            <div className="flex items-center justify-between"><span className="font-mono text-xs text-glow">{m.id}</span><PriorityBadge p={m.priority} /></div>
            <div className="mt-1 font-medium">{m.title}</div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{m.severity}</span><span>{m.department}</span><span>{m.team}</span><span>{m.technician ?? "Unassigned"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between"><StatusBadge s={m.status} /><SlaCountdown m={m} now={now} /></div>
          </Link>
        ))}
      </div>
      {now && list.length === 0 && <p className="glass p-6 text-center text-sm text-muted-foreground">No missions match this view.</p>}
    </Shell>
  );
}
