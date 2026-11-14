import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Plug,
  RefreshCw,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase";

type Provider = {
  provider_key: string;
  provider_name: string;
  publisher: string;
  category: string;
  description: string;
  catalog_status: string;
  readiness_stage: string;
  auth_methods: string[];
  required_scopes: string[];
  supported_sync_modes: string[];
  documentation_url: string | null;
  security_tier: string;
  supports_webhooks: boolean;
  supports_incremental_sync: boolean;
  is_featured: boolean;
  search_aliases: string[];
};

type Connection = {
  id: string;
  provider_key: string;
  display_name: string;
  connection_status: string;
  environment: string;
  last_health_status: string;
  last_checked_at: string | null;
  last_successful_sync_at: string | null;
  consecutive_failures: number;
};

type SyncEvent = {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  event_status: string;
  occurred_at: string;
  recorded_at: string;
  classification: string;
};

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border bg-card p-4 shadow-card sm:p-5 ${className}`}>{children}</section>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <Panel>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Panel>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

export function ConnectorHubWorkspace({ title }: { title: string }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("The secure connector catalog is not configured.");
      setLoading(false);
      return () => { live = false; };
    }

    Promise.all([
      supabase.from("integration_provider_catalog")
        .select("provider_key,provider_name,publisher,category,description,catalog_status,readiness_stage,auth_methods,required_scopes,supported_sync_modes,documentation_url,security_tier,supports_webhooks,supports_incremental_sync,is_featured,search_aliases")
        .order("display_order", { ascending: true })
        .limit(250),
      supabase.from("integration_connections")
        .select("id,provider_key,display_name,connection_status,environment,last_health_status,last_checked_at,last_successful_sync_at,consecutive_failures")
        .order("updated_at", { ascending: false })
        .limit(200),
    ]).then(([providerResult, connectionResult]) => {
      if (!live) return;
      if (providerResult.error) setError(providerResult.error.message);
      else setProviders((providerResult.data ?? []) as Provider[]);
      if (connectionResult.error) {
        const message = connectionResult.error.message;
        setError((current) => current ?? message);
        setConnections([]);
      } else {
        setConnections((connectionResult.data ?? []) as Connection[]);
      }
      setLoading(false);
      setRefreshing(false);
    }).catch((reason) => {
      if (!live) return;
      setError(reason instanceof Error ? reason.message : "Connector information could not be loaded.");
      setLoading(false);
      setRefreshing(false);
    });

    return () => { live = false; };
  }, [reload]);

  const categories = useMemo(
    () => [...new Set(providers.map((provider) => provider.category).filter(Boolean))].sort(),
    [providers],
  );
  const visibleProviders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return providers.filter((provider) =>
      (category === "all" || provider.category === category) &&
      (!needle || [
        provider.provider_name, provider.publisher, provider.category,
        provider.description, provider.provider_key, ...(provider.search_aliases ?? []),
      ].join(" ").toLowerCase().includes(needle)),
    );
  }, [providers, category, query]);
  const connectedCount = connections.filter((connection) =>
    ["connected", "active", "healthy"].includes(connection.connection_status.toLowerCase()),
  ).length;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Plug className="size-5" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Integration operations</p>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">Browse approved providers and inspect real connection records.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={loading || refreshing} onClick={() => { setRefreshing(true); setReload((value) => value + 1); }}>
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Provider catalog" value={loading ? "…" : providers.length} detail="Catalog entries, not active connections" />
        <Metric label="Connection records" value={loading ? "…" : connections.length} detail="Real records visible to your account" />
        <Metric label="Active connections" value={loading ? "…" : connectedCount} detail="Based on recorded connection status" />
      </div>

      {error && <Panel className="border-destructive/30"><div className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div></Panel>}

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Provider directory</h3>
            <p className="text-xs text-muted-foreground">Catalog availability does not mean authentication or synchronization is configured.</p>
          </div>
          <span className="text-xs text-muted-foreground">{visibleProviders.length} providers shown</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search providers, publishers, capabilities…" />
          </div>
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {loading ? <p className="py-6 text-sm text-muted-foreground">Loading approved provider records…</p> : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {visibleProviders.map((provider) => {
              const providerConnections = connections.filter((connection) => connection.provider_key === provider.provider_key);
              return (
                <article key={provider.provider_key} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold">{provider.provider_name}</h4>
                      <p className="text-xs text-muted-foreground">{provider.publisher} · {provider.category}</p>
                    </div>
                    <span className="shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide">{provider.readiness_stage || provider.catalog_status}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{provider.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-muted px-2 py-1 text-[10px]">Security: {provider.security_tier}</span>
                    {provider.auth_methods?.slice(0, 2).map((method) => <span key={method} className="rounded-md bg-muted px-2 py-1 text-[10px]">{method}</span>)}
                    {provider.supports_webhooks && <span className="rounded-md bg-muted px-2 py-1 text-[10px]">Webhooks</span>}
                    {provider.supports_incremental_sync && <span className="rounded-md bg-muted px-2 py-1 text-[10px]">Incremental sync</span>}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      {providerConnections.length ? `${providerConnections.length} connection record(s)` : "No connection record"}
                    </span>
                    {provider.documentation_url ? (
                      <a href={provider.documentation_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        Provider docs <ExternalLink className="size-3" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">No docs link</span>}
                  </div>
                </article>
              );
            })}
            {!visibleProviders.length && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">No providers match this search.</p>}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h3 className="font-semibold">Connection status</h3></div>
        {connections.length ? (
          <div className="divide-y">
            {connections.map((connection) => (
              <div key={connection.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-medium">{connection.display_name}</p><p className="text-xs text-muted-foreground">{connection.provider_key} · {connection.environment}</p></div>
                <div className="text-right"><p className="text-xs font-medium">{connection.connection_status} · {connection.last_health_status}</p><p className="text-[11px] text-muted-foreground">Last checked: {formatDate(connection.last_checked_at)}</p></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="font-medium">No live provider connections are registered.</p>
            <p className="mt-1 text-sm text-muted-foreground">The provider directory is populated, but this project currently has no connection records. The provider authorization and credential-setup flow is not yet available here, so no Connect button is shown as if it were functional.</p>
          </div>
        )}
      </Panel>
    </div>
  );
}

export function IntelliSyncWorkspace({ title }: { title: string }) {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [connections, setConnections] = useState<Record<string, unknown>[]>([]);
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("The secure IntelliSync service is not configured.");
      setLoading(false);
      return () => { live = false; };
    }

    Promise.all([
      supabase.functions.invoke("intellisync-api", { body: { action: "health" } }),
      supabase.functions.invoke("intellisync-api", { body: { action: "list_connections" } }),
      supabase.functions.invoke("intellisync-api", { body: { action: "list_events", limit: 50 } }),
    ]).then(([healthResult, connectionResult, eventResult]) => {
      if (!live) return;
      if (healthResult.error) setError(healthResult.error.message);
      else setHealth((healthResult.data ?? {}) as Record<string, unknown>);
      if (connectionResult.error) {
        const message = connectionResult.error.message;
        setError((current) => current ?? message);
      } else {
        setConnections(Array.isArray(connectionResult.data?.connections) ? connectionResult.data.connections : []);
      }
      if (eventResult.error) {
        const message = eventResult.error.message;
        setError((current) => current ?? message);
      } else {
        setEvents(Array.isArray(eventResult.data?.events) ? eventResult.data.events as SyncEvent[] : []);
      }
      setLoading(false);
      setRefreshing(false);
    }).catch((reason) => {
      if (!live) return;
      setError(reason instanceof Error ? reason.message : "IntelliSync status could not be loaded.");
      setLoading(false);
      setRefreshing(false);
    });

    return () => { live = false; };
  }, [reload]);

  const eventStats = (health?.events ?? {}) as Record<string, number>;
  const deliveryStats = (health?.deliveries ?? {}) as Record<string, number>;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Workflow className="size-5" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Data synchronization</p>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">Live status from the protected IntelliSync API.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={loading || refreshing} onClick={() => { setRefreshing(true); setReload((value) => value + 1); }}>
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </Panel>

      {error && <Panel className="border-destructive/30"><div className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div></Panel>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Sync events" value={loading ? "…" : eventStats.total ?? 0} detail={`${eventStats.pending ?? 0} pending · ${eventStats.failed ?? 0} failed`} />
        <Metric label="Deliveries" value={loading ? "…" : deliveryStats.total ?? 0} detail={`${deliveryStats.delivered ?? 0} delivered · ${deliveryStats.failed ?? 0} failed`} />
        <Metric label="Connection bindings" value={loading ? "…" : connections.length} detail="Authorized bindings returned by the API" />
      </div>

      <Panel>
        <div className="mb-3 flex items-center gap-2"><Activity className="size-5 text-primary" /><h3 className="font-semibold">Connection bindings</h3></div>
        {connections.length ? (
          <div className="divide-y">
            {connections.map((connection, index) => (
              <div key={String(connection.id ?? index)} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-medium">{String(connection.product_key ?? "Connected product")}</p><p className="text-xs text-muted-foreground">{String(connection.connection_scope ?? "Scope")} · {String(connection.direction ?? "Direction")}</p></div>
                <span className="rounded-full border px-2.5 py-1 text-xs">{String(connection.status ?? "Unknown")}</span>
              </div>
            ))}
          </div>
        ) : <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">No active IntelliSync connection bindings are registered for this organization scope.</p>}
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center gap-2"><Activity className="size-5 text-primary" /><h3 className="font-semibold">Recent synchronization events</h3></div>
        {events.length ? (
          <div className="divide-y">
            {events.map((event) => (
              <div key={event.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div><p className="font-medium">{event.event_type}</p><p className="text-xs text-muted-foreground">{event.aggregate_type} · {event.aggregate_id} · {event.classification}</p></div>
                <div className="text-right"><p className="text-xs">{event.event_status}</p><p className="text-[11px] text-muted-foreground">{formatDate(event.recorded_at || event.occurred_at)}</p></div>
              </div>
            ))}
          </div>
        ) : <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">No synchronization events have been recorded yet.</p>}
      </Panel>

      {health ? (
        <Panel className="border-dashed">
          <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-sm font-medium">Protected sync service connected</p><p className="mt-1 text-xs text-muted-foreground">The authenticated status API is reachable. Provider OAuth, job creation, schedules, manual retry, and reconciliation controls are not exposed by the current API and are not represented as working actions here.</p></div></div>
        </Panel>
      ) : null}
    </div>
  );
}
