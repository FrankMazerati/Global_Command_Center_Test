import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Database, AlertCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Row = Record<string, unknown>;

const PAGE_TABLES: Record<string, string> = {
  "business-overview-dashboard": "organizations",
  "company-management": "organizations",
  "business-locations": "organizations",
  "business-activity": "audit_events",
  "business-approvals": "access_requests",
  "business-integrations": "integration_connections",
  "business-performance": "audit_events",
  "business-reporting-and-analytics": "audit_events",
  "financial-overview": "marketplace_orders",
  "transactions-and-payments": "marketplace_orders",
  "tenant-business-records": "tenants",
  "company-profiles": "organizations",
  "organization-records": "organizations",
  "global-iam-overview": "profiles",
  "organizations": "organizations",
  "tenants": "tenants",
  "tenant-membership": "workforce_organization_memberships",
  "departments": "departments",
  "teams": "workforce_organizational_units",
  "security-groups": "groups",
  "roles": "roles",
  "permissions": "permissions",
  "access-requests": "access_requests",
  "access-reviews": "permission_scope_grants",
  "identity-audit": "audit_events",
  "directory-health": "profiles",
  "directory-activity": "audit_events",
  "desktop-computers": "devices",
  "laptops": "devices",
  "tablets": "devices",
  "mobile-devices": "devices",
  "servers": "devices",
  "device-inventory": "devices",
  "device-assignments": "device_assignment_history",
  "device-history": "device_lifecycle_events",
  "device-compliance": "device_compliance_checks",
  "network-operations-dashboard": "network_assets",
  "infrastructure-health": "network_assets",
  "global-network-overview": "network_assets",
  "network-monitoring": "network_assets",
  "device-and-infrastructure-monitoring": "network_assets",
  "server-monitoring": "network_assets",
  "network-performance": "network_assets",
  "network-events": "audit_events",
  "network-alerts": "notification_events",
  "incident-monitoring": "investigations",
  "event-history": "audit_events",
  "security-operations-dashboard": "audit_events",
  "security-posture": "audit_events",
  "security-health": "audit_events",
  "threat-monitoring": "audit_events",
  "threat-intelligence": "knowledge_articles",
  "security-events": "audit_events",
  "security-alerts": "notification_events",
  "suspicious-activity": "audit_events",
  "vulnerability-overview": "investigations",
  "vulnerability-assessments": "investigations",
  "vulnerability-tracking": "investigations",
  "security-incidents": "investigations",
  "incident-investigation": "investigations",
  "incident-history": "investigations",
  "security-audit-history": "audit_events",
  "governance-dashboard": "audit_events",
  "compliance-overview": "audit_events",
  "compliance-evidence": "audit_events",
  "risk-register": "investigations",
  "audit-overview": "audit_events",
  "audit-events": "audit_events",
  "audit-findings": "investigation_findings",
  "audit-history": "audit_events",
  "ticket-audit-archive": "ticket_lifecycle_events",
  "ticket-audit-detail": "ticket_lifecycle_events",
  "audit-search-and-retrieval": "audit_events",
  "all-knowledge-spaces": "knowledge_bases",
  "recent-articles": "knowledge_articles",
  "knowledge-administration": "knowledge_bases",
  "faqs-and-common-questions": "knowledge_articles",
  "troubleshooting-and-resolutions": "knowledge_articles",
  "workflow-library": "workflows",
  "workflow-templates": "workflows",
  "active-workflows": "workflow_runs",
  "workflow-history": "workflow_runs",
  "workflow-dashboard": "workflow_runs",
  "mission-history": "situation_runs",
  "situation-simulator": "situations",
  "scenario-simulator": "situations",
  "investigation-findings": "investigation_findings",
  "assistant-sessions": "assistant_sessions",
  "conversation-history": "assistant_messages",
  "unanswered-questions": "help_buddy_unanswered_questions",
  "calendar-events": "calendar_events",
  "service-catalog": "service_catalog",
  "service-status": "integration_connections",
  "integration-management": "integration_connections",
  "connected-application-directory": "integration_provider_catalog",
  "integration-provider-catalog": "integration_provider_catalog",
  "employee-rewards": "employee_rewards",
  "rewards-and-gift-cards": "employee_rewards",
  "job-postings": "job_postings",
  "job-applications": "job_applications",
  "candidate-profiles": "candidate_profiles",
  "intellisphere-apps": "intellisphere_apps",
  "native-productivity-applications": "intellisphere_apps",
  "idea-ledger": "idea_ledger_entries",
  "idea-ledger-entries": "idea_ledger_entries",
  "notifications": "notification_events",
  "notification-center": "notification_events",
};

const LABELS: Record<string, string[]> = {
  profiles: ["display_name", "work_email", "job_title", "member_status", "organization_id"],
  organizations: ["name", "organization_type", "status", "region", "created_at"],
  tenants: ["name", "status", "organization_id", "created_at"],
  tickets: ["ticket_id", "title", "priority", "status", "updated_at"],
  devices: ["device_name", "serial_number", "device_type", "status", "assigned_to"],
  audit_events: ["event_type", "action", "actor_profile_id", "created_at"],
  knowledge_articles: ["title", "status", "knowledge_base_id", "updated_at"],
  workflows: ["name", "description", "status", "updated_at"],
  workflow_runs: ["workflow_id", "status", "started_at", "completed_at"],
  access_requests: ["requester_profile_id", "resource_key", "status", "created_at"],
};

function cell(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function OperationalPageWorkspace({ title, pageSlug }: { title: string; pageSlug: string }) {
  const table = PAGE_TABLES[pageSlug];
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(Boolean(table));
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!table) return;
    setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not configured. No sample data is being displayed.");
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error: resultError } = await supabase.from(table as never).select("*").limit(100);
    if (resultError) {
      setError(resultError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
      setRefreshedAt(new Date().toLocaleString());
    }
    setLoading(false);
  }, [table]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(() => {
    const available = new Set(rows.flatMap((row) => Object.keys(row)));
    const preferred = LABELS[table ?? ""] ?? [];
    return [...preferred.filter((key) => available.has(key)), ...[...available].filter((key) => !preferred.includes(key))].slice(0, 7);
  }, [rows, table]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);

  if (!table) {
    return (
      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
          <AlertCircle className="size-4" /> Workflow not connected
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This route is registered, but it does not yet have a verified backend data contract or approved actions. It will not display fabricated records or claim to be operational.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Database className="size-3.5" /> Supabase · {table}
          </div>
          <h2 className="mt-1 text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Authenticated, policy-filtered records. This general workspace is read-only until a page-specific write contract is approved.
          </p>
          {refreshedAt && <p className="mt-1 text-xs text-muted-foreground">Last refreshed: {refreshedAt}</p>}
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      <label className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}…`} />
        <span className="text-xs text-muted-foreground">{filtered.length} / {rows.length}</span>
      </label>
      {loading && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Loading authorized records…</p>}
      {!loading && error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Unable to load {table}: {error}</p>}
      {!loading && !error && rows.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No records are visible to this account. This may mean the table is empty or access is restricted.</p>}
      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-auto rounded-lg border">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground"><tr>{columns.map((key) => <th className="px-3 py-2" key={key}>{key.replaceAll("_", " ")}</th>)}<th className="px-3 py-2">Detail</th></tr></thead>
              <tbody>{filtered.map((row, index) => <tr className="border-b last:border-0 hover:bg-accent/40" key={String(row["id"] ?? row["ticket_id"] ?? index)}>{columns.map((key) => <td className="max-w-[260px] truncate px-3 py-2" key={key}>{cell(row[key])}</td>)}<td className="px-3 py-2"><button type="button" className="font-medium text-primary hover:underline" onClick={() => setSelected(row)}>View</button></td></tr>)}</tbody>
            </table>
          </div>
          {selected && <aside className="rounded-lg border bg-background/50 p-4"><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold">Record detail</h3><button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)}>Close</button></div><dl className="grid gap-2 text-xs">{Object.entries(selected).map(([key, value]) => <div className="border-b pb-2 last:border-0" key={key}><dt className="font-semibold text-muted-foreground">{key.replaceAll("_", " ")}</dt><dd className="mt-0.5 break-words">{cell(value)}</dd></div>)}</dl></aside>}
        </div>
      )}
    </section>
  );
}
