import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { RefreshCw, Network, Layers } from "lucide-react";
import { GlassCard, ModuleHeader, StatusDot } from "@/components/glass/glass";
import { listConnections } from "@/lib/intellisync/client";

const connectionsQuery = queryOptions({ queryKey: ["sync-connections"], queryFn: listConnections });

export const Route = createFileRoute("/intellisync")({
  head: () => ({
    meta: [
      { title: "IntelliSync Engine — IntelliStack" },
      { name: "description", content: "Core synchronization and coordination layer for IntelliStack." },
      { property: "og:title", content: "IntelliSync Engine — IntelliStack" },
      { property: "og:description", content: "Core synchronization and coordination layer for IntelliStack." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(connectionsQuery),
  component: IntelliSyncPage,
});

const tone = { healthy: "success", degraded: "warning", failed: "danger", not_connected: "info" } as const;
const label = { healthy: "Healthy", degraded: "Degraded", failed: "Failed", not_connected: "Not connected yet" } as const;

function IntelliSyncPage() {
  const { data } = useSuspenseQuery(connectionsQuery);
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <ModuleHeader icon={RefreshCw} title="IntelliSync" subtitle="Core synchronization & coordination engine" />
      <div className="grid gap-4 md:grid-cols-4">
        {([
          ["IntelliSync", "Events, retries, reconciliation, health"],
          ["MySync", "Employee view of their connected services"],
          ["Company Sync", "Admin management of all connections"],
          ["Central Authorization", "Decides who can trigger what"],
        ] as const).map(([t, d]) => (
          <GlassCard key={t} title={t} icon={Layers}><p className="text-xs text-muted-foreground">{d}</p></GlassCard>
        ))}
      </div>
      <GlassCard title="Module Connections" icon={Network}>
        <p className="mb-3 text-xs text-muted-foreground">Status is real: modules show "Not connected yet" until they start sending sync events.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => {
            const s = c.status as keyof typeof tone;
            return (
              <div key={c.id} className="glass flex items-center gap-3 rounded-lg p-3">
                <StatusDot tone={tone[s]} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.category} • {label[s]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
