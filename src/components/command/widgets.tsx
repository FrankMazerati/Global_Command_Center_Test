import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Search, Filter } from "lucide-react";

export type Tone = "primary" | "success" | "warning" | "destructive" | "accent";
const toneText: Record<Tone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  accent: "text-accent",
};
const toneBg: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  accent: "bg-accent",
};
const toneVar: Record<Tone, string> = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  destructive: "var(--color-destructive)",
  accent: "var(--color-accent)",
};

export type Widget =
  | {
      kind: "stats";
      title: string;
      icon?: LucideIcon;
      items: { value: string; label: string; delta?: string; down?: boolean }[];
    }
  | {
      kind: "list";
      title: string;
      icon?: LucideIcon;
      action?: string;
      search?: boolean;
      rows: { name: string; sub?: string; status?: string; tone?: Tone; right?: string }[];
    }
  | {
      kind: "bars";
      title: string;
      icon?: LucideIcon;
      action?: string;
      headline?: { label: string; value: string };
      rows: { label: string; value: number; right: string; tone?: Tone }[];
    }
  | {
      kind: "donut";
      title: string;
      icon?: LucideIcon;
      action?: string;
      center: string;
      centerSub?: string;
      legend: { label: string; value: string; pct: number; tone: Tone }[];
    }
  | { kind: "status"; title: string; icon?: LucideIcon; value: string; sub: string; tone?: Tone }
  | {
      kind: "actions";
      title: string;
      icon?: LucideIcon;
      items: { label: string; icon: LucideIcon }[];
    }
  | { kind: "toggles"; title: string; icon?: LucideIcon; items: { label: string; sub: string }[] }
  | {
      kind: "tree";
      title: string;
      icon?: LucideIcon;
      root: string;
      items: { label: string; count?: string }[];
    }
  | {
      kind: "matrix";
      title: string;
      icon?: LucideIcon;
      action?: string;
      cols: string[];
      rows: { label: string; cells: (string | number)[] }[];
    }
  | {
      kind: "chart";
      title: string;
      icon?: LucideIcon;
      action?: string;
      type: "line" | "bars";
      points: number[];
      labels?: string[];
    }
  | { kind: "flow"; title: string; icon?: LucideIcon; steps: string[] }
  | {
      kind: "groups";
      title: string;
      icon?: LucideIcon;
      groups: { name: string; items: string[] }[];
    };

export type Placed = Widget & { span?: string };

function Head({
  title,
  icon: Icon,
  action,
  search,
}: {
  title: string;
  icon?: LucideIcon | undefined;
  action?: string | undefined;
  search?: boolean | undefined;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {title}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {search && (
          <>
            <Search className="h-3.5 w-3.5 text-primary" />
            <Filter className="h-3.5 w-3.5 text-primary" />
          </>
        )}
        {action && (
          <button className="flex items-center gap-1 rounded border border-border px-2 py-0.5 hover:border-primary hover:text-foreground">
            {action}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function Donut({
  legend,
  center,
  centerSub,
}: {
  legend: { pct: number; tone: Tone }[];
  center: string;
  centerSub?: string | undefined;
}) {
  let acc = 0;
  const stops = legend
    .map((l) => {
      const s = `${toneVar[l.tone]} ${acc}% ${acc + l.pct}%`;
      acc += l.pct;
      return s;
    })
    .join(",");
  return (
    <div
      className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${stops})` }}
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-background text-center leading-tight">
        <div>
          <div className="text-sm font-bold">{center}</div>
          {centerSub && <div className="text-[9px] text-muted-foreground">{centerSub}</div>}
        </div>
      </div>
    </div>
  );
}

function Chart({
  type,
  points,
  labels,
}: {
  type: "line" | "bars";
  points: number[];
  labels?: string[] | undefined;
}) {
  const max = Math.max(...points);
  if (type === "bars")
    return (
      <div>
        <div className="flex h-28 items-end gap-1">
          {points.map((p, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-accent to-primary"
              style={{ height: `${(p / max) * 100}%` }}
            />
          ))}
        </div>
        {labels && (
          <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
            {labels.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        )}
      </div>
    );
  const w = 300,
    h = 100;
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - (p / max) * (h - 8)}`)
    .join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full" preserveAspectRatio="none">
        <polygon points={`0,${h} ${d} ${w},${h}`} fill="var(--color-primary)" opacity="0.15" />
        <polyline points={d} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
      </svg>
      {labels && (
        <div className="flex justify-between text-[9px] text-muted-foreground">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function WidgetCard({ w }: { w: Placed }) {
  let body: ReactNode = null;
  switch (w.kind) {
    case "stats":
      body = (
        <div className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
          {w.items.map((s) => (
            <div key={s.label} className="px-3 py-1">
              <div className="font-display text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              {s.delta && (
                <div className={`text-xs ${s.down ? "text-destructive" : "text-success"}`}>
                  {s.down ? "↓" : "↑"} {s.delta}
                </div>
              )}
            </div>
          ))}
        </div>
      );
      break;
    case "list":
      body = (
        <div className="scroll-blue max-h-60 divide-y divide-border">
          {w.rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-2 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-full border border-primary bg-secondary text-[10px] font-bold">
                  {r.name
                    .split(" ")
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="font-medium">{r.name}</div>
                  {r.sub && <div className="text-[10px] text-muted-foreground">{r.sub}</div>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                {r.status && (
                  <span className={`flex items-center gap-1 ${toneText[r.tone ?? "success"]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${toneBg[r.tone ?? "success"]}`} />
                    {r.status}
                  </span>
                )}
                {r.right && <span className="text-muted-foreground">{r.right}</span>}
              </div>
            </div>
          ))}
        </div>
      );
      break;
    case "bars":
      body = (
        <div className="space-y-2">
          {w.headline && (
            <div className="flex justify-between font-display text-lg">
              <span>{w.headline.label}</span>
              <span>{w.headline.value}</span>
            </div>
          )}
          {w.rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[110px_1fr_auto] items-center gap-2 text-xs"
            >
              <span>{r.label}</span>
              <div className="h-2 rounded bg-secondary">
                <div
                  className={`h-2 rounded ${toneBg[r.tone ?? "primary"]}`}
                  style={{ width: `${r.value}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{r.right}</span>
            </div>
          ))}
        </div>
      );
      break;
    case "donut":
      body = (
        <div className="flex items-center gap-4">
          <Donut legend={w.legend} center={w.center} centerSub={w.centerSub} />
          <div className="flex-1 space-y-1 text-xs">
            {w.legend.map((l) => (
              <div key={l.label} className="flex justify-between">
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${toneBg[l.tone]}`} />
                  {l.label}
                </span>
                <span>{l.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
      break;
    case "status":
      body = (
        <div>
          <div className={`font-display text-2xl font-bold ${toneText[w.tone ?? "success"]}`}>
            {w.value}
          </div>
          <div className="text-[10px] text-muted-foreground">{w.sub}</div>
        </div>
      );
      break;
    case "actions":
      body = (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {w.items.map(({ label, icon: I }, i) => (
            <button
              key={label}
              className={`grid place-items-center gap-1 rounded-lg border border-border p-2 text-[10px] hover:border-primary hover:shadow-[var(--glow)] ${i === 0 ? "border-primary bg-accent/30" : "bg-secondary/40"}`}
            >
              <I className="h-6 w-6 text-primary" />
              {label}
            </button>
          ))}
        </div>
      );
      break;
    case "toggles":
      body = (
        <div className="space-y-2">
          {w.items.map((t) => (
            <label
              key={t.label}
              className="flex items-center justify-between rounded border border-border bg-secondary/30 p-2 text-xs"
            >
              <div>
                <div className="font-medium">{t.label}</div>
                <div className="text-[10px] text-muted-foreground">{t.sub}</div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
            </label>
          ))}
        </div>
      );
      break;
    case "tree":
      body = (
        <div className="text-xs">
          <div className="mb-1 rounded border border-primary px-2 py-1">{w.root}</div>
          <div className="ml-3 space-y-1 border-l border-border pl-3">
            {w.items.map((i) => (
              <div key={i.label} className="flex justify-between">
                <span>📁 {i.label}</span>
                <span className="text-muted-foreground">{i.count}</span>
              </div>
            ))}
          </div>
        </div>
      );
      break;
    case "matrix":
      body = (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th />
                {w.cols.map((c) => (
                  <th key={c} className="px-1 py-1 font-normal text-muted-foreground">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {w.rows.map((r) => (
                <tr key={r.label}>
                  <td className="py-1 pr-2">{r.label}</td>
                  {r.cells.map((c, i) => (
                    <td
                      key={i}
                      className="border border-background bg-accent/40 px-1 py-1 text-center"
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      break;
    case "chart":
      body = <Chart type={w.type} points={w.points} labels={w.labels} />;
      break;
    case "flow":
      body = (
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          {w.steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className="rounded-full border border-primary bg-secondary/60 px-3 py-1 shadow-[var(--glow)]">
                {s}
              </span>
              {i < w.steps.length - 1 && <ArrowRight className="h-3 w-3 text-primary" />}
            </div>
          ))}
        </div>
      );
      break;
    case "groups":
      body = (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {w.groups.map((g) => (
            <div key={g.name} className="rounded-lg border border-border bg-secondary/30 p-2">
              <div className="mb-1 text-xs font-semibold text-primary">{g.name}</div>
              <ul className="space-y-0.5 text-[11px]">
                {g.items.map((i) => (
                  <li key={i}>
                    <button className="w-full rounded px-1 text-left hover:bg-accent/30">
                      {i}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
      break;
  }
  return (
    <section className={`panel p-3 ${w.span ?? ""}`}>
      <Head
        title={w.title}
        icon={w.icon}
        action={"action" in w ? w.action : undefined}
        search={"search" in w ? w.search : undefined}
      />
      {body}
    </section>
  );
}
