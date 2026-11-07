import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity, ArrowDown, ArrowUp, Bell, BookOpen, BriefcaseBusiness, CalendarDays,
  CheckCircle2, Clock3, CloudSun, GripVertical, Megaphone, Search,
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
  ["Tokyo", "Asia/Tokyo"], ["Dubai", "Asia/Dubai"], ["New York", "America/New_York"],
  ["London", "Europe/London"], ["Chicago", "America/Chicago"], ["Los Angeles", "America/Los_Angeles"],
  ["Sydney", "Australia/Sydney"], ["Berlin", "Europe/Berlin"], ["Mumbai", "Asia/Kolkata"], ["São Paulo", "America/Sao_Paulo"],
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
const STOCK_CATALOG = ["AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","SPY","QQQ","DOW","S&P 500","NASDAQ","NYSE","RUSSELL 2000","GLOBAL"];
const WORK_TABS = ["Critical & Urgent", "High Priority", "Upcoming", "Follow-ups", "Help Desk / Tickets"] as const;

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(timer); }, []);
  return now;
}

function Panel({ title, icon: Icon, children, action, className }: { title: string; icon: typeof Activity; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return <section className={cn("glass rounded-lg p-2.5", className)}>
    <div className="mb-2 flex items-center gap-2"><Icon className="size-4 text-sky-300"/><h2 className="flex-1 font-display text-xs font-bold uppercase tracking-[.12em] text-slate-100">{title}</h2>{action}</div>
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
  const [clockOrder, setClockOrder] = useState<string[]>(["Tokyo","Dubai","New York","London","Chicago"]);
  const [clockManager, setClockManager] = useState(false);
  const [stockWatch, setStockWatch] = useState<string[]>(["DOW","S&P 500","NASDAQ","AAPL","MSFT","NVDA"]);
  const [stockManager, setStockManager] = useState(false);
  const [clockExpanded, setClockExpanded] = useState(false);
  const [clockDrag, setClockDrag] = useState<number | null>(null);
  const [news, setNews] = useState(NEWS_DEFAULT);
  const [newNews, setNewNews] = useState("");
  const [workTab, setWorkTab] = useState<(typeof WORK_TABS)[number]>("Critical & Urgent");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      const savedPicks = localStorage.getItem("mo:quick-picks");
      if (savedPicks) setPicks(JSON.parse(savedPicks) as Pick[]);
      const savedClocks = localStorage.getItem("mo:clock-order");
      if (savedClocks) { const saved = (JSON.parse(savedClocks) as string[]).filter(city => CLOCKS.some(([name]) => name === city)); setClockOrder(saved.length ? saved : ["Tokyo","Dubai","New York","London","Chicago"]); }
      const savedStocks = localStorage.getItem("mo:market-watch");
      if (savedStocks) setStockWatch(JSON.parse(savedStocks) as string[]);
    } catch { /* Keep the safe defaults when saved preferences are unavailable. */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("mo:quick-picks", JSON.stringify(picks)); } catch { /* Storage is optional. */ } }, [picks]);
  useEffect(() => { try { localStorage.setItem("mo:clock-order", JSON.stringify(clockOrder)); } catch { /* Storage is optional. */ } }, [clockOrder]);
  useEffect(() => { try { localStorage.setItem("mo:market-watch", JSON.stringify(stockWatch)); } catch { /* Storage is optional. */ } }, [stockWatch]);

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

  return <div className="command-dashboard space-y-2 text-slate-100">
    <div className="space-y-2">
      <section className="dashboard-profile-scene glass-strong overflow-hidden rounded-xl p-2.5 sm:p-3">
          <div className="relative z-10 flex flex-wrap items-center gap-4">
            <div className="relative grid size-[68px] shrink-0 place-items-center">
              <div className="absolute inset-1 rotate-45 rounded-[14px] border border-sky-200/60 bg-sky-100/10 shadow-[0_0_18px_rgba(56,189,248,.2)]"/>
              <span className="absolute font-display text-sm font-black text-sky-100">FM</span><img src={`${import.meta.env.BASE_URL}frankmazerati.png`} alt="Frank Mazerati" onError={e => { e.currentTarget.style.display = "none"; }} className="relative size-[50px] border border-sky-100/70 object-cover shadow-[0_0_16px_rgba(56,189,248,.2)]" style={{clipPath:"polygon(50% 0%,100% 50%,50% 100%,0% 50%)"}}/>
              <span className="absolute bottom-1 right-0 size-3.5 rounded-full border-2 border-slate-950 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]"/>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-sky-200/80">{greeting} · YOUR COMMAND IS READY</div>
              <h1 className="mt-0.5 font-display text-lg font-black tracking-wide text-white sm:text-xl">Frank Mazerati</h1>
              <div className="mt-1 text-xs font-semibold text-sky-200">Founder & Chief Principal Architect</div>
              <div className="mt-1 text-[9px] text-slate-200/80">Role: Global Admin</div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[9px] text-slate-100/85"><span>Company ID: <strong className="text-white">IntelliStack Systems</strong></span><span>User ID: <strong className="text-white">001</strong></span></div>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
              <span className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-300/75">Availability</span>
              <select aria-label="Availability status" value={availability} onChange={e => { const value = e.target.value as Availability; setAvailability(value); work.setAvailability(value); }} className={cn("h-7 max-w-[145px] rounded-full border px-2.5 text-[10px] font-bold outline-none backdrop-blur-md", statusTone[availability] || "border-sky-300/40 bg-sky-300/10 text-sky-100")}>
                {AVAILABILITY.map(status => <option key={status} value={status} className="bg-[#0a172b] text-white">{status}</option>)}
              </select>
            </div>
          </div>

          <div className="relative z-10 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-white/15 pt-1.5 text-[8px] text-slate-100/85">
            <span className="inline-flex items-center gap-1"><Clock3 className="size-3 text-sky-200"/>Local <strong className="font-mono text-[9px] font-semibold text-white tabular-nums">{now ? now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "--:--"}</strong></span>
            <span className="text-slate-200/65">{now ? now.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"}) : "Local date"}</span>
            <span className="inline-flex items-center gap-1"><CloudSun className="size-3 text-sky-200"/>Weather: <strong className="font-semibold text-white">Not connected</strong></span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-200"/>Authenticated</span>
          </div>

          <div className="relative z-10 mt-1.5 flex flex-wrap items-center justify-between gap-1 border-t border-white/10 pt-1.5">
            <div className="font-display text-[8px] font-black uppercase tracking-[.1em] text-slate-100">SEE EVERYTHING <span className="text-sky-200">LOCALLY.</span> CONNECT EVERYTHING <span className="text-sky-200">GLOBALLY.</span> POWERED BY <span className="text-sky-200">INTELLIGENCE.</span></div>
            <div className="text-[7px] font-bold uppercase tracking-[.1em] text-slate-300/70">ONE WORLD · ONE SYSTEM · ONE INTELLIGENT NETWORK</div>
          </div>


        </section>
      <section className="utility-rail glass rounded-xl p-2 space-y-2">
      <section className="global-time-strip flex min-h-0 flex-wrap items-center gap-2 border-y border-white/15 px-1 py-1">
        <div className="flex items-center gap-1.5 pr-2 text-sky-200"><Clock3 className="size-3"/><span className="font-display text-[8px] font-bold uppercase tracking-[.12em]">Global Time</span></div>
        <div className="global-clock-list flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          {clocks.slice(0, clockExpanded ? 10 : 5).map(([city, zone]) => {
            const idx = clockOrder.indexOf(city);
            return <div key={city} draggable={clockManager} onDragStart={() => setClockDrag(idx)} onDragOver={e => { if (clockManager) e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (clockManager && clockDrag !== null) setClockOrder(order => reorder(order, clockDrag, idx)); setClockDrag(null); }} className={cn("global-clock-item flex items-center gap-1", clockManager && "cursor-grab", clockDrag === idx && "opacity-40")}>
              {clockManager && <GripVertical className="size-2.5 text-sky-300/70"/>}
              <span className="text-[7px] font-semibold uppercase tracking-[.08em] text-slate-300/70">{city}</span>
              <span className="font-mono text-[9px] leading-none tabular-nums text-white">{now ? now.toLocaleTimeString([], {timeZone:zone,hour:"2-digit",minute:"2-digit"}) : "--:--"}</span>
              {clockManager && <button type="button" aria-label={"Remove "+city} onClick={() => setClockOrder(items => items.filter(x => x !== city))} className="grid size-4 place-items-center rounded-full border border-sky-300/30 text-sky-100 hover:bg-sky-400/20"><X className="size-2.5"/></button>}
            </div>;
          })}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Manage global clocks" onClick={() => {setClockManager(v=>!v);setClockExpanded(true);}} className="holo-control grid size-6 place-items-center rounded-full text-sky-100">{clockManager ? <X className="size-3"/> : <GripVertical className="size-3"/>}</button>
          <button type="button" aria-label={clockExpanded ? "Show five clocks" : "Show all clocks"} onClick={() => setClockExpanded(v=>!v)} className="holo-control grid size-6 place-items-center rounded-full text-sky-100">{clockExpanded ? <ArrowUp className="size-3"/> : <ArrowDown className="size-3"/>}</button>
          {clockManager && <select aria-label="Add a global clock" value="" onChange={e=>{if(e.target.value)setClockOrder(items=>items.includes(e.target.value)?items:[...items,e.target.value]);}} className="holo-control h-6 max-w-[110px] rounded-full px-1.5 text-[8px] text-sky-100"><option value="" className="bg-slate-900">+ Add city</option>{CLOCKS.filter(([city])=>!clockOrder.includes(city)).map(([city])=><option key={city} value={city} className="bg-slate-900">{city}</option>)}</select>}
        </div>
      </section>
      <div className="global-news-row flex min-w-0 flex-wrap items-center gap-2 border-t border-white/15 px-1 pt-2">
        <span className="shrink-0 font-display text-[8px] font-bold uppercase tracking-[.12em] text-sky-200">Global News</span>
        {news.map((source) => <span key={source} className="inline-flex items-center gap-1 rounded-full border border-sky-200/20 bg-white/[.06] px-2 py-1 text-[9px] text-white/90">{source}{<button type="button" aria-label={"Remove "+source} onClick={() => setNews(items => items.filter(item => item !== source))} className="text-sky-100/70 hover:text-rose-200"><X className="size-2.5"/></button>}</span>)}
        <form className="ml-auto flex gap-1" onSubmit={e=>{e.preventDefault();const v=newNews.trim();if(v&&!news.includes(v))setNews(items=>[...items,v]);setNewNews("");}}><input aria-label="Add global news category" value={newNews} onChange={e=>setNewNews(e.target.value)} placeholder="Add news" className="h-6 w-24 rounded-md border border-sky-200/20 bg-white/[.06] px-2 text-[9px] text-white placeholder:text-white/50"/><button type="submit" aria-label="Add news category" className="holo-control grid size-6 place-items-center rounded-md"><Plus className="size-3"/></button></form>
      </div>
      <section className="market-watch-strip glass overflow-hidden rounded-lg px-2 py-1.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-display text-[9px] font-black uppercase tracking-[.16em] text-sky-300"><TrendingUp className="size-3.5"/> Market Watch</div>
            <button type="button" onClick={() => setStockManager(v => !v)} className="rounded-md border border-sky-300/25 px-2 py-1 text-[9px] font-semibold text-sky-200 hover:bg-sky-300/10">{stockManager ? "Done" : "Manage"}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {stockWatch.map(symbol => <div key={symbol} className="flex min-w-[74px] items-center gap-1 border-l border-sky-300/20 pl-2">
              <div><div className="text-[9px] font-bold tracking-wide text-slate-100">{symbol}</div><div className="text-[8px] text-slate-400">Feed unavailable</div></div>
              {stockManager && <button type="button" aria-label={"Remove "+symbol} onClick={() => setStockWatch(items => items.filter(x => x !== symbol))} className="ml-1 text-rose-300"><X className="size-3"/></button>}
            </div>)}
          </div>
          {stockManager && <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">{STOCK_CATALOG.filter(x => !stockWatch.includes(x)).map(symbol => <button type="button" key={symbol} onClick={() => setStockWatch(items => [...items,symbol])} className="rounded-md border border-sky-300/20 px-2 py-1 text-[9px] text-sky-100 hover:bg-sky-300/10"><Plus className="mr-1 inline size-3"/>{symbol}</button>)}</div>}
          
        </section>
      <div className="company-announcements flex min-w-0 items-center gap-2 border-t border-white/15 px-1 pt-2 text-[9px] text-white/85"><Megaphone className="size-3 shrink-0 text-sky-200"/><span className="font-display text-[8px] font-bold uppercase tracking-[.12em] text-sky-200">Company Announcements</span><span className="min-w-0">No new company announcements</span></div>
    </section>
    </div>
    <Panel title="Global Search" icon={Search} className="w-full">
      <form className="flex w-full items-center gap-2" onSubmit={e=>{e.preventDefault();const q=searchQuery.trim().toLowerCase();const match=PICK_CATALOG.find(p=>p.label.toLowerCase().includes(q));if(match)navigate({to:"/m/$section/$group/$page",params:{section:match.section,group:match.group,page:match.page}});}}>
        <Search className="size-3.5 shrink-0 text-sky-200"/>
        <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search people, services, tickets, systems…" aria-label="Global Search" className="h-8 min-w-0 flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-white/55"/>
        <button type="submit" className="holo-control rounded-md px-3 py-1 text-[9px] font-bold">Search</button>
      </form>
    </Panel>
      <Panel title="Quick Picks" icon={Sparkles} action={<button type="button" onClick={() => setPickEditor(v => !v)} className="inline-flex items-center gap-1 rounded-md border border-sky-400/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300 hover:bg-sky-400/10">{pickEditor ? "Finish" : <><Plus className="size-3"/> Manage</>}</button>}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {picks.map((pick, index) => <div key={pick.label} draggable={pickEditor} onDragStart={() => setPickDrag(index)} onDragOver={e => { if (pickEditor) e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (pickDrag !== null) setPicks(items => reorder(items, pickDrag, index)); setPickDrag(null); }} className={cn("group relative", pickEditor && "cursor-grab", pickDrag === index && "opacity-40")}>
              <Link to="/m/$section/$group/$page" params={{section:pick.section,group:pick.group,page:pick.page}} className="holo-control flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-slate-100 transition">
                {pickEditor ? <GripVertical className="size-3 shrink-0 text-sky-400"/> : pickIcon(pick.icon)}
                <span className="leading-tight">{pick.label}</span>
              </Link>
              {pickEditor && <button type="button" aria-label={"Remove "+pick.label} onClick={() => setPicks(items => items.filter(p => p.label !== pick.label))} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-rose-400/50 bg-[#31101a] text-rose-300"><X className="size-3"/></button>}
            </div>)}
          </div>
          {pickEditor && <div className="mt-3 border-t border-sky-400/15 pt-3"><div className="mb-2 text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">Add a shortcut</div><div className="flex flex-wrap gap-2">{PICK_CATALOG.filter(p => !picks.some(current => current.label === p.label)).map(p => <button key={p.label} type="button" onClick={() => addPick(p.label)} className="inline-flex items-center gap-1 rounded-md border border-sky-400/20 bg-sky-400/5 px-2 py-1.5 text-[10px] font-semibold text-sky-200 hover:bg-sky-400/15"><Plus className="size-3"/>{p.label}</button>)}</div><p className="mt-2 text-[9px] text-slate-500">Drag to reorder · remove with × · your choices are saved on this device</p></div>}
        </Panel>
    <div className="dashboard-layout grid gap-2">
      <main className="dashboard-work min-w-0 min-h-0">
                <Panel className="h-full overflow-y-auto" title="Bring the Work to You" icon={Activity} action={<span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-300">Awaiting live data connection</span>}>
          <div className="mb-2 flex flex-wrap gap-1">{WORK_TABS.map(tab => <button key={tab} type="button" onClick={() => setWorkTab(tab)} className={cn("rounded-md border px-2.5 py-1 text-[9px] font-bold", workTab === tab ? "border-sky-200/50 bg-sky-200/15 text-white" : "border-white/20 bg-white/5 text-slate-200/75 hover:bg-white/10")}>{tab}</button>)}</div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[["Today’s Work","Tasks and actions assigned to your role."],["Upcoming Commitments","Meetings, due dates and scheduled work."],["Pending Decisions","Approvals and items awaiting your direction."],["Recent Activity","Work completed and updates from your teams."]].map(([title,description]) => <div key={title} className="rounded-lg border border-white/15 bg-white/[.06] p-2.5"><div className="text-[10px] font-semibold text-slate-100">{title}</div><p className="mt-1 text-[9px] leading-relaxed text-slate-300/75">{description}</p><div className="mt-2 border-t border-white/10 pt-1.5 text-[8px] text-slate-400">{work.activeTicketId && title === "Today’s Work" ? "Active ticket available" : "No connected records yet"}</div></div>)}
          </div>
          {work.activeTicketId && <div className="mt-2 flex items-center justify-between rounded-lg border border-sky-300/20 bg-sky-300/[.06] px-3 py-2"><span className="text-[10px] text-slate-200">Active ticket: {work.activeTicketId}</span><Link to="/m/$section/$group/$page" params={{section:"service-desk-and-enterprise-operations",group:"ticket-management",page:"active-ticket-workspace"}} className="text-[10px] font-semibold text-sky-200 hover:underline">Continue work</Link></div>}
          <p className="mt-2 text-[8px] text-slate-400">This workspace is organized around your role. Live tasks, commitments, approvals and activity populate when their source systems are connected.</p>
        </Panel>
      </main>
            <aside className="space-y-2 xl:sticky xl:top-28">
        <div className="dashboard-helpbuddy h-full overflow-y-auto rounded-xl border border-sky-400/25 bg-[#0a172b]/40 shadow-[0_12px_34px_rgba(0,0,0,.18)]"><HelpBuddyPanel className="h-full"/></div>
        

      </aside>
    </div>
    <div className="dashboard-lower grid gap-2 lg:grid-cols-2">

              
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
    </div>
  </div>;
}
