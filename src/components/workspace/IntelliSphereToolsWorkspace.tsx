import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { BookOpen, CloudUpload, Download, FileText, FolderOpen, FormInput, Image, MessageSquareText, Plus, Save, Send } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type ToolKind = "intellinotes" | "intellidrive" | "intelliforms" | "intellistudio" | "intellitext";
type Profile = { id: string; organization_id: string; tenant_id: string | null };
type RecordRow = { id: string; title: string; content_markdown: string; version: number; metadata: Record<string, unknown>; updated_at: string };
type DriveFile = { id: string; file_name: string; storage_bucket: string; storage_path: string; mime_type: string | null; file_size_bytes: number | null; created_at: string };

const config: Record<ToolKind, { title: string; subtitle: string; accent: string; icon: typeof BookOpen; docType: string }> = {
  intellinotes: { title: "IntelliNotes", subtitle: "Capture meeting notes, decisions, and follow-ups.", accent: "#A855F7", icon: BookOpen, docType: "intellinotes" },
  intellidrive: { title: "IntelliDrive", subtitle: "Your private file library inside IntelliStack.", accent: "#00CFFF", icon: FolderOpen, docType: "intellidrive" },
  intelliforms: { title: "IntelliForms", subtitle: "Build reusable forms and collect real submissions.", accent: "#F59E0B", icon: FormInput, docType: "intelliforms" },
  intellistudio: { title: "IntelliStudio", subtitle: "Organize creative briefs, brand work, and projects.", accent: "#F472B6", icon: Image, docType: "intellistudio" },
  intellitext: { title: "IntelliText", subtitle: "Create and reuse business communication templates.", accent: "#34D399", icon: MessageSquareText, docType: "intellitext" },
};

function bytes(value: number | null) {
  if (!value) return "—";
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

export function IntelliSphereToolsWorkspace({ pageSlug }: { pageSlug: string }) {
  const kind = (Object.keys(config).find((key) => pageSlug.includes(key)) ?? "intellinotes") as ToolKind;
  const product = config[kind];
  const Icon = product.icon;
  const client = getSupabaseClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fieldLabels, setFieldLabels] = useState("Name, Email, Department");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("Connecting to your private workspace…");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const loadRecords = useCallback(async (ownerId: string) => {
    if (!client) return;
    const { data, error } = await client.from("intellisphere_documents")
      .select("id,title,content_markdown,version,metadata,updated_at")
      .eq("owner_profile_id", ownerId).eq("document_type", product.docType)
      .is("deleted_at", null).order("updated_at", { ascending: false }).limit(100);
    if (error) { setStatus("Could not load workspace records: " + error.message); return; }
    setRecords((data ?? []) as RecordRow[]);
  }, [client, product.docType]);

  const loadFiles = useCallback(async (ownerId: string) => {
    if (!client) return;
    const { data, error } = await client.from("files_metadata")
      .select("id,file_name,storage_bucket,storage_path,mime_type,file_size_bytes,created_at")
      .eq("uploaded_by", ownerId).eq("storage_bucket", "company-documents")
      .order("created_at", { ascending: false }).limit(200);
    if (error) { setStatus("File index unavailable: " + error.message); return; }
    setFiles((data ?? []) as DriveFile[]);
  }, [client]);

  useEffect(() => {
    let live = true;
    if (!client) { setStatus("Supabase client is not configured in this environment."); return; }
    void (async () => {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (!live) return;
      if (authError || !user) { setStatus("Sign in with an active organization account to use this workspace."); return; }
      const { data, error } = await client.from("profiles")
        .select("id,organization_id,tenant_id,member_status").eq("id", user.id).maybeSingle();
      if (!live) return;
      if (error || !data || data.member_status !== "active" || !data.organization_id) {
        setStatus("An active organization profile is required. No local demo records are shown."); return;
      }
      const current = { id: data.id, organization_id: data.organization_id, tenant_id: data.tenant_id };
      setProfile(current);
      if (kind === "intellidrive") await loadFiles(user.id); else await loadRecords(user.id);
      if (live) setStatus("Connected · private organization workspace");
    })();
    return () => { live = false; };
  }, [client, kind, product.docType, loadFiles, loadRecords]);

  const saveRecord = async (type = product.docType, recordTitle = title, content = body, metadata: Record<string, unknown> = {}) => {
    if (!client || !profile) { setStatus("Sign in with an active organization account before saving."); return null; }
    if (!recordTitle.trim()) { setStatus("Add a title before saving."); return null; }
    setBusy(true);
    const existing = records.find((item) => item.id === selectedId);
    const payload = {
      ...(type === product.docType && existing ? { id: existing.id } : {}),
      organization_id: profile.organization_id, tenant_id: profile.tenant_id,
      owner_profile_id: profile.id, document_type: type, title: recordTitle.trim(),
      content_markdown: content, version: type === product.docType && existing ? existing.version + 1 : 1,
      metadata, updated_at: new Date().toISOString(),
    };
    const { data, error } = await client.from("intellisphere_documents").upsert(payload, { onConflict: "id" })
      .select("id,title,content_markdown,version,metadata,updated_at").single();
    setBusy(false);
    if (error) { setStatus("Save failed: " + error.message); return null; }
    if (type === product.docType) {
      setRecords((current) => [data as RecordRow, ...current.filter((item) => item.id !== data.id)]);
      setSelectedId(data.id);
    }
    setStatus("Saved to private IntelliStack storage · version " + data.version);
    return data as RecordRow;
  };

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !client || !profile) return;
    if (file.size > 50 * 1024 * 1024) { setStatus("This file exceeds the 50 MB company-documents limit."); return; }
    setUploading(true);
    const path = profile.id + "/" + profile.organization_id + "/" + crypto.randomUUID() + "/" + file.name.replace(/[\\/]/g, "_");
    const { error: uploadError } = await client.storage.from("company-documents").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (uploadError) { setUploading(false); setStatus("Upload failed: " + uploadError.message); return; }
    const { error: indexError } = await client.from("files_metadata").insert({
      organization_id: profile.organization_id, tenant_id: profile.tenant_id, uploaded_by: profile.id,
      storage_bucket: "company-documents", storage_path: path, file_name: file.name,
      mime_type: file.type || null, file_size_bytes: file.size, visibility: "restricted",
    });
    setUploading(false);
    if (indexError) {
      await client.storage.from("company-documents").remove([path]);
      setStatus("File uploaded but could not be indexed; the uploaded object was rolled back. " + indexError.message);
      return;
    }
    await loadFiles(profile.id);
    setStatus("File uploaded and indexed in your private IntelliDrive.");
  };

  const downloadFile = async (file: DriveFile) => {
    if (!client) return;
    const { data, error } = await client.storage.from(file.storage_bucket).createSignedUrl(file.storage_path, 60);
    if (error || !data?.signedUrl) { setStatus("Download link unavailable: " + (error?.message ?? "No signed URL returned")); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const filteredRecords = useMemo(() => records.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())), [records, search]);
  const openRecord = (record: RecordRow) => {
    setSelectedId(record.id); setTitle(record.title); setBody(record.content_markdown);
    if (kind === "intelliforms") setFieldLabels(String(record.metadata.fieldLabels ?? "Name, Email"));
  };

  const createFormSubmission = async () => {
    const labels = fieldLabels.split(",").map((label) => label.trim()).filter(Boolean);
    if (!labels.length || labels.some((label) => !answers[label]?.trim())) { setStatus("Complete every form field before submitting."); return; }
    const saved = await saveRecord("intelliform_response", "Response · " + (title || "Untitled form"), JSON.stringify({ formTitle: title, answers }), { formOwner: profile?.id, source: "IntelliForms" });
    if (saved) { setAnswers({}); setStatus("Form response saved to the private database."); }
  };

  return <div className="space-y-4">
    <section className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-card">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: product.accent }} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl" style={{ color: product.accent, backgroundColor: product.accent + "20" }}><Icon className="size-6" /></span>
        <div><div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">IntelliSphere · Native business suite</div><h2 className="text-2xl font-bold">{product.title}</h2><p className="text-sm text-muted-foreground">{product.subtitle}</p></div>
      </div>
    </section>

    {kind === "intellidrive" ? <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Private company file library</h3><p className="text-xs text-muted-foreground">Uploads use the private company-documents bucket and owner-scoped paths.</p></div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: product.accent }}><CloudUpload className="size-4" />{uploading ? "Uploading…" : "Upload file"}<input type="file" className="hidden" disabled={uploading || !profile} accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg" onChange={(event) => void uploadFile(event)} /></label>
      </div>
      <div className="space-y-2">{files.length ? files.map((file) => <div key={file.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><FileText className="size-5 shrink-0" style={{ color: product.accent }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.file_name}</p><p className="text-xs text-muted-foreground">{bytes(file.file_size_bytes)} · {file.mime_type ?? "Unknown type"} · {new Date(file.created_at).toLocaleDateString()}</p></div><button type="button" onClick={() => void downloadFile(file)} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs"><Download className="size-3.5" /> Download</button></div>) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No files have been uploaded to this account yet.</p>}</div>
    </section> : <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="space-y-3 rounded-xl border bg-card p-4">
        {kind === "intelliforms" ? <>
          <div><h3 className="font-semibold">Form builder</h3><p className="text-xs text-muted-foreground">Define fields, save a reusable form, then collect database-backed responses.</p></div>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Form name" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <label className="grid gap-1 text-xs font-medium">Field labels (comma separated)<input value={fieldLabels} onChange={(event) => setFieldLabels(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm" /></label>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Form description and instructions" rows={4} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <button type="button" disabled={busy || !profile} onClick={() => void saveRecord(product.docType, title, body, { fieldLabels })} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ background: product.accent }}><Save className="size-4" /> Save form</button>
          <div className="border-t pt-3"><h4 className="mb-2 text-sm font-semibold">Preview and submit</h4>{fieldLabels.split(",").map((field) => field.trim()).filter(Boolean).map((field) => <label key={field} className="mb-2 grid gap-1 text-xs">{field}<input value={answers[field] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [field]: event.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm" /></label>)}<button type="button" onClick={() => void createFormSubmission()} disabled={busy || !profile} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Send className="size-4" /> Submit response</button></div>
        </> : kind === "intellistudio" ? <>
          <h3 className="font-semibold">Creative project workspace</h3><p className="text-xs text-muted-foreground">Save project briefs and brand direction; media editing and asset rendering are separate milestones.</p>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project or campaign name" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Creative brief, audience, message, visual direction, deliverables…" rows={12} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <button type="button" disabled={busy || !profile} onClick={() => void saveRecord()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ background: product.accent }}><Save className="size-4" /> Save project brief</button>
        </> : kind === "intellitext" ? <>
          <h3 className="font-semibold">Business message template</h3><p className="text-xs text-muted-foreground">Prepare reusable business messages. Sending externally is not connected here.</p>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Template name" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your message. Use placeholders such as {{first_name}}." rows={12} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !profile} onClick={() => void saveRecord()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ background: product.accent }}><Save className="size-4" /> Save template</button><button type="button" onClick={() => void navigator.clipboard.writeText(body).then(() => setStatus("Message copied to clipboard.")).catch(() => setStatus("Clipboard access is unavailable in this browser."))} className="rounded-lg border px-3 py-2 text-sm">Copy message</button></div>
        </> : <>
          <h3 className="font-semibold">Personal and meeting notes</h3><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Note title" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Capture decisions, meeting notes, ideas, and follow-ups…" rows={14} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <button type="button" disabled={busy || !profile} onClick={() => void saveRecord()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ background: product.accent }}><Save className="size-4" /> Save note</button>
        </>}
        <p className="text-xs text-muted-foreground" aria-live="polite">{status}</p>
      </section>
      <aside className="space-y-3 rounded-xl border bg-card p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Saved {kind === "intelliforms" ? "forms" : kind === "intellistudio" ? "projects" : kind === "intellitext" ? "templates" : "notes"}</h3><span className="text-xs text-muted-foreground">{records.length}</span></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search saved items" className="w-full rounded-lg border bg-background px-3 py-2 text-xs" />
        {filteredRecords.length ? filteredRecords.map((record) => <button type="button" key={record.id} onClick={() => openRecord(record)} className={"w-full rounded-lg border p-3 text-left " + (selectedId === record.id ? "border-primary bg-primary/5" : "hover:bg-muted/50")}><span className="block truncate text-sm font-medium">{record.title}</span><span className="text-[11px] text-muted-foreground">Version {record.version} · {new Date(record.updated_at).toLocaleDateString()}</span></button>) : <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">No saved records are available.</p>}
        <button type="button" onClick={() => { setSelectedId(""); setTitle(""); setBody(""); setAnswers({}); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"><Plus className="size-3.5" /> New</button>
      </aside>
    </div>}
    <p className="text-xs text-muted-foreground">Only records returned by the authenticated account's row-level security policies are displayed. No simulated content is inserted.</p>
  </div>;
}
