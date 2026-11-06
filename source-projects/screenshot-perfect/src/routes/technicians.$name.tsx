import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Award, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/intellidesk/Shell";
import { Btn, Panel, Stars } from "@/components/intellidesk/bits";
import { SUPPORT_LEVELS, useStore } from "@/lib/intellidesk/store";

export const Route = createFileRoute("/technicians/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.name} — Technician Profile · IntelliDesk` },
      { name: "description", content: `Support level, recognition stars and mission performance for ${params.name}.` },
      { property: "og:title", content: `${params.name} — Technician Profile` },
      { property: "og:description", content: "Support level, stars and performance." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { name } = Route.useParams();
  const s = useStore();
  const t = s.technicians.find((x) => x.name === name);
  if (!s.ready) return <Shell crumbs={[{ label: "Technician" }]}><div className="glass h-40 animate-pulse" /></Shell>;
  if (!t) throw notFound();
  const missions = s.missions.filter((m) => m.technician === t.name);
  const rec = s.recognition.filter((r) => r.who === t.name);
  return (
    <Shell crumbs={[{ label: "Mission Control", to: "/" }, { label: "Technicians", to: "/technicians" }, { label: t.name }]}>
      <div className="mb-3"><Link to="/technicians" className="tap inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><ArrowLeft className="h-4 w-4" />Technicians</Link></div>
      <div className="glass glow mb-4 flex flex-wrap items-center gap-4 p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-glow font-display text-2xl font-bold">L{t.level}</div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t.name}</h1>
          <p className="text-sm text-muted-foreground">Level {t.level} — {SUPPORT_LEVELS[t.level].name} · {t.team} · {t.availability}</p>
        </div>
        <div className="text-center"><div className="font-display text-3xl font-bold text-star">{t.stars}★</div><div className="text-xs text-muted-foreground">Recognition stars</div></div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Performance">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/30 p-3"><div className="font-display text-2xl font-bold">{t.objectivesCompleted}</div>Objectives</div>
            <div className="rounded-lg bg-muted/30 p-3"><div className="font-display text-2xl font-bold">{t.missionsCompleted}</div>Missions</div>
          </div>
        </Panel>
        <Panel title="Qualifications & approvals" icon={<ShieldCheck className="h-4 w-4 text-glow" />}>
          <ul className="mb-3 space-y-1 text-sm">{t.qualifications.map((q) => <li key={q}>• {q}</li>)}</ul>
          <Btn variant="ghost" className="w-full" disabled={s.role !== "Manager"} onClick={() => toast.info("Level change request recorded", { description: "Requires administrator authorization and qualifications — backend workflow pending." })}>
            <Award className="h-4 w-4" />Request level review
          </Btn>
          <p className="mt-2 text-xs text-muted-foreground">Stars do not promote automatically. Level changes need manager/admin authorization.</p>
        </Panel>
        <Panel title="Recognition history">
          {rec.length === 0 && <p className="text-xs text-muted-foreground">No objective awards this session.</p>}
          <ul className="space-y-1 text-xs">{rec.map((r, i) => <li key={i} className="flex items-center gap-2"><Stars earned={r.stars} total={r.stars} size={10} />{r.objective} · {r.missionId}</li>)}</ul>
        </Panel>
        <Panel title="Missions" className="md:col-span-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {missions.map((m) => <Link key={m.id} to="/workspace/$id" params={{ id: m.id }} className="tap flex items-center justify-between rounded-lg bg-muted/30 px-3 text-sm"><span className="truncate"><span className="font-mono text-glow">{m.id}</span> {m.title}</span><span className="text-xs">{m.status}</span></Link>)}
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
