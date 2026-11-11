import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Facebook, Github, Instagram, Linkedin, Link2, Send, Youtube } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

type SitePage = { title: string; summary: string; content_markdown: string; seo_title: string | null; seo_description: string | null; canonical_path: string | null; og_image_url: string | null; page_type: string };
type SocialLink = { id: string; platform: string; label: string; url: string; icon_key: string; sort_order: number };

const navPages = [["Home","home"],["Products","products"],["Solutions","solutions"],["About","about"],["Partners","partners"],["Careers","careers"],["Contact","contact"]] as const;
const footerPages = [["Connect","social"],["Privacy","privacy"],["Terms","terms"],["Cookie Preferences","cookie-preferences"],["Acceptable Use","acceptable-use"],["Data Protection","data-protection"],["Security","security"],["Accessibility","accessibility"],["Responsible Disclosure","responsible-disclosure"]] as const;
const iconMap = { linkedin: Linkedin, facebook: Facebook, instagram: Instagram, youtube: Youtube, github: Github, link: Link2 } as const;

function MarkdownContent({content}:{content:string}) {
  const blocks = content.split(/\n{2,}/).map(block=>block.trim()).filter(Boolean);
  return <div className="space-y-5">
    {blocks.map((block,index)=>{
      const lines=block.split("\n");
      if (/^### /.test(block)) return <h3 key={index} className="text-xl font-semibold text-white">{block.replace(/^### /,"")}</h3>;
      if (/^## /.test(block)) return <h2 key={index} className="text-2xl font-semibold text-white">{block.replace(/^## /,"")}</h2>;
      if (/^# /.test(block)) return <h2 key={index} className="text-3xl font-bold text-white">{block.replace(/^# /,"")}</h2>;
      if (lines.every(line=>/^[-*] /.test(line))) return <ul key={index} className="list-disc space-y-2 pl-6">{lines.map((line,i)=><li key={i}>{line.replace(/^[-*] /,"")}</li>)}</ul>;
      return <p key={index} className="leading-8 text-slate-200">{block}</p>;
    })}
  </div>;
}

export function PublicSitePage({ slug, initialPage, initialSocial }: { slug: string; initialPage: SitePage | null; initialSocial: SocialLink[] }) {
  const page = initialPage;
  const social = initialSocial;
  const loading = false;
  const notFound = !page;
  const [form,setForm] = useState({name:"",email:"",company:"",topic:"General inquiry",message:"",consent:false});
  const [sending,setSending] = useState(false);
  useEffect(() => {
    if (!page) return;
    const title = page.seo_title || page.title + " | IntelliStack Systems";
    document.title = title;
    const setMeta = (key: string, value: string, property = false) => {
      const selector = property ? 'meta[property="' + key + '"]' : 'meta[name="' + key + '"]';
      let element = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!element) { element = document.createElement("meta"); if (property) element.setAttribute("property",key); else element.name=key; document.head.appendChild(element); }
      element.content = value;
    };
    setMeta("description", page.seo_description || page.summary);
    setMeta("og:title", title, true);
    setMeta("og:description", page.seo_description || page.summary, true);
    setMeta("og:type", "website", true);
    setMeta("twitter:card", "summary");
    if (page.og_image_url) { setMeta("og:image",page.og_image_url,true); setMeta("twitter:image",page.og_image_url); }
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical=document.createElement("link"); canonical.rel="canonical"; document.head.appendChild(canonical); }
    canonical.href = page.canonical_path ? new URL(page.canonical_path,window.location.origin).toString() : window.location.href;
  }, [page]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !form.consent) return;
    setSending(true);
    const { error } = await supabase.from("site_contact_submissions").insert({
      name:form.name.trim(), email:form.email.trim(), company:form.company.trim() || null,
      topic:form.topic, message:form.message.trim(), consent:form.consent, status:"new",
    });
    setSending(false);
    if (error) { toast.error("We couldn't submit your inquiry. Please try again."); return; }
    toast.success("Your inquiry was submitted.");
    setForm({name:"",email:"",company:"",topic:"General inquiry",message:"",consent:false});
  };
  return <div className="min-h-dvh bg-[#061225] text-slate-100">
    <header className="border-b border-sky-300/20 bg-[#030b18]/95"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5"><Link to="/p/$slug" params={{slug:"home"}} className="min-w-0"><span className="block text-xs font-black tracking-[.2em] text-white">INTELLISTACK SYSTEMS</span><span className="mt-1 block text-[10px] font-semibold tracking-[.15em] text-sky-300">MAXIMUS OPTIMUS COMMAND CENTER</span></Link><nav aria-label="Public website" className="hidden flex-wrap items-center gap-4 lg:flex">{navPages.map(([label,key])=><Link key={key} to="/p/$slug" params={{slug:key}} className="text-xs text-slate-300 hover:text-sky-300">{label}</Link>)}</nav><Link to="/login" className="rounded-lg border border-sky-300/30 px-4 py-2 text-sm hover:bg-sky-400/10">Sign in <ArrowUpRight className="ml-1 inline size-4"/></Link></div></header>
    <main className="mx-auto min-h-[65vh] max-w-5xl px-5 py-12">
      {loading ? <p className="text-sm text-slate-400">Loading published page…</p> : notFound || !page ? <div className="rounded-2xl border border-white/10 bg-white/5 p-8"><h1 className="text-3xl font-bold">Page unavailable</h1><p className="mt-3 text-slate-300">This page is not published or does not exist.</p><Link to="/login" className="mt-5 inline-block text-sky-300">Return to sign in</Link></div> : <>
        <div className="mb-8 border-b border-sky-300/20 pb-7"><p className="text-xs font-semibold uppercase tracking-[.22em] text-sky-300">IntelliStack Systems · {page.page_type}</p><h1 className="mt-3 text-4xl font-bold tracking-tight">{page.title}</h1><p className="mt-3 max-w-3xl text-lg text-slate-300">{page.summary}</p></div>
        <article className="max-w-3xl"><MarkdownContent content={page.content_markdown}/></article>
        {slug === "contact" && <form onSubmit={submit} className="mt-10 grid max-w-2xl gap-4 rounded-2xl border border-sky-300/20 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Send an inquiry</h2>
          <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Name<input required maxLength={160} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="rounded-lg border border-white/15 bg-[#08182d] px-3 py-2"/></label><label className="grid gap-1 text-sm">Work email<input required type="email" maxLength={254} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="rounded-lg border border-white/15 bg-[#08182d] px-3 py-2"/></label></div>
          <label className="grid gap-1 text-sm">Company (optional)<input maxLength={180} value={form.company} onChange={e=>setForm({...form,company:e.target.value})} className="rounded-lg border border-white/15 bg-[#08182d] px-3 py-2"/></label>
          <label className="grid gap-1 text-sm">Inquiry type<select value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} className="rounded-lg border border-white/15 bg-[#08182d] px-3 py-2"><option>General inquiry</option><option>Business partnership</option><option>Product information</option><option>Sales</option><option>Media</option><option>Careers</option><option>Accessibility</option><option>Privacy request</option></select></label>
          <label className="grid gap-1 text-sm">Message<textarea required minLength={10} maxLength={10000} rows={5} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} className="rounded-lg border border-white/15 bg-[#08182d] px-3 py-2"/></label>
          <label className="flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})} required className="mt-0.5"/>I agree that IntelliStack Systems may use this information to respond to my inquiry. Do not include passwords, payment information, or sensitive incident evidence.</label>
          <button disabled={sending || !form.consent} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{sending ? "Submitting…" : "Submit inquiry"} <Send className="size-4"/></button>
        </form>}
      </>}
    </main>
    <footer className="border-t border-sky-300/20 bg-[#030b18]"><div className="mx-auto grid max-w-6xl gap-7 px-5 py-8 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold tracking-[.2em]">INTELLISTACK SYSTEMS</p><p className="mt-2 max-w-md text-xs leading-6 text-slate-400">One World. One System. One Intelligent Network.</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">{footerPages.map(([label,key])=><Link key={key} to="/p/$slug" params={{slug:key}} className="text-xs text-slate-400 hover:text-sky-300">{label}</Link>)}</div></div><div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-sky-300">Follow IntelliStack</p><div className="flex flex-wrap gap-3">{social.map(item=>{const Icon=iconMap[item.icon_key as keyof typeof iconMap] ?? Link2;return <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={item.label} title={item.label} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:border-sky-300/40 hover:text-sky-300"><Icon className="size-5"/></a>})}</div>{social.length===0 && <p className="text-xs text-slate-500">Official social channels will appear here when published.</p>}</div></div><div className="border-t border-white/10 px-5 py-3 text-center text-[10px] text-slate-500">© {new Date().getFullYear()} IntelliStack Systems. All rights reserved.</div></footer>
  </div>;
}
