import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Frosted-glass panel. Use for every card / panel on every page. */
export function GlassCard({
  title, icon: Icon, action, className, children,
}: { title?: string; icon?: LucideIcon; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("glass rounded-xl p-4", className)}>
      {title && (
        <header className="mb-3 flex min-w-0 items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-env" />}
            <span className="truncate">{title}</span>
          </h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatTile({ value, label, delta, up = true }: { value: string; label: string; delta?: string; up?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      {delta && <div className={cn("text-xs", up ? "text-success" : "text-danger")}>{up ? "↑" : "↓"} {delta}</div>}
    </div>
  );
}

/** Module page hero: icon tile + title + subtitle. */
export function ModuleHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="glass glow-env grid h-14 w-14 shrink-0 place-items-center rounded-xl">
        <Icon className="h-7 w-7 text-env-glow" />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="truncate text-sm text-env-glow">{subtitle}</p>
      </div>
    </div>
  );
}

export function ModuleTabs({ tabs, active, onChange }: { tabs: { id: string; label: string; icon: LucideIcon }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "glass flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
            active === t.id ? "glow-env bg-env-soft" : "hover:bg-env-soft",
          )}
        >
          <t.icon className="h-4 w-4 text-env" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function StatusDot({ tone = "success" }: { tone?: "success" | "warning" | "danger" | "info" }) {
  const map = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", info: "bg-info" };
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", map[tone])} />;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-gradient-to-r from-env to-env-glow" style={{ width: `${value}%` }} />
    </div>
  );
}
