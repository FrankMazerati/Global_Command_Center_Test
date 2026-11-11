import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicSitePage } from "@/components/public-site/PublicSitePage";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => {
    const title = params.slug.split("-").map(word => word.charAt(0).toUpperCase()+word.slice(1)).join(" ");
    return { meta: [
      { title: title + " | IntelliStack Systems" },
      { name: "description", content: title + " — IntelliStack Systems and the Maximus Optimus Command Center." },
      { name: "robots", content: "index,follow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "IntelliStack Systems" },
      { name: "twitter:card", content: "summary" },
    ] };
  },
  component: PublicPageRoute,
});

function PublicPageRoute() {
  const { slug } = Route.useParams();
  return <PublicSitePage slug={slug}/>;
}
