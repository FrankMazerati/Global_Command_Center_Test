import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Plug,
  Plus,
  Radar,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { HelpBuddyPanel } from "@/components/shell/HelpBuddy";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABILITY, useWork, type Availability } from "@/lib/work-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Maximus Optimus Global Command Center" },
      { name: "description", content: "See everything locally, connect everything globally, powered by intelligence." },
      { property: "og:title", content: "Maximus Optimus Global Command Center" },
      { property: "og:description", content: "IntelliStack Systems presents Maximus Optimus Global Command Center." },
    ],
  }),
  component: Dashboard,
});

const ZONES = [
  ["Chicago", "America/Chicago"],
  ["New York", "America/New_York"],
  ["London", "Europe/London"],
  ["Dubai", "Asia/Dubai"],
  ["Tokyo", "Asia/Tokyo"],
  ["Los Angeles", "America/Los_Angeles"],
  ["São Paulo", "America/Sao_Paulo"],
  ["Berlin", "Europe/Berlin"],
  ["Mumbai", "Asia/Kolkata"],
  ["Sydney", "Australia/Sydney"],
] as const;

type Pick = { label: string; section: string; group: string; page: string; tone: string };
const QUICK_PICKS: Pick[] = [
  { label: "Active Ticket", section: "command-center", group: "ticket-management", page: "active-ticket-workspace", tone: "bg-maximus" },
  { label: "My Tickets", section: "command-center", group: "intellidesk-overview", page: "my-tickets", tone: "bg-primary" },
  { label: "Create Ticket", section: "command-center", group: "intellidesk-overview", page: "create-ticket", tone: "bg-optimus" },
  { label: "Global Directory", section: "new-active-directory", group: "directory-overview", page: "global-directory", tone: "bg-contractor" },
  { label: "IntelliCalendar", section: "collaboration", group: "intellistack-collaboration-tools", page: "intellicalendar", tone: "bg-world" },
  { label: "Financial Overview", section: "my-business-center", group: "financial-center", page: "financial-overview", tone: "bg-tenant" },
  { label: "Network Dashboard", section: "noc-center", group: "noc-overview", page: "network-operations-dashboard", tone: "bg-network" },
  { label: "Security Ops", section: "security", group: "security-overview", page: "security-operations-dashboard", tone: "bg-optimus" },
  { label: "Audit Archive", section: "governance", group: "audit-management", page: "ticket-audit-archive", tone: "bg-tenant" },
  { label: "Learning Paths", section: "knowledge-and-learning", group: "training-and-learning", page: "learning-paths", tone: "bg-everything" },
];

const DEFAULT_NEWS = ["IT", "Corporate", "Security", "Network", "Help Desk / Executive"];
const WORK_TABS = ["Tickets", "Approvals", "Follow-ups", "Priorities"] as const;
type WorkTab = (typeof WORK_TABS)[number];

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Card({ title, icon: Icon, children, className, action }: { title: string; icon?: LucideIcon; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-card", className)}>
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="size-4 text-primary" />}
        <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Dashboard() {
  const now = useNow();
  const w = useWork();
  const [zonesOpen, setZonesOpen] = useState(false);
  const [picksOpen, setPicksOpen] = useState(false);
  const [news, setNews] = useState<string[]>(DEFAULT_NEWS);
  const [newSource, setNewSource] = useState("");
  const [workTab, setWorkTab] = useState<WorkTab>("Tickets");
  const hour = now?.getHours() ?? 9;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const move = (i: number, d: -1 | 1) =>
    setNews((n) => {
      const j = i + d;
      if (j < 0 || j >= n.length) return n;
      const c = [...n];
      const a = c[i]!;
      c[i] = c[j]!;
      c[j] = a;
      return c;
    });

  return (
    <div className="space-y-4">
      {/* Announcements */}
      <div className="flex items-center gap-3 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-card">
        <Megaphone className="size-4 shrink-0" />
        <span className="flex-1">See everything locally, connect everything globally, powered by intelligence.</span>
        <span className="hidden text-xs opacity-90 sm:inline">Company announcements connect in a later phase</span>
      </div>

      {/* Time bar */}
      <div className="rounded-xl border bg-card px-3 py-2 shadow-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {ZONES.slice(0, zonesOpen ? 10 : 5).map(([city, tz]) => (
            <div key={tz} className="text-xs">
              <span className="text-muted-foreground">{city} </span>
              <span className="font-semibold tabular-nums">
                {now ? now.toLocaleTimeString([], { timeZone: tz, hour: "2-digit", minute: "2-digit" }) : "--:--"}
              </span>
            </div>
          ))}
          <button type="button" onClick={() => setZonesOpen(!zonesOpen)} className="ml-auto flex items-center gap-1 text-xs font-medium text-primary">
            {zonesOpen ? <>Fewer <ChevronUp className="size-3" /></> : <>All 10 <ChevronDown className="size-3" /></>}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          {/* Profile */}
          <section className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-gradient font-display text-xl font-bold text-primary-foreground">FM</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-muted-foreground">{greeting},</div>
                <h1 className="font-display text-xl font-bold">Frank Mazerati</h1>
                <div className="text-sm text-secondary-foreground">Principal, Chief Principal Architect and Design Engineer</div>
                <p className="mt-1 text-xs text-tenant">Every ticket you close makes someone's day easier.</p>
              </div>
              <div className="w-full sm:w-48">
                <Select value={w.availability} onValueChange={(v) => w.setAvailability(v as Availability)}>
                  <SelectTrigger aria-label="Availability"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t pt-3 text-sm sm:grid-cols-2">
              {["Global Company ID", "Global User ID", "Work email", "Phone", "Location", "Department", "Manager"].map((k) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right text-muted-foreground/80">From directory record</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Quick Picks */}
          <Card
            title="Quick Picks"
            icon={Sparkles}
            action={
              <button type="button" onClick={() => setPicksOpen(!picksOpen)} className="text-xs font-medium text-primary">
                {picksOpen ? "Show 5" : "Show 10"}
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {QUICK_PICKS.slice(0, picksOpen ? 10 : 5).map((p) => (
                <Link
                  key={p.label}
                  to="/m/$section/$group/$page"
                  params={{ section: p.section, group: p.group, page: p.page }}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  <span className={cn("size-2.5 shrink-0 rounded-full", p.tone)} /> {p.label}
                </Link>
              ))}
            </div>
          </Card>

          {/* Bring the Work to You */}
          <section className="rounded-xl border-2 border-primary/30 bg-card p-4 shadow-card">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-bold tracking-wide">Bring the Work to You</h2>
              <StatusBadge status="Awaiting integration" className="ml-auto" />
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {WORK_TABS.map((t) => (
                <button key={t} type="button" onClick={() => setWorkTab(t)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", workTab === t ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent")}>
                  {t}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Your {workTab.toLowerCase()} will appear here, by role and priority, once your existing records are connected.
              {w.activeTicketId && (
                <div className="mt-3">
                  <Link to="/m/$section/$group/$page" params={{ section: "command-center", group: "ticket-management", page: "active-ticket-workspace" }} className="font-semibold text-primary hover:underline">
                    Continue working on {w.activeTicketId}
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Help Buddy inline on mobile */}
          <div className="rounded-xl border bg-card shadow-card lg:hidden">
            <HelpBuddyPanel />
          </div>

          {/* News feed */}
          <Card title="News feed" icon={Megaphone}>
            <ul className="space-y-1.5">
              {news.map((s, i) => (
                <li key={s} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span className="flex-1 font-medium">{s}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">Source not connected</span>
                  <button type="button" aria-label={`Move ${s} up`} onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground"><ArrowUp className="size-4" /></button>
                  <button type="button" aria-label={`Move ${s} down`} onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground"><ArrowDown className="size-4" /></button>
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => setNews((n) => n.filter((x) => x !== s))} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = newSource.trim();
                if (v && !news.includes(v)) setNews([...news, v]);
                setNewSource("");
              }}
            >
              <Input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="Add a news source" aria-label="New news source" />
              <button type="submit" aria-label="Add source" className="grid w-10 place-items-center rounded-md border hover:bg-accent"><Plus className="size-4" /></button>
            </form>
          </Card>

          {/* Module cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Connectors", icon: Plug, text: "Microsoft 365, calendars, file storage and more.", to: ["productivity", "connected-productivity-tools", "connection-status"] },
              { title: "Network monitoring", icon: Radar, text: "Infrastructure health and alerts.", to: ["noc-center", "noc-overview", "network-operations-dashboard"] },
              { title: "Security monitoring", icon: ShieldCheck, text: "Posture, threats and incidents.", to: ["security", "security-overview", "security-posture"] },
              { title: "Knowledge base", icon: BookOpen, text: "Guides, walkthroughs and training.", to: ["knowledge-and-learning", "getting-started", "getting-started-with-your-command-center"] },
            ].map((c) => (
              <Link key={c.title} to="/m/$section/$group/$page" params={{ section: c.to[0]!, group: c.to[1]!, page: c.to[2]! }} className="group rounded-xl border bg-card p-4 shadow-card hover:border-primary/50">
                <div className="mb-1 flex items-center gap-2">
                  <c.icon className="size-4 text-primary" />
                  <h3 className="flex-1 text-sm font-semibold">{c.title}</h3>
                  <StatusBadge status="Awaiting integration" />
                </div>
                <p className="text-sm text-muted-foreground">{c.text}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Persistent Help Buddy beside the work on desktop/tablet */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-xl border bg-card shadow-card">
            <HelpBuddyPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
