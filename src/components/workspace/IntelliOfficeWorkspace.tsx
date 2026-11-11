import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { FileText, Table2, Presentation, MessageSquare, Plus, Download, Save, Search, Send, Trash2, ChevronLeft, ChevronRight, Bold, Italic, Underline, Palette, Users, LockKeyhole } from "lucide-react";

type OfficeKind = "intelliword" | "intellisheets" | "intellislides" | "intellichat";
const STORE_PREFIX = "intellistack.office.v1.";

const products: Record<OfficeKind, { name: string; tagline: string; accent: string; icon: typeof FileText }> = {
  intelliword: { name: "IntelliWord", tagline: "Documents that move business forward.", accent: "blue", icon: FileText },
  intellisheets: { name: "IntelliSheets", tagline: "Turn business data into decisions.", accent: "emerald", icon: Table2 },
  intellislides: { name: "IntelliSlides", tagline: "Build the story behind the strategy.", accent: "violet", icon: Presentation },
  intellichat: { name: "IntelliChat", tagline: "A connected communication workspace.", accent: "cyan", icon: MessageSquare },
};

function useLocalDocument<T>(kind: OfficeKind, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(STORE_PREFIX + kind);
      return saved ? (JSON.parse(saved) as T) : initial;
    } catch {
      return initial;
    }
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_PREFIX + kind, JSON.stringify(value));
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setSavedAt(null);
    }
  }, [kind, value]);
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
  const initial = { title: "Untitled document", body: "" };
  const { value, setValue, savedAt } = useLocalDocument("intelliword", initial);
  const [bold, setBold] = useState(false);
  const words = value.body.trim() ? value.body.trim().split(/\s+/).length : 0;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-sm"><span className="grid size-9 place-items-center rounded-lg bg-blue-600/10 text-blue-600"><FileText className="size-5"/></span><div><b>Document editor</b><p className="text-xs text-muted-foreground">Your working draft is saved on this device.</p></div></div>
      <button type="button" onClick={() => downloadText((value.title || "document").replace(/[^a-z0-9-_]/gi,"-")+".txt", value.body)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"><Download className="size-4"/> Export text</button>
    </div>
    <section className="mx-auto max-w-4xl rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <button type="button" onClick={() => setBold(!bold)} aria-pressed={bold} className={`rounded-md border p-2 ${bold ? "bg-blue-600 text-white" : "hover:bg-muted"}`}><Bold className="size-4"/></button>
        <button type="button" onClick={() => setValue(v => ({...v, body: v.body + (v.body ? "\n\n" : "") + "## "}))} className="rounded-md border px-3 py-2 text-xs hover:bg-muted">Heading</button>
        <button type="button" onClick={() => setValue(v => ({...v, body: v.body + (v.body ? "\n" : "") + "• "}))} className="rounded-md border px-3 py-2 text-xs hover:bg-muted">Bullet</button>
        <span className="ml-auto text-xs text-muted-foreground"><Save className="mr-1 inline size-3"/> {savedAt ? `Saved locally ${savedAt}` : "Local save unavailable"}</span>
      </div>
      <div className="p-5 sm:p-8">
        <input aria-label="Document title" value={value.title} onChange={e => setValue(v => ({...v,title:e.target.value}))} className="mb-5 w-full border-0 bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground" placeholder="Document title"/>
        <textarea aria-label="Document content" value={value.body} onChange={e => setValue(v => ({...v,body:e.target.value}))} placeholder="Start writing your business plan, proposal, report, or document…" className={`min-h-[420px] w-full resize-y border-0 bg-transparent text-base leading-7 outline-none placeholder:text-muted-foreground ${bold ? "font-semibold" : ""}`}/>
        <div className="border-t pt-3 text-xs text-muted-foreground">{words} words · {value.body.length} characters · IntelliStack document draft</div>
      </div>
    </section>
  </div>;
}

const columnName = (index: number) => String.fromCharCode(65 + index);
function SheetsWorkspace() {
  const initial = { title: "Untitled workbook", cells: Array.from({length:8}, () => Array.from({length:6}, () => "")) };
  const { value, setValue, savedAt } = useLocalDocument("intellisheets", initial);
  const [active, setActive] = useState("A1");
  const [formula, setFormula] = useState("");
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
      <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-emerald-600/10 text-emerald-600"><Table2 className="size-5"/></span><div><b>Workbook editor</b><p className="text-xs text-muted-foreground">Edit cells, calculate simple SUM ranges, import and export CSV.</p></div></div>
      <div className="flex flex-wrap gap-2"><label className="cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-muted">Import CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv}/></label><button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white"><Download className="size-4"/> Export CSV</button></div>
    </div>
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b p-3"><input aria-label="Workbook title" value={value.title} onChange={e=>setValue(v=>({...v,title:e.target.value}))} className="min-w-0 flex-1 border-0 bg-transparent font-semibold outline-none"/><span className="text-xs text-muted-foreground">{savedAt ? `Saved locally ${savedAt}` : "Local save unavailable"}</span></div>
      <div className="flex items-center gap-2 border-b bg-muted/30 p-2"><span className="w-12 rounded border bg-background px-2 py-1 text-center text-xs font-semibold">{active}</span><span className="text-sm text-muted-foreground">fx</span><input aria-label="Cell formula or value" value={activeValue} onChange={e=>{if(activeCoords) updateCell(Number(activeCoords[2])-1,activeCoords[1]!.charCodeAt(0)-65,e.target.value)}} className="min-w-0 flex-1 rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Enter a value or =SUM(A1:A4)"/></div>
      <div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr><th className="w-10 border bg-muted/60 p-2"></th>{Array.from({length:Math.max(6,...value.cells.map(r=>r.length))},(_,i)=><th key={i} className="min-w-28 border bg-muted/60 p-2 text-xs font-semibold">{columnName(i)}</th>)}</tr></thead><tbody>{value.cells.map((row,r)=><tr key={r}><th className="border bg-muted/60 p-2 text-xs">{r+1}</th>{Array.from({length:Math.max(6,row.length)},(_,c)=><td key={c} className={`border p-0 ${active===columnName(c)+(r+1)?"ring-2 ring-inset ring-emerald-500":""}`}><input aria-label={`${columnName(c)}${r+1}`} value={row[c]??""} onFocus={()=>setActive(columnName(c)+(r+1))} onChange={e=>updateCell(r,c,e.target.value)} className="w-full min-w-28 bg-transparent px-2 py-2 outline-none focus:bg-emerald-500/5"/>{row[c]?.startsWith("=")&&<span className="block px-2 pb-1 text-[10px] text-emerald-700">Result: {resultFor(row[c]!)}</span>}</td>)}</tr>)}</tbody></table></div>
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-violet-600/10 text-violet-600"><Presentation className="size-5"/></span><div><b>Presentation builder</b><p className="text-xs text-muted-foreground">Create slides and export a presentation outline.</p></div></div><button type="button" onClick={exportOutline} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white"><Download className="size-4"/> Export outline</button></div>
    <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-xl border bg-card p-3"><div className="mb-3 flex items-center justify-between"><b className="text-sm">Slides</b><button type="button" onClick={add} className="rounded-md border p-1.5 hover:bg-muted" aria-label="Add slide"><Plus className="size-4"/></button></div><div className="space-y-2">{value.slides.map((s,i)=><button type="button" key={s.id} onClick={()=>setIndex(i)} className={`w-full rounded-lg border p-3 text-left text-xs ${index===i?"border-violet-500 bg-violet-500/5":"hover:bg-muted"}`}><span className="text-muted-foreground">Slide {i+1}</span><b className="mt-1 block truncate">{s.title}</b></button>)}</div></aside>
      <section className="space-y-3 rounded-xl border bg-card p-3 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><input aria-label="Presentation name" value={value.title} onChange={e=>setValue(v=>({...v,title:e.target.value}))} className="min-w-0 flex-1 border-0 bg-transparent font-semibold outline-none"/><span className="text-xs text-muted-foreground">{savedAt? `Saved locally ${savedAt}`:"Local save unavailable"}</span></div>
        <div className="mx-auto flex aspect-video w-full max-w-4xl flex-col justify-center rounded-xl border bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-lg sm:p-12"><div className="mb-4 text-xs font-semibold uppercase tracking-[.25em] text-violet-300">IntelliStack · IntelliSlides</div><input aria-label="Slide title" value={slide?.title??""} onChange={e=>update({title:e.target.value})} className="w-full border-0 bg-transparent text-2xl font-bold outline-none placeholder:text-white/50 sm:text-4xl"/><textarea aria-label="Slide content" value={slide?.body??""} onChange={e=>update({body:e.target.value})} className="mt-5 min-h-24 w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-200 outline-none placeholder:text-white/50 sm:text-lg"/></div>
        <div className="flex items-center justify-between"><button type="button" disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="size-4"/> Previous</button><span className="text-xs text-muted-foreground">Slide {index+1} of {value.slides.length}</span><div className="flex gap-2"><button type="button" disabled={value.slides.length===1} onClick={remove} className="rounded-md border p-2 text-destructive disabled:opacity-40" aria-label="Delete slide"><Trash2 className="size-4"/></button><button type="button" disabled={index===value.slides.length-1} onClick={()=>setIndex(i=>Math.min(value.slides.length-1,i+1))} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm disabled:opacity-40">Next <ChevronRight className="size-4"/></button></div></div>
      </section>
    </div>
  </div>;
}

function ChatWorkspace() {
  const [draft,setDraft]=useState("");
  const [messages,setMessages]=useState<string[]>([]);
  const [channel,setChannel]=useState("General");
  const send=()=>{if(!draft.trim())return;setMessages(items=>[...items,draft.trim()]);setDraft("");};
  return <div className="overflow-hidden rounded-xl border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-cyan-600/10 text-cyan-600"><MessageSquare className="size-5"/></span><div><b>IntelliChat workspace</b><p className="text-xs text-muted-foreground">Communication product foundation</p></div></div><span className="rounded-full border px-2.5 py-1 text-xs text-amber-700">Local prototype · not delivered to other users</span></div>
    <div className="grid min-h-[420px] md:grid-cols-[190px_1fr]">
      <aside className="border-b bg-muted/20 p-3 md:border-b-0 md:border-r"><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</div>{["General","Announcements","Project Room"].map(name=><button type="button" key={name} onClick={()=>{setChannel(name);setMessages([])}} className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${channel===name?"bg-cyan-600/10 font-semibold text-cyan-700":"hover:bg-muted"}`}>{name}</button>)}<div className="mt-5 rounded-lg border p-3 text-xs text-muted-foreground"><LockKeyhole className="mb-2 size-4"/>Real-time delivery, membership, tenant isolation, presence, attachments, and read receipts require the dedicated IntelliChat backend.</div></aside>
      <section className="flex min-w-0 flex-col p-4"><div className="border-b pb-3"><b>#{channel}</b><p className="text-xs text-muted-foreground">Private local workspace preview</p></div><div className="flex-1 space-y-3 py-4">{messages.length===0?<div className="mx-auto mt-12 max-w-sm text-center text-sm text-muted-foreground"><Users className="mx-auto mb-3 size-8 opacity-50"/>No local draft messages yet. Type below to test the composer. Nothing is sent to another person.</div>:messages.map((message,i)=><div key={i} className="ml-auto max-w-[85%] rounded-xl bg-cyan-600/10 px-3 py-2 text-sm">{message}<div className="mt-1 text-right text-[10px] text-muted-foreground">Local draft</div></div>)}</div><div className="flex gap-2 border-t pt-3"><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Write a local test message…" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"/><button type="button" onClick={send} disabled={!draft.trim()} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"><Send className="size-4"/> Test</button></div></section>
    </div>
  </div>;
}

export function IntelliOfficeWorkspace({ pageSlug }: { pageSlug: string }) {
  const kind = (["intelliword","intellisheets","intellislides","intellichat"].find(key=>pageSlug.includes(key)) ?? "intelliword") as OfficeKind;
  const product=products[kind]; const Icon=product.icon;
  return <div className="space-y-4">
    <section className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-card">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{background:kind==="intelliword"?"#2563eb":kind==="intellisheets"?"#059669":kind==="intellislides"?"#7c3aed":"#0891b2"}}/>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className={`grid size-12 place-items-center rounded-xl ${kind==="intelliword"?"bg-blue-600/10 text-blue-600":kind==="intellisheets"?"bg-emerald-600/10 text-emerald-600":kind==="intellislides"?"bg-violet-600/10 text-violet-600":"bg-cyan-600/10 text-cyan-600"}`}><Icon className="size-6"/></span><div><div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">IntelliStack productivity suite</div><h2 className="text-2xl font-bold">{product.name}</h2><p className="text-sm text-muted-foreground">{product.tagline}</p></div></div><span className="rounded-full border px-3 py-1 text-xs font-medium">Foundation workspace</span></div>
    </section>
    {kind==="intelliword"?<WordWorkspace/>:kind==="intellisheets"?<SheetsWorkspace/>:kind==="intellislides"?<SlidesWorkspace/>:<ChatWorkspace/>}
    <p className="text-xs text-muted-foreground">Foundation scope: original IntelliStack implementation using familiar productivity patterns. Drafts are stored in this browser on this device; cross-device synchronization, shared collaboration, and enterprise persistence are separate backend milestones.</p>
  </div>;
}
