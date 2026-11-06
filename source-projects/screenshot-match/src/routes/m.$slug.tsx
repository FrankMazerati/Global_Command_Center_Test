import { createFileRoute, notFound } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { GlassCard, ModuleHeader } from "@/components/glass/glass";
import { findNav } from "@/lib/navigation";

/** Generic workspace template for every menu destination not yet built. */
export const Route = createFileRoute("/m/$slug")({
  loader: ({ params }) => {
    const item = findNav(params.slug);
    if (!item) throw notFound();
    return { title: item.title };
  },
  head: ({ loaderData }) => {
    const t = `${loaderData?.title ?? "Module"} — IntelliStack Systems`;
    return {
      meta: [
        { title: t },
        { name: "description", content: `${loaderData?.title ?? "Module"} workspace in IntelliStack.` },
        { property: "og:title", content: t },
        { property: "og:description", content: `${loaderData?.title ?? "Module"} workspace in IntelliStack.` },
      ],
    };
  },
  component: ModulePage,
});

function ModulePage() {
  const { slug } = Route.useParams();
  const item = findNav(slug)!;
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <ModuleHeader icon={item.icon} title={item.title} subtitle="IntelliStack Systems module" />
      <GlassCard title="Coming next" icon={Construction}>
        <p className="text-sm text-muted-foreground">This workspace uses the shared glass template and will be built out in a later step.</p>
      </GlassCard>
    </div>
  );
}
