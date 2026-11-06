import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Shell } from "@/components/intellidesk/Shell";
import { Panel } from "@/components/intellidesk/bits";
import { SUPPORT_LEVELS, useStore, type SupportLevel } from "@/lib/intellidesk/store";

export const Route = createFileRoute("/technicians/")({
  head: () => ({
    meta: [
      { title: "Technicians & Support Levels — IntelliDesk" },
      { name: "description", content: "Technical support levels, availability and recognition stars per technician." },
      { property: "og:title", content: "Technicians & Support Levels" },
      { property: "og:description", content: "Support levels, availability and recognition." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Techs,
});

function Techs() {
  const s = useStore();
  return (
    <Shell crumbs={[{ label: "Mission Control", to: "/" }, { label: "Technicians & Levels" }]}>
      <div className="mb-3 flex items-center gap-2"><Link to="/" className="tap inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><ArrowLeft className="h-4 w-4" />Overview</Link><h1 className="text-xl font-bold">Technicians & Support Levels</h1></div>
      <p className="mb-4 text-xs text-muted-foreground">Three separate systems: <b>Technical Support Levels</b> (L1–L3, responsibilities) · <b>Recognition Stars</b> (earned per objective) · <b>Subscription Levels</b> (company product access 1–5, managed elsewhere). Stars never promote automatically.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {([1, 2, 3] as SupportLevel[]).map((l) => (
          <Panel key={l} title={`Level ${l} — ${SUPPORT_LEVELS[l].name}`}>
            <ul className="mb-3 list-disc pl-4 text-xs text-muted-foreground">{SUPPORT_LEVELS[l].scope.map((x) => <li key={x}>{x}</li>)}</ul>
            {s.technicians.filter((t) => t.level === l).map((t) => (
              <Link key={t.name} to="/technicians/$name" params={{ name: t.name }} className="tap flex items-center justify-between rounded-lg bg-muted/30 px-3 text-sm">
                <span>{t.name}</span><span className="text-xs text-star">{t.stars}★</span>
              </Link>
            ))}
          </Panel>
        ))}
      </div>
    </Shell>
  );
}
