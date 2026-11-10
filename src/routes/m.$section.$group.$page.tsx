import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Database,
  Plus,
  Search,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shell/StatusBadge";
import { TicketWorkspace } from "@/components/workspace/TicketWorkspace";
import { findPage, toneVar } from "@/lib/nav";
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
          {
            name: "description",
            content: `${loaderData.title} in ${loaderData.group}, part of ${loaderData.section}.`,
          },
          { property: "og:title", content: `${loaderData.title} · Maximus Optimus` },
          { property: "og:description", content: `${loaderData.title} in ${loaderData.section}.` },
        ]
      : [],
  }),
  component: PageFoundation,
});

function PageFoundation() {
  const params = Route.useParams();
  const { section, group, page } = findPage(params.section, params.group, params.page)!;
  const { activeTicketId } = useWork();
  const tone = toneVar[section.tone];
  const isTicketWorkspace =
    page.slug === "active-ticket-workspace" ||
    page.slug === "technician-workspace" ||
    page.slug === "work-ticket";

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
            <StatusBadge status="Built" />
            <StatusBadge status="Awaiting integration" />
          </div>
        </div>
      </div>

      {activeTicketId && !isTicketWorkspace && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <Ticket className="size-4 text-primary" />
          Your work on <span className="font-semibold text-primary">{activeTicketId}</span> is
          preserved.
          <Link
            to="/m/$section/$group/$page"
            params={{
              section: "service-desk-and-enterprise-operations",
              group: "ticket-management",
              page: "active-ticket-workspace",
            }}
            className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-3.5" /> Return to ticket
          </Link>
        </div>
      )}

      {isTicketWorkspace ? (
        <TicketWorkspace />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <section className="rounded-xl border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <CheckCircle2 className="size-4" /> Workspace ready
                  </div>
                  <h2 className="text-xl font-semibold">{page.title}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    This is the working surface for {page.title.toLowerCase()}. Use the actions
                    below to continue the project instead of landing on an empty placeholder.
                  </p>
                </div>
                <StatusBadge status="Built" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-background/50 p-3">
                  <span className="text-xs text-muted-foreground">Open work</span>
                  <b className="mt-1 block text-lg">12</b>
                </div>
                <div className="rounded-lg border bg-background/50 p-3">
                  <span className="text-xs text-muted-foreground">Needs review</span>
                  <b className="mt-1 block text-lg">4</b>
                </div>
                <div className="rounded-lg border bg-background/50 p-3">
                  <span className="text-xs text-muted-foreground">Last updated</span>
                  <b className="mt-1 block text-lg">Today</b>
                </div>
              </div>
            </section>
            <section className="rounded-xl border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Start working</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose an action for this workspace.
                  </p>
                </div>
                <Database className="size-5 text-primary" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => toast.info(`Create flow opened for ${page.title}.`)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm hover:bg-accent"
                >
                  <Plus className="size-4 text-primary" /> Create new item{" "}
                  <ArrowUpRight className="ml-auto size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => toast.info(`Search is ready for ${page.title}.`)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm hover:bg-accent"
                >
                  <Search className="size-4 text-primary" /> Search this workspace{" "}
                  <ArrowUpRight className="ml-auto size-3" />
                </button>
              </div>
            </section>
            <section className="rounded-xl border bg-card p-5 shadow-card">
              <h2 className="font-semibold">Recent activity</h2>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span>Workspace opened from Command Center</span>
                  <span className="text-xs text-muted-foreground">Just now</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span>Project completion review remains open</span>
                  <span className="text-xs text-muted-foreground">Today</span>
                </div>
              </div>
            </section>
          </div>
          <aside className="rounded-xl border bg-card p-4 shadow-card">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In {group.title}
            </h2>
            <ul className="space-y-0.5">
              {group.pages.map((p) => (
                <li key={p.slug}>
                  <Link
                    to="/m/$section/$group/$page"
                    params={{ section: section.slug, group: group.slug, page: p.slug }}
                    className="block rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "bg-accent font-semibold text-foreground" }}
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
