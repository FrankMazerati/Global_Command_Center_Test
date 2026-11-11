import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { PublicSitePage } from "@/components/public-site/PublicSitePage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://fzwbvccvqnbvzbqfgiep.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_QHvUP4LtiZmAf1R8hckaow_el-EbunR";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const supabase = createClient(supabaseUrl,supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const [pageResult,socialResult] = await Promise.all([
      supabase.from("site_pages").select("title,summary,content_markdown,seo_title,seo_description,canonical_path,og_image_url,page_type").eq("slug",params.slug).eq("status","published").maybeSingle(),
      supabase.from("site_social_links").select("id,platform,label,url,icon_key,sort_order").eq("is_active",true).order("sort_order"),
    ]);
    return { page: pageResult.data, social: socialResult.data ?? [] };
  },
  head: ({ loaderData, params }) => {
    const page = loaderData?.page;
    const title = page?.seo_title || (page?.title ?? params.slug) + " | IntelliStack Systems";
    const description = page?.seo_description || page?.summary || "IntelliStack Systems and the Maximus Optimus Command Center.";
    const canonical = page?.canonical_path || "/p/" + params.slug;
    return { meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: page ? "index,follow" : "noindex,nofollow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "IntelliStack Systems" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      ...(page?.og_image_url ? [{property:"og:image",content:page.og_image_url}] : []),
      { name: "twitter:card", content: "summary" },
      ...(page?.og_image_url ? [{name:"twitter:image",content:page.og_image_url}] : []),
    ], links:[{rel:"canonical",href:canonical}] };
  },
  component: PublicPageRoute,
});

function PublicPageRoute() {
  const { slug } = Route.useParams();
  const data = Route.useLoaderData();
  return <PublicSitePage slug={slug} initialPage={data.page} initialSocial={data.social}/>;
}
