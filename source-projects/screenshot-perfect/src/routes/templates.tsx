import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/intellidesk/Shell";
import { Panel } from "@/components/intellidesk/bits";
import { setState, useStore } from "@/lib/intellidesk/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Mission Templates — IntelliDesk" },
      { name: "description", content: "Configure mission templates, objective libraries, star values and SLA policies." },
      { property: "og:title", content: "Mission Templates — IntelliDesk" },
      { property: "og:description", content: "Objective libraries and star values per category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Templates,
});

function Templates() {
  const s = useStore();
  const [sel, setSel] = useState("hw");
  const t = s.templates.find((x) => x.id === sel) ?? s.templates[0]!;
  const canEdit = s.role === "Manager";
  const patch = (objId: string, p: Record<string, unknown>) =>
    setState((st) => ({ ...st, templates: st.templates.map((x) => x.id !== t.id ? x : { ...x, objectives: x.objectives.map((o) => (o.id === objId ? { ...o, ...p } : o)) }) }));

  return (
    <Shell crumbs={[{ label: "Mission Control", to: "/" }, { label: "Mission Templates" }]}>
      <div className="mb-3 flex items-center gap-2"><Link to="/" className="tap inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><ArrowLeft className="h-4 w-4" />Overview</Link><h1 className="text-xl font-bold">Mission Templates</h1></div>
      {!canEdit && <p className="mb-3 flex items-center gap-1 text-xs text-high"><Lock className="h-3 w-3" />Read only. Switch demo role to Manager to configure templates.</p>}
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Panel>
          <div className="flex gap-2 overflow-x-auto lg:flex-col">
            {s.templates.map((x) => (
              <button key={x.id} onClick={() => setSel(x.id)} className={cn("tap shrink-0 rounded-lg px-3 text-left text-sm", x.id === t.id ? "bg-primary/25 font-semibold text-glow" : "hover:bg-accent/40")}>{x.name}</button>
            ))}
          </div>
        </Panel>
        <Panel title={t.name} action={<span className="text-xs text-star">{t.objectives.reduce((a, o) => a + o.stars, 0)}★ total</span>}>
          <div className="mb-3 grid gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-muted/30 p-2">Default level<br /><b>L{t.defaultLevel}</b></div>
            <div className="rounded-lg bg-muted/30 p-2">SLA policy<br /><b>{t.slaPolicy}</b></div>
            <div className="rounded-lg bg-muted/30 p-2">Response / Resolution<br /><b>{t.responseMin}m / {t.resolutionMin / 60}h</b></div>
            <div className="rounded-lg bg-muted/30 p-2">Escalation<br /><b>{t.escalation}</b></div>
          </div>
          <div className="space-y-2">
            {t.objectives.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/30 p-3 text-sm">
                <span className="min-w-40 flex-1">{o.title}</span>
                <label className="flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-star text-star" />
                  <input type="number" min={0} max={10} disabled={!canEdit} value={o.stars} onChange={(e) => patch(o.id, { stars: Math.max(0, Number(e.target.value)) })} className="h-9 w-14 rounded border bg-secondary px-2" />
                </label>
                {(["evidenceRequired", "approvalRequired", "optional"] as const).map((k) => (
                  <label key={k} className="flex min-h-9 items-center gap-1 text-xs">
                    <input type="checkbox" disabled={!canEdit} checked={!!o[k]} onChange={(e) => patch(o.id, { [k]: e.target.checked })} />
                    {k === "evidenceRequired" ? "Evidence" : k === "approvalRequired" ? "Approval" : "Optional"}
                  </label>
                ))}
              </div>
            ))}
          </div>
          {canEdit && <button onClick={() => toast.success("Template saved (browser only)", { description: "Applies to new missions. Server-side persistence pending." })} className="tap mt-3 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Save template</button>}
        </Panel>
      </div>
    </Shell>
  );
}
