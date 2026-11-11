import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Facebook, Github, Instagram, Linkedin, Link2, Send, Youtube } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

type SitePage = { title: string; summary: string; content_markdown: string; seo_title: string | null; seo_description: string | null; page_type: string };
type SocialLink = { id: string; platform: string; label: string; url: string; icon_key: string; sort_order: number };

const footerPages = [["About","about"],["Contact","contact"],["Privacy","privacy"],["Terms","terms"],["Security","security"],["Accessibility","accessibility"],["Responsible Disclosure","responsible-disclosure"]] as const;
const iconMap = { linkedin: Linkedin, facebook: Facebook, instagram: Instagram, youtube: Youtube, github: Github, link: Link2 } as const;

export function PublicSitePage({ slug }: { slug: string }) {
  const [page,setPage] = useState<SitePage | null>(null);
  const [social,setSocial] = useState<SocialLink[]>([]);
  const [loading,setLoading] = useState(true);
  const [notFound,setNotFound] = useState(false);
  const [form,setForm] = useState({name:"",email:"",company:"",topic:"General inquiry",message:"",consent:false});
  const [sending,setSending] = useState(false);
  useEffect(() => {
    let live = true;
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    Promise.all([
      supabase.from("site_pages").select("title,summary,content_markdown,seo_title,seo_description,page_type").eq("slug",slug).eq("status","published").maybeSingle(),
      supabase.from("site_social_links").select("id,platform,label,url,icon_key,sort_order").eq("is_active",true).order("sort_order"),
    ]).then(([p,s]) => {
      if (!live) return;
      setPage((p.data as SitePage | null) ?? null);
      setNotFound(!p.data);
      setSocial((s.data ?? []) as SocialLink[]);
      setLoading(false);
    });
    return () => { live = false; };
  },[slug]);
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
    <header className="border-b border-sky-300/20 bg-[#030b18]/95"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5"><Link to="/" className="min-w-0"><span className="block text-xs font-black tracking-[.2em] text-white">INTELLISTACK SYSTEMS</span><span className="mt-1 block text-[10px] font-semibold tracking-[.15em] text-sky-300">MAXIMUS OPTIMUS COMMAND CENTER</span></Link><Link to="/login" className="rounded-lg border border-sky-300/30 px-4 py-2 text-sm hover:bg-sky-400/10">Sign in <ArrowUpRight className="ml-1 inline size-4"/></Link></div></header>
    <main className="mx-auto min-h-[65vh] max-w-5xl px-5 py-12">
      {loading ? <p className="text-sm text-slate-400">Loading published page…</p> : notFound || !page ? <div className="rounded-2xl border border-white/10 bg-white/5 p-8"><h1 className="text-3xl font-bold">Page unavailable</h1><p className="mt-3 text-slate-300">This page is not published or does not exist.</p><Link to="/" className="mt-5 inline-block text-sky-300">Return to sign in</Link></div> : <>
        <div className="mb-8 border-b border-sky-300/20 pb-7"><p className="text-xs font-semibold uppercase tracking-[.22em] text-sky-300">IntelliStack Systems · {page.page_type}</p><h1 className="mt-3 text-4xl font-bold tracking-tight">{page.title}</h1><p className="mt-3 max-w-3xl text-lg text-slate-300">{page.summary}</p></div>
        <article className="max-w-3xl whitespace-pre-wrap leading-8 text-slate-200">{page.content_markdown}</article>
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
