import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, CheckCircle2, Hourglass, LifeBuoy, Lock, Paperclip, Pause, Play, Send, Shuffle, Siren, Star, Trophy } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/components/intellidesk/Shell";
import { ActionDialog } from "@/components/intellidesk/ActionDialog";
import { Btn, Panel, PriorityBadge, SlaCountdown, Stars, StatusBadge, useNow } from "@/components/intellidesk/bits";
import {
  addWorkLog, closeMission, doApprove, doCompleteObjective, escalate, pauseToggle, setObjectiveField, submitForResolution, transfer,
} from "@/lib/intellidesk/actions";
import { canSubmitForResolution, earnedStars, possibleStars, progressPct, TEAMS, useStore, type ObjectiveState } from "@/lib/intellidesk/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Mission Workspace ${params.id} — IntelliDesk` },
      { name: "description", content: "Execute mission objectives, earn stars and complete the mission." },
      { property: "og:title", content: `Mission Workspace ${params.id}` },
      { property: "og:description", content: "Active mission objectives and recognition." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { id } = Route.useParams();
  const s = useStore();
  const now = useNow();
  const [dlg, setDlg] = useState<null | "esc" | "xfer" | "help">(null);
  const [log, setLog] = useState("");
  const m = s.missions.find((x) => x.id === id);
  if (!s.ready) return <Shell crumbs={[{ label: "Mission Workspace" }]}><div className="glass h-40 animate-pulse" /></Shell>;
  if (!m) throw notFound();
  const mine = m.technician === s.me;
  const isMgr = s.role === "Manager";
  const locked = !mine || !["Accepted", "In Progress", "Escalated"].includes(m.status);
  const earned = earnedStars(m), total = possibleStars(m), pct = progressPct(m);
  const blocker = canSubmitForResolution(m);

  return (
    <Shell crumbs={[{ label: "Mission Control", to: "/" }, { label: "Mission Queue", to: "/missions" }, { label: `Briefing ${m.id}`, to: "/briefing/$id", params: { id: m.id } }, { label: "Workspace" }]}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Link to="/briefing/$id" params={{ id: m.id }} className="tap inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><ArrowLeft className="h-4 w-4" />Briefing</Link>
        <Link to="/" className="tap inline-flex items-center rounded-lg border px-3 text-sm">Overview</Link>
      </div>

      {/* Mission header */}
      <div className="glass glow sticky top-16 z-20 mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-glow">{m.id}</span><PriorityBadge p={m.priority} /><span className="rounded border px-2 py-0.5">{m.severity}</span><StatusBadge s={m.status} />
          <span className="ml-auto">SLA <SlaCountdown m={m} now={now} /></span>
        </div>
        <h1 className="mt-1 text-lg font-bold sm:text-xl">{m.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>Technician: <b className="text-foreground">{m.technician ?? "—"}</b></span>
          <span className="flex items-center gap-1 text-star"><Star className="h-4 w-4 fill-star" /><b className="text-base">{earned}</b> / {total} stars</span>
          <span>{pct}% complete</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-glow transition-all duration-700" style={{ width: `${pct}%` }} /></div>
        {!mine && <p className="mt-2 flex items-center gap-1 text-xs text-high"><Lock className="h-3 w-3" />View only — objectives can be completed by the assigned technician ({m.technician}).</p>}
      </div>

      {m.status === "Closed" && (
        <div className="glass glow mb-4 flex flex-col items-center gap-2 p-6 text-center">
          <Trophy className="h-10 w-10 text-star" />
          <h2 className="text-xl font-bold">Mission Complete</h2>
          <Stars earned={earned} total={total} size={22} animateKey="final" />
          <p className="text-sm text-muted-foreground">{m.technician} earned {earned} of {total} stars across {m.objectives.filter((o) => o.starsEarned).length} objectives.</p>
          <div className="flex gap-2"><Link to="/history" className="tap inline-flex items-center rounded-lg border px-4 text-sm">Mission History</Link><Link to="/missions" search={{ filter: "Available to Accept" }} className="tap inline-flex items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Next Mission</Link></div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel title="Mission Objectives" icon={<BadgeCheck className="h-4 w-4 text-glow" />}>
          <ol className="space-y-3">
            {m.objectives.map((o, i) => <Objective key={o.id} i={i} o={o} missionId={m.id} locked={locked} isMgr={isMgr} />)}
          </ol>
        </Panel>

        <div className="space-y-4">
          <Panel title="Mission Controls">
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="ghost" onClick={() => pauseToggle(m.id)} disabled={!mine && !isMgr || ["Closed", "Pending Verification"].includes(m.status)}>{m.status === "Paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{m.status === "Paused" ? "Resume" : "Pause"}</Btn>
              <Btn variant="ghost" onClick={() => setDlg("help")} disabled={m.status === "Closed"}><LifeBuoy className="h-4 w-4" />Assistance</Btn>
              <Btn variant="ghost" onClick={() => setDlg("esc")} disabled={m.status === "Closed"}><Siren className="h-4 w-4" />Escalate</Btn>
              <Btn variant="ghost" onClick={() => setDlg("xfer")} disabled={m.status === "Closed" || (!mine && !isMgr)}><Shuffle className="h-4 w-4" />Transfer</Btn>
            </div>
            <Btn className="mt-2 w-full" onClick={() => submitForResolution(m.id)} disabled={locked || !!blocker}><Send className="h-4 w-4" />Submit for Resolution</Btn>
            {blocker && !locked && <p className="mt-1 text-xs text-muted-foreground">{blocker}</p>}
            <Btn variant="success" className="mt-2 w-full" onClick={() => closeMission(m.id)} disabled={m.status !== "Pending Verification" || !isMgr}><CheckCircle2 className="h-4 w-4" />Verify & Complete Mission</Btn>
            {m.status === "Pending Verification" && !isMgr && <p className="mt-1 text-xs text-muted-foreground">Awaiting Manager verification. Switch demo role to Manager to close.</p>}
          </Panel>

          <Panel title="Mission Information">
            <dl className="space-y-1 text-xs">
              {[["Requester", m.requester], ["Device", m.asset], ["Department", m.department], ["Team", m.team], ["Related", m.related.join(", ")]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">Knowledge Base</p>
            {m.kb.map((k) => <div key={k} className="text-xs">{k}</div>)}
          </Panel>

          <Panel title="Mission Log">
            <div className="mb-2 flex gap-2">
              <input value={log} onChange={(e) => setLog(e.target.value)} placeholder="Add work log…" className="h-11 flex-1 rounded-lg border bg-secondary px-3 text-sm" />
              <Btn onClick={() => { if (log.trim()) { addWorkLog(m.id, log.trim()); setLog(""); } }} disabled={!log.trim()}>Add</Btn>
            </div>
            <ul className="max-h-80 space-y-2 overflow-y-auto text-xs">
              {[...m.log].reverse().map((l, i) => (
                <li key={i} className={cn("rounded-lg border-l-2 bg-muted/30 px-2 py-1", l.kind === "recognition" ? "border-star" : l.kind === "assignment" ? "border-primary" : l.kind === "requester" ? "border-high" : "border-border")}>
                  <span className="text-muted-foreground">{new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.who} · {l.kind}</span><br />{l.text}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <ActionDialog open={dlg === "esc"} onOpenChange={(o) => !o && setDlg(null)} title="Escalate Mission" options={TEAMS.filter((t) => t !== m.team)} optionLabel="Escalate to" confirm="Escalate" onConfirm={({ option, reason }) => escalate(m.id, option!, reason)} />
      <ActionDialog open={dlg === "xfer"} onOpenChange={(o) => !o && setDlg(null)} title="Transfer Mission" options={[...TEAMS, ...s.technicians.map((t) => t.name).filter((n) => n !== m.technician)]} optionLabel="Transfer to" confirm="Transfer" onConfirm={({ option, reason }) => transfer(m.id, option!, reason)} />
      <ActionDialog open={dlg === "help"} onOpenChange={(o) => !o && setDlg(null)} title="Request Assistance" options={s.technicians.map((t) => `${t.name} (L${t.level})`)} optionLabel="Ask" confirm="Request" onConfirm={({ option, reason }) => addWorkLog(m.id, `Assistance requested from ${option}: ${reason}`)} />
    </Shell>
  );
}

function Objective({ o, i, missionId, locked, isMgr }: { o: ObjectiveState; i: number; missionId: string; locked: boolean; isMgr: boolean }) {
  const [open, setOpen] = useState(!o.completedAt && i < 4);
  const done = !!o.completedAt;
  return (
    <li className={cn("rounded-xl border p-3 transition-colors", o.starsEarned ? "border-success/40 bg-success/5" : o.awaitingApproval ? "border-star/40 bg-star/5" : "bg-muted/20")}>
      <button onClick={() => setOpen((x) => !x)} className="flex min-h-11 w-full items-center gap-3 text-left">
        {o.starsEarned ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : o.awaitingApproval ? <Hourglass className="h-5 w-5 shrink-0 text-star" /> : <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]">{i + 1}</span>}
        <span className="flex-1 text-sm font-medium">{o.title}{o.optional && <span className="ml-1 text-xs text-muted-foreground">(optional)</span>}</span>
        <Stars earned={o.starsEarned ? o.stars : 0} total={o.stars} size={16} animateKey={o.id} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-8 text-xs">
          <p className="text-muted-foreground">{o.instructions}</p>
          <p><b>Completion requirement:</b> {o.requirement}</p>
          <div className="flex flex-wrap gap-2">
            {o.evidenceRequired && <span className="rounded border border-high/40 px-2 py-0.5 text-high">Evidence required</span>}
            {o.approvalRequired && <span className="rounded border border-star/40 px-2 py-0.5 text-star">Supervisor approval</span>}
          </div>
          <textarea value={o.notes} disabled={done || locked} onChange={(e) => setObjectiveField(missionId, o.id, { notes: e.target.value })} rows={2} placeholder="Work notes / evidence…" className="w-full rounded-lg border bg-secondary p-2 text-sm disabled:opacity-60" />
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="ghost" className="h-9 min-h-9 text-xs" disabled={done || locked} onClick={() => setObjectiveField(missionId, o.id, { attachments: [...o.attachments, `evidence-${o.attachments.length + 1}.png`] })}><Paperclip className="h-3 w-3" />Attach (demo)</Btn>
            {o.attachments.map((a) => <span key={a} className="rounded bg-muted px-2 py-1">{a}</span>)}
          </div>
          {!done && <Btn disabled={locked} onClick={() => doCompleteObjective(missionId, o.id)}><CheckCircle2 className="h-4 w-4" />Complete objective · {o.stars}★</Btn>}
          {o.awaitingApproval && (isMgr ? <Btn variant="success" onClick={() => doApprove(missionId, o.id)}>Approve & award {o.stars}★</Btn> : <p className="text-star">Awaiting supervisor approval — stars held.</p>)}
          {done && <p className="text-muted-foreground">Completed {new Date(o.completedAt!).toLocaleString()} by {o.completedBy}{o.approvedBy ? ` · approved by ${o.approvedBy}` : ""}</p>}
        </div>
      )}
    </li>
  );
}
