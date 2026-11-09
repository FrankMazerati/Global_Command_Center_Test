import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/command/AppShell";
import { menu } from "@/lib/menu";
import { getDashboardPage, resolveMenuItem } from "@/lib/dashboard-pages";
import { findDestination } from "@/lib/menu-spec";
import { DestinationPage } from "@/components/command/menu/DestinationPage";
import { ReferenceDashboard } from "@/components/command/ReferenceDashboard";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const extra = {
  title: "User & Role Administration",
  slug: "user-role-administration",
  description: "Identity governance and access control command.",
  groups: [
    {
      name: "Access",
      items: [
        "Users Overview",
        "Roles",
        "Permissions Matrix",
        "Access Reviews",
        "Role Assignments",
        "Audit & Compliance",
      ],
    },
  ],
};

export const Route = createFileRoute("/section/$slug")({
  loader: ({ params }) => {
    const page = getDashboardPage(params.slug);
    if (page)
      return {
        title: page.title,
        slug: page.slug,
        description: page.subtitle,
        groups: [],
        page,
        destination: null,
      };
    const destination = findDestination(params.slug);
    if (destination)
      return {
        title: destination.label,
        slug: destination.slug,
        description: destination.summary,
        groups: [],
        page: null,
        destination: destination.slug,
      };
    const s = [...menu, extra].find((m) => m.slug === params.slug);
    if (!s) throw notFound();
    return { ...s, page: null, destination: null };
  },
  head: ({ loaderData }) => {
    const t = loaderData
      ? `${loaderData.title} — Global Command Center`
      : "Section — Global Command Center";
    const d = loaderData?.description || "IntelliStack Systems Global Command Center section.";
    const image = loaderData?.page?.scene;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image?.startsWith("https://")
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: SectionPage,
});

function SectionPage() {
  const s = Route.useLoaderData();
  if (s.destination) {
    return <DestinationPage slug={s.destination} />;
  }
  if (s.page)
    return (
      <AppShell active={s.slug}>
        <ReferenceDashboard key={s.slug} page={s.page} />
      </AppShell>
    );
  return (
    <AppShell active={s.slug}>
      <div className="mb-4 p-5">
        <h1 className="font-display text-3xl font-bold text-glow">{s.title}</h1>
        <p className="mt-1 text-muted-foreground">{s.description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {s.groups.map((g) => (
          <section key={g.name}>
            <h2 className="mb-2 text-sm font-semibold text-primary">{g.name}</h2>
            {g.items.map((item) => (
              <Button
                key={item}
                asChild
                variant="ghost"
                className="h-auto min-h-8 w-full justify-start whitespace-normal text-left text-xs"
              >
                <Link to="/section/$slug" params={{ slug: resolveMenuItem(item, s.slug) }}>
                  {item}
                </Link>
              </Button>
            ))}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
