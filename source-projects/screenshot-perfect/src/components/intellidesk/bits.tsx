import { Star } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fmtCountdown, slaState, type Mission, type Priority } from "@/lib/intellidesk/store";

export function useNow(interval = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

const prioCls: Record<Priority, string> = {
  Critical: "bg-critical/20 text-critical border-critical/50",
  High: "bg-high/20 text-high border-high/50",
  Normal: "bg-normal/15 text-normal border-normal/40",
  Low: "bg-low/15 text-low border-low/40",
};

export function PriorityBadge({ p }: { p: Priority }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold", prioCls[p])}>{p}</span>;
}

export function StatusBadge({ s }: { s: string }) {
  const cls =
    s === "Closed" || s === "Resolved" ? "text-success border-success/40 bg-success/10"
    : s === "Escalated" ? "text-critical border-critical/40 bg-critical/10"
    : s === "Pending Verification" ? "text-star border-star/40 bg-star/10"
    : s === "In Progress" || s === "Accepted" ? "text-glow border-glow/40 bg-primary/15"
    : "text-muted-foreground border-border bg-muted/40";
  return <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-medium", cls)}>{s}</span>;
}

export function SlaCountdown({ m, now, compact }: { m: Mission; now: number | null; compact?: boolean }) {
  if (now == null) return <span className="text-xs text-muted-foreground">—</span>;
  const st = slaState(m, now);
  const cls = st === "breached" ? "text-critical" : st === "warning" ? "text-high" : st === "met" ? "text-success" : "text-glow";
  const label = st === "met" ? "SLA met" : st === "breached" && (m.status === "Closed" || m.status === "Resolved") ? "SLA breached" : fmtCountdown(m.resolutionDue - now);
  return (
    <span className={cn("font-mono text-xs font-semibold tabular-nums", cls)}>
      {!compact && st === "breached" && m.status !== "Closed" ? "BREACHED " : ""}
      {label}
    </span>
  );
}

export function Stars({ earned, total, size = 14, animateKey }: { earned: number; total: number; size?: number; animateKey?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5" aria-label={`${earned} of ${total} stars`}>
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={`${animateKey}-${i}-${i < earned}`}
          style={{ width: size, height: size }}
          className={cn(i < earned ? "fill-star text-star animate-star" : "text-muted-foreground/50")}
        />
      ))}
    </span>
  );
}

export function Panel({ title, icon, action, children, className }: { title?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass p-4", className)}>
      {title && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">{icon}{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Btn({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "success" }) {
  const v = {
    primary: "bg-primary text-primary-foreground glow",
    ghost: "border border-border bg-secondary/60 text-foreground",
    danger: "bg-destructive text-destructive-foreground",
    success: "bg-success text-background",
  }[variant];
  return <button {...p} className={cn("tap inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40", v, className)} />;
}
