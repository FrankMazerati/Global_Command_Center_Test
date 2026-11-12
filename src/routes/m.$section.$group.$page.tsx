import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  Laptop,
  LockKeyhole,
  Plus,
  Search,
  ShoppingBag,
  Ticket,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shell/StatusBadge";
import { TicketManagementWorkspace } from "@/components/workspace/TicketManagementWorkspace";
import { TicketWorkspace } from "@/components/workspace/TicketWorkspace";
import { WorkflowCenter } from "@/components/workspace/WorkflowCenter";
import {
  HelpBuddyWorkspace,
  KnowledgeSpacesWorkspace,
} from "@/components/workspace/KnowledgeAndHelpWorkspaces";
import { HelpBuddyIntelligenceManagement } from "@/components/workspace/HelpBuddyIntelligenceManagement";
import { MarketplaceHistoryWorkspace } from "@/components/workspace/MarketplaceHistoryWorkspace";
import { WorkforceHistoryWorkspace } from "@/components/workspace/WorkforceHistoryWorkspace";
import { IntelliOfficeWorkspace } from "@/components/workspace/IntelliOfficeWorkspace";
import { IntelliSphereToolsWorkspace } from "@/components/workspace/IntelliSphereToolsWorkspace";
import { EmployeeProfileWorkspace } from "@/components/workspace/EmployeeProfileWorkspace";
import { GroupMembershipWorkspace } from "@/components/workspace/GroupMembershipWorkspace";
import { OperationalPageWorkspace } from "@/components/workspace/OperationalPageWorkspace";
import { IdentityAccessWorkspace } from "@/components/workspace/IdentityAccessWorkspace";
import { PublicSiteManagementWorkspace } from "@/components/workspace/PublicSiteManagementWorkspace";
import { findPage, toneVar } from "@/lib/nav";
import { getSupabaseClient } from "@/lib/supabase";
import { useWork } from "@/lib/work-context";

export const Route = createFileRoute("/m/$section/$group/$page")({
  loader: ({ params }) => {
    const found = findPage(params.section, params.group, params.page);
    if (!found) throw notFound();
    return { title: found.page.title, section: found.section.title, group: found.group.title };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} · ${loaderData.section} · Maximus Optimus` },
          { name: "robots", content: "noindex,nofollow" },
          {
            name: "description",
            content: `${loaderData.title} in ${loaderData.group}, part of ${loaderData.section}.`,
          },
        ]
      : [],
  }),
  component: PageFoundation,
});

type Row = Record<string, unknown>;
type DirectoryKind = "users" | "devices" | "tenants" | "tickets" | "groups" | "group_memberships";
const directorySlugs: Record<DirectoryKind, string[]> = {
  users: [
    "global-directory",
    "user-accounts",
    "global-user-id",
    "user-profiles",
    "employee-accounts",
    "contractor-accounts",
    "business-accounts",
    "tenant-user-accounts",
    "external-users",
    "employees",
    "workforce-directory",
    "managers",
    "technician-directory",
    "technician-profiles",
  ],
  devices: [
    "device-overview",
    "desktop-computers",
    "laptops",
    "tablets",
    "mobile-devices",
    "servers",
    "device-inventory",
    "device-assignments",
    "device-history",
    "device-compliance",
    "infrastructure-inventory",
  ],
  tenants: ["tenants", "tenant-business-records", "tenant-membership", "tenant-administration"],
  groups: ["groups", "security-groups", "group-objects"],
  group_memberships: ["group-membership"],
  tickets: [
    "incidents",
    "service-requests",
    "problems",
    "change-requests",
    "open-tickets",
    "assigned-tickets",
    "escalations",
    "work-queue",
    "command-queue",
    "create-ticket",
    "my-tickets",
    "my-assigned-tickets",
    "other-users-tickets",
    "team-tickets",
    "all-tickets",
    "ticket-briefing",
    "ticket-history",
    "related-tickets",
  ],
};
const directoryKind = (slug: string): DirectoryKind | null =>
  (Object.entries(directorySlugs).find(([, slugs]) => slugs.includes(slug))?.[0] as
    DirectoryKind | undefined) ?? null;
const display = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? "—"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

function SupabaseDirectory({ kind, title }: { kind: DirectoryKind; title: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    title: "",
    description: "",
    priority: "medium",
    status: "open",
  });

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    setSelected(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not configured for this workspace.");
      setLoading(false);
      return () => {
        live = false;
      };
    }
    const directoryQuery =
      kind === "users"
        ? supabase
            .from("profiles")
            .select(
              "id,organization_id,tenant_id,department_id,organizational_unit_id,employee_global_id,company_global_id,first_name,last_name,display_name,work_email,work_phone,job_title,manager_profile_id,member_status,location_city,location_region,country_code,timezone,avatar_url,created_at,updated_at",
            )
            .limit(500)
        : supabase.from(kind).select("*").limit(500);
    directoryQuery.then(({ data, error: queryError }) => {
      if (!live) return;
      if (queryError) setError(queryError.message);
      else setRows((data ?? []) as Row[]);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [kind]);

  const columns = useMemo(() => {
    const preferred =
      kind === "users"
        ? [
            "display_name",
            "work_email",
            "job_title",
            "employee_global_id",
            "member_status",
            "department_id",
            "organization_id",
            "tenant_id",
          ]
        : kind === "devices"
          ? ["name", "device_name", "serial_number", "type", "assigned_to", "status"]
          : kind === "tenants"
            ? ["name", "tenant_name", "company_id", "owner", "status"]
            : kind === "groups"
              ? [
                  "name",
                  "group_key",
                  "group_type",
                  "description",
                  "is_privileged",
                  "organization_id",
                  "tenant_id",
                ]
              : kind === "group_memberships"
                ? ["group_id", "profile_id", "added_by", "expires_at", "created_at"]
                : ["ticket_id", "title", "summary", "priority", "status", "assignee"];
    const keys = new Set(rows.flatMap((row) => Object.keys(row)));
    return [
      ...preferred.filter((key) => keys.has(key)),
      ...[...keys].filter((key) => !preferred.includes(key)),
    ].slice(0, 8);
  }, [kind, rows]);
  const filtered = useMemo(
    () =>
      !query.trim()
        ? rows
        : rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())),
    [query, rows],
  );

  const createRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (kind === "users") {
      setError(
        "User provisioning is not available here. Create identities through the approved authentication and invitation workflow.",
      );
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const payload: Row =
      kind === "users"
        ? { full_name: form.name.trim(), email: form.email.trim(), role: "user", status: "active" }
        : {
            title: form.title.trim(),
            description: form.description.trim(),
            priority: form.priority,
            status: form.status,
          };
    const { data, error: insertError } = await supabase
      .from(kind)
      .insert(payload)
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data) setRows((current) => [data as Row, ...current]);
    setCompose(false);
    setForm({
      name: "",
      email: "",
      title: "",
      description: "",
      priority: "medium",
      status: "open",
    });
    toast.success(
      `${kind === "users" ? "User" : kind === "devices" ? "Device" : "Ticket"} created in Supabase.`,
    );
  };
  const openRow = (row: Row) => {
    setSelected(row);
    setEditing(kind === "tickets");
    setForm({
      name: String(row["full_name"] ?? row["name"] ?? ""),
      email: String(row["email"] ?? ""),
      title: String(row["title"] ?? row["subject"] ?? ""),
      description: String(row["description"] ?? row["summary"] ?? ""),
      priority: String(row["priority"] ?? "medium"),
      status: String(row["status"] ?? "open"),
    });
  };
  const saveTicket = async () => {
    if (kind !== "tickets" || !selected) return;
    const key = selected["id"] !== undefined ? "id" : "ticket_id";
    const supabase = getSupabaseClient();
    if (!supabase || selected[key] === undefined) return;
    const { data, error: updateError } = await supabase
      .from("tickets")
      .update({
        title: form.title,
        description: form.description,
        priority: form.priority,
        status: form.status,
      })
      .eq(key, selected[key])
      .select("*")
      .single();
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (data) {
      setRows((current) =>
        current.map((row) => (row[key] === selected[key] ? (data as Row) : row)),
      );
      setSelected(data as Row);
    }
    setEditing(false);
    toast.success("Ticket updated in Supabase.");
  };

  return (
    <section className="rounded-xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            Live Supabase data
          </div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {kind === "users"
              ? "Employee identity and organization fields from the canonical profiles table; account provisioning is handled separately."
              : kind === "groups"
                ? "Organization-scoped directory groups. Membership changes require the approved access workflow."
                : kind === "group_memberships"
                  ? "Membership records from the canonical group_memberships relation. This view is read-only."
                  : "Authenticated records from the selected table."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {filtered.length} visible · {rows.length} loaded
          </span>
          {(kind === "devices" || kind === "tickets") && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium text-primary hover:bg-accent"
              onClick={() => setCompose((value) => !value)}
            >
              <Plus className="size-3" /> Create{" "}
              {kind === "users" ? "user" : kind === "devices" ? "device" : "ticket"}
            </button>
          )}
        </div>
      </div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${kind}…`}
        />
      </div>
      {compose && (
        <form
          className="mb-4 grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:grid-cols-2"
          onSubmit={createRecord}
        >
          <b className="sm:col-span-2">
            Create {kind === "users" ? "user" : kind === "devices" ? "device" : "ticket"} in
            Supabase
          </b>
          {kind === "users" ? (
            <>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                required
                placeholder="Full name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                required
                type="email"
                placeholder="Work email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </>
          ) : kind === "devices" ? (
            <>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                required
                placeholder="Device name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                required
                placeholder="Serial number"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2"
                required
                placeholder="Device type (laptop, server, mobile…)"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </>
          ) : (
            <>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                required
                placeholder="Ticket title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
              >
                <option>low</option>
                <option>medium</option>
                <option>high</option>
                <option>urgent</option>
              </select>
              <textarea
                className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2"
                required
                placeholder="Describe the work"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              Save to Supabase
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => setCompose(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {loading && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Loading {kind} from Supabase…
        </div>
      )}
      {!loading && error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to read `{kind}`: {error}
        </div>
      )}
      {!loading && !error && !rows.length && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No records returned for this account.
        </div>
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-auto rounded-lg border">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th className="px-3 py-2" key={column}>
                      {column.replaceAll("_", " ")}
                    </th>
                  ))}
                  <th className="px-3 py-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <tr
                    className="border-b last:border-0 hover:bg-accent/50"
                    key={String(
                      row["id"] ?? row["user_id"] ?? row["ticket_id"] ?? row["device_id"] ?? index,
                    )}
                  >
                    {columns.map((column) => (
                      <td className="max-w-[240px] truncate px-3 py-2" key={column}>
                        {display(row[column])}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={() => openRow(row)}
                      >
                        Drill down
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected && (
            <aside className="rounded-lg border bg-background/50 p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Record detail
                  </div>
                  <h3 className="font-semibold">
                    {display(
                      selected["name"] ??
                        selected["full_name"] ??
                        selected["title"] ??
                        selected["ticket_id"] ??
                        selected["id"],
                    )}
                  </h3>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground"
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
              </div>
              {editing ? (
                <div className="grid gap-2">
                  <input
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                  />
                  <textarea
                    className="min-h-20 rounded-md border bg-background px-2 py-1 text-sm"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                  <select
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                  >
                    <option>open</option>
                    <option>in_progress</option>
                    <option>pending</option>
                    <option>closed</option>
                  </select>
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                    onClick={saveTicket}
                  >
                    Save ticket
                  </button>
                </div>
              ) : (
                <dl className="grid gap-2 text-sm">
                  {Object.entries(selected).map(([key, value]) => (
                    <div className="border-b pb-2 last:border-0" key={key}>
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                        {key.replaceAll("_", " ")}
                      </dt>
                      <dd className="break-words">{display(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </aside>
          )}
        </div>
      )}
    </section>
  );
}

const marketplaceSlugs = [
  "marketplace-overview",
  "products-and-services",
  "pricing-and-feature-comparisons",
  "side-by-side-product-comparisons",
  "company-purchases",
  "tenant-purchases",
  "subscription-management",
  "seats-and-licensing",
  "upgrades-and-feature-access",
  "financial-overview",
  "income-and-revenue",
  "transactions-and-payments",
  "billing-and-renewals",
];
const workforceHistorySlugs = [
  "intellistaff",
  "intellistaff-overview",
  "intellihire",
  "intellihire-overview",
  "intelliwork",
  "intelliwork-overview",
];
const subscriptionLevels = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"];
const catalogSeed = [
  {
    name: "IntelliDesk",
    description: "Ticketing, work queues, SLAs and service operations.",
    category: "Operations",
  },
  {
    name: "IntelliCalendar",
    description: "Shared schedules, meetings and follow-up coordination.",
    category: "Productivity",
  },
  {
    name: "IntelliChat",
    description: "Secure messaging, groups and collaboration spaces.",
    category: "Collaboration",
  },
  {
    name: "IntelliDrive",
    description: "Controlled documents and shared workspaces.",
    category: "Collaboration",
  },
  {
    name: "IntelliSync",
    description: "Approved connector and directory synchronization.",
    category: "Integrations",
  },
];

function MarketplaceCatalogWorkspace({ title }: { title: string }) {
  const [catalog, setCatalog] = useState<Row[]>(catalogSeed);
  const [selected, setSelected] = useState<string[]>(["IntelliDesk"]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, number | null>>({
    users: null,
    devices: null,
    tenants: null,
    tickets: null,
  });
  const [companies, setCompanies] = useState<string[]>([]);
  const [companyA, setCompanyA] = useState("Current company");
  const [companyB, setCompanyB] = useState("All organizations");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return () => {
        live = false;
      };
    }
    const tables = ["users", "devices", "tenants", "tickets"] as const;
    Promise.all(
      tables.map(async (table) => {
        const result = await supabase.from(table).select("*").limit(500);
        return [table, (result.data ?? []) as Row[]] as const;
      }),
    ).then(async (results) => {
      if (!live) return;
      const nextCounts: Record<string, number | null> = {};
      const companySet = new Set<string>();
      results.forEach(([table, rows]) => {
        nextCounts[table] = rows.length;
        rows.forEach((row) => {
          const company = row["company_id"] ?? row["company"] ?? row["organization_id"];
          if (company) companySet.add(String(company));
        });
      });
      setCounts(nextCounts);
      setCompanies([...companySet]);
      for (const table of ["marketplace_products", "products", "applications"]) {
        const result = await supabase.from(table).select("*").limit(50);
        if (!result.error && result.data?.length) {
          setCatalog(result.data as Row[]);
          break;
        }
      }
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  const categories = [
    "All",
    ...new Set(catalog.map((item) => String(item["category"] ?? "Ecosystem"))),
  ];
  const visible = catalog.filter(
    (item) =>
      (filter === "All" || String(item["category"] ?? "Ecosystem") === filter) &&
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  );
  const footprint = (company: string) => ({
    people: counts["users"] ?? 0,
    devices: counts["devices"] ?? 0,
    tenants: counts["tenants"] ?? 0,
    tickets: counts["tickets"] ?? 0,
    network: (counts["devices"] ?? 0) + (counts["tenants"] ?? 0),
  });
  const requestAccess = async (name: string) => {
    setRequesting(name);
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from("entitlements")
        .insert({ application_name: name, status: "requested" });
      if (error) toast.error(`Access request could not be saved: ${error.message}`);
      else toast.success(`Access request saved for ${name}.`);
    }
    setRequesting(null);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-gradient-to-br from-white via-sky-50/60 to-violet-50/60 p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              IntelliSphere Marketplace
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Discover, compare, request and manage capabilities across the IntelliStack Systems
              ecosystem.
            </p>
          </div>
          <div className="rounded-xl border bg-white/75 px-4 py-3 text-sm shadow-sm">
            <span className="block text-xs text-muted-foreground">Subscription center</span>
            <b>Level 3 · Core workspace</b>
          </div>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <Users className="mb-3 size-5 text-sky-600" />
          <span className="text-xs text-muted-foreground">People in scope</span>
          <b className="mt-1 block text-2xl">{loading ? "—" : (counts["users"] ?? "—")}</b>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <Laptop className="mb-3 size-5 text-violet-600" />
          <span className="text-xs text-muted-foreground">Devices in network</span>
          <b className="mt-1 block text-2xl">{loading ? "—" : (counts["devices"] ?? "—")}</b>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <Building2 className="mb-3 size-5 text-emerald-600" />
          <span className="text-xs text-muted-foreground">Tenants / orgs</span>
          <b className="mt-1 block text-2xl">{loading ? "—" : (counts["tenants"] ?? "—")}</b>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <Ticket className="mb-3 size-5 text-orange-600" />
          <span className="text-xs text-muted-foreground">Tickets in scope</span>
          <b className="mt-1 block text-2xl">{loading ? "—" : (counts["tickets"] ?? "—")}</b>
        </div>
      </div>
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Application catalog</h3>
            <p className="text-sm text-muted-foreground">
              Compact tiles show what is available, locked, or ready to request.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                className="w-40 bg-transparent text-sm outline-none"
                placeholder="Search apps"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setFilter(category)}
                className={`rounded-md px-3 py-2 text-xs ${filter === category ? "bg-primary text-primary-foreground" : "border hover:bg-accent"}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((app, index) => {
            const name = String(
              app["name"] ?? app["application_name"] ?? `Application ${index + 1}`,
            );
            const locked = index > 2;
            const isSelected = selected.includes(name);
            return (
              <article
                className={`rounded-xl border p-4 transition ${isSelected ? "border-primary bg-primary/5" : "bg-white/60 hover:border-primary/40"}`}
                key={name}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white">
                    <ShoppingBag className="size-5" />
                  </div>
                  {locked ? (
                    <LockKeyhole className="size-4 text-muted-foreground" />
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                      Available
                    </span>
                  )}
                </div>
                <h4 className="font-semibold">{name}</h4>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                  {String(
                    app["description"] ?? app["summary"] ?? "IntelliStack workspace capability.",
                  )}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent"
                    onClick={() =>
                      setSelected((current) =>
                        current.includes(name)
                          ? current.filter((item) => item !== name)
                          : current.length < 2
                            ? [...current, name]
                            : [current[1]!, name],
                      )
                    }
                  >
                    {isSelected ? (
                      <>
                        <Check className="mr-1 inline size-3" /> Selected
                      </>
                    ) : (
                      "Compare"
                    )}
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                    onClick={() => requestAccess(name)}
                    disabled={requesting === name}
                  >
                    {locked ? "Request access" : "Open"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Company footprint comparison</h3>
            <p className="text-sm text-muted-foreground">
              Compare people, devices, tenants and work volume using the live records returned by
              Supabase.
            </p>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={companyA}
            onChange={(event) => setCompanyA(event.target.value)}
          >
            <option>Current company</option>
            {companies.map((company) => (
              <option key={company}>{company}</option>
            ))}
          </select>
          <span className="self-center text-xs font-semibold text-muted-foreground">VS</span>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={companyB}
            onChange={(event) => setCompanyB(event.target.value)}
          >
            <option>All organizations</option>
            {companies.map((company) => (
              <option key={company}>{company}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            [companyA, footprint(companyA)],
            [companyB, footprint(companyB)],
          ].map(([label, data]) => (
            <div
              className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-4"
              key={String(label)}
            >
              <div className="mb-3 flex items-center justify-between">
                <b>{String(label)}</b>
                <Building2 className="size-4 text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(data as Record<string, number>).map(([metric, value]) => (
                  <div className="rounded-lg border bg-white p-3" key={metric}>
                    <span className="block text-xs capitalize text-muted-foreground">{metric}</span>
                    <strong className="text-lg">{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShoppingBag className="size-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Five subscription levels</h3>
            <p className="text-sm text-muted-foreground">
              Level 3 is the middle tier. Locked capabilities remain visible so administrators can
              plan access.
            </p>
          </div>
        </div>
        <div className="overflow-auto rounded-lg border">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-3 py-3">Capability</th>
                {subscriptionLevels.map((level) => (
                  <th
                    className={`px-3 py-3 ${level === "Level 3" ? "text-primary" : ""}`}
                    key={level}
                  >
                    {level}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "Core workspace",
                "Directory and identity",
                "IntelliDesk operations",
                "IntelliCalendar and IntelliChat",
                "Advanced analytics and administration",
              ].map((feature, index) => (
                <tr className="border-b last:border-0" key={feature}>
                  <td className="px-3 py-3 font-medium">{feature}</td>
                  {subscriptionLevels.map((level, levelIndex) => (
                    <td className="px-3 py-3" key={level}>
                      {levelIndex >= Math.max(0, index - 1) ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MarketplaceWorkspace({ title, pageSlug }: { title: string; pageSlug: string }) {
  const historyPages = [
    "marketplace-overview",
    "company-purchases",
    "tenant-purchases",
    "subscription-management",
    "billing-and-renewals",
    "transactions-and-payments",
    "financial-overview",
    "income-and-revenue",
  ];
  if (historyPages.includes(pageSlug)) {
    return <MarketplaceHistoryWorkspace title={title} pageSlug={pageSlug} />;
  }
  return <MarketplaceCatalogWorkspace title={title} />;
}

function EnvironmentAssessment() {
  const [profile, setProfile] = useState({
    companySize: "",
    industry: "",
    locations: "",
    employees: "",
    monthlySpend: "",
    infrastructure: "",
    identity: "",
    security: "",
    serviceDesk: "",
    productivity: "",
    vendors: "",
    challenges: "",
  });
  const [analyzed, setAnalyzed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const employees = Number(profile.employees) || 0;
  const recommendation =
    employees <= 25
      ? "Level 1"
      : employees <= 100
        ? "Level 2"
        : employees <= 500
          ? "Level 3"
          : employees <= 2000
            ? "Level 4"
            : "Level 5";
  const analysis = [
    [
      "Identity and access",
      profile.identity ? "Integrate" : "Add",
      profile.identity
        ? "Your current identity platform can be assessed for connector fit."
        : "IntelliDirectory can provide a unified identity baseline.",
    ],
    [
      "Security and monitoring",
      profile.security ? "Retain + improve" : "Gap",
      profile.security
        ? "Map current controls to IntelliStack security and NOC coverage."
        : "Add security posture, threat monitoring, and operational visibility.",
    ],
    [
      "Service desk and tickets",
      profile.serviceDesk ? "Consolidate" : "Opportunity",
      profile.serviceDesk
        ? "Compare ticket, SLA, and workflow overlap against IntelliDesk."
        : "IntelliDesk can provide the initial service workflow and audit trail.",
    ],
    [
      "Productivity and collaboration",
      profile.productivity ? "Integrate" : "Opportunity",
      profile.productivity
        ? "Identify which connected tools should remain and where native tools fit."
        : "Evaluate IntelliCalendar, IntelliChat, IntelliDrive, and IntelliSync.",
    ],
  ];
  const update = (key: keyof typeof profile, value: string) =>
    setProfile((current) => ({ ...current, [key]: value }));
  const saveAssessment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("company_assessments")
      .insert({ profile, recommendation, analysis });
    setSaving(false);
    setSaved(!error);
    if (error) toast.error(`Assessment could not be saved: ${error.message}`);
    else toast.success("Assessment saved to Supabase.");
  };
  return (
    <section className="rounded-2xl border bg-gradient-to-br from-white to-sky-50/40 p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Company Environment Assessment
          </div>
          <h2 className="mt-1 text-xl font-semibold">
            See where you are today—and what a unified IntelliStack environment could change.
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Enter the current business and IT environment. The assessment keeps current capabilities
            visible, identifies overlap and gaps, and recommends a subscription level without hiding
            the assumptions.
          </p>
        </div>
        <BarChart3 className="size-6 text-primary" />
      </div>
      <form onSubmit={saveAssessment} className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Company size
            <select
              className="rounded-md border bg-white px-3 py-2"
              value={profile.companySize}
              onChange={(e) => update("companySize", e.target.value)}
            >
              <option value="">Select size</option>
              <option>1–25</option>
              <option>26–100</option>
              <option>101–500</option>
              <option>501–2,000</option>
              <option>2,000+</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Industry
            <input
              className="rounded-md border bg-white px-3 py-2"
              value={profile.industry}
              onChange={(e) => update("industry", e.target.value)}
              placeholder="Industry or sector"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Locations
            <input
              className="rounded-md border bg-white px-3 py-2"
              value={profile.locations}
              onChange={(e) => update("locations", e.target.value)}
              placeholder="Countries, offices, regions"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Employees
            <input
              required
              type="number"
              min="1"
              className="rounded-md border bg-white px-3 py-2"
              value={profile.employees}
              onChange={(e) => update("employees", e.target.value)}
              placeholder="Number of employees"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Current monthly software spend
            <input
              className="rounded-md border bg-white px-3 py-2"
              value={profile.monthlySpend}
              onChange={(e) => update("monthlySpend", e.target.value)}
              placeholder="$ / month (optional)"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Current vendors and licenses
            <textarea
              className="min-h-20 rounded-md border bg-white px-3 py-2"
              value={profile.vendors}
              onChange={(e) => update("vendors", e.target.value)}
              placeholder="Vendors, contracts, license counts"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Servers, networks, devices, cloud and infrastructure
            <textarea
              className="min-h-20 rounded-md border bg-white px-3 py-2"
              value={profile.infrastructure}
              onChange={(e) => update("infrastructure", e.target.value)}
              placeholder="Servers, network equipment, endpoints, cloud services"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Identity and Active Directory
            <textarea
              className="min-h-20 rounded-md border bg-white px-3 py-2"
              value={profile.identity}
              onChange={(e) => update("identity", e.target.value)}
              placeholder="AD, SSO, MFA, identity provider"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Security and monitoring
            <textarea
              className="min-h-20 rounded-md border bg-white px-3 py-2"
              value={profile.security}
              onChange={(e) => update("security", e.target.value)}
              placeholder="Security, monitoring, compliance"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Help desk and ticketing
            <textarea
              className="min-h-20 rounded-md border bg-white px-3 py-2"
              value={profile.serviceDesk}
              onChange={(e) => update("serviceDesk", e.target.value)}
              placeholder="Help desk, ticketing, SLA tools"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Productivity and collaboration
            <textarea
              className="min-h-20 rounded-md border bg-white px-3 py-2"
              value={profile.productivity}
              onChange={(e) => update("productivity", e.target.value)}
              placeholder="Email, calendar, chat, files, collaboration"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Operational challenges
            <textarea
              className="min-h-20 rounded-md border bg-white px-3 py-2"
              value={profile.challenges}
              onChange={(e) => update("challenges", e.target.value)}
              placeholder="What is difficult, duplicated, risky, or expensive today?"
            />
          </label>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border bg-white/80 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              Recommended starting point
            </div>
            <div className="mt-1 text-3xl font-semibold">{recommendation}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Based on {employees || "your"} employees. Final recommendation also considers devices,
              locations, security, and operational complexity.
            </p>
          </div>
          <button
            type="button"
            className="w-full rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-accent"
            onClick={() => setAnalyzed(true)}
          >
            Analyze environment
          </button>
          {analyzed && (
            <div className="rounded-xl border bg-white/80 p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4 text-emerald-600" /> Preliminary analysis
              </div>
              <div className="grid gap-2">
                {analysis.map(([area, action, detail]) => (
                  <div className="rounded-lg border p-3" key={area}>
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-sm">{area}</b>
                      <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] text-sky-700">
                        {action}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save assessment"}
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() =>
                toast.info("Consultation request is ready for the authorized sales workflow.")
              }
            >
              Request consultation
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => toast.info("Proposal handoff is ready once the assessment is saved.")}
            >
              Proceed to proposal
            </button>
          </div>
          {saved && (
            <p className="text-xs text-emerald-700">
              Saved to the `company_assessments` Supabase table.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

function PageFoundation() {
  const params = Route.useParams();
  const { section, group, page } = findPage(params.section, params.group, params.page)!;
  const { activeTicketId } = useWork();
  const tone = toneVar[section.tone];
  const ticketWorkspace = section.slug === "intellidesk-command-center" && group.slug === "technician-workspace" && page.slug === "work-queue";
  const directory = directoryKind(page.slug);
  const marketplace = marketplaceSlugs.includes(page.slug);
  const workforceHistory = workforceHistorySlugs.includes(page.slug);
  const workflowCenter = section.slug === "workflow-center";
  const knowledgeSpaces = section.slug === "intellibase";
  const officeTool = ["intelliword", "intellisheets", "intellislides", "intellichat"].includes(
    page.slug,
  );
  const suiteTools = [
    "intellinotes",
    "intellidrive",
    "intelliforms",
    "intellistudio",
    "intellitext",
  ].includes(page.slug);
  const helpBuddy = section.slug === "help-buddy";
  const helpBuddyManagement = helpBuddy && group.slug === "intelligence-management";
  const identityAccessSlugs = new Set([
    "directory-dashboard", "global-directory", "directory-health", "directory-activity",
    "user-accounts", "global-user-id", "employee-accounts", "contractor-accounts",
    "business-accounts", "tenant-user-accounts", "external-users", "identity-verification",
    "account-status", "departments", "organizational-units", "organizational-hierarchy", "teams", "security-groups", "group-objects",
    "roles-and-permissions", "access-management", "application-access", "access-requests",
    "access-audit", "directory-audit-history",
  ]);
  const identityAccess = section.slug === "new-active-directory" && identityAccessSlugs.has(page.slug);
  const publicSiteView =
    page.slug === "website-content-management"
      ? "pages"
      : page.slug === "social-media-management"
        ? "social"
        : page.slug === "public-contact-inquiries"
          ? "inquiries"
          : null;
  return (
    <div className="space-y-4">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
      >
        <Link to="/" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="size-3" />
        <Link to="/m/$section" params={{ section: section.slug }} className="hover:text-foreground">
          {section.title}
        </Link>
        <ChevronRight className="size-3" />
        <span>{group.title}</span>
        <ChevronRight className="size-3" />
        <span className="font-medium text-foreground">{page.title}</span>
      </nav>
      <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-card">
        <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: tone }} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-display text-[11px] tracking-wider" style={{ color: tone }}>
              {section.number} · {section.title.toUpperCase()}
            </div>
            <h1 className="font-display text-2xl font-bold">{page.title}</h1>
            <p className="text-sm text-muted-foreground">{group.title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(officeTool ||
              suiteTools ||
              helpBuddy ||
              workflowCenter ||
              ticketWorkspace ||
              workforceHistory ||
              directory === "tickets") && <StatusBadge status="Built" />}
            {((directory && directory !== "tickets") || marketplace || knowledgeSpaces) && (
              <StatusBadge status="Connected" />
            )}
            {!officeTool &&
              !suiteTools &&
              !helpBuddy &&
              !workflowCenter &&
              !ticketWorkspace &&
              !workforceHistory &&
              !directory &&
              !marketplace &&
              !knowledgeSpaces && <StatusBadge status="Awaiting configuration" />}
          </div>
        </div>
      </div>
      {activeTicketId && !ticketWorkspace && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <Ticket className="size-4 text-primary" />
          Your work on <span className="font-semibold text-primary">{activeTicketId}</span> is
          preserved.
          <Link
            to="/m/$section/$group/$page"
            params={{
              section: "intellidesk-command-center",
              group: "technician-workspace",
              page: "work-queue",
            }}
            className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-3.5" /> Return to ticket
          </Link>
        </div>
      )}
      {publicSiteView ? (
        <PublicSiteManagementWorkspace view={publicSiteView} />
      ) : officeTool ? (
        <IntelliOfficeWorkspace pageSlug={page.slug} />
      ) : suiteTools ? (
        <IntelliSphereToolsWorkspace pageSlug={page.slug} />
      ) : knowledgeSpaces ? (
        <KnowledgeSpacesWorkspace title={page.title} pageSlug={page.slug} />
      ) : helpBuddyManagement ? (
        <HelpBuddyIntelligenceManagement pageSlug={page.slug} />
      ) : helpBuddy ? (
        <HelpBuddyWorkspace title={page.title} pageSlug={page.slug} />
      ) : workflowCenter ? (
        <WorkflowCenter title={page.title} />
      ) : ticketWorkspace ? (
        <TicketWorkspace />
      ) : marketplace ? (
        <MarketplaceWorkspace title={page.title} pageSlug={page.slug} />
      ) : workforceHistory ? (
        <WorkforceHistoryWorkspace title={page.title} pageSlug={page.slug} />
      ) : ["user-profiles", "badges-and-achievements", "stars-and-recognition"].includes(
          page.slug,
        ) ? (
        <EmployeeProfileWorkspace />
      ) : page.slug === "group-membership" ? (
        <GroupMembershipWorkspace />
      ) : identityAccess ? (
        <IdentityAccessWorkspace title={page.title} pageSlug={page.slug} />
      ) : directory === "tickets" ? (
        <TicketManagementWorkspace title={page.title} pageSlug={page.slug} />
      ) : directory ? (
        <SupabaseDirectory kind={directory} title={page.title} />
      ) : (
        <OperationalPageWorkspace title={page.title} pageSlug={page.slug} />
      )}
    </div>
  );
}
