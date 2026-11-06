import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity, ArrowDown, ArrowUp, Bell, BookOpen, BriefcaseBusiness, CalendarDays,
  CheckCircle2, Clock3, CloudSun, GripVertical, Megaphone,
  Plus, Radar, ShieldCheck, Sparkles, TrendingUp, UserRound, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { HelpBuddyPanel } from "@/components/shell/HelpBuddy";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { AVAILABILITY, useWork, type Availability } from "@/lib/work-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Global Command Center · Maximus Optimus" },
    { name: "description", content: "See Everything Locally. Connect Everything Globally. Powered by Intelligence." },
  ]}),
  component: Dashboard,
});

const CLOCKS = [
  ["London", "Europe/London"], ["Chicago", "America/Chicago"], ["New York", "America/New_York"],
  ["Sydney", "Australia/Sydney"], ["Tokyo", "Asia/Tokyo"], ["Los Angeles", "America/Los_Angeles"],
  ["Dubai", "Asia/Dubai"], ["Berlin", "Europe/Berlin"], ["Mumbai", "Asia/Kolkata"], ["São Paulo", "America/Sao_Paulo"],
] as const;

type Pick = { label: string; section: string; group: string; page: string; icon: string };
const PICK_CATALOG: Pick[] = [
  { label: "Active Ticket", section: "service-desk-and-enterprise-operations", group: "ticket-management", page: "active-ticket-workspace", icon: "ticket" },
  { label: "My Tickets", section: "service-desk-and-enterprise-operations", group: "intellidesk-overview", page: "my-tickets", icon: "inbox" },
  { label: "Create Ticket", section: "service-desk-and-enterprise-operations", group: "intellidesk-overview", page: "create-ticket", icon: "plus" },
  { label: "Global Directory", section: "identity-and-access-management", group: "directory-overview", page: "global-directory", icon: "users" },
  { label: "IntelliCalendar", section: "productivity-and-collaboration", group: "intellistack-collaboration-tools", page: "intellicalendar", icon: "calendar" },
  { label: "Financial Overview", section: "business-products", group: "financial-center", page: "financial-overview", icon: "chart" },
  { label: "Network Dashboard", section: "service-desk-and-enterprise-operations", group: "noc-overview", page: "network-operations-dashboard", icon: "network" },
  { label: "Security Ops", section: "security-risk-and-governance", group: "security-overview", page: "security-operations-dashboard", icon: "shield" },
  { label: "Audit Archive", section: "security-risk-and-governance", group: "audit-management", page: "ticket-audit-archive", icon: "audit" },
  { label: "Learning Paths", section: "account-and-administration", group: "training-and-learning", page: "learning-paths", icon: "book" },
];
const DEFAULT_PICKS = PICK_CATALOG.slice(0, 5);
const NEWS_DEFAULT = ["IT", "Corporate", "Security", "Network", "Help Desk / Executive"];
const WORK_TABS = ["Critical & Urgent", "High Priority", "Upcoming", "Follow-ups", "Help Desk / Tickets"] as const;

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(timer); }, []);
  return now;
}

function Panel({ title, icon: Icon, children, action, className }: { title: string; icon: typeof Activity; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return <section className={cn("glass rounded-xl p-4", className)}>
    <div className="mb-3 flex items-center gap-2"><Icon className="size-4 text-sky-300"/><h2 className="flex-1 font-display text-xs font-bold uppercase tracking-[.12em] text-slate-100">{title}</h2>{action}</div>
    {children}
  </section>;
}

function pickIcon(name: string) {
  const cls = "size-4 text-sky-300";
  if (name === "calendar") return <CalendarDays className={cls}/>;
  if (name === "shield") return <ShieldCheck className={cls}/>;
  if (name === "book") return <BookOpen className={cls}/>;
  if (name === "chart") return <TrendingUp className={cls}/>;
  if (name === "network") return <Radar className={cls}/>;
  if (name === "users") return <UserRound className={cls}/>;
  if (name === "plus") return <Plus className={cls}/>;
  return <BriefcaseBusiness className={cls}/>;
}

function Dashboard() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();
    if (!client) { navigate({ to: "/login", replace: true }); return; }
    client.auth.getSession().then(({ data }) => { if (!active) return; if (!data.session) navigate({ to: "/login", replace: true }); else setAuthReady(true); })
      .catch(() => navigate({ to: "/login", replace: true }));
    return () => { active = false; };
  }, [navigate]);

  const now = useNow();
  const work = useWork();
  const hour = now?.getHours() ?? 9;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const [availability, setAvailability] = useState<Availability>(work.availability);
  const [picks, setPicks] = useState<Pick[]>(DEFAULT_PICKS);
  const [pickEditor, setPickEditor] = useState(false);
  const [pickDrag, setPickDrag] = useState<number | null>(null);
  const [clockOrder, setClockOrder] = useState<string[]>(CLOCKS.map(([city]) => city));
  const [clockManager, setClockManager] = useState(false);
  const [clockExpanded, setClockExpanded] = useState(false);
  const [clockDrag, setClockDrag] = useState<number | null>(null);
  const [news, setNews] = useState(NEWS_DEFAULT);
  const [newNews, setNewNews] = useState("");
  const [workTab, setWorkTab] = useState<(typeof WORK_TABS)[number]>("Critical & Urgent");

  useEffect(() => {
    try {
      const savedPicks = localStorage.getItem("mo:quick-picks");
      if (savedPicks) setPicks(JSON.parse(savedPicks) as Pick[]);
      const savedClocks = localStorage.getItem("mo:clock-order");
      if (savedClocks) setClockOrder(JSON.parse(savedClocks) as string[]);
    } catch { /* Keep the safe defaults when saved preferences are unavailable. */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("mo:quick-picks", JSON.stringify(picks)); } catch { /* Storage is optional. */ } }, [picks]);
  useEffect(() => { try { localStorage.setItem("mo:clock-order", JSON.stringify(clockOrder)); } catch { /* Storage is optional. */ } }, [clockOrder]);

  const clocks = useMemo(() => clockOrder.map(city => CLOCKS.find(([name]) => name === city)).filter((x): x is (typeof CLOCKS)[number] => Boolean(x)), [clockOrder]);
  const addPick = (label: string) => {
    const found = PICK_CATALOG.find(p => p.label === label);
    if (found && !picks.some(p => p.label === label)) setPicks(current => [...current, found]);
  };
  const reorder = <T,>(items: T[], from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return items;
    const next = [...items]; const [item] = next.splice(from, 1); if (item) next.splice(to, 0, item); return next;
  };
  const statusTone: Record<string, string> = {
    Available: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    Away: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    Busy: "border-rose-400/40 bg-rose-400/10 text-rose-300",
    "Out to Lunch": "border-orange-400/40 bg-orange-400/10 text-orange-300",
    "In a Meeting": "border-violet-400/40 bg-violet-400/10 text-violet-300",
    "On Break": "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
    "On a Call": "border-blue-400/40 bg-blue-400/10 text-blue-300",
    "Helping a User": "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    "Out of Office": "border-slate-400/40 bg-slate-400/10 text-slate-300",
  };

  if (!authReady) return <div className="grid min-h-[55vh] place-items-center text-sm text-slate-400"><div className="flex items-center gap-3"><span className="size-2 animate-pulse rounded-full bg-sky-400"/>Securing your command session…</div></div>;

  return <div className="space-y-4 text-slate-200">
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <section className="dashboard-profile-scene glass-strong overflow-hidden rounded-2xl p-4 sm:p-5">
          <div className="relative z-10 flex flex-wrap items-center gap-4">
            <div className="relative grid size-[104px] shrink-0 place-items-center">
              <div className="absolute inset-1 rotate-45 rounded-[18px] border border-sky-300/70 bg-sky-300/10 shadow-[0_0_28px_rgba(56,189,248,.3)]"/>
              <img src={`${import.meta.env.BASE_URL}frankmazerati.png`} alt="Frank Mazerati" onError={e => { e.currentTarget.style.display = "none"; }} className="relative size-[96px] border-2 border-sky-200/80 object-cover shadow-[0_0_24px_rgba(56,189,248,.28)]" style={{clipPath:"polygon(50% 0%,100% 50%,50% 100%,0% 50%)"}}/>
              <span className="absolute bottom-1 right-0 size-3.5 rounded-full border-2 border-slate-950 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]"/>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-sky-200/80">{greeting} · YOUR COMMAND IS READY</div>
              <h1 className="mt-1 font-display text-2xl font-black tracking-wide text-white sm:text-3xl">Frank Mazerati</h1>
              <div className="mt-1 text-xs font-semibold text-sky-200">Founder & Chief Principal Architect</div>
              <div className="mt-1 text-[10px] text-slate-200/80">Role: Global Admin <span className="mx-2 text-slate-400">|</span> Position: Chief Principal Architect and Design Engineer</div>
              <p className="mt-2 text-[10px] text-slate-200/75">Every ticket you close makes someone's day easier.</p>
            </div>
            <div className="flex min-w-[150px] flex-col items-start gap-2 sm:items-end">
              <span className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-300/75">Availability</span>
              <select aria-label="Availability status" value={availability} onChange={e => { const value = e.target.value as Availability; setAvailability(value); work.setAvailability(value); }} className={cn("h-8 max-w-[155px] rounded-full border px-3 text-[11px] font-bold outline-none backdrop-blur-md", statusTone[availability] || "border-sky-300/40 bg-sky-300/10 text-sky-100")}>
                {AVAILABILITY.map(status => <option key={status} value={status} className="bg-[#0a172b] text-white">{status}</option>)}
              </select>
            </div>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 sm:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.14em] text-slate-300/75"><Clock3 className="size-3 text-sky-200"/> Local time</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-white">{now ? now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "--:--"}</div>
              <div className="text-[9px] text-slate-300/70">{now ? now.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"}) : "Local date"}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.14em] text-slate-300/75"><CloudSun className="size-3 text-sky-200"/> Local weather</div>
              <div className="mt-1 text-xs font-semibold text-white">Not connected</div>
              <div className="text-[9px] text-slate-300/70">Weather service required</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.14em] text-slate-300/75"><CalendarDays className="size-3 text-sky-200"/> Time of day</div>
              <div className="mt-1 text-xs font-semibold text-white">{greeting}</div>
              <div className="text-[9px] text-slate-300/70">Based on local device time</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.14em] text-slate-300/75"><ShieldCheck className="size-3 text-sky-200"/> Session</div>
              <div className="mt-1 text-xs font-semibold text-emerald-200">Authenticated</div>
              <div className="text-[9px] text-slate-300/70">Supabase session verified</div>
            </div>
          </div>

          <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            <div className="font-display text-[9px] font-black uppercase tracking-[.13em] text-slate-100">SEE EVERYTHING <span className="text-sky-200">LOCALLY.</span> CONNECT EVERYTHING <span className="text-sky-200">GLOBALLY.</span> POWERED BY <span className="text-sky-200">INTELLIGENCE.</span></div>
            <div className="text-[8px] font-bold uppercase tracking-[.12em] text-slate-300/70">ONE WORLD · ONE SYSTEM · ONE INTELLIGENT NETWORK</div>
          </div>

          <div className="relative z-10 mt-4 grid gap-3 border-t border-white/10 pt-3 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="mb-2 text-[9px] font-bold uppercase tracking-[.16em] text-sky-200">Identity record · system controlled</div>
              <div className="space-y-1.5">
                {[
                  ["Company ID", "Assigned by IntelliStack IAM"],
                  ["Global User ID", "Assigned by IntelliStack IAM"],
                  ["Department", "Manager assigned"],
                ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-white/10 py-1.5"><span className="text-[10px] text-slate-300/70">{label}</span><span className="text-right text-[11px] font-semibold text-slate-100">{value}</span></div>)}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[9px] font-bold uppercase tracking-[.16em] text-sky-200">Work contact · user managed</div>
              <div className="space-y-1.5">
                {[
                  ["Work email", "Profile record"],
                  ["Work phone", "Profile record"],
                  ["Work location", "Profile record"],
                ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-white/10 py-1.5"><span className="text-[10px] text-slate-300/70">{label}</span><span className="text-right text-[11px] font-semibold text-slate-100">{value}</span></div>)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 backdrop-blur-md lg:col-span-2">
              <div className="text-[9px] font-bold uppercase tracking-[.16em] text-sky-200">Manager · read-only reporting record</div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-semibold text-slate-100">Assigned manager and manager contact</span><span className="text-[10px] text-slate-300/65">Populated from the organization reporting structure</span></div>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-300/15 bg-slate-950/10 px-2 py-2 backdrop-blur-md">
      <div className="mr-1 flex min-w-[105px] items-center gap-2 px-2">
        <Clock3 className="size-3.5 text-sky-300"/>
        <span className="font-display text-[9px] font-bold uppercase tracking-[.14em] text-slate-300">Global Time</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {clocks.slice(0, clockExpanded ? 10 : 5).map(([city, zone]) => {
          const idx = clockOrder.indexOf(city);
          return <div key={city} draggable={clockManager} onDragStart={() => setClockDrag(idx)} onDragOver={e => { if (clockManager) e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (clockManager && clockDrag !== null) setClockOrder(order => reorder(order, clockDrag, idx)); setClockDrag(null); }} className={cn("glass flex min-w-[104px] items-center gap-1.5 rounded-md px-2 py-1", clockManager && "cursor-grab border-dashed border-sky-300/50", clockDrag === idx && "opacity-40")}>
            {clockManager && <GripVertical className="size-3 shrink-0 text-sky-300"/>}
            <div className="min-w-0 flex-1"><div className="truncate text-[8px] font-semibold uppercase tracking-[.12em] text-slate-400">{city}</div><div className="font-mono text-[13px] font-bold leading-tight tabular-nums text-white">{now ? now.toLocaleTimeString([], { timeZone: zone, hour: "2-digit", minute: "2-digit" }) : "--:--"}</div></div>
          </div>;
        })}
      </div>
      <div className="flex items-center gap-1.5 px-1">
        <button type="button" onClick={() => setClockManager(v => !v)} className="rounded-md border border-sky-300/20 px-2 py-1 text-[9px] font-semibold text-sky-200 hover:bg-sky-300/10">{clockManager ? "Done" : "Reorder"}</button>
        <button type="button" onClick={() => setClockExpanded(v => !v)} className="rounded-md border border-sky-300/20 px-2 py-1 text-[9px] font-semibold text-sky-200 hover:bg-sky-300/10">{clockExpanded ? "5 clocks" : "10 clocks"}</button>
      </div>
    </section>

        <section className="glass overflow-hidden rounded-xl px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-display text-[9px] font-black uppercase tracking-[.16em] text-sky-300"><TrendingUp className="size-3.5"/> Market Watch</div>
            <span className="text-[8px] font-semibold uppercase tracking-wider text-amber-300">Live data connector required</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {["DOW","S&P 500","NASDAQ","NYSE","RUSSELL 2000","GLOBAL"].map(symbol => <div key={symbol} className="min-w-0 border-l border-sky-300/20 pl-2">
              <div className="truncate text-[9px] font-bold tracking-wide text-slate-200">{symbol}</div>
              <div className="mt-0.5 text-[8px] text-slate-500">Awaiting market feed</div>
            </div>)}
          </div>
        </section>

        <Panel title="Quick Picks" icon={Sparkles} action={<button type="button" onClick={() => setPickEditor(v => !v)} className="inline-flex items-center gap-1 rounded-md border border-sky-400/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300 hover:bg-sky-400/10">{pickEditor ? "Finish" : <><Plus className="size-3"/> Manage</>}</button>}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {picks.map((pick, index) => <div key={pick.label} draggable={pickEditor} onDragStart={() => setPickDrag(index)} onDragOver={e => { if (pickEditor) e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (pickDrag !== null) setPicks(items => reorder(items, pickDrag, index)); setPickDrag(null); }} className={cn("group relative", pickEditor && "cursor-grab", pickDrag === index && "opacity-40")}>
              <Link to="/m/$section/$group/$page" params={{section:pick.section,group:pick.group,page:pick.page}} className="flex min-h-[54px] items-center gap-2 rounded-lg border border-sky-400/20 bg-[#071225] px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:border-sky-300/60 hover:bg-[#102542]">
                {pickEditor ? <GripVertical className="size-3 shrink-0 text-sky-400"/> : pickIcon(pick.icon)}
                <span className="leading-tight">{pick.label}</span>
              </Link>
              {pickEditor && <button type="button" aria-label={"Remove "+pick.label} onClick={() => setPicks(items => items.filter(p => p.label !== pick.label))} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-rose-400/50 bg-[#31101a] text-rose-300"><X className="size-3"/></button>}
            </div>)}
          </div>
          {pickEditor && <div className="mt-3 border-t border-sky-400/15 pt-3"><div className="mb-2 text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">Add a shortcut</div><div className="flex flex-wrap gap-2">{PICK_CATALOG.filter(p => !picks.some(current => current.label === p.label)).map(p => <button key={p.label} type="button" onClick={() => addPick(p.label)} className="inline-flex items-center gap-1 rounded-md border border-sky-400/20 bg-sky-400/5 px-2 py-1.5 text-[10px] font-semibold text-sky-200 hover:bg-sky-400/15"><Plus className="size-3"/>{p.label}</button>)}</div><p className="mt-2 text-[9px] text-slate-500">Drag to reorder · remove with × · your choices are saved on this device</p></div>}
        </Panel>

        <Panel title="Bring the Work to You" icon={Activity} action={<span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-300">Awaiting live data connection</span>}>
          <div className="mb-3 flex flex-wrap gap-1.5">{WORK_TABS.map(tab => <button key={tab} type="button" onClick={() => setWorkTab(tab)} className={cn("rounded-md border px-3 py-1.5 text-[10px] font-bold", workTab === tab ? "border-sky-400/50 bg-sky-400/15 text-sky-200" : "border-slate-700 bg-[#071225] text-slate-400 hover:text-white")}>{tab}</button>)}</div>
          <div className="rounded-lg border border-dashed border-sky-400/20 bg-[#071225] px-4 py-6 text-center"><div className="mx-auto mb-2 grid size-9 place-items-center rounded-full border border-sky-400/25 bg-sky-400/10"><BriefcaseBusiness className="size-4 text-sky-300"/></div><div className="text-xs font-semibold text-slate-200">{workTab}</div><p className="mt-1 text-[10px] text-slate-500">Role-based work items will appear here when ticket and workflow records are connected.</p>{work.activeTicketId && <Link to="/m/$section/$group/$page" params={{section:"service-desk-and-enterprise-operations",group:"ticket-management",page:"active-ticket-workspace"}} className="mt-3 inline-block text-xs font-semibold text-sky-300 hover:underline">Continue {work.activeTicketId}</Link>}</div>
        </Panel>

        <Panel title="Operations & Intelligence" icon={Radar}>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["Network Operations", "Infrastructure health, service status and alerts.", "service-desk-and-enterprise-operations","noc-overview","network-operations-dashboard",<Radar className="size-4"/>],
              ["Security Operations", "Security posture, threat signals and incidents.", "security-risk-and-governance","security-overview","security-operations-dashboard",<ShieldCheck className="size-4"/>],
              ["Governance & Audit", "Approvals, audit trails and compliance activity.", "security-risk-and-governance","audit-management","ticket-audit-archive",<CheckCircle2 className="size-4"/>],
              ["Knowledge & Learning", "Guides, runbooks and training resources.", "account-and-administration","training-and-learning","learning-paths",<BookOpen className="size-4"/>],
            ].map(([title,desc,section,group,page,icon]) => <Link key={String(title)} to="/m/$section/$group/$page" params={{section:String(section),group:String(group),page:String(page)}} className="flex items-start gap-3 rounded-lg border border-sky-400/15 bg-[#071225] p-3 hover:border-sky-300/50"><span className="mt-0.5 text-sky-300">{icon}</span><span><span className="block text-xs font-semibold text-slate-100">{String(title)}</span><span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{String(desc)}</span></span></Link>)}
          </div>
        </Panel>

        <Panel title="News & Intelligence Feed" icon={Megaphone}>
          <div className="space-y-1.5">{news.map((source,index) => <div key={source} className="flex items-center gap-2 rounded-md border border-slate-700/60 bg-[#071225] px-3 py-2"><span className="flex-1 text-[11px] font-semibold text-slate-200">{source}</span><span className="text-[9px] text-slate-500">Source not connected</span><button type="button" aria-label="Move up" onClick={() => setNews(items => reorder(items,index,index-1))} className="text-slate-500 hover:text-sky-300"><ArrowUp className="size-3"/></button><button type="button" aria-label="Move down" onClick={() => setNews(items => reorder(items,index,index+1))} className="text-slate-500 hover:text-sky-300"><ArrowDown className="size-3"/></button><button type="button" aria-label="Remove news source" onClick={() => setNews(items => items.filter(item => item !== source))} className="text-slate-500 hover:text-rose-300"><X className="size-3"/></button></div>)}</div>
          <form className="mt-2 flex gap-2" onSubmit={e => {e.preventDefault(); const value=newNews.trim(); if(value && !news.includes(value)) setNews(items=>[...items,value]); setNewNews("");}}><input value={newNews} onChange={e=>setNewNews(e.target.value)} placeholder="Add a news category" className="h-8 min-w-0 flex-1 rounded-md border border-slate-700 bg-[#071225] px-3 text-xs text-white outline-none focus:border-sky-400"/><button type="submit" aria-label="Add news category" className="grid size-8 place-items-center rounded-md border border-sky-400/30 text-sky-300"><Plus className="size-4"/></button></form>
        </Panel>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-28">
        <div className="rounded-xl border border-sky-400/25 bg-[#0a172b] shadow-[0_12px_34px_rgba(0,0,0,.24)]"><HelpBuddyPanel/></div>
        <Panel title="Command Status" icon={ShieldCheck}>
          <div className="space-y-3">
            {[["Identity & Access","Role governed"],["Service Desk","Awaiting connection"],["Network Operations","Awaiting connection"],["Security Operations","Awaiting connection"]].map(([label,value],i)=><div key={label} className="flex items-center justify-between gap-2"><span className="text-[10px] text-slate-400">{label}</span><span className={cn("text-[9px] font-bold",i===0?"text-emerald-300":"text-amber-300")}>{value}</span></div>)}
          </div>
        </Panel>
        <Panel title="Market Watch" icon={TrendingUp} action={<span className="text-[9px] font-bold text-amber-300">FEED NOT CONNECTED</span>}>
          <div className="space-y-2">{["DOW JONES","S&P 500","NASDAQ","NYSE","RUSSELL 2000"].map(symbol=><div key={symbol} className="flex items-center justify-between border-b border-slate-700/50 pb-2 last:border-0 last:pb-0"><span className="text-[10px] font-bold tracking-wide text-slate-300">{symbol}</span><span className="text-[9px] text-slate-500">Awaiting market data</span></div>)}</div>
        </Panel>
      </aside>
    </div>


  </div>;
}
