import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ExternalLink, FilePlus2, Globe2, Pencil, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

type Page = {id:string;slug:string;title:string;summary:string;content_markdown:string;page_type:string;status:string;seo_title:string|null;seo_description:string|null;canonical_path:string|null;og_image_url:string|null;locale:string};
type Social = {id:string;platform:string;label:string;url:string;icon_key:string;sort_order:number;is_active:boolean};
type Inquiry = {id:string;name:string;email:string;company:string|null;topic:string;message:string;status:string;created_at:string};
const blankPage = {slug:"",title:"",summary:"",content_markdown:"",page_type:"standard",status:"draft",seo_title:"",seo_description:"",canonical_path:"",og_image_url:"",locale:"en-US"};
const blankSocial = {platform:"LinkedIn",label:"LinkedIn",url:"https://www.linkedin.com/company/",icon_key:"linkedin",sort_order:0,is_active:false};
const platforms = [{name:"LinkedIn",icon:"linkedin"},{name:"Facebook",icon:"facebook"},{name:"Instagram",icon:"instagram"},{name:"X",icon:"x"},{name:"YouTube",icon:"youtube"},{name:"TikTok",icon:"tiktok"},{name:"Threads",icon:"threads"},{name:"GitHub",icon:"github"}];

export function PublicSiteManagementWorkspace({view}:{view:"pages"|"social"|"inquiries"}) {
 const [pages,setPages]=useState<Page[]>([]),[social,setSocial]=useState<Social[]>([]),[inquiries,setInquiries]=useState<Inquiry[]>([]);
 const [page,setPage]=useState<typeof blankPage>(blankPage),[pageId,setPageId]=useState<string|null>(null);
 const [link,setLink]=useState<typeof blankSocial>(blankSocial),[linkId,setLinkId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[authorized,setAuthorized]=useState(false);
 const supabase=getSupabaseClient();
 const load = useCallback(async()=>{
   if(!supabase){setLoading(false);return;}
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){setLoading(false);return;}
   const {data:admin}=await supabase.rpc("is_global_admin");
   setAuthorized(Boolean(admin));
   if(!admin){setLoading(false);return;}
   if(view==="pages"){const r=await supabase.from("site_pages").select("*").order("updated_at",{ascending:false});if(r.error)toast.error(r.error.message);else setPages((r.data??[]) as Page[]);}
   if(view==="social"){const r=await supabase.from("site_social_links").select("*").order("sort_order");if(r.error)toast.error(r.error.message);else setSocial((r.data??[]) as Social[]);}
   if(view==="inquiries"){const r=await supabase.from("site_contact_submissions").select("*").order("created_at",{ascending:false}).limit(200);if(r.error)toast.error(r.error.message);else setInquiries((r.data??[]) as Inquiry[]);}
   setLoading(false);
 },[supabase,view]);
 useEffect(()=>{void load();},[load]);
 const savePage=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase)return;setSaving(true);
  const payload={...page,seo_title:page.seo_title||null,seo_description:page.seo_description||null,canonical_path:page.canonical_path||null,og_image_url:page.og_image_url||null,updated_by:(await supabase.auth.getUser()).data.user?.id,updated_at:new Date().toISOString(),published_at:page.status==="published"?new Date().toISOString():null};
  const result=pageId?await supabase.from("site_pages").update(payload).eq("id",pageId):await supabase.from("site_pages").insert({...payload,created_by:(await supabase.auth.getUser()).data.user?.id});
  setSaving(false);if(result.error){toast.error(result.error.message);return;}toast.success("Website page saved.");setPage(blankPage);setPageId(null);await load();
 };
 const saveSocial=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase)return;setSaving(true);
  const payload={...link,updated_by:(await supabase.auth.getUser()).data.user?.id,updated_at:new Date().toISOString()};
  const result=linkId?await supabase.from("site_social_links").update(payload).eq("id",linkId):await supabase.from("site_social_links").insert({...payload,created_by:(await supabase.auth.getUser()).data.user?.id});
  setSaving(false);if(result.error){toast.error(result.error.message);return;}toast.success("Social link saved.");setLink(blankSocial);setLinkId(null);await load();
 };
 const removeSocial=async(id:string)=>{if(!supabase)return;const r=await supabase.from("site_social_links").delete().eq("id",id);if(r.error)toast.error(r.error.message);else{toast.success("Social link removed.");await load();}};
 const updateInquiry=async(id:string,status:string)=>{if(!supabase)return;const r=await supabase.from("site_contact_submissions").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(r.error)toast.error(r.error.message);else await load();};
 if(loading)return <section className="rounded-xl border bg-card p-6">Loading website administration…</section>;
 if(!authorized)return <section className="rounded-xl border bg-card p-6"><h2 className="text-lg font-semibold">Global administrator access required</h2><p className="mt-2 text-sm text-muted-foreground">Website publishing, official social links, and public inquiry records are restricted to authorized Global Administrators.</p></section>;
 return <section className="space-y-5 rounded-xl border bg-card p-5">
  <header><div className="text-xs font-semibold uppercase tracking-widest text-primary">Global website administration</div><h2 className="mt-1 text-2xl font-bold">{view==="pages"?"Public page content management":view==="social"?"Official social media links":"Public contact inquiries"}</h2><p className="mt-1 text-sm text-muted-foreground">Changes persist in Supabase and are enforced by database row-level security.</p></header>
  {view==="pages"&&<><form onSubmit={savePage} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
   <label className="grid gap-1 text-sm">URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={page.slug} onChange={e=>setPage({...page,slug:e.target.value})} className="rounded-md border bg-background px-3 py-2"/></label>
   <label className="grid gap-1 text-sm">Page title<input required maxLength={180} value={page.title} onChange={e=>setPage({...page,title:e.target.value})} className="rounded-md border bg-background px-3 py-2"/></label>
   <label className="grid gap-1 text-sm md:col-span-2">Summary<input maxLength={500} value={page.summary} onChange={e=>setPage({...page,summary:e.target.value})} className="rounded-md border bg-background px-3 py-2"/></label>
   <label className="grid gap-1 text-sm md:col-span-2">Page content (Markdown)<textarea required rows={10} maxLength={100000} value={page.content_markdown} onChange={e=>setPage({...page,content_markdown:e.target.value})} className="rounded-md border bg-background px-3 py-2 font-mono text-xs"/></label>
   <label className="grid gap-1 text-sm">Page type<select value={page.page_type} onChange={e=>setPage({...page,page_type:e.target.value})} className="rounded-md border bg-background px-3 py-2">{["standard","marketing","legal","trust","support"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="grid gap-1 text-sm">Publication status<select value={page.status} onChange={e=>setPage({...page,status:e.target.value})} className="rounded-md border bg-background px-3 py-2"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
   <label className="grid gap-1 text-sm">SEO title<input value={page.seo_title} onChange={e=>setPage({...page,seo_title:e.target.value})} className="rounded-md border bg-background px-3 py-2"/></label>
   <label className="grid gap-1 text-sm">SEO description<input maxLength={320} value={page.seo_description} onChange={e=>setPage({...page,seo_description:e.target.value})} className="rounded-md border bg-background px-3 py-2"/></label>
   <label className="grid gap-1 text-sm">Canonical path<input placeholder="/p/about" value={page.canonical_path} onChange={e=>setPage({...page,canonical_path:e.target.value})} className="rounded-md border bg-background px-3 py-2"/></label>
   <label className="grid gap-1 text-sm">Social preview image URL<input type="url" value={page.og_image_url} onChange={e=>setPage({...page,og_image_url:e.target.value})} className="rounded-md border bg-background px-3 py-2"/></label>
   <div className="flex flex-wrap items-center gap-2 md:col-span-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"><Save className="size-4"/>{saving?"Saving…":pageId?"Update page":"Create page"}</button><button type="button" onClick={()=>{setPage(blankPage);setPageId(null)}} className="rounded-md border px-4 py-2 text-sm">Clear</button></div>
  </form><div className="space-y-2">{pages.map(p=><div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><FilePlus2 className="size-5 text-primary"/><div className="min-w-0 flex-1"><div className="font-medium">{p.title}</div><div className="text-xs text-muted-foreground">/p/{p.slug} · {p.status} · {p.page_type}</div></div><button onClick={()=>{setPage({slug:p.slug,title:p.title,summary:p.summary,content_markdown:p.content_markdown,page_type:p.page_type,status:p.status,seo_title:p.seo_title??"",seo_description:p.seo_description??"",canonical_path:p.canonical_path??"",og_image_url:p.og_image_url??"",locale:p.locale});setPageId(p.id)}} className="rounded-md border px-3 py-2 text-xs"><Pencil className="mr-1 inline size-3"/>Edit</button>{p.status==="published"&&<a href={"/p/"+p.slug} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-2 text-xs">Preview <ExternalLink className="ml-1 inline size-3"/></a>}</div>)}</div></>}
  {view==="social"&&<><form onSubmit={saveSocial} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
   <label className="grid gap-1 text-sm">Platform<select value={link.platform} onChange={e=>{const x=platforms.find(p=>p.name===e.target.value)!;setLink({...link,platform:x.name,label:x.name,icon_key:x.icon})}} className="rounded-md border bg-background px-3 py-2">{platforms.map(p=><option key={p.name}>{p.name}</option>)}</select></label>
   <label className="grid gap-1 text-sm">Public label<input required value={link.label} onChange={e=>setLink({...link,label:e.target.value})} className="rounded-md border bg-background px-3 py-2"/></label>
   <label className="grid gap-1 text-sm md:col-span-2">Official profile URL (HTTPS)<input required type="url" pattern="https://.*" value={link.url} onChange={e=>setLink({...link,url:e.target.value})} className="rounded-md border bg-background px-3 py-2"/></label>
   <label className="grid gap-1 text-sm">Display order<input type="number" value={link.sort_order} onChange={e=>setLink({...link,sort_order:Number(e.target.value)})} className="rounded-md border bg-background px-3 py-2"/></label>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={link.is_active} onChange={e=>setLink({...link,is_active:e.target.checked})}/>Publish on public website</label>
   <div className="flex gap-2 md:col-span-2"><button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">{saving?"Saving…":linkId?"Update link":"Add social link"}</button><button type="button" onClick={()=>{setLink(blankSocial);setLinkId(null)}} className="rounded-md border px-4 py-2 text-sm">Clear</button></div>
  </form><div className="space-y-2">{social.map(s=><div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><Globe2 className="size-5 text-primary"/><div className="min-w-0 flex-1"><div className="font-medium">{s.label} <span className="text-xs text-muted-foreground">· {s.is_active?"Published":"Hidden"}</span></div><a href={s.url} target="_blank" rel="noreferrer" className="break-all text-xs text-primary">{s.url}</a></div><button onClick={()=>{setLink({platform:s.platform,label:s.label,url:s.url,icon_key:s.icon_key,sort_order:s.sort_order,is_active:s.is_active});setLinkId(s.id)}} className="rounded-md border px-3 py-2 text-xs">Edit</button><button onClick={()=>void removeSocial(s.id)} className="rounded-md border px-3 py-2 text-xs text-destructive"><Trash2 className="size-3"/></button></div>)}</div></>}
  {view==="inquiries"&&<div className="space-y-3">{inquiries.map(i=><article key={i.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{i.name} · {i.topic}</h3><a href={"mailto:"+i.email} className="text-sm text-primary">{i.email}</a><p className="text-xs text-muted-foreground">{i.company??"No company supplied"} · {new Date(i.created_at).toLocaleString()}</p></div><select value={i.status} onChange={e=>void updateInquiry(i.id,e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">{["new","in_review","responded","closed","spam"].map(x=><option key={x}>{x}</option>)}</select></div><p className="mt-3 whitespace-pre-wrap text-sm">{i.message}</p></article>)}{!inquiries.length&&<p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No inquiries have been received.</p>}</div>}
 </section>;
}
