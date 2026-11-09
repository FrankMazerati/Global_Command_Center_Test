import { useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Download,
  Globe,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { filterRecords, type DashboardPage, type DemoRecord } from "@/lib/dashboard-pages";
import { useDemo } from "./DemoProvider";
import { WidgetCard } from "./widgets";
const inputClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary";
export function ReferenceDashboard({ page }: { page: DashboardPage }) {
  const demo = useDemo();
  const rows = demo.rows[page.slug] ?? page.records;
  const [tab, setTab] = useState(page.tabs[0] ?? "Overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [editing, setEditing] = useState<DemoRecord | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState({
    timezone: "UTC",
    language: "English (US)",
    backup: "Daily · 02:00 UTC",
  });
  const filtered = filterRecords(rows, query, status);
  const logs = demo.activity[page.slug] ?? [];
  const notify = (message: string) => {
    setNotice(message);
    demo.log(page.slug, message);
  };
  const isSettings = page.slug === "administration-settings-support";
  const isMarket = page.slug === "intellimarketplace";
  const isMatrix = tab.includes("Matrix") || tab === "Permissions" || tab === "Controls";
  const isAudit = tab.includes("Audit") || tab === "Analytics" || tab === "Workforce Analytics";
  const exportRows = () => {
    const csv = [
      "Name,Details,Status,Region",
      ...rows.map((r) =>
        [r.name, r.detail, r.status, r.region].map((v) => `"${v.replaceAll('"', '""')}"`).join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${page.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Report exported");
  };
  const runAction = (label: string) => {
    if (label.includes("Export") || label.includes("Report")) {
      exportRows();
      return;
    }
    if (/^(Add|New|Register|Provision|Create|Invite)/.test(label)) {
      setEditing({
        id: `demo-${Date.now()}`,
        name: "",
        detail: "",
        status: "Active",
        region: "Americas",
      });
      return;
    }
    setAction(label);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    const exists = rows.some((r) => r.id === editing.id);
    demo.setRows(
      page.slug,
      exists ? rows.map((r) => (r.id === editing.id ? editing : r)) : [editing, ...rows],
    );
    notify(`${editing.name} ${exists ? "updated" : "added"}`);
    setEditing(null);
  };
  const scene = (
    <div className="command-scene relative min-h-48 overflow-hidden rounded-lg border border-border">
      <img
        src={page.scene}
        alt={`${page.title} command visualization from your reference`}
        className="h-full min-h-48 w-full object-cover"
      />
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded border border-border bg-background/80 px-2 py-1 text-[10px] text-primary">
        <Globe className="h-3 w-3" />
        MAXIMUS OPTIMUS · {tab}
      </div>
      <div className="absolute bottom-3 right-3 rounded border border-border bg-background/80 px-2 py-1 text-[10px] text-success">
        ● Demo environment
      </div>
    </div>
  );
  const health = (
    <section className="panel p-3">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Shield className="h-4 w-4 text-primary" />
        {page.health}
      </h2>
      <div className="flex items-center gap-4">
        <div className="command-ring grid h-24 w-24 shrink-0 place-items-center rounded-full border-8 border-primary text-center">
          <div>
            <strong className="text-xl">{page.percent}%</strong>
            <div className="text-[10px] text-muted-foreground">
              {page.percent === 100 ? "Synchronized" : "Healthy"}
            </div>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          <div className="text-success">
            ● {page.slug === "assets-resources" ? "Optimal" : "Healthy"}
          </div>
          <div className="text-primary">{rows.length} demo records</div>
          <div className="text-muted-foreground">
            Last update: {logs.length ? "Just now" : "Ready"}
          </div>
          <Button variant="outline" size="sm" onClick={() => setAction("View Health Details")}>
            View Details
            <ArrowRight />
          </Button>
        </div>
      </div>
    </section>
  );
  const recordList = (
    <section className="panel p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-primary" />
          {page.listTitle}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          title={`Add ${page.entity}`}
          aria-label={`Add ${page.entity}`}
          onClick={() => runAction(`Add ${page.entity}`)}
        >
          <Plus />
        </Button>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <div className="flex min-w-32 flex-1 items-center gap-1 rounded border border-input px-2">
          <Search className="h-3.5 w-3.5 text-primary" />
          <input
            className="h-8 w-full min-w-0 bg-transparent text-xs outline-none"
            aria-label={`Search ${page.listTitle}`}
            placeholder="Search records…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-36 rounded border border-input bg-background px-2 text-xs"
        >
          <option>All</option>
          {[...new Set(rows.map((r) => r.status))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="scroll-blue max-h-64 divide-y divide-border">
        {filtered.length === 0 && (
          <p className="py-5 text-center text-xs text-muted-foreground">No matching records</p>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="flex items-center gap-2 py-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary bg-secondary text-xs text-primary">
              {r.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="break-words text-xs font-semibold">{r.name}</div>
              <div className="break-words text-[10px] text-muted-foreground">
                {r.detail} · {r.region}
              </div>
              <div
                className={`text-[10px] ${["Pending", "Attention", "Open", "Maintenance", "Suspended", "On Leave"].includes(r.status) ? "text-warning" : "text-success"}`}
              >
                ● {r.status}
              </div>
            </div>
            {isMarket ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = r.status === "Subscribed" ? "Available" : "Subscribed";
                  demo.setRows(
                    page.slug,
                    rows.map((x) => (x.id === r.id ? { ...x, status: next } : x)),
                  );
                  notify(`${r.name}: ${next}`);
                }}
              >
                {r.status === "Subscribed" ? "Remove" : "+ Add"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${r.name}`}
                onClick={() => setEditing({ ...r })}
              >
                <Pencil />
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
  const actions = (
    <section className="panel p-3">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Activity className="h-4 w-4 text-primary" />
        {page.slug === "user-role-administration" ? "Quick Governance Actions" : "Quick Actions"}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {page.actions.map((label, i) => (
          <Button
            key={label}
            variant="outline"
            className="h-16 flex-col whitespace-normal px-1 text-center text-[10px]"
            onClick={() => runAction(label)}
          >
            {i === 0 ? (
              <Plus />
            ) : i === page.actions.length - 1 ? (
              <Download />
            ) : i % 2 ? (
              <Shield />
            ) : (
              <RefreshCw />
            )}
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
  const bars = (
    <WidgetCard
      w={{
        kind: "bars",
        title: page.secondary,
        icon: Layers,
        rows: page.bars.map(([label, value]) => ({
          label,
          value: (value / Math.max(...page.bars.map((b) => b[1]), 1)) * 100,
          right: value.toLocaleString(),
        })),
      }}
    />
  );
  const activity = (
    <section className="panel p-3">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Activity className="h-4 w-4 text-primary" />
        Recent Activity
      </h2>
      {[
        ...logs,
        ...[
          "Directory synchronized",
          "Policy review completed",
          "Report generated",
          "Service health checked",
        ],
      ]
        .slice(0, 6)
        .map((l, i) => (
          <div
            key={`${i}-${l}`}
            className="flex items-start justify-between gap-2 border-b border-border/40 py-2 text-[11px]"
          >
            <span className="flex gap-2">
              <span className="text-primary">●</span>
              {l}
            </span>
            <span className="shrink-0 text-[9px] text-muted-foreground">
              {i < logs.length ? "Just now" : `${i * 3 + 2}m ago`}
            </span>
          </div>
        ))}
    </section>
  );
  const matrix = (
    <section className="panel p-3">
      <h2 className="mb-3 text-sm font-semibold">
        {tab.includes("Skills") ? "Skills Matrix" : "Permissions Matrix"}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left">Resource</th>
              {["Read", "Write", "Execute", "Approve", "Admin"].map((x) => (
                <th key={x} className="p-2">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              "User Management",
              "Data Access",
              "Financial Systems",
              "Infrastructure",
              "Security",
              "Compliance",
            ].map((resource) => (
              <tr key={resource}>
                <td className="p-2">{resource}</td>
                {["Read", "Write", "Execute", "Approve", "Admin"].map((permission, i) => (
                  <td key={permission} className="border border-border p-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${resource} ${permission}`}
                      checked={toggles[`${resource}-${permission}`] ?? i < 2}
                      onChange={(e) => {
                        setToggles({ ...toggles, [`${resource}-${permission}`]: e.target.checked });
                        notify(
                          `${resource} ${permission} ${e.target.checked ? "enabled" : "disabled"} in demo`,
                        );
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
  const controls = (
    <section className="panel p-3">
      <h2 className="mb-2 text-sm font-semibold">Security Controls</h2>
      {[
        "Multi-Factor Authentication",
        "Zero Trust Network",
        "Threat Detection AI",
        "Data Encryption",
        "Access Policies",
        "Audit Logging",
      ].map((label) => (
        <label
          key={label}
          className="flex items-center justify-between gap-2 border-b border-border/40 py-2 text-xs"
        >
          <span>{label}</span>
          <input
            type="checkbox"
            checked={toggles[label] ?? true}
            onChange={(e) => {
              setToggles({ ...toggles, [label]: e.target.checked });
              notify(`${label} ${e.target.checked ? "enabled" : "disabled"} in demo`);
            }}
          />
        </label>
      ))}
      <div className="mt-3 text-xs text-success">Security Posture: DEMO</div>
    </section>
  );
  const systemSettings = (
    <section className="panel p-3">
      <h2 className="mb-3 text-sm font-semibold">System Settings</h2>
      {(
        [
          [
            "timezone",
            "Global Timezone",
            ["UTC", "America/Chicago", "Europe/London", "Asia/Singapore"],
          ],
          ["language", "Default Language", ["English (US)", "Spanish", "French"]],
          [
            "backup",
            "Backup Schedule",
            ["Daily · 02:00 UTC", "Daily · 06:00 UTC", "Weekly · Sunday"],
          ],
        ] as const
      ).map(([key, label, values]) => (
        <label className="mb-2 flex items-center justify-between gap-2 text-xs" key={key}>
          {label}
          <select
            className="min-w-0 rounded border border-input bg-background p-1"
            value={settings[key]}
            onChange={(e) => {
              setSettings({ ...settings, [key]: e.target.value });
              notify(`${label} updated`);
            }}
          >
            {values.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      ))}
    </section>
  );
  return (
    <div className="reference-dashboard">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-primary bg-secondary/60 shadow-[var(--glow)]">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-glow lg:text-3xl">{page.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{page.subtitle}</p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground">Home › {page.title}</span>
      </div>
      <div role="tablist" aria-label={`${page.title} views`} className="mb-4 flex flex-wrap gap-2">
        {page.tabs.map((t) => (
          <Button
            key={t}
            role="tab"
            aria-selected={tab === t}
            variant="outline"
            size="sm"
            className={tab === t ? "border-primary bg-accent/60 shadow-[var(--glow)]" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      {notice && (
        <div
          role="status"
          className="mb-3 flex items-center gap-2 rounded border border-success/40 bg-success/10 p-2 text-xs text-success"
        >
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}
      <div className="reference-grid">
        <div className="space-y-3">
          <WidgetCard
            w={{
              kind: "stats",
              title:
                page.slug === "global-user-id" ? "Global ID Overview" : `${page.title} Overview`,
              items: page.metrics.map(([value, label], i) => ({
                value:
                  i === 0 && rows.length !== page.records.length
                    ? `${value} + ${rows.length - page.records.length}`
                    : value,
                label,
                ...(i === 0 ? { delta: "+3.2%" } : {}),
              })),
            }}
          />
          {recordList}
          {actions}
        </div>
        <div className="space-y-3">
          {scene}
          {isMatrix ? (
            matrix
          ) : isAudit ? (
            <>
              <WidgetCard
                w={{
                  kind: "chart",
                  title: tab,
                  type: "line",
                  points: [14, 22, 19, 28, 36, 31, 42, 56, 52, 63, 75, 88],
                  labels: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"],
                }}
              />
              {activity}
            </>
          ) : tab === "Org Chart" || tab === "Hierarchy" ? (
            <WidgetCard
              w={{
                kind: "tree",
                title: tab,
                root: "Elena Martinez · Chief Executive Officer",
                items: [
                  { label: "David Kim · Operations" },
                  { label: "Sarah Thompson · Finance" },
                  { label: "Arjun Patel · Engineering" },
                  { label: "Isabella Rossi · People Ops" },
                ],
              }}
            />
          ) : page.format ? (
            <section className="panel p-4">
              <h2 className="mb-3 text-sm">
                {page.slug === "global-company-id" ? "Company ID Format" : "Universal ID Format"}
              </h2>
              <div className="break-all font-display text-lg text-primary">{page.format}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Globally unique · Federated · Resolvable
              </div>
            </section>
          ) : isSettings ? (
            controls
          ) : (
            <WidgetCard
              w={{
                kind: "chart",
                title:
                  page.slug === "intellidesk" ? "Ticket Resolution Trend" : "Operational Analytics",
                type: "line",
                points: [16, 23, 21, 32, 35, 29, 43, 52, 48, 64, 68, 84],
                labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
              }}
            />
          )}
          {(tab === "Sources" ||
            tab === "Tickets" ||
            tab === "Tenants" ||
            tab === "All Apps" ||
            tab === "My Subscriptions") && (
            <div className="panel p-3 text-xs text-primary">
              {filtered.length} records available in {tab}
            </div>
          )}
        </div>
        <div className="space-y-3">
          {health}
          {isSettings ? systemSettings : bars}
          {activity}
        </div>
      </div>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogTitle>
            {editing && rows.some((r) => r.id === editing.id) ? "Edit" : "Add"} {page.entity}
          </DialogTitle>
          <DialogDescription>
            Demo record · Changes stay available while navigating this session.
          </DialogDescription>
          {editing && (
            <form onSubmit={save} className="space-y-3">
              <label className="block text-xs">
                Name
                <input
                  required
                  className={inputClass}
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label className="block text-xs">
                Details
                <input
                  className={inputClass}
                  value={editing.detail}
                  onChange={(e) => setEditing({ ...editing, detail: e.target.value })}
                />
              </label>
              <label className="block text-xs">
                Status
                <select
                  className={inputClass}
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                >
                  {[
                    ...new Set([
                      "Active",
                      "Pending",
                      "Open",
                      "In Progress",
                      "Resolved",
                      "Verified",
                      "Suspended",
                      "Completed",
                      "Available",
                      "Subscribed",
                      ...rows.map((r) => r.status),
                    ]),
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                Region / Location
                <input
                  className={inputClass}
                  value={editing.region}
                  onChange={(e) => setEditing({ ...editing, region: e.target.value })}
                />
              </label>
              <div className="flex justify-between gap-2">
                {rows.some((r) => r.id === editing.id) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      demo.setRows(
                        page.slug,
                        rows.filter((r) => r.id !== editing.id),
                      );
                      notify(`${editing.name} deleted`);
                      setEditing(null);
                    }}
                  >
                    <Trash2 />
                    Delete
                  </Button>
                )}
                <Button type="submit" className="ml-auto">
                  Save {page.entity}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        <DialogContent>
          <DialogTitle>{action}</DialogTitle>
          <DialogDescription>
            {action === "Emergency Lockdown"
              ? "Demo only. Confirming changes the simulated platform status; no live systems are affected."
              : `Demo operation for ${page.title}. No external systems are connected.`}
          </DialogDescription>
          {action?.includes("Health") ? (
            <div className="space-y-3 text-sm">
              <p className="text-success">All demo services operational</p>
              <p>Health score: {page.percent}%</p>
              <Button
                onClick={() => {
                  notify("Health check completed");
                  setAction(null);
                }}
              >
                Run Health Check
              </Button>
            </div>
          ) : (
            <>
              <label className="text-xs">
                Target record
                <select aria-label="Target record" className={inputClass} id="action-target">
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                onClick={() => {
                  const target = (
                    document.getElementById("action-target") as HTMLSelectElement | null
                  )?.value;
                  const completed = action ?? "Operation";
                  if (
                    target &&
                    /Verify|Resolve|Certify|Check In|Check Out|Maintenance|Onboard|Escalate/.test(
                      completed,
                    )
                  ) {
                    const next = completed.includes("Verify")
                      ? "Verified"
                      : completed.includes("Resolve")
                        ? "Resolved"
                        : completed.includes("Certify")
                          ? "Completed"
                          : completed === "Check In"
                            ? "In Stock"
                            : completed === "Check Out"
                              ? "Deployed"
                              : completed === "Maintenance"
                                ? "Maintenance"
                                : completed === "Escalate"
                                  ? "Escalated"
                                  : "Active";
                    demo.setRows(
                      page.slug,
                      rows.map((r) => (r.id === target ? { ...r, status: next } : r)),
                    );
                  }
                  notify(`${completed} completed in demo`);
                  setAction(null);
                }}
              >
                Confirm {action}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
