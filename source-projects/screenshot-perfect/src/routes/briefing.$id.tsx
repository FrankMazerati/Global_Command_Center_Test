import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, HelpCircle, Link2, Rocket, Shuffle, Siren, Star } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/components/intellidesk/Shell";
import { ActionDialog } from "@/components/intellidesk/ActionDialog";
import { Btn, Panel, PriorityBadge, SlaCountdown, StatusBadge, useNow } from "@/components/intellidesk/bits";
import { acceptMission, addWorkLog, escalate, transfer } from "@/lib/intellidesk/actions";
import { possibleStars, TEAMS, useStore } from "@/lib/intellidesk/store";

export const Route = createFileRoute("/briefing/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Mission Briefing ${params.id} — IntelliDesk` },
      { name: "description", content: `Review mission ${params.id} before accepting it.` },
      { property: "og:title", content: `Mission Briefing ${params.id}` },
      { property: "og:description", content: "Priority, SLA, objectives and context for this mission." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Briefing,
});

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 border-b border-border/40 py-2 text-sm"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></div>;
}

function Briefing() {
  const { id } = Route.useParams();
  const s = useStore();
  const now = useNow();
  const [dlg, setDlg] = useState<null | "esc" | "xfer" | "clar">(null);
  const m = s.missions.find((x) => x.id === id);
  if (!s.ready) return <Shell crumbs={[{ label: "Mission Briefing" }]}><div className="glass h-40 animate-pulse" /></Shell>;
  if (!m) throw notFound();
  const mine = m.technician === s.me;
  const canAccept = !m.technician && !["Closed", "Resolved"].includes(m.status);
  const fmt = (t: number) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Shell crumbs={[{ label: "Mission Control", to: "/" }, { label: "Mission Queue", to: "/missions" }, { label: `Briefing ${m.id}` }]}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link to="/missions" className="tap inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><ArrowLeft className="h-4 w-4" />Mission Queue</Link>
        <Link to="/" className="tap inline-flex items-center rounded-lg border px-3 text-sm">Overview</Link>
      </div>

      <div className="glass glow mb-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-mono text-glow">{m.id}</span><PriorityBadge p={m.priority} /><span className="rounded border px-2 py-0.5">{m.severity}</span><StatusBadge s={m.status} /></div>
        <h1 className="mt-2 text-xl font-bold sm:text-2xl">Mission Briefing: {m.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {canAccept && <Btn onClick={() => acceptMission(m.id)}><Rocket className="h-4 w-4" />Accept Mission</Btn>}
          {(mine || (m.technician && s.role === "Manager")) && (
            <Link to="/workspace/$id" params={{ id: m.id }} className="tap inline-flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground glow">Open Mission Workspace<ArrowRight className="h-4 w-4" /></Link>
          )}
          {m.technician && !mine && <span className="flex items-center text-sm text-muted-foreground">Assigned to {m.technician}</span>}
          <Btn variant="ghost" onClick={() => setDlg("clar")}><HelpCircle className="h-4 w-4" />Request Clarification</Btn>
          <Btn variant="ghost" onClick={() => setDlg("xfer")} disabled={m.status === "Closed"}><Shuffle className="h-4 w-4" />Transfer Mission</Btn>
          <Btn variant="ghost" onClick={() => setDlg("esc")} disabled={m.status === "Closed"}><Siren className="h-4 w-4" />Escalate Mission</Btn>
        </div>
        {canAccept && <p className="mt-2 text-xs text-muted-foreground">Opening a briefing never assigns it — acceptance is recorded only when you press Accept Mission.</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Assignment">
          <Row k="Requester" v={m.requester} /><Row k="Affected user" v={m.affectedUser} /><Row k="Department" v={m.department} />
          <Row k="Device / asset" v={m.asset} /><Row k="Category" v={`${m.category} › ${m.subcategory}`} /><Row k="Assigned team" v={m.team} />
          <Row k="Technician" v={m.technician ?? "—"} /><Row k="Accepted" v={m.acceptedAt ? fmt(m.acceptedAt) : "—"} /><Row k="Estimated work" v={m.estimate} />
        </Panel>
        <Panel title="SLA">
          <Row k="Received" v={fmt(m.receivedAt)} /><Row k="Response due" v={fmt(m.responseDue)} />
          <Row k="Responded" v={m.respondedAt ? fmt(m.respondedAt) : <span className="text-high">Awaiting</span>} />
          <Row k="Resolution due" v={fmt(m.resolutionDue)} /><Row k="Countdown" v={<SlaCountdown m={m} now={now} />} />
          <p className="mt-2 text-xs text-muted-foreground">Stars never mark an SLA as met — only resolution within target does.</p>
        </Panel>
        <Panel title="Related information" icon={<Link2 className="h-4 w-4 text-glow" />}>
          <p className="mb-1 text-xs text-muted-foreground">Related incidents</p>
          {m.related.map((r) => <div key={r} className="font-mono text-sm">{r}</div>)}
          <p className="mb-1 mt-3 text-xs text-muted-foreground">Knowledge Base recommendations</p>
          {m.kb.map((k) => <div key={k} className="flex items-center gap-2 text-sm"><BookOpen className="h-3 w-3 text-glow" />{k}</div>)}
        </Panel>
        <Panel title={`Required Objectives · ${possibleStars(m)}★ possible`} className="lg:col-span-2">
          <ol className="space-y-1">
            {m.objectives.map((o, i) => (
              <li key={o.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm">
                <span className="w-5 text-muted-foreground">{i + 1}.</span>
                <span className="flex-1">{o.title}</span>
                {o.completedAt && <CheckCircle2 className="h-4 w-4 text-success" />}
                <span className="flex items-center gap-1 text-star">{o.stars}<Star className="h-3 w-3 fill-star" /></span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Previous mission activity">
          <ul className="space-y-2 text-xs">
            {[...m.log].reverse().map((l, i) => <li key={i}><span className="text-muted-foreground">{fmt(l.at)} · {l.who}</span><br />{l.text}</li>)}
          </ul>
        </Panel>
      </div>

      <ActionDialog open={dlg === "esc"} onOpenChange={(o) => !o && setDlg(null)} title="Escalate Mission" description="Escalation notifies the receiving team and manager." options={TEAMS.filter((t) => t !== m.team)} optionLabel="Escalate to" confirm="Escalate" onConfirm={({ option, reason }) => escalate(m.id, option!, reason)} />
      <ActionDialog open={dlg === "xfer"} onOpenChange={(o) => !o && setDlg(null)} title="Transfer Mission" options={[...TEAMS, ...s.technicians.map((t) => t.name).filter((n) => n !== m.technician)]} optionLabel="Transfer to team or technician" confirm="Transfer" onConfirm={({ option, reason }) => transfer(m.id, option!, reason)} />
      <ActionDialog open={dlg === "clar"} onOpenChange={(o) => !o && setDlg(null)} title="Request Clarification" description={`Message to ${m.requester} (recorded in the Mission Log).`} confirm="Send request" onConfirm={({ reason }) => addWorkLog(m.id, `Clarification requested: ${reason}`, "requester")} />
    </Shell>
  );
}
