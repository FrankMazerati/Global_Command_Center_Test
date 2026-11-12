import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, CheckCircle2, MapPin, Plus, RefreshCw, ShieldCheck } from "lucide-react";

import { getSupabaseClient } from "@/lib/supabase";

type LocationRow = {
  id: string;
  name: string;
  organization_type: string;
  status: string;
  region: string | null;
  location_code?: string | null;
  location_timezone?: string | null;
  location_country_code?: string | null;
  created_at: string;
};

export function OrganizationLocationsWorkspace({ title }: { title: string }) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [schemaReady, setSchemaReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    locationCode: "",
    region: "",
    timezone: "America/Chicago",
    countryCode: "US",
  });

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not configured for this workspace.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Sign in to view your organization's locations.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile?.organization_id) {
      setError(profileError?.message ?? "This account is not associated with an organization.");
      setLoading(false);
      return;
    }

    const orgId = String(profile.organization_id);
    setOrganizationId(orgId);

    const [locationResult, adminResult, localEntitlement, multiEntitlement] = await Promise.all([
      supabase
        .from("organizations")
        .select("id,name,organization_type,status,region,location_code,location_timezone,location_country_code,created_at")
        .eq("parent_organization_id", orgId)
        .eq("organization_type", "location")
        .order("name"),
      supabase.rpc("is_org_admin", { p_organization_id: orgId }),
      supabase.rpc("has_marketplace_entitlement", {
        p_organization_id: orgId,
        p_entitlement_key: "local_operations",
        p_location_organization_id: null,
      }),
      supabase.rpc("has_marketplace_entitlement", {
        p_organization_id: orgId,
        p_entitlement_key: "multi_location_management",
        p_location_organization_id: null,
      }),
    ]);

    let rows = locationResult.data as LocationRow[] | null;
    let migrationAvailable = !locationResult.error && !adminResult.error && !localEntitlement.error && !multiEntitlement.error;

    if (locationResult.error) {
      const fallback = await supabase
        .from("organizations")
        .select("id,name,organization_type,status,region,created_at")
        .eq("parent_organization_id", orgId)
        .eq("organization_type", "location")
        .order("name");
      rows = (fallback.data ?? []) as LocationRow[];
      if (fallback.error) setError(fallback.error.message);
    }

    const nextRows = rows ?? [];
    const nextAdmin = adminResult.data === true;
    const hasLocal = localEntitlement.data === true;
    const hasMulti = multiEntitlement.data === true;
    setLocations(nextRows);
    setIsAdmin(nextAdmin);
    setSchemaReady(migrationAvailable);
    setCanCreate(migrationAvailable && nextAdmin && (nextRows.length === 0 ? hasLocal : hasMulti));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organizationId || !canCreate) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    const { data, error: createError } = await supabase.rpc("create_organization_location", {
      p_organization_id: organizationId,
      p_name: form.name.trim(),
      p_location_code: form.locationCode.trim().toUpperCase(),
      p_region: form.region.trim() || null,
      p_timezone: form.timezone,
      p_country_code: form.countryCode.trim().toUpperCase(),
      p_address: {},
    });

    if (createError) {
      setError(createError.message);
    } else {
      setMessage("Location registered. The new location is recorded under your company; operational access still follows role and location scope.");
      setForm({ name: "", locationCode: "", region: "", timezone: "America/Chicago", countryCode: "US" });
      await load();
    }
    setSaving(false);
    void data;
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Building2 className="size-4" /> Local Operations Manager
            </div>
            <h2 className="mt-2 text-xl font-bold">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Register and review the locations belonging to your company. Each location is a child organization;
              its employees and operational records remain protected by separate role and data-scope checks.
            </p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {message && <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">{message}</div>}

      {!schemaReady && !loading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <p className="font-semibold">Location licensing foundation is staged, not activated.</p>
          <p className="mt-1 text-muted-foreground">
            The location fields, subscription entitlements, and guarded registration RPC are in the feature-branch migration.
            They have not been applied to this database, so location creation is unavailable here.
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Registered locations</h3>
            <p className="text-xs text-muted-foreground">{locations.length} location records visible to this account</p>
          </div>
          <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">Company scope</span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading authorized location records…</p>
        ) : locations.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed p-5 text-center">
            <MapPin className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-2 font-medium">No location records found</p>
            <p className="mt-1 text-sm text-muted-foreground">No locations have been registered under this company yet.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {locations.map((location) => (
              <article key={location.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{location.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{location.location_code ?? "Location code pending"}{location.region ? ` · ${location.region}` : ""}</p>
                  </div>
                  <span className="rounded-full border px-2 py-1 text-[11px] capitalize">{location.status}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  {location.location_timezone ?? "Timezone not configured"}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{location.location_country_code ?? "Country not configured"}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      {schemaReady && isAdmin && (
        <form onSubmit={createLocation} className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 font-semibold"><Plus className="size-4 text-primary" /> Register a location</div>
          <p className="mt-1 text-sm text-muted-foreground">
            The server checks your organization-admin role and active subscription entitlement. Essential includes one location;
            additional locations require Professional multi-location or Enterprise global-management entitlement.
          </p>
          {!canCreate ? (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
              Your current account or subscription does not currently permit another location. Ask an organization administrator
              or review the company's subscription.
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Location name</span>
                  <input required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Chicago North Clinic" />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Location code</span>
                  <input required minLength={2} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,31}" value={form.locationCode} onChange={(event) => setForm((current) => ({ ...current, locationCode: event.target.value.toUpperCase() }))} className="w-full rounded-md border bg-background px-3 py-2" placeholder="CHI-NORTH" />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Region (optional)</span>
                  <input maxLength={100} value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Chicago North" />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Timezone</span>
                  <input required value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} className="w-full rounded-md border bg-background px-3 py-2" placeholder="America/Chicago" />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="font-medium">Two-letter country code</span>
                  <input required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" value={form.countryCode} onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))} className="w-full rounded-md border bg-background px-3 py-2" />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" /> Server-side entitlement check and audit event</p>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  <Plus className="size-4" /> {saving ? "Registering…" : "Register location"}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </section>
  );
}
