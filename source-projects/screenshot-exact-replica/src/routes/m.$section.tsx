import { Link, Outlet, createFileRoute, notFound, useMatches } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";

import { StatusBadge } from "@/components/shell/StatusBadge";
import { SECTION_ICONS } from "@/components/shell/section-icons";
import { findSection, toneVar } from "@/lib/nav";

export const Route = createFileRoute("/m/$section")({
  loader: ({ params }) => {
    const section = findSection(params.section);
    if (!section) throw notFound();
    return { title: section.title, summary: section.summary };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} · Maximus Optimus` },
          { name: "description", content: loaderData.summary },
          { property: "og:title", content: `${loaderData.title} · Maximus Optimus` },
          { property: "og:description", content: loaderData.summary },
        ]
      : [],
  }),
  component: SectionLayout,
});

function SectionLayout() {
  const { section: slug } = Route.useParams();
  const isLeaf = useMatches({ select: (m) => m.some((x) => x.routeId === "/m/$section/$group/$page") });
  if (isLeaf) return <Outlet />;
  const section = findSection(slug)!;
  const Icon = SECTION_ICONS[section.slug] ?? LayoutGrid;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5 shadow-card">
        <span className="grid size-14 place-items-center rounded-xl text-primary-foreground" style={{ background: toneVar[section.tone] }}>
          <Icon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-xs text-muted-foreground">SECTION {section.number}</div>
          <h1 className="font-display text-2xl font-bold">{section.title}</h1>
          <p className="text-sm text-muted-foreground">{section.summary}</p>
        </div>
        <StatusBadge status="Built" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {section.groups.map((g) => (
          <div key={g.slug} className="rounded-xl border bg-card p-4 shadow-card">
            <h2 className="mb-2 font-semibold" style={{ color: toneVar[section.tone] }}>{g.title}</h2>
            <ul className="space-y-0.5">
              {g.pages.map((p) => (
                <li key={p.slug}>
                  <Link
                    to="/m/$section/$group/$page"
                    params={{ section: section.slug, group: g.slug, page: p.slug }}
                    className="block rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
