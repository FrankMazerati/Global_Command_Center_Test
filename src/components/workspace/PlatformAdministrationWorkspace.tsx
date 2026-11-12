import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  GitBranch,
  LayoutDashboard,
  LockKeyhole,
  Network,
  Plug,
  Settings2,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const DEPARTMENTS = [
  { slug: "platform-studio", title: "Platform Studio", description: "Build and extend platform modules, features and components.", icon: Boxes },
  { slug: "dashboard-and-template-management", title: "Dashboard & Template Management", description: "Manage reusable dashboards, layouts, widgets and page templates.", icon: LayoutDashboard },
  { slug: "organization-and-hierarchy", title: "Organization & Hierarchy", description: "Manage platform, tenant, company, department and team structure.", icon: Building2 },
  { slug: "identity-and-authorization", title: "Identity & Authorization", description: "Govern roles, permissions, access requests and privileged grants.", icon: LockKeyhole },
  { slug: "platform-configuration", title: "Platform Configuration", description: "Control global settings, scoped overrides and feature configuration.", icon: Settings2 },
  { slug: "navigation-and-service-registry", title: "Navigation & Service Registry", description: "Register routes, pages, services and navigation destinations.", icon: Network },
  { slug: "chat-buddy-administration", title: "Chat Buddy Administration", description: "Administer assistant configuration, character catalog and knowledge policy.", icon: Bot },
  { slug: "help-center-administration", title: "Help Center Administration", description: "Manage knowledge collections, support articles and troubleshooting.", icon: FileText },
  { slug: "connectivity-and-integrations", title: "Connectivity & Integrations", description: "Govern connectors, APIs, webhooks and integration health.", icon: Plug },
  { slug: "data-and-database-administration", title: "Data & Database Administration", description: "Catalog schemas, migrations, classification and retention controls.", icon: Database },
  { slug: "workflow-and-automation", title: "Workflow & Automation", description: "Manage reusable workflows, approvals and escalation paths.", icon: Workflow },
  { slug: "security-audit-and-compliance", title: "Security, Audit & Compliance", description: "Manage security policies, audit controls and compliance evidence.", icon: ShieldCheck },
  { slug: "release-and-change-management", title: "Release & Change Management", description: "Govern change requests, releases, deployments and rollback.", icon: GitBranch },
  { slug: "monitoring-and-diagnostics", title: "Monitoring & Diagnostics", description: "Review service health, incidents, alerts and diagnostics.", icon: Activity },
] as const;

const SHARED_AREAS = [
  { title: "Template Library", detail: "Create, duplicate, review and archive reusable templates." },
  { title: "Configuration", detail: "Edit validated draft settings within the assigned scope." },
  { title: "Permissions & Scope", detail: "Review role requirements and permitted administration boundaries." },
  { title: "Testing & Publishing", detail: "Validate changes and prepare approval-gated publication." },
  { title: "Version History & Audit", detail: "Inspect version lineage, change reasons and audit evidence." },
];

type Props = { title: string; pageSlug: string; groupSlug: string };

export function PlatformAdministrationWorkspace({ title, pageSlug, groupSlug }: Props) {
  const navigate = useNavigate();
  const activeDepartment = DEPARTMENTS.find((department) => department.slug === groupSlug);
  const openDepartment = (slug: string, page = "overview") =>
    navigate({
      to: "/m/$section/$group/$page",
      params: { section: "platform-administration-center", group: slug, page },
    });

  if (pageSlug === "overview" || pageSlug === "administration-overview") {
    return (
      <section className="space-y-5">
        <div className="rounded-2xl border border-sky-300/20 bg-slate-950/75 p-5 text-slate-100 shadow-[0_18px_55px_rgba(2,8,23,.28)]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-sky-300">
            <ShieldCheck className="size-4" /> Central platform control plane
          </div>
          <h2 className="mt-2 text-2xl font-bold">Platform Administration Center</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            One governed workspace for platform configuration, reusable templates, authorization,
            service registration, release management and operational oversight.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5">14 administration departments</span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">84 registered workspace destinations</span>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-amber-200">Backend connection pending</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DEPARTMENTS.map((department, index) => {
            const Icon = department.icon;
            return (
              <button
                key={department.slug}
                type="button"
                onClick={() => openDepartment(department.slug)}
                className="group rounded-xl border border-border/80 bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-600">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-3 font-semibold">{department.title}</h3>
                <p className="mt-1 min-h-10 text-sm leading-5 text-muted-foreground">{department.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Open department <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-amber-300/40 bg-amber-50/80 p-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardCheck className="size-4" /> Administration workspace foundation
        </div>
        <p className="mt-1 text-sm leading-6">
          This department's shared frontend structure is registered. Its live data services,
          database policies and mutation handlers are not connected yet. No changes are being
          saved or published from this screen.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Department workspace</p>
            <h2 className="mt-1 text-xl font-bold">{activeDepartment?.title ?? title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{title} · Shared administration lifecycle</p>
          </div>
          <span className="rounded-full border border-amber-300/50 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Not connected
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SHARED_AREAS.map((area, index) => (
            <div key={area.title} className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="grid size-6 place-items-center rounded-md bg-muted">{index + 1}</span>
                Shared lifecycle
              </div>
              <h3 className="mt-3 font-semibold">{area.title}</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{area.detail}</p>
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Backend service not configured</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="size-4 text-sky-600" /> Shared lifecycle standard
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Draft → validate → preview → approval (when required) → publish → version history →
          rollback. Sensitive actions must be authorized and audited on the server.
        </p>
      </div>
    </section>
  );
}
