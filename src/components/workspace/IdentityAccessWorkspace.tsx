import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Database, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

type Row = Record<string, unknown>;

const DATASETS: Record<string, { table: string; description: string; fields: string[] }> = {
  "directory-dashboard": { table: "profiles", description: "Identity overview from the canonical profile directory.", fields: ["display_name", "work_email", "job_title", "member_status", "organization_id"] },
  "global-directory": { table: "profiles", description: "Authenticated directory records, scoped by database policies.", fields: ["display_name", "work_email", "job_title", "employee_global_id", "member_status"] },
  "directory-health": { table: "profiles", description: "Profile activation and identity completeness.", fields: ["display_name", "work_email", "member_status", "updated_at"] },
  "directory-activity": { table: "audit_events", description: "Recorded administrative and identity activity.", fields: ["event_type", "action", "actor_profile_id", "created_at"] },
  "user-accounts": { table: "profiles", description: "User account profile records. Authentication provisioning remains in Supabase Auth.", fields: ["display_name", "work_email", "member_status", "created_at"] },
  "global-user-id": { table: "profiles", description: "Stable global employee identifiers from profile records.", fields: ["employee_global_id", "company_global_id", "display_name", "work_email"] },
  "employee-accounts": { table: "profiles", description: "Employee profile directory.", fields: ["display_name", "work_email", "job_title", "department_id", "member_status"] },
  "contractor-accounts": { table: "profiles", description: "Contractor identity records visible under current access policies.", fields: ["display_name", "work_email", "job_title", "tenant_id", "member_status"] },
  "business-accounts": { table: "profiles", description: "Business account profile records.", fields: ["display_name", "work_email", "organization_id", "member_status"] },
  "tenant-user-accounts": { table: "profiles", description: "Tenant-linked profiles visible under tenant isolation policies.", fields: ["display_name", "work_email", "tenant_id", "member_status"] },
  "external-users": { table: "profiles", description: "External identity profiles where visible under current policy.", fields: ["display_name", "work_email", "tenant_id", "member_status"] },
  "identity-verification": { table: "profiles", description: "Identity profile and account status fields. Verification evidence is not inferred.", fields: ["display_name", "work_email", "member_status", "updated_at"] },
  "account-status": { table: "profiles", description: "Account lifecycle status from the canonical profile record.", fields: ["display_name", "work_email", "member_status", "updated_at"] },
  departments: { table: "departments", description: "Organization-scoped departments and reporting structure.", fields: ["name", "code", "manager_profile_id", "organization_id"] },
  "organizational-units": { table: "organizational_units", description: "Organization-scoped directory units.", fields: ["name", "unit_type", "parent_unit_id", "organization_id"] },
  "organizational-hierarchy": { table: "departments", description: "Department hierarchy and reporting relationships.", fields: ["name", "code", "parent_department_id", "manager_profile_id", "organization_id"] },
  teams: { table: "organizational_units", description: "Organization-scoped organizational units and team records.", fields: ["name", "unit_type", "parent_unit_id", "organization_id"] },
  "security-groups": { table: "groups", description: "Security groups and their organization and tenant scope.", fields: ["name", "group_key", "group_type", "is_privileged", "organization_id", "tenant_id"] },
  "group-objects": { table: "groups", description: "Directory group objects.", fields: ["name", "group_key", "group_type", "description", "is_privileged"] },
  "roles-and-permissions": { table: "roles", description: "Role catalog. Role and permission administration is restricted by database policy.", fields: ["name", "role_key", "description", "is_privileged", "is_system_role"] },
  "access-management": { table: "profile_roles", description: "Role assignments visible to the signed-in user or authorized administrators.", fields: ["profile_id", "role_id", "organization_id", "tenant_id", "is_active", "starts_at", "expires_at"] },
  "application-access": { table: "permission_scope_grants", description: "Scoped permission grants, filtered by the active user's authorization.", fields: ["role_id", "permission_id", "organization_id", "tenant_id", "department_id", "effect", "expires_at"] },
  "access-audit": { table: "audit_events", description: "Access and identity audit events visible under audit policies.", fields: ["event_type", "action", "actor_profile_id", "organization_id", "created_at"] },
  "directory-audit-history": { table: "audit_events", description: "Directory lifecycle audit events.", fields: ["event_type", "action", "actor_profile_id", "created_at"] },
};

const ACCESS_REQUEST_SLUGS = new Set(["access-requests", "access-request", "request-access"]);
const ROLE_CATALOG_SLUGS = new Set(["roles-and-permissions", "roles", "permissions", "role-catalog"]);
const textValue = (value: unknown) => value == null || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value);

export function IdentityAccessWorkspace({ title, pageSlug }: { title: string; pageSlug: string }) {
  const dataset = DATASETS[pageSlug] ?? (ROLE_CATALOG_SLUGS.has(pageSlug) ? DATASETS["roles-and-permissions"] : undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [catalogView, setCatalogView] = useState<"roles" | "permissions" | "role_permissions">("roles");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestResource, setRequestResource] = useState("");
  const [temporary, setTemporary] = useState(true);
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const isRequestPage = ACCESS_REQUEST_SLUGS.has(pageSlug);
  const isRoleCatalog = ROLE_CATALOG_SLUGS.has(pageSlug);
  const activeTable = isRequestPage ? "access_requests" : isRoleCatalog ? catalogView : dataset?.table;

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not configured. No sample records are shown.");
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const table = activeTable;
    if (!table) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase.from(table as never).select("*").limit(200);
    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
      setRefreshedAt(new Date().toLocaleString());
    }
    setLoading(false);
  }, [activeTable, isRequestPage]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
  }, [query, rows]);

  const columns = useMemo(() => {
    const available = new Set(rows.flatMap((row) => Object.keys(row)));
    const preferred = isRequestPage
      ? ["requester_profile_id", "target_profile_id", "requested_resource", "reason", "status", "temporary_access", "expires_at", "created_at"]
      : activeTable === "roles"
        ? ["name", "role_key", "description", "is_privileged", "is_system_role"]
        : activeTable === "permissions"
          ? ["permission_key", "resource", "action", "description", "sensitivity"]
          : activeTable === "role_permissions"
            ? ["role_id", "permission_id", "scope"]
            : dataset?.fields ?? [];
    return [...preferred.filter((field) => available.has(field)), ...[...available].filter((field) => !preferred.includes(field))].slice(0, 8);
  }, [activeTable, dataset?.fields, isRequestPage, rows]);

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestReason.trim() || !requestResource.trim()) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setError("Sign in before submitting an access request.");
      setSaving(false);
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,organization_id,member_status")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (profileError || !profile?.organization_id || profile.member_status !== "active") {
      setError(profileError?.message ?? "An active organization profile is required to request access.");
      setSaving(false);
      return;
    }
    const { error: insertError } = await supabase.from("access_requests").insert({
      organization_id: profile.organization_id,
      requester_profile_id: auth.user.id,
      requested_resource: requestResource.trim(),
      reason: requestReason.trim(),
      temporary_access: temporary,
      expires_at: temporary && expiry ? new Date(expiry).toISOString() : null,
      status: "pending",
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      toast.error("Access request could not be submitted.");
      return;
    }
    setRequestReason("");
    setRequestResource("");
    setExpiry("");
    toast.success("Access request submitted.");
    await load();
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="size-4" /> Identity & Access · <Database className="size-3.5" /> Supabase
          </div>
          <h2 className="mt-1 text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {isRequestPage ? "Request additional access with a business reason and optional expiry. Approval is governed by organization and global administrator policies." : dataset?.description ?? "Identity and access records."}
          </p>
          {refreshedAt && <p className="mt-1 text-xs text-muted-foreground">Last refreshed: {refreshedAt}</p>}
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {isRoleCatalog && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Role and permission catalog">
          {(["roles", "permissions", "role_permissions"] as const).map((view) => (
            <button key={view} type="button" role="tab" aria-selected={catalogView === view} onClick={() => setCatalogView(view)} className={`rounded-md border px-3 py-2 text-sm ${catalogView === view ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}>
              {view === "roles" ? "Roles" : view === "permissions" ? "Permissions" : "Role assignments"}
            </button>
          ))}
        </div>
      )}

      {isRequestPage && (
        <form onSubmit={submitRequest} className="grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h3 className="font-semibold">Request access</h3>
            <p className="text-xs text-muted-foreground">Requests are linked to your authenticated profile and organization. Submitting a request does not grant access.</p>
          </div>
          <label className="grid gap-1 text-sm sm:col-span-2">Resource, application, role, or permission needed
            <input required maxLength={240} value={requestResource} onChange={(event) => setRequestResource(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Example: Finance reporting workspace" />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">Business reason
            <textarea required minLength={8} maxLength={2000} value={requestReason} onChange={(event) => setRequestReason(event.target.value)} className="min-h-24 rounded-md border bg-background px-3 py-2" placeholder="Explain the work that requires this access." />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={temporary} onChange={(event) => setTemporary(event.target.checked)} /> Temporary access
          </label>
          {temporary && <label className="grid gap-1 text-sm">Requested expiry
            <input type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} className="rounded-md border bg-background px-3 py-2" />
          </label>}
          <div className="sm:col-span-2">
            <button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? "Submitting…" : "Submit access request"}</button>
          </div>
        </form>
      )}

      <label className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder={`Search ${title.toLowerCase()}…`} />
        <span className="text-xs text-muted-foreground">{filtered.length} / {rows.length}</span>
      </label>

      {loading && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Loading authorized records…</p>}
      {!loading && error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {!loading && !error && rows.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{isRequestPage ? "No access requests are visible yet." : "No records are visible to this account. This can mean the table is empty or access is restricted."}</p>}
      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-auto rounded-lg border">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground"><tr>{columns.map((field) => <th key={field} className="px-3 py-2">{field.replaceAll("_", " ")}</th>)}<th className="px-3 py-2">Detail</th></tr></thead>
              <tbody>{filtered.map((row, index) => <tr key={String(row["id"] ?? row["profile_id"] ?? index)} className="border-b last:border-0 hover:bg-accent/40">{columns.map((field) => <td key={field} className="max-w-[260px] truncate px-3 py-2">{textValue(row[field])}</td>)}<td className="px-3 py-2"><button type="button" className="font-medium text-primary hover:underline" onClick={() => setSelected(row)}>View</button></td></tr>)}</tbody>
            </table>
          </div>
          {selected && <aside className="rounded-lg border p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Record detail</h3><button type="button" onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button></div><dl className="grid gap-2 text-xs">{Object.entries(selected).map(([key, value]) => <div key={key} className="border-b pb-2 last:border-0"><dt className="font-semibold text-muted-foreground">{key.replaceAll("_", " ")}</dt><dd className="mt-0.5 break-words">{textValue(value)}</dd></div>)}</dl></aside>}
        </div>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><AlertCircle className="mt-0.5 size-3.5 shrink-0" /> Role assignment, privilege changes, and approval decisions are not performed by direct client writes. They must pass the server-side approval workflow and database authorization checks.</p>
    </section>
  );
}
