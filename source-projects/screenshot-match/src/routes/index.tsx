import { createFileRoute, Link } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import { GlassCard, ModuleHeader } from "@/components/glass/glass";
import { NAV } from "@/lib/navigation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Global Command Center — IntelliStack Systems" },
      { name: "description", content: "Central hub for every IntelliStack module." },
      { property: "og:title", content: "Global Command Center — IntelliStack Systems" },
      { property: "og:description", content: "Central hub for every IntelliStack module." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <ModuleHeader icon={Radar} title="Global Command Center" subtitle="One Intelligent Network. Powered by Intelligence." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {NAV.filter((n) => n.id !== "home").map((n) => {
          const target = n.children?.[0] ?? n;
          const body = (
            <GlassCard className="h-full transition hover:glow-env">
              <n.icon className="mb-3 h-6 w-6 text-env" />
              <div className="text-sm font-semibold">{n.title}</div>
              {n.children && <div className="mt-1 text-xs text-muted-foreground">{n.children.length} areas</div>}
            </GlassCard>
          );
          return target.to ? (
            <Link key={n.id} to={target.to}>{body}</Link>
          ) : (
            <Link key={n.id} to="/m/$slug" params={{ slug: target.id }}>{body}</Link>
          );
        })}
      </div>
    </div>
  );
}
