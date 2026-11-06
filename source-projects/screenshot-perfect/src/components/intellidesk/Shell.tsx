import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell, BookOpen, Building2, Calendar, ChevronRight, Cloud, Code2, Contact, FolderTree, Headphones, HelpCircle, Home,
  Info, Lock, Menu, MessageSquare, RefreshCw, Search, Server, ShieldCheck, Briefcase, Plug, X, Clock,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resetDemo, setState, useStore } from "@/lib/intellidesk/store";
import { useNow } from "./bits";

const OUTSIDE = [
  { t: "Home", i: Home }, { t: "About Us", i: Info }, { t: "Contact Us", i: Contact }, { t: "New Active Directory", i: FolderTree },
  { t: "IntelliConnect", i: Plug }, { t: "IntelliSync", i: RefreshCw }, { t: "Connect & Build", i: Code2 },
];
const OUTSIDE2 = [
  { t: "IntelliAccess", i: Lock }, { t: "IntelliChat", i: MessageSquare }, { t: "IntelliCalendar", i: Calendar }, { t: "IntelliDrive", i: Cloud },
  { t: "IntelliSearch", i: Search }, { t: "Business Center", i: Building2 }, { t: "Workspace & Productivity", i: Briefcase },
];

const DESK_NAV = [
  { to: "/", label: "Mission Control" },
  { to: "/missions", label: "Mission Queue" },
  { to: "/history", label: "Mission History" },
  { to: "/technicians", label: "Technicians & Levels" },
  { to: "/templates", label: "Mission Templates" },
] as const;

export type Crumb = { label: string; to?: string; params?: Record<string, string>; search?: Record<string, string> };

export function Shell({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [buddy, setBuddy] = useState(false);
  const s = useStore();
  const now = useNow(30_000);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const outside = (t: string) => toast.info(`${t} is a separate Command Center module`, { description: "Not part of this IntelliDesk build." });
  const alerts = s.missions.filter((m) => m.priority === "Critical" && m.status !== "Closed").length;

  const nav = (
    <nav className="flex flex-col gap-0.5 p-2 text-sm">
      {OUTSIDE.map(({ t, i: I }) => (
        <button key={t} onClick={() => outside(t)} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-left text-muted-foreground hover:bg-accent/50 hover:text-foreground">
          <I className="h-4 w-4" />{t}
        </button>
      ))}
      <div className="my-1 rounded-lg border border-primary/60 bg-primary/15 glow">
        <div className="flex min-h-10 items-center gap-3 px-3 font-semibold text-foreground"><Headphones className="h-4 w-4 text-glow" />IntelliDesk</div>
        {DESK_NAV.map((n) => (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
            className={cn("flex min-h-10 items-center pl-10 pr-3 text-xs", (n.to === "/" ? path === "/" : path.startsWith(n.to)) ? "font-semibold text-glow" : "text-muted-foreground hover:text-foreground")}>
            {n.label}
          </Link>
        ))}
      </div>
      {OUTSIDE2.map(({ t, i: I }) => (
        <button key={t} onClick={() => outside(t)} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-left text-muted-foreground hover:bg-accent/50 hover:text-foreground">
          <I className="h-4 w-4" />{t}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-panel px-3 backdrop-blur">
        <button aria-label="Open navigation" onClick={() => setOpen(true)} className="tap flex w-11 items-center justify-center rounded-lg lg:hidden"><Menu className="h-5 w-5" /></button>
        <Link to="/" className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-glow" />
          <span className="font-display text-sm font-bold leading-tight">IntelliStack<br />Systems</span>
        </Link>
        <p className="hidden truncate border-l pl-3 text-xs text-muted-foreground xl:block">One Intelligent Network. Control Everything Centrally. Connect Everything Globally.</p>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/missions" search={{ filter: "Critical" }} aria-label="Critical alerts" className="tap relative flex w-11 items-center justify-center rounded-lg">
            <Bell className="h-5 w-5" />
            {alerts > 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-critical px-1 text-[10px] font-bold">{alerts}</span>}
          </Link>
          <select
            aria-label="Demo role"
            value={s.role}
            onChange={(e) => { setState((x) => ({ ...x, role: e.target.value as "Technician" | "Manager" })); toast(`Demo role: ${e.target.value}`); }}
            className="h-10 rounded-lg border bg-secondary px-2 text-xs"
          >
            <option>Technician</option><option>Manager</option>
          </select>
          <Link to="/technicians/$name" params={{ name: s.me }} className="hidden text-xs font-medium sm:block">{s.me}</Link>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r bg-panel lg:block">{nav}</aside>
        {open && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="w-72 overflow-y-auto border-r bg-popover">
              <div className="flex justify-end p-2"><button aria-label="Close" onClick={() => setOpen(false)} className="tap flex w-11 items-center justify-center"><X /></button></div>
              {nav}
            </div>
            <button aria-label="Close navigation" className="flex-1 bg-background/70" onClick={() => setOpen(false)} />
          </div>
        )}
        <main className="min-w-0 flex-1 p-3 pb-24 sm:p-5">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <button onClick={() => outside("Global Command Center")} className="hover:text-foreground">Global Command Center</button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => outside("Command Center")} className="hover:text-foreground">Command Center</button>
            <ChevronRight className="h-3 w-3" />
            <Link to="/" className="hover:text-foreground">IntelliDesk</Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {c.to && i < crumbs.length - 1 ? (
                  <Link to={c.to as "/"} params={c.params as never} search={c.search as never} className="hover:text-foreground">{c.label}</Link>
                ) : (
                  <span className="font-semibold text-glow">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          {children}
        </main>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 flex h-10 items-center gap-4 border-t bg-panel px-3 text-[11px] text-muted-foreground backdrop-blur">
        <span className="flex items-center gap-1 text-success"><Server className="h-3 w-3" />All Systems Online</span>
        <span className="hidden sm:inline">Platform v2.0.0 · Demo data (browser only)</span>
        <span className="hidden items-center gap-1 sm:flex"><Clock className="h-3 w-3" />{now ? new Date(now).toLocaleString() : ""}</span>
        <button onClick={() => { resetDemo(); toast.success("Demo data reset"); }} className="ml-auto underline-offset-2 hover:underline">Reset demo</button>
      </footer>

      {/* Help Buddy — existing persistent assistant (placeholder hook-in) */}
      <button onClick={() => setBuddy((b) => !b)} className="tap fixed bottom-12 right-3 z-40 flex items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground glow">
        <HelpCircle className="h-4 w-4" />Help Buddy
      </button>
      {buddy && (
        <div className="glass fixed bottom-28 right-3 z-40 w-[min(92vw,320px)] p-4 text-sm">
          <h3 className="mb-2 font-semibold">Help Buddy</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>• Touch any metric to drill into the matching missions.</li>
            <li>• Open a mission to read its Briefing, then <b className="text-foreground">Accept Mission</b>.</li>
            <li>• Objectives with evidence need notes first; some need Manager approval before stars are awarded.</li>
            <li>• Switch the demo role (top right) to Manager to approve objectives and close missions.</li>
          </ul>
          <Link to="/missions" className="mt-3 flex items-center gap-1 text-xs text-glow"><BookOpen className="h-3 w-3" />Open Mission Queue</Link>
        </div>
      )}
    </div>
  );
}
