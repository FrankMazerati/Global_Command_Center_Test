import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { FileText, Table2, Presentation, MessageSquare, Plus, Download, Save, Send, Trash2, ChevronLeft, ChevronRight, Bold, Users, FileDown, FilePlus2, PenLine, Cloud, ExternalLink, Video, UserPlus } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type OfficeKind = "intelliword" | "intellisheets" | "intellislides" | "intellichat";
const STORE_PREFIX = "intellistack.office.v1.";

const products: Record<OfficeKind, { name: string; tagline: string; accent: string; icon: typeof FileText }> = {
  intelliword: { name: "IntelliWord", tagline: "Documents that move business forward.", accent: "#00CFFF", icon: FileText },
  intellisheets: { name: "IntelliSheets", tagline: "Turn business data into decisions.", accent: "#AEB8C4", icon: Table2 },
  intellislides: { name: "IntelliSlides", tagline: "Build the story behind the strategy.", accent: "#FF00A8", icon: Presentation },
  intellichat: { name: "IntelliChat", tagline: "A connected communication workspace.", accent: "#6D28D9", icon: MessageSquare },
};

function useLocalDocument<T>(kind: OfficeKind, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORE_PREFIX + kind);
      if (saved) setValue(JSON.parse(saved) as T);
    } catch {
      // Keep the in-memory draft when browser storage is unavailable.
    }
    setHydrated(true);
  }, [kind]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORE_PREFIX + kind, JSON.stringify(value));
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setSavedAt(null);
    }
  }, [kind, value, hydrated]);
  return { value, setValue, savedAt };
}

function downloadText(filename: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function WordWorkspace() {
  const initial = { title: "Untitled document", body: "", signatureName: "", signatureTitle: "" };
  const { value, setValue, savedAt } = useLocalDocument("intelliword", initial);
  const [identity, setIdentity] = useState<{ id: string; organization_id: string; tenant_id: string | null } | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [savedDocuments, setSavedDocuments] = useState<Array<{ id: string; title: string; content_markdown: string; version: number; metadata: Record<string, unknown> }>>([]);
  const [databaseStatus, setDatabaseStatus] = useState("Checking account and document storage…");
  const [saving, setSaving] = useState(false);
  const [bold, setBold] = useState(false);
  const words = value.body.trim() ? value.body.trim().split(/\s+/).length : 0;
  const fileBase = (value.title || "document").replace(/[^a-z0-9-_]/gi, "-");

  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();
    if (!client) {
      setDatabaseStatus("Database client unavailable; this draft remains on this device.");
      return () => { active = false; };
    }
    void (async () => {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (!active) return;
      if (authError || !user) {
        setDatabaseStatus("Sign in to save documents to your IntelliStack workspace.");
        return;
      }
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("id, organization_id, tenant_id, member_status")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (profileError || !profile || profile.member_status !== "active" || !profile.organization_id) {
        setDatabaseStatus("An active organization profile is required for workspace saving.");
        return;
      }
      setIdentity({ id: profile.id, organization_id: profile.organization_id, tenant_id: profile.tenant_id });
      const { data: documents, error: documentsError } = await client
        .from("intellisphere_documents")
        .select("id, title, content_markdown, version, metadata")
        .eq("owner_profile_id", user.id)
        .eq("document_type", "intelliword")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(25);
      if (!active) return;
      if (documentsError) {
        setDatabaseStatus("Workspace storage is not available yet: " + documentsError.message);
        return;
      }
      const records = (documents ?? []) as typeof savedDocuments;
      setSavedDocuments(records);
      if (records.length > 0) {
        setDocumentId(records[0]!.id);
        setValue({
          title: records[0]!.title,
          body: records[0]!.content_markdown,
          signatureName: String(records[0]!.metadata?.signatureName ?? ""),
          signatureTitle: String(records[0]!.metadata?.signatureTitle ?? ""),
        });
      }
      setDatabaseStatus("Connected · private document storage ready");
    })();
    return () => { active = false; };
  }, [setValue]);

  const saveDocument = async () => {
    const client = getSupabaseClient();
    if (!client || !identity) {
      setDatabaseStatus("Sign in with an active organization account to save to the database.");
      return;
    }
    setSaving(true);
    const id = documentId ?? crypto.randomUUID();
    const currentVersion = savedDocuments.find((item) => item.id === id)?.version ?? 0;
    const payload = {
      id,
      organization_id: identity.organization_id,
      tenant_id: identity.tenant_id,
      owner_profile_id: identity.id,
      document_type: "intelliword",
      title: value.title.trim() || "Untitled document",
      content_markdown: value.body,
      version: currentVersion + 1,
      metadata: { signatureName: value.signatureName, signatureTitle: value.signatureTitle },
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from("intellisphere_documents")
      .upsert(payload, { onConflict: "id" })
      .select("id, title, content_markdown, version, metadata")
      .single();
    setSaving(false);
    if (error) {
      setDatabaseStatus("Save failed: " + error.message);
      return;
    }
    setDocumentId(data.id);
    setSavedDocuments((items) => [data as typeof items[number], ...items.filter((item) => item.id !== data.id)]);
    setDatabaseStatus("Saved securely to your IntelliStack workspace · version " + data.version);
  };

  const newDocument = () => {
    setDocumentId(null);
    setValue({ title: "Untitled document", body: "", signatureName: "", signatureTitle: "" });
    setDatabaseStatus("New document · not yet saved to the database");
  };

  const addSignature = () => {
    if (!value.signatureName.trim()) {
      setDatabaseStatus("Enter the signer's name before inserting a signature block.");
      return;
    }
    const signature = "\n\n---\n\n**Signature**\n\n" + value.signatureName.trim() +
      (value.signatureTitle.trim() ? "\n" + value.signatureTitle.trim() : "") +
      "\nDate: " + new Date().toLocaleDateString() + "\n";
    setValue((current) => ({ ...current, body: current.body + signature }));
    setDatabaseStatus("Typed signature block inserted. This is not a verified electronic signature.");
  };

  const exportWord = () => {
    const html = "<!doctype html><html><head><meta charset='utf-8'><title>" +
      escapeHtml(value.title) +
      "</title><style>body{font:12pt Calibri,Arial,sans-serif;line-height:1.6;margin:1in}h1{font-size:22pt}pre{white-space:pre-wrap;font:12pt Calibri,Arial,sans-serif}</style></head><body><h1>" +
      escapeHtml(value.title) + "</h1><pre>" + escapeHtml(value.body) + "</pre></body></html>";
    downloadText(fileBase + ".doc", html, "application/msword");
  };

  const exportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setDatabaseStatus("Allow pop-ups to open the print dialog and save this document as PDF.");
      return;
    }
    printWindow.document.write("<!doctype html><html><head><meta charset='utf-8'><title>" +
      escapeHtml(value.title) +
      "</title><style>body{font:12pt Arial,sans-serif;line-height:1.6;margin:1in}h1{font-size:22pt}pre{white-space:pre-wrap;font:12pt Arial,sans-serif}@media print{body{margin:0.75in}}</style></head><body><h1>" +
      escapeHtml(value.title) + "</h1><pre>" + escapeHtml(value.body) +
      "</pre><script>window.onload=()=>window.print()</script></body></html>");
    printWindow.document.close();
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="grid size-9 place-items-center rounded-lg" style={{ backgroundColor: "#00CFFF22", color: "#00CFFF" }}><FileText className="size-5" /></span>
        <div><b>IntelliWord document editor</b><p className="text-xs text-muted-foreground">Private drafts, signature blocks, Word-compatible export and PDF printing.</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={newDocument} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><FilePlus2 className="size-4" /> New</button>
        <button type="button" onClick={() => void saveDocument()} disabled={saving || !identity} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: "#007FA8" }}><Save className="size-4" /> {saving ? "Saving…" : "Save to IntelliStack"}</button>
        <button type="button" onClick={exportWord} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Download className="size-4" /> Word .doc</button>
        <button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: "#007FA8" }}><FileDown className="size-4" /> Convert to PDF</button>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <label className="text-xs font-medium text-muted-foreground" htmlFor="intelliword-saved-docs">Saved documents</label>
      <select id="intelliword-saved-docs" value={documentId ?? ""} onChange={(event) => {
        const selected = savedDocuments.find((item) => item.id === event.target.value);
        if (!selected) return;
        setDocumentId(selected.id);
        setValue({
          title: selected.title,
          body: selected.content_markdown,
          signatureName: String(selected.metadata?.signatureName ?? ""),
          signatureTitle: String(selected.metadata?.signatureTitle ?? ""),
        });
      }} className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="">New / unsaved document</option>
        {savedDocuments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
      <span className="text-xs text-muted-foreground">{savedAt ? "Local draft saved " + savedAt : "Local draft not yet saved"}</span>
    </div>

    <section className="mx-auto max-w-5xl rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <button type="button" onClick={() => setBold(!bold)} aria-pressed={bold} className="rounded-md border p-2" style={bold ? { backgroundColor: "#007FA8", color: "white" } : undefined}><Bold className="size-4" /></button>
        <button type="button" onClick={() => setValue((v) => ({ ...v, body: v.body + (v.body ? "\n\n" : "") + "## " }))} className="rounded-md border px-3 py-2 text-xs hover:bg-muted">Heading</button>
        <button type="button" onClick={() => setValue((v) => ({ ...v, body: v.body + (v.body ? "\n" : "") + "• " }))} className="rounded-md border px-3 py-2 text-xs hover:bg-muted">Bullet</button>
        <span className="ml-auto text-xs text-muted-foreground"><Save className="mr-1 inline size-3" /> {savedAt ? "Saved locally " + savedAt : "Local save unavailable"}</span>
      </div>
      <div className="p-5 sm:p-8">
        <input aria-label="Document title" value={value.title} onChange={(event) => setValue((v) => ({ ...v, title: event.target.value }))} className="mb-5 w-full border-0 bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground" placeholder="Document title" />
        <textarea aria-label="Document content" value={value.body} onChange={(event) => setValue((v) => ({ ...v, body: event.target.value }))} placeholder="Start writing your business plan, proposal, report, or document…" className={"min-h-[420px] w-full resize-y border-0 bg-transparent text-base leading-7 outline-none placeholder:text-muted-foreground " + (bold ? "font-semibold" : "")} />
        <div className="mt-5 grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-xs font-medium">Typed signature name<input value={value.signatureName} onChange={(event) => setValue((v) => ({ ...v, signatureName: event.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Full name" /></label>
          <label className="grid gap-1 text-xs font-medium">Title / role<input value={value.signatureTitle} onChange={(event) => setValue((v) => ({ ...v, signatureTitle: event.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Title or role" /></label>
          <button type="button" onClick={addSignature} className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm"><PenLine className="size-4" /> Insert signature</button>
          <p className="text-xs text-muted-foreground sm:col-span-3">A typed signature block is a document feature, not identity verification or a legally validated e-signature.</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span>{words} words · {value.body.length} characters</span>
          <span aria-live="polite">{databaseStatus}</span>
        </div>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-2">
      <a href="/m/account-and-administration/account-and-system-administration/integration-management?provider=microsoft_onedrive" className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted/40">
        <Cloud className="size-5" style={{ color: "#00CFFF" }} /><span className="min-w-0 flex-1"><b className="block text-sm">Save to OneDrive</b><span className="text-xs text-muted-foreground">Connect Microsoft OneDrive in Integration Management first.</span></span><ExternalLink className="size-4" />
      </a>
      <a href="/m/account-and-administration/account-and-system-administration/integration-management?provider=microsoft_365" className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted/40">
        <Cloud className="size-5" style={{ color: "#00CFFF" }} /><span className="min-w-0 flex-1"><b className="block text-sm">Save to Microsoft 365</b><span className="text-xs text-muted-foreground">Connect and authorize Microsoft 365 before cloud saving is enabled.</span></span><ExternalLink className="size-4" />
      </a>
    </div>
    <p className="text-xs text-muted-foreground">PDF export uses your browser's print dialog; choose “Save as PDF.” Word export is an HTML-based .doc compatibility file, not a native .docx package. OneDrive and Microsoft 365 remain catalog-only until an authorized connection is completed.</p>
  </div>;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const columnName = (index: number) => String.fromCharCode(65 + index);
function SheetsWorkspace() {
  const initial = { title: "Untitled workbook", cells: Array.from({length:8}, () => Array.from({length:6}, () => "")) };
  const { value, setValue, savedAt } = useLocalDocument("intellisheets", initial);
  const [active, setActive] = useState("A1");
  const [search, setSearch] = useState("");
  const updateCell = (r:number,c:number,next:string) => setValue(v => ({...v,cells:v.cells.map((row,ri)=>ri===r?row.map((cell,ci)=>ci===c?next:cell):row)}));
  const exportCsv = () => downloadText((value.title || "workbook")+".csv", value.cells.map(row=>row.map(cell=>`"${String(cell).replace(/"/g,'""')}"`).join(",")).join("\n"), "text/csv");
  const importCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0]; if(!file) return;
    const reader=new FileReader(); reader.onload=()=>{const rows=String(reader.result??"").split(/\r?\n/).map(line=>line.split(",").map(cell=>cell.replace(/^"|"$/g,"").replace(/""/g,'"')));setValue(v=>({...v,cells:rows.slice(0,50).map(row=>row.slice(0,12).concat(Array(Math.max(0,6-row.length)).fill("")))}));}; reader.readAsText(file); event.target.value="";
  };
  const resultFor = (cell:string) => {
    const match=cell.match(/^=SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
    if(!match) return cell;
    const c1=match[1]!.toUpperCase().charCodeAt(0)-65, r1=Number(match[2])-1, c2=match[3]!.toUpperCase().charCodeAt(0)-65, r2=Number(match[4])-1;
    let total=0; for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++) for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++) total+=Number(value.cells[r]?.[c]??0)||0;
    return String(total);
  };
  const activeCoords = active.match(/^([A-F])(\d+)$/);
  const activeValue = activeCoords ? value.cells[Number(activeCoords[2])-1]?.[activeCoords[1]!.charCodeAt(0)-65] ?? "" : "";
  const visibleRows = value.cells.filter(row=>!search || row.join(" ").toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-slate-500/10 text-slate-300"><Table2 className="size-5"/></span><div><b>Workbook editor</b><p className="text-xs text-muted-foreground">Edit cells, calculate simple SUM ranges, import and export CSV.</p></div></div>
      <div className="flex flex-wrap gap-2"><label className="cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-muted">Import CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv}/></label><button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white"><Download className="size-4"/> Export CSV</button></div>
    </div>
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b p-3"><input aria-label="Workbook title" value={value.title} onChange={e=>setValue(v=>({...v,title:e.target.value}))} className="min-w-0 flex-1 border-0 bg-transparent font-semibold outline-none"/><span className="text-xs text-muted-foreground">{savedAt ? `Saved locally ${savedAt}` : "Local save unavailable"}</span></div>
      <div className="flex items-center gap-2 border-b bg-muted/30 p-2"><span className="w-12 rounded border bg-background px-2 py-1 text-center text-xs font-semibold">{active}</span><span className="text-sm text-muted-foreground">fx</span><input aria-label="Cell formula or value" value={activeValue} onChange={e=>{if(activeCoords) updateCell(Number(activeCoords[2])-1,activeCoords[1]!.charCodeAt(0)-65,e.target.value)}} className="min-w-0 flex-1 rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-400" placeholder="Enter a value or =SUM(A1:A4)"/></div>
      <div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr><th className="w-10 border bg-muted/60 p-2"></th>{Array.from({length:Math.max(6,...value.cells.map(r=>r.length))},(_,i)=><th key={i} className="min-w-28 border bg-muted/60 p-2 text-xs font-semibold">{columnName(i)}</th>)}</tr></thead><tbody>{value.cells.map((row,r)=><tr key={r}><th className="border bg-muted/60 p-2 text-xs">{r+1}</th>{Array.from({length:Math.max(6,row.length)},(_,c)=><td key={c} className={`border p-0 ${active===columnName(c)+(r+1)?"ring-2 ring-inset ring-slate-400":""}`}><input aria-label={`${columnName(c)}${r+1}`} value={row[c]??""} onFocus={()=>setActive(columnName(c)+(r+1))} onChange={e=>updateCell(r,c,e.target.value)} className="w-full min-w-28 bg-transparent px-2 py-2 outline-none focus:bg-slate-500/5"/>{row[c]?.startsWith("=")&&<span className="block px-2 pb-1 text-[10px] text-slate-300">Result: {resultFor(row[c]!)}</span>}</td>)}</tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter visible rows…" className="rounded-md border bg-background px-3 py-1.5 text-sm"/><button type="button" onClick={()=>setValue(v=>({...v,cells:[...v.cells,Array.from({length:6},()=> "")]}))} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"><Plus className="size-4"/> Add row</button><span className="text-xs text-muted-foreground">{visibleRows.length} visible rows · local workbook</span></div>
    </section>
  </div>;
}

type Slide = { id: string; title: string; body: string };
function SlidesWorkspace() {
  const initial = { title:"Untitled presentation", slides:[{id:"slide-1",title:"Your presentation starts here",body:"Add your key message, supporting points, and the story you want your audience to remember."}] as Slide[] };
  const {value,setValue,savedAt}=useLocalDocument("intellislides",initial);
  const [index,setIndex]=useState(0);
  const slide=value.slides[Math.min(index,value.slides.length-1)];
  const update=(patch:Partial<Slide>)=>setValue(v=>({...v,slides:v.slides.map((s,i)=>i===index?{...s,...patch}:s)}));
  const add=()=>{setValue(v=>({...v,slides:[...v.slides,{id:`slide-${Date.now()}`,title:"New slide",body:"Add your talking points here."}]}));setIndex(value.slides.length);};
  const remove=()=>{if(value.slides.length<=1)return;setValue(v=>({...v,slides:v.slides.filter((_,i)=>i!==index)}));setIndex(Math.max(0,index-1));};
  const exportOutline=()=>downloadText((value.title||"presentation")+".md",`# ${value.title}\n\n`+value.slides.map((s,i)=>`## ${i+1}. ${s.title}\n\n${s.body}\n`).join("\n"));
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-[#FF00A8]/10 text-[#FF00A8]"><Presentation className="size-5"/></span><div><b>Presentation builder</b><p className="text-xs text-muted-foreground">Create slides and export a presentation outline.</p></div></div><button type="button" onClick={exportOutline} className="inline-flex items-center gap-2 rounded-lg bg-[#FF00A8] px-3 py-2 text-sm font-medium text-white"><Download className="size-4"/> Export outline</button></div>
    <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-xl border bg-card p-3"><div className="mb-3 flex items-center justify-between"><b className="text-sm">Slides</b><button type="button" onClick={add} className="rounded-md border p-1.5 hover:bg-muted" aria-label="Add slide"><Plus className="size-4"/></button></div><div className="space-y-2">{value.slides.map((s,i)=><button type="button" key={s.id} onClick={()=>setIndex(i)} className={`w-full rounded-lg border p-3 text-left text-xs ${index===i?"border-[#FF00A8] bg-[#FF00A8]/5":"hover:bg-muted"}`}><span className="text-muted-foreground">Slide {i+1}</span><b className="mt-1 block truncate">{s.title}</b></button>)}</div></aside>
      <section className="space-y-3 rounded-xl border bg-card p-3 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><input aria-label="Presentation name" value={value.title} onChange={e=>setValue(v=>({...v,title:e.target.value}))} className="min-w-0 flex-1 border-0 bg-transparent font-semibold outline-none"/><span className="text-xs text-muted-foreground">{savedAt? `Saved locally ${savedAt}`:"Local save unavailable"}</span></div>
        <div className="mx-auto flex aspect-video w-full max-w-4xl flex-col justify-center rounded-xl border bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 p-6 text-white shadow-lg sm:p-12"><div className="mb-4 text-xs font-semibold uppercase tracking-[.25em] text-[#FF66CC]">IntelliStack · IntelliSlides</div><input aria-label="Slide title" value={slide?.title??""} onChange={e=>update({title:e.target.value})} className="w-full border-0 bg-transparent text-2xl font-bold outline-none placeholder:text-white/50 sm:text-4xl"/><textarea aria-label="Slide content" value={slide?.body??""} onChange={e=>update({body:e.target.value})} className="mt-5 min-h-24 w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-200 outline-none placeholder:text-white/50 sm:text-lg"/></div>
        <div className="flex items-center justify-between"><button type="button" disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="size-4"/> Previous</button><span className="text-xs text-muted-foreground">Slide {index+1} of {value.slides.length}</span><div className="flex gap-2"><button type="button" disabled={value.slides.length===1} onClick={remove} className="rounded-md border p-2 text-destructive disabled:opacity-40" aria-label="Delete slide"><Trash2 className="size-4"/></button><button type="button" disabled={index===value.slides.length-1} onClick={()=>setIndex(i=>Math.min(value.slides.length-1,i+1))} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm disabled:opacity-40">Next <ChevronRight className="size-4"/></button></div></div>
      </section>
    </div>
  </div>;
}

type ChatProfile = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  work_email: string | null;
};
type ChatChannel = {
  id: string;
  name: string;
  channel_type: string;
  organization_id: string;
  tenant_id: string | null;
};
type ChatMessage = {
  id: string;
  channel_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
};

function ChatWorkspace() {
  const client = getSupabaseClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ id: string; organization_id: string; tenant_id: string | null } | null>(null);
  const [people, setPeople] = useState<ChatProfile[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [inviteProfileId, setInviteProfileId] = useState("");
  const [messageStatus, setMessageStatus] = useState("Checking your account…");
  const [busy, setBusy] = useState(false);

  const loadChannels = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client
      .from("intellisphere_chat_channels")
      .select("id, name, channel_type, organization_id, tenant_id")
      .order("updated_at", { ascending: false });
    if (error) {
      setMessageStatus("Chat channels unavailable: " + error.message);
      return;
    }
    setChannels((data ?? []) as ChatChannel[]);
  }, [client]);

  useEffect(() => {
    let active = true;
    if (!client) {
      setMessageStatus("Chat database client unavailable.");
      return () => { active = false; };
    }
    void (async () => {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (!active) return;
      if (authError || !user) {
        setMessageStatus("Sign in to use persistent IntelliChat.");
        return;
      }
      setUserId(user.id);
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("id, organization_id, tenant_id, member_status")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (profileError || !profile || profile.member_status !== "active" || !profile.organization_id) {
        setMessageStatus("An active organization profile is required for IntelliChat.");
        return;
      }
      setIdentity({ id: profile.id, organization_id: profile.organization_id, tenant_id: profile.tenant_id });
      const { data: directory } = await client
        .from("profiles")
        .select("id, display_name, first_name, last_name, work_email")
        .eq("organization_id", profile.organization_id)
        .eq("member_status", "active")
        .limit(100);
      if (active) setPeople((directory ?? []) as ChatProfile[]);
      await loadChannels();
      if (active) setMessageStatus("Connected · private group messaging is ready");
    })();
    return () => { active = false; };
  }, [client, loadChannels]);

  useEffect(() => {
    if (!activeChannelId && channels.length > 0) setActiveChannelId(channels[0]!.id);
  }, [activeChannelId, channels]);

  useEffect(() => {
    if (!client || !activeChannelId) {
      setMessages([]);
      return;
    }
    let active = true;
    void (async () => {
      const { data, error } = await client
        .from("intellisphere_chat_messages")
        .select("id, channel_id, sender_profile_id, body, created_at")
        .eq("channel_id", activeChannelId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (active) {
        if (error) setMessageStatus("Message history unavailable: " + error.message);
        else setMessages((data ?? []) as ChatMessage[]);
      }
    })();
    const subscription = client
      .channel("intellisphere-chat-" + activeChannelId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "intellisphere_chat_messages",
        filter: "channel_id=eq." + activeChannelId,
      }, (payload) => {
        const incoming = payload.new as ChatMessage;
        if (active) setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming]);
      })
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(subscription);
    };
  }, [client, activeChannelId]);

  const createGroup = async () => {
    if (!client || !identity || !userId || !newChannelName.trim()) return;
    setBusy(true);
    const { data: channel, error } = await client
      .from("intellisphere_chat_channels")
      .insert({
        organization_id: identity.organization_id,
        tenant_id: identity.tenant_id,
        channel_type: "group",
        name: newChannelName.trim(),
        created_by_profile_id: userId,
      })
      .select("id, name, channel_type, organization_id, tenant_id")
      .single();
    if (error || !channel) {
      setBusy(false);
      setMessageStatus("Group creation failed: " + (error?.message ?? "No channel returned"));
      return;
    }
    const memberIds = [userId, ...(inviteProfileId ? [inviteProfileId] : [])];
    const { error: memberError } = await client
      .from("intellisphere_chat_members")
      .insert(memberIds.map((profile_id) => ({ channel_id: channel.id, profile_id })));
    setBusy(false);
    if (memberError) {
      await client.from("intellisphere_chat_channels").delete().eq("id", channel.id);
      setMessageStatus("Group membership could not be established: " + memberError.message);
      return;
    }
    setNewChannelName("");
    setInviteProfileId("");
    setChannels((current) => [channel as ChatChannel, ...current]);
    setActiveChannelId(channel.id);
    setMessageStatus("Group created · members are restricted to your organization and tenant");
  };

  const addParticipant = async () => {
    if (!client || !activeChannelId || !inviteProfileId) return;
    setBusy(true);
    const { error } = await client
      .from("intellisphere_chat_members")
      .insert({ channel_id: activeChannelId, profile_id: inviteProfileId });
    setBusy(false);
    setMessageStatus(error ? "Invite failed: " + error.message : "Participant added to the group");
    if (!error) setInviteProfileId("");
  };

  const sendMessage = async () => {
    const channel = channels.find((item) => item.id === activeChannelId);
    if (!client || !identity || !userId || !channel || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    const { error } = await client.from("intellisphere_chat_messages").insert({
      channel_id: channel.id,
      organization_id: channel.organization_id,
      tenant_id: channel.tenant_id,
      sender_profile_id: userId,
      message_type: "text",
      body,
    });
    if (error) {
      setDraft(body);
      setMessageStatus("Message was not sent: " + error.message);
    } else {
      setMessageStatus("Message sent and stored in the authorized group");
    }
  };

  const activeChannel = channels.find((item) => item.id === activeChannelId);
  const personName = (profileId: string) => {
    const person = people.find((item) => item.id === profileId);
    if (!person) return profileId === userId ? "You" : "Group member";
    return person.display_name || [person.first_name, person.last_name].filter(Boolean).join(" ") || person.work_email || "Group member";
  };

  return <div className="overflow-hidden rounded-xl border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
      <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg" style={{ backgroundColor: "#6D28D922", color: "#8B5CF6" }}><MessageSquare className="size-5" /></span><div><b>IntelliChat</b><p className="text-xs text-muted-foreground">Persistent, organization-scoped group messaging</p></div></div>
      <a href="/m/account-and-administration/account-and-system-administration/integration-management?provider=microsoft_teams" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-muted"><Video className="size-4" /> Video meeting setup <ExternalLink className="size-3" /></a>
    </div>
    <div className="grid min-h-[480px] md:grid-cols-[230px_1fr]">
      <aside className="border-b bg-muted/20 p-3 md:border-b-0 md:border-r">
        <div className="mb-2 flex items-center justify-between"><b className="text-xs uppercase tracking-wider text-muted-foreground">Groups</b><span className="text-xs text-muted-foreground">{channels.length}</span></div>
        {channels.map((channel) => <button type="button" key={channel.id} onClick={() => setActiveChannelId(channel.id)} className={"mb-1 w-full rounded-lg px-3 py-2 text-left text-sm " + (activeChannelId === channel.id ? "bg-violet-700/15 font-semibold text-violet-300" : "hover:bg-muted")}># {channel.name}</button>)}
        {channels.length === 0 && <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No groups are available to your account yet. Create one below.</p>}
        <div className="mt-4 space-y-2 border-t pt-3">
          <label className="grid gap-1 text-xs font-medium">New group name<input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} className="w-full rounded-md border bg-background px-2 py-2 text-sm" placeholder="Project room" /></label>
          <label className="grid gap-1 text-xs font-medium">Invite one teammate (optional)<select value={inviteProfileId} onChange={(event) => setInviteProfileId(event.target.value)} className="w-full rounded-md border bg-background px-2 py-2 text-sm"><option value="">Choose teammate</option>{people.filter((person) => person.id !== userId).map((person) => <option key={person.id} value={person.id}>{person.display_name || person.work_email || person.id}</option>)}</select></label>
          <button type="button" onClick={() => void createGroup()} disabled={busy || !identity || !newChannelName.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: "#6D28D9" }}><Plus className="size-4" /> Create group</button>
        </div>
      </aside>
      <section className="flex min-w-0 flex-col p-4">
        {activeChannel ? <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><div><b>#{activeChannel.name}</b><p className="text-xs text-muted-foreground">Organization and tenant scoped · {activeChannel.channel_type}</p></div><div className="flex flex-wrap items-center gap-2"><select aria-label="Add a teammate" value={inviteProfileId} onChange={(event) => setInviteProfileId(event.target.value)} className="max-w-44 rounded-md border bg-background px-2 py-1.5 text-xs"><option value="">Add participant…</option>{people.filter((person) => person.id !== userId).map((person) => <option key={person.id} value={person.id}>{person.display_name || person.work_email || person.id}</option>)}</select><button type="button" onClick={() => void addParticipant()} disabled={busy || !inviteProfileId} className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs disabled:opacity-40"><UserPlus className="size-3.5" /> Add</button></div></div>
          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            {messages.length === 0 ? <div className="mx-auto mt-12 max-w-sm text-center text-sm text-muted-foreground"><Users className="mx-auto mb-3 size-8 opacity-50" />This group has no messages yet. Send the first message to its authorized members.</div> : messages.map((message) => <div key={message.id} className={"max-w-[88%] rounded-xl px-3 py-2 text-sm " + (message.sender_profile_id === userId ? "ml-auto bg-violet-700/15" : "bg-muted")}><div className="mb-1 text-[10px] font-semibold text-muted-foreground">{personName(message.sender_profile_id)}</div><p className="whitespace-pre-wrap break-words">{message.body}</p><div className="mt-1 text-right text-[10px] text-muted-foreground">{new Date(message.created_at).toLocaleString()}</div></div>)}
          </div>
          <div className="flex gap-2 border-t pt-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Message this group…" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" /><button type="button" onClick={() => void sendMessage()} disabled={!draft.trim() || busy} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: "#6D28D9" }}><Send className="size-4" /> Send</button></div>
        </> : <div className="m-auto max-w-md text-center"><MessageSquare className="mx-auto mb-3 size-10 text-violet-400" /><h3 className="font-semibold">Your IntelliChat groups</h3><p className="mt-2 text-sm text-muted-foreground">Create a group to start persistent messaging with teammates in your organization and tenant.</p></div>}
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">{messageStatus}</p>
      </section>
    </div>
    <div className="border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">Group text messages are database-backed with membership checks and row-level security. Video calls, presence, file attachments, and read receipts are not enabled yet; the Teams catalog entry is not a connected calling service.</div>
  </div>;
}

export function IntelliOfficeWorkspace({ pageSlug }: { pageSlug: string }) {
  const kind = (["intelliword","intellisheets","intellislides","intellichat"].find(key=>pageSlug.includes(key)) ?? "intelliword") as OfficeKind;
  const product=products[kind]; const Icon=product.icon;
  return <div className="space-y-4">
    <section className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-card">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: product.accent }} />
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl" style={{ backgroundColor: product.accent + "22", color: product.accent }}><Icon className="size-6"/></span><div><div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">IntelliStack productivity suite</div><h2 className="text-2xl font-bold">{product.name}</h2><p className="text-sm text-muted-foreground">{product.tagline}</p></div></div><span className="rounded-full border px-3 py-1 text-xs font-medium">Foundation workspace</span></div>
    </section>
    {kind==="intelliword"?<WordWorkspace/>:kind==="intellisheets"?<SheetsWorkspace/>:kind==="intellislides"?<SlidesWorkspace/>:<ChatWorkspace/>}
    <p className="text-xs text-muted-foreground">Foundation scope: original IntelliStack implementation using familiar productivity patterns. Drafts are stored in this browser on this device; cross-device synchronization, shared collaboration, and enterprise persistence are separate backend milestones.</p>
  </div>;
}
