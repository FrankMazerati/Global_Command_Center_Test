import { cn } from "@/lib/utils";

export type BuildStatus =
  "Built" | "Connected" | "Tested" | "Awaiting integration" | "Awaiting configuration";

const styles: Record<BuildStatus, string> = {
  Built: "bg-primary/10 text-primary border-primary/30",
  Connected: "bg-success/10 text-success border-success/30",
  Tested: "bg-tenant/10 text-tenant border-tenant/30",
  "Awaiting integration": "bg-warning/15 text-foreground border-warning/40",
  "Awaiting configuration": "bg-contractor/10 text-contractor border-contractor/30",
};

export function StatusBadge({ status, className }: { status: BuildStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}
