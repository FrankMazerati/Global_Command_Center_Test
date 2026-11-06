import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, AlertOctagon, AlertTriangle, CheckCircle2, Flame, Gauge, Inbox, Rocket, Siren, Timer, TrendingUp, User, Users, Zap,
} from "lucide-react";
import hero from "@/assets/command-center.jpg";
import { Shell } from "@/components/intellidesk/Shell";
import { Panel, PriorityBadge, SlaCountdown, Stars, useNow } from "@/components/intellidesk/bits";
import { applyFilter, earnedStars, slaState, useStore, type Filter } from "@/lib/intellidesk/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IntelliDesk Mission Control — IntelliStack" },
      { name: "description", content: "Intelligent service operations: accept missions, complete objectives, earn recognition stars." },
      { property: "og:title", content: "IntelliDesk Mission Control" },
      { property: "og:description", content: "Service operations reimagined as missions with star-based objectives." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const s = useStore();
  const now = useNow();
  const me = s.technicians.find((t) => t.name === s.me);
  const n = (f: Filter) => (now ? applyFilter(s.missions, f, me, now).length : 0);
  const metrics: { label: string; f: Filter; icon: typeof Inbox; tone?: string }[] = [
    { label: "Active Missions", f: "Active", icon: Activity },
    { label: "Unassigned", f: "Unassigned", icon: Inbox },
    { label: "My Active Missions", f: "Assigned to Me", icon: User },
    { label: "Critical", f: "Critical", icon: Flame, tone: "text-critical" },
    { label: "High Priority", f: "High", icon: Zap, tone: "text-high" },
    { label: "SLA Warnings", f: "SLA Warning", icon: Timer, tone: "text-high" },
    { label: "SLA Breaches", f: "SLA Breached", icon: AlertOctagon, tone: "text-critical" },
    { label: "Escalated", f: "Escalated", icon: Siren, tone: "text-critical" },
    { label: "Completed", f: "Completed", icon: CheckCircle2, tone: "text-success" },
  ];
  const active = s.missions.filter((m) => m.status !== "Closed");
  const critical = active.filter((m) => m.priority === "Critical");
  const slaAlerts = now ? active.filter((m) => slaState(m, now) !== "ok").slice(0, 4) : [];
  const recent = s.missions.flatMap((m) => m.log.map((l) => ({ ...l, id: m.id }))).sort((a, b) => b.at - a.at).slice(0, 6);
  const closed = s.missions.filter((m) => m.status === "Closed");
  const met = now ? closed.filter((m) => slaState(m, now) === "met").length : 0;

  return (
    <Shell crumbs={[{ label: "Mission Control Overview" }]}>
      <div className="relative mb-4 overflow-hidden rounded-xl border glow">
        <img src={hero} alt="IntelliDesk operations center" width={1920} height={832} className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="relative bg-gradient-to-r from-background/95 via-background/70 to-transparent p-5 sm:p-8">
          <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-4xl"><Rocket className="h-8 w-8 text-glow" />IntelliDesk</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Mission Control · Intelligent IT Service Operations</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/missions" search={{ filter: "Available to Accept" }} className="tap inline-flex items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground glow">Find a Mission</Link>
            <Link to="/missions" search={{ filter: "Assigned to Me" }} className="tap inline-flex items-center rounded-lg border bg-secondary/70 px-4 text-sm font-semibold">My Missions</Link>
            {me && (
              <Link to="/technicians/$name" params={{ name: me.name }} className="tap inline-flex items-center gap-2 rounded-lg border bg-secondary/70 px-4 text-sm">
                L{me.level} · <Stars earned={1} total={1} /> {me.stars}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {metrics.map(({ label, f, icon: I, tone }) => (
              <Link key={label} to="/missions" search={{ filter: f }} className="glass tap flex flex-col gap-1 p-4">
                <span className="flex items-center gap-2 text-xs text-muted-foreground"><I className={`h-4 w-4 ${tone ?? "text-glow"}`} />{label}</span>
                <span className={`font-display text-3xl font-bold ${tone ?? ""}`}>{now ? n(f) : "–"}</span>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Team Workload" icon={<Users className="h-4 w-4 text-glow" />}>
              <div className="space-y-2">
                {["L1 Support", "L2 Support", "L3 Engineering", "Network Ops", "Security Ops"].map((t) => {
                  const c = active.filter((m) => m.team === t).length;
                  return (
                    <Link key={t} to="/missions" search={{ filter: "All", team: t }} className="tap flex items-center gap-3 rounded-lg px-2 text-xs hover:bg-accent/40">
                      <span className="w-28 shrink-0">{t}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, c * 22)}%` }} /></span>
                      <span className="w-14 text-right text-muted-foreground">{c} active</span>
                    </Link>
                  );
                })}
              </div>
            </Panel>
            <Panel title="Mission Performance" icon={<TrendingUp className="h-4 w-4 text-glow" />}>
              <div className="grid grid-cols-2 gap-3 text-center">
                <Link to="/history" className="tap rounded-lg bg-muted/40 p-3"><div className="font-display text-2xl font-bold text-success">{closed.length}</div><div className="text-xs text-muted-foreground">Missions closed</div></Link>
                <Link to="/history" className="tap rounded-lg bg-muted/40 p-3"><div className="font-display text-2xl font-bold">{closed.length ? Math.round((met / closed.length) * 100) : 0}%</div><div className="text-xs text-muted-foreground">SLA met (closed)</div></Link>
                <Link to="/technicians" className="tap rounded-lg bg-muted/40 p-3"><div className="font-display text-2xl font-bold text-star">{s.missions.reduce((a, m) => a + earnedStars(m), 0)}</div><div className="text-xs text-muted-foreground">Stars earned on missions</div></Link>
                <Link to="/missions" search={{ filter: "SLA Breached" }} className="tap rounded-lg bg-muted/40 p-3"><div className="font-display text-2xl font-bold text-critical">{n("SLA Breached")}</div><div className="text-xs text-muted-foreground">Open breaches</div></Link>
              </div>
            </Panel>
          </div>

          <Panel title="Recent Mission Activity" icon={<Activity className="h-4 w-4 text-glow" />} action={<Link to="/history" className="text-xs text-glow">View all</Link>}>
            <ul className="divide-y divide-border">
              {recent.map((r, i) => (
                <li key={i}>
                  <Link to="/briefing/$id" params={{ id: r.id }} className="tap flex items-center gap-3 px-1 py-2 text-xs">
                    <span className="font-mono text-glow">{r.id}</span>
                    <span className="flex-1 truncate">{r.text}</span>
                    <span className="text-muted-foreground">{now ? `${Math.max(0, Math.round((now - r.at) / 60000))}m ago` : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Right-side operations panel */}
        <aside className="space-y-4">
          <Panel title="Mission Queue" icon={<Inbox className="h-4 w-4 text-glow" />} action={<Link to="/missions" className="text-xs text-glow">Open</Link>}>
            {(["Critical", "High", "Normal", "Low"] as const).map((p) => (
              <Link key={p} to="/missions" search={{ filter: p }} className="tap flex items-center justify-between rounded-lg px-2 text-sm hover:bg-accent/40">
                <PriorityBadge p={p} /><span className="font-display text-lg font-bold">{active.filter((m) => m.priority === p).length}</span>
              </Link>
            ))}
          </Panel>
          <Panel title="Critical Mission Alerts" icon={<AlertTriangle className="h-4 w-4 text-critical" />}>
            <div className="space-y-2">
              {critical.map((m) => (
                <Link key={m.id} to="/briefing/$id" params={{ id: m.id }} className="tap block rounded-lg border border-critical/40 bg-critical/10 p-2 text-xs">
                  <div className="flex justify-between"><span className="font-mono">{m.id}</span><SlaCountdown m={m} now={now} compact /></div>
                  <div className="truncate font-medium">{m.title}</div>
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="SLA Countdown Alerts" icon={<Timer className="h-4 w-4 text-high" />}>
            <div className="space-y-1">
              {slaAlerts.length === 0 && <p className="text-xs text-muted-foreground">No SLA risks right now.</p>}
              {slaAlerts.map((m) => (
                <Link key={m.id} to="/briefing/$id" params={{ id: m.id }} className="tap flex items-center justify-between rounded-lg px-2 text-xs hover:bg-accent/40">
                  <span className="truncate pr-2">{m.id} · {m.title}</span><SlaCountdown m={m} now={now} compact />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Team Readiness & Availability" icon={<Gauge className="h-4 w-4 text-glow" />}>
            <div className="space-y-1">
              {s.technicians.map((t) => (
                <Link key={t.name} to="/technicians/$name" params={{ name: t.name }} className="tap flex items-center gap-2 rounded-lg px-2 text-xs hover:bg-accent/40">
                  <span className={`h-2 w-2 rounded-full ${t.availability === "Available" ? "bg-success" : t.availability === "On Mission" ? "bg-primary" : "bg-muted-foreground"}`} />
                  <span className="flex-1">{t.name}</span>
                  <span className="rounded border px-1.5 text-[10px]">L{t.level}</span>
                  <span className="w-20 text-right text-muted-foreground">{t.availability}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </Shell>
  );
}
