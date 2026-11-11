import { useEffect, useState } from "react";
import { Facebook, Github, Instagram, Link2, Linkedin, Youtube } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Social = {id:string;label:string;url:string;icon_key:string;sort_order:number};
const icons:Record<string,typeof Link2>={linkedin:Linkedin,facebook:Facebook,instagram:Instagram,youtube:Youtube,github:Github,link:Link2};

export function OfficialSocialLinks() {
 const [items,setItems]=useState<Social[]>([]);
 useEffect(()=>{
  let live=true;const supabase=getSupabaseClient();if(!supabase)return;
  supabase.from("site_social_links").select("id,label,url,icon_key,sort_order").eq("is_active",true).order("sort_order").then(({data})=>{if(live)setItems((data??[]) as Social[])});
  return ()=>{live=false};
 },[]);
 if(!items.length)return null;
 return <div className="flex flex-wrap items-center gap-2" aria-label="Official IntelliStack social media links">{items.map(item=>{const Icon=icons[item.icon_key]??Link2;return <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={item.label} title={item.label} className="rounded-lg border border-sky-300/15 p-2 text-slate-400 transition hover:border-sky-300/40 hover:text-sky-200"><Icon className="size-4"/></a>})}</div>;
}
