import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { Shell } from "@/components/intellidesk/Shell";
import { Panel, SlaCountdown, Stars, StatusBadge, useNow } from "@/components/intellidesk/bits";
import { earnedStars, possibleStars, useStore } from "@/lib/intellidesk/store";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Mission History — IntelliDesk" },
      { name: "description", content: "Closed missions and the objective-by-objective recognition record." },
      { property: "og:title", content: "Mission History — IntelliDesk" },
      { property: "og:description", content: "Closed missions and recognition history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: History,
});

function History() {
  const s = useStore();
  const now = useNow();
  const done = s.missions.filter((m) => m.status === "Closed" || m.status === "Pending Verification");
  return (
    <Shell crumbs={[{ label: "Mission Control", to: "/" }, { label: "Mission History" }]}>
      <div className="mb-3 flex items-center gap-2"><Link to="/" className="tap inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><ArrowLeft className="h-4 w-4" />Overview</Link><h1 className="text-xl font-bold">Mission History</h1></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Completed & pending verification">
          <div className="space-y-2">
            {done.map((m) => (
              <Link key={m.id} to="/workspace/$id" params={{ id: m.id }} className="tap block rounded-lg bg-muted/30 p-3">
                <div className="flex items-center justify-between text-xs"><span className="font-mono text-glow">{m.id}</span><StatusBadge s={m.status} /></div>
                <div className="text-sm font-medium">{m.title}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>{m.technician} · {earnedStars(m)}/{possibleStars(m)}★</span><SlaCountdown m={m} now={now} compact /></div>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title="Recognition record (this session)" icon={<Star className="h-4 w-4 fill-star text-star" />}>
          {s.recognition.length === 0 && <p className="text-sm text-muted-foreground">Complete objectives to build the recognition record.</p>}
          <ul className="space-y-2 text-xs">
            {s.recognition.map((r, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
                <Stars earned={r.stars} total={r.stars} size={12} />
                <span className="flex-1"><b>{r.who}</b> — {r.objective} <Link to="/workspace/$id" params={{ id: r.missionId }} className="font-mono text-glow">{r.missionId}</Link></span>
                <span className="text-muted-foreground">{new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Shell>
  );
}
