import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Archive, BookOpen, Brain, Database, Library, LockKeyhole, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

type Category = { id: string; category_key: string; name: string; description: string; target_patterns: number; sort_order: number; status: string };
type Template = { id: string; category_id: string; intent_key: string; title: string; user_examples: string[]; response_variants: string[]; follow_up_variants: string[]; tone: string; audience: string; repeat_policy: string; cooldown_turns: number; requires_permission_check: boolean; escalation_level: string | null; status: string; visibility: string; version: number; updated_at: string };
type Memory = { id: string; memory_type: string; title: string; content: string; importance: number; confidence: number; status: string; updated_at: string };
type CategoryDraft = { category_key: string; name: string; description: string; target_patterns: string; sort_order: string };
type QaEntry = { id: string; knowledge_base_id: string; question: string; answer_markdown: string; intent_key: string; alternate_questions: string[]; tags: string[]; status: string; visibility: string; version: number; updated_at: string };
type KnowledgeBaseOption = { id: string; name: string };
type UnansweredQuestion = { id: string; question: string; normalized_question: string; status: string; profile_id: string; created_at: string; session_id: string; linked_qa_entry_id: string | null; resolution_notes: string | null };

const pageTitles: Record<string, string> = {
  "intelligence-overview": "Help Buddy Intelligence Overview",
  "conversational-responses": "Conversational Response Library",
  "permission-and-escalation-responses": "Permissions and Administrative Escalations",
  "personality-and-tone-rules": "Personality and Tone Rules",
  "memory-management": "Persistent Memory Management",
  "semantic-and-vector-search": "Semantic and Vector Search",
  "knowledge-scenarios": "Knowledge Scenario Library",
  "response-categories": "Categories and Subcategories",
  "unanswered-question-review": "Unanswered Question Review",
  "response-analytics": "Response Analytics",
  "response-audit-and-history": "Version and Change History",
};

const managementAreas: Array<{ icon: LucideIcon; title: string; description: string }> = [
  { icon: Library, title: "Conversational Library", description: "Greetings, small talk, playful questions, humor and everyday conversation." },
  { icon: LockKeyhole, title: "Permissions and Escalations", description: "Access denials, administrator contacts, approval requirements and security-safe responses." },
  { icon: Sparkles, title: "Personality and Tone", description: "Variation, repetition handling, user-aware tone and conversational transitions." },
  { icon: Brain, title: "Persistent Memory", description: "Personal context, conversation continuity, corrections and memory lifecycle." },
  { icon: Database, title: "Semantic and Vector Search", description: "pgvector storage, embedding coverage and similarity retrieval." },
  { icon: BookOpen, title: "Knowledge Scenarios", description: "Platform questions, workflow guidance, onboarding, offboarding and IntelliDesk." },
];

const emptyForm = {
  title: "", intent_key: "", category_id: "", examples: "", responses: "", followups: "",
  tone: "friendly", audience: "all", repeat_policy: "rotate", cooldown_turns: "3",
  requires_permission_check: false, escalation_level: "", status: "draft", visibility: "internal",
};

const Panel = ({ children, className = "" }: { children: ReactNode; className?: string }) =>
  <section className={`rounded-xl border bg-card p-4 shadow-sm sm:p-5 ${className}`}>{children}</section>;

export function HelpBuddyIntelligenceManagement({ pageSlug }: { pageSlug: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [auditRows, setAuditRows] = useState<Array<Record<string, unknown>>>([]);
  const [unansweredRows, setUnansweredRows] = useState<UnansweredQuestion[]>([]);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [qaCount, setQaCount] = useState(0);
  const [qaEntries, setQaEntries] = useState<QaEntry[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseOption[]>([]);
  const [qaEditor, setQaEditor] = useState(false);
  const [editingQa, setEditingQa] = useState<QaEntry | null>(null);
  const [qaDraft, setQaDraft] = useState({ knowledge_base_id: "", question: "", answer_markdown: "", intent_key: "platform.general", alternate_questions: "", tags: "", status: "draft", visibility: "public_internal" });
  const [articleCount, setArticleCount] = useState(0);
  const [vectorCounts, setVectorCounts] = useState({ responses: 0, memories: 0, qa: 0, articles: 0 });
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [memoryDraft, setMemoryDraft] = useState({ title: "", content: "", memory_type: "preference" });
  const [categoryEditor, setCategoryEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({ category_key: "", name: "", description: "", target_patterns: "0", sort_order: "0" });

  const supabase = getSupabaseClient();
  const viewSlug = ({
    "permissions-and-escalation-responses": "permission-and-escalation-responses",
    "persistent-memory-management": "memory-management",
    "knowledge-scenario-library": "knowledge-scenarios",
    "response-categories-and-subcategories": "response-categories",
    "version-and-change-history": "response-audit-and-history",
  } as Record<string, string>)[pageSlug] ?? pageSlug;
  const title = pageTitles[viewSlug] ?? "Help Buddy Intelligence Management";

  const reload = useCallback(async () => {
    if (!supabase) { setError("The secure database connection is unavailable."); setLoading(false); return; }
    setLoading(true);
    setError("");
    const [manageResult, categoryResult, templateResult, qaResult, basesResult, articleResult, memoryResult, auditResult, unansweredResult] = await Promise.all([
      supabase.rpc("kb_can_manage"),
      supabase.from("help_buddy_library_categories").select("*").order("sort_order"),
      supabase.from("help_buddy_response_templates").select("*").order("updated_at", { ascending: false }).limit(1000),
      supabase.from("help_buddy_qa_entries").select("id,knowledge_base_id,question,answer_markdown,intent_key,alternate_questions,tags,status,visibility,version,updated_at").order("updated_at", { ascending: false }).limit(1000),
      supabase.from("knowledge_bases").select("id,name").order("name"),
      supabase.from("knowledge_articles").select("id", { count: "exact", head: true }),
      supabase.from("help_buddy_memory_records").select("id,memory_type,title,content,importance,confidence,status,updated_at").eq("memory_scope", "user").order("updated_at", { ascending: false }).limit(200),
      supabase.from("help_buddy_management_audit").select("id,entity_type,entity_id,operation,actor_profile_id,created_at,old_record,new_record").order("created_at", { ascending: false }).limit(100),
      supabase.from("help_buddy_unanswered_questions").select("id,question,normalized_question,status,profile_id,created_at,session_id,linked_qa_entry_id,resolution_notes").order("created_at", { ascending: false }).limit(300),
    ]);
    setCanManage(manageResult.data === true);
    if (categoryResult.error) setError(categoryResult.error.message);
    else setCategories((categoryResult.data ?? []) as Category[]);
    if (templateResult.error) setError(templateResult.error.message);
    else setTemplates((templateResult.data ?? []) as Template[]);
    setQaEntries((qaResult.data ?? []) as QaEntry[]);
    setQaCount(qaResult.data?.length ?? 0);
    setKnowledgeBases((basesResult.data ?? []) as KnowledgeBaseOption[]);
    setArticleCount(articleResult.count ?? 0);
    setMemories((memoryResult.data ?? []) as Memory[]);
    setAuditRows((auditResult.data ?? []) as Array<Record<string, unknown>>);
    setUnansweredRows((unansweredResult.data ?? []) as UnansweredQuestion[]);
    const [responses, memoryVectors, qaVectors, articleVectors] = await Promise.all([
      supabase.from("help_buddy_response_templates").select("id", { count: "exact", head: true }).not("embedding", "is", null),
      supabase.from("help_buddy_memory_records").select("id", { count: "exact", head: true }).not("embedding", "is", null),
      supabase.from("help_buddy_qa_entries").select("id", { count: "exact", head: true }).not("embedding", "is", null),
      supabase.from("knowledge_articles").select("id", { count: "exact", head: true }).not("embedding", "is", null),
    ]);
    setVectorCounts({ responses: responses.count ?? 0, memories: memoryVectors.count ?? 0, qa: qaVectors.count ?? 0, articles: articleVectors.count ?? 0 });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void reload(); }, [pageSlug, reload]);

  const filteredTemplates = useMemo(() => templates.filter((item) => {
    const category = categories.find((entry) => entry.id === item.category_id);
    const permissionPage = viewSlug === "permission-and-escalation-responses";
    const personalityPage = viewSlug === "personality-and-tone-rules";
    const categoryMatch = categoryFilter === "all" || item.category_id === categoryFilter;
    const pageMatch = permissionPage
      ? ["permission_denials", "admin_escalations"].includes(category?.category_key ?? "")
      : personalityPage
        ? ["personality_rules", "small_talk", "playful_humor", "greetings", "time_based_greetings", "silly_imaginative", "repetition", "clarification", "frustration", "off_topic", "encouragement", "gratitude", "compliments", "farewells", "conversation_transitions"].includes(category?.category_key ?? "")
        : viewSlug === "conversational-responses"
          ? !["permission_denials", "admin_escalations", "personality_rules", "memory_awareness"].includes(category?.category_key ?? "")
          : true;
    return categoryMatch && pageMatch && (!search || `${item.title} ${item.intent_key} ${item.user_examples.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  }), [templates, categories, viewSlug, categoryFilter, search]);

  const openNew = (categoryId = categories[0]?.id ?? "") => {
    setEditing(null);
    setForm({ ...emptyForm, category_id: categoryId });
    setShowEditor(true);
  };
  const openEdit = (entry: Template) => {
    setEditing(entry);
    setForm({
      title: entry.title, intent_key: entry.intent_key, category_id: entry.category_id,
      examples: entry.user_examples.join("\n"), responses: entry.response_variants.join("\n"),
      followups: entry.follow_up_variants.join("\n"), tone: entry.tone, audience: entry.audience,
      repeat_policy: entry.repeat_policy, cooldown_turns: String(entry.cooldown_turns),
      requires_permission_check: entry.requires_permission_check, escalation_level: entry.escalation_level ?? "",
      status: entry.status, visibility: entry.visibility,
    });
    setShowEditor(true);
  };
  const saveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !canManage) return;
    const payload = {
      title: form.title.trim(), intent_key: form.intent_key.trim(), category_id: form.category_id,
      user_examples: form.examples.split("\n").map((s) => s.trim()).filter(Boolean),
      response_variants: form.responses.split("\n").map((s) => s.trim()).filter(Boolean),
      follow_up_variants: form.followups.split("\n").map((s) => s.trim()).filter(Boolean),
      tone: form.tone, audience: form.audience, repeat_policy: form.repeat_policy,
      cooldown_turns: Math.max(0, Number(form.cooldown_turns) || 0),
      requires_permission_check: form.requires_permission_check,
      escalation_level: form.escalation_level || null, status: form.status, visibility: form.visibility,
      version: editing ? editing.version + 1 : 1,
      updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    };
    const result = editing
      ? await supabase.from("help_buddy_response_templates").update(payload).eq("id", editing.id)
      : await supabase.from("help_buddy_response_templates").insert({ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id ?? null });
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(editing ? "Response template updated." : "Response template created.");
    setShowEditor(false);
    await reload();
  };
  const archiveTemplate = async (entry: Template) => {
    if (!supabase || !canManage) return;
    const { error: updateError } = await supabase.from("help_buddy_response_templates").update({ status: "archived", version: entry.version + 1 }).eq("id", entry.id);
    if (updateError) toast.error(updateError.message);
    else { toast.success("Template archived. It remains in history and can be restored by an administrator."); await reload(); }
  };
  const saveMemory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !memoryDraft.title.trim() || !memoryDraft.content.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { toast.error("Sign in to manage personal memory."); return; }
    const payload = { profile_id: auth.user.id, memory_scope: "user", memory_type: memoryDraft.memory_type, title: memoryDraft.title.trim(), content: memoryDraft.content.trim(), importance: 3 };
    const result = editingMemory
      ? await supabase.from("help_buddy_memory_records").update({ memory_type: payload.memory_type, title: payload.title, content: payload.content }).eq("id", editingMemory.id)
      : await supabase.from("help_buddy_memory_records").insert(payload);
    if (result.error) toast.error(result.error.message);
    else { setMemoryDraft({ title: "", content: "", memory_type: "preference" }); setEditingMemory(null); toast.success(editingMemory ? "Memory updated." : "Personal memory saved."); await reload(); }
  };
  const forgetMemory = async (memory: Memory) => {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("help_buddy_memory_records").delete().eq("id", memory.id);
    if (deleteError) toast.error(deleteError.message);
    else { toast.success("Memory deleted."); await reload(); }
  };

  const openQaNew = () => { setEditingQa(null); setQaDraft({ knowledge_base_id: knowledgeBases[0]?.id ?? "", question: "", answer_markdown: "", intent_key: "platform.general", alternate_questions: "", tags: "", status: "draft", visibility: "public_internal" }); setQaEditor(true); };
  const openQaEdit = (entry: QaEntry) => { setEditingQa(entry); setQaDraft({ knowledge_base_id: entry.knowledge_base_id, question: entry.question, answer_markdown: entry.answer_markdown, intent_key: entry.intent_key, alternate_questions: entry.alternate_questions.join("\n"), tags: entry.tags.join(", "), status: entry.status, visibility: entry.visibility }); setQaEditor(true); };
  const saveQa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !canManage) return;
    const user = (await supabase.auth.getUser()).data.user;
    const payload = { knowledge_base_id: qaDraft.knowledge_base_id, question: qaDraft.question.trim(), answer_markdown: qaDraft.answer_markdown.trim(), intent_key: qaDraft.intent_key.trim(), alternate_questions: qaDraft.alternate_questions.split("\n").map((v) => v.trim()).filter(Boolean), tags: qaDraft.tags.split(",").map((v) => v.trim()).filter(Boolean), status: qaDraft.status, visibility: qaDraft.visibility, version: editingQa ? editingQa.version + 1 : 1, updated_by: user?.id ?? null };
    const result = editingQa ? await supabase.from("help_buddy_qa_entries").update(payload).eq("id", editingQa.id) : await supabase.from("help_buddy_qa_entries").insert({ ...payload, created_by: user?.id ?? null });
    if (result.error) toast.error(result.error.message); else { toast.success(editingQa ? "Q&A scenario updated." : "Q&A scenario created."); setQaEditor(false); await reload(); }
  };
  const archiveQa = async (entry: QaEntry) => {
    if (!supabase || !canManage) return;
    const { error: updateError } = await supabase.from("help_buddy_qa_entries").update({ status: "archived", version: entry.version + 1 }).eq("id", entry.id);
    if (updateError) toast.error(updateError.message); else { toast.success("Scenario archived; source history retained."); await reload(); }
  };

  const resolveUnanswered = async (item: UnansweredQuestion) => {
    if (!supabase || !canManage) return;
    const user = (await supabase.auth.getUser()).data.user;
    const { error: updateError } = await supabase.from("help_buddy_unanswered_questions").update({
      status: "resolved", resolution_notes: "Reviewed by an authorized knowledge administrator.",
      resolved_by: user?.id ?? null, resolved_at: new Date().toISOString(),
    }).eq("id", item.id);
    if (updateError) toast.error(updateError.message);
    else { toast.success("Question marked as reviewed."); await reload(); }
  };

  const targetTotal = categories.reduce((sum, category) => sum + category.target_patterns, 0);
  const responseCount = templates.filter((item) => item.status !== "archived").length;
  const publishedCount = templates.filter((item) => item.status === "published").length;

  return <div className="space-y-4">
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Brain className="size-6" /></span><div><div className="text-xs font-semibold uppercase tracking-wider text-primary">Help Buddy · Intelligence Management</div><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-muted-foreground">Manage the approved knowledge, responses, memory and behavior that power Help Buddy.</p></div></div>
        <span className={`rounded-full border px-3 py-1.5 text-xs ${canManage ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{canManage ? "Knowledge administrator" : "Read-only access"}</span>
      </div>
      {error && <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    </Panel>

    {viewSlug === "intelligence-overview" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[[responseCount,"Response templates"],[publishedCount,"Published responses"],[qaCount,"Q&A scenarios"],[targetTotal.toLocaleString(),"Target patterns"]].map(([value,label]) => <Panel key={String(label)}><div className="text-2xl font-semibold tabular-nums">{loading ? "—" : value}</div><div className="text-xs text-muted-foreground">{label}</div></Panel>)}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {managementAreas.map(({ icon: Icon, title: label, description }) => <div key={label} className="rounded-xl border p-4"><div className="mb-2 flex items-center gap-2"><Icon className="size-5 text-primary"/><b>{label}</b></div><p className="text-sm text-muted-foreground">{description}</p></div>)}
      </div>
    </>}

    {(viewSlug === "conversational-responses" || viewSlug === "permission-and-escalation-responses" || viewSlug === "personality-and-tone-rules") && <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel><b className="text-2xl">{filteredTemplates.length}</b><p className="text-xs text-muted-foreground">Matching templates</p></Panel>
        <Panel><b className="text-2xl">{filteredTemplates.filter((item) => item.status === "published").length}</b><p className="text-xs text-muted-foreground">Published and available</p></Panel>
        <Panel><b className="text-2xl">{filteredTemplates.filter((item) => item.status === "draft").length}</b><p className="text-xs text-muted-foreground">Drafts awaiting review</p></Panel>
      </div>
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search phrases, intents and responses"/></div>
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {canManage && <button type="button" onClick={() => openNew()} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Plus className="size-4"/> Add response</button>}
        </div>
        <div className="mt-4 divide-y">
          {filteredTemplates.map((entry) => <article key={entry.id} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b>{entry.title}</b><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{categories.find((c) => c.id === entry.category_id)?.name ?? "Uncategorized"}</span><span className="rounded-full border px-2 py-0.5 text-[10px]">{entry.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{entry.intent_key} · {entry.tone} tone · {entry.response_variants.length} variations · v{entry.version}</p><p className="mt-2 text-sm">{entry.response_variants[0] ?? "No response variants entered yet."}</p><p className="mt-1 text-xs text-muted-foreground">Recognizes: {entry.user_examples.slice(0,5).join(" · ")}</p></div>
              {canManage && <div className="flex shrink-0 gap-1"><button type="button" title="Edit" onClick={() => openEdit(entry)} className="rounded-md border p-2 hover:bg-accent"><Pencil className="size-4"/></button>{entry.status !== "archived" && <button type="button" title="Archive" onClick={() => void archiveTemplate(entry)} className="rounded-md border p-2 hover:bg-accent"><Archive className="size-4"/></button>}</div>}
            </div>
          </article>)}
          {!filteredTemplates.length && <p className="py-8 text-center text-sm text-muted-foreground">No templates match this view. {canManage ? "Add the first response or change the filter." : "Published content will appear here when available to your role."}</p>}
        </div>
      </Panel>
    </>}

    {viewSlug === "response-categories" && <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Library className="size-5 text-primary"/><h3 className="font-semibold">Library categories and target coverage</h3></div>{canManage && <button type="button" onClick={() => { setEditingCategory(null); setCategoryDraft({ category_key: "", name: "", description: "", target_patterns: "0", sort_order: String(categories.length * 10 + 10) }); setCategoryEditor(true); }} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground"><Plus className="size-3"/>Add category</button>}</div>
      <div className="divide-y">{categories.map((category) => <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><b className="text-sm">{category.name}</b><p className="text-xs text-muted-foreground">{category.description}</p></div><div className="flex items-center gap-3"><span className="text-xs tabular-nums">{templates.filter((t) => t.category_id === category.id).length} created / {category.target_patterns.toLocaleString()} target</span><span className={`rounded-full px-2 py-1 text-[10px] ${category.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted"}`}>{category.status}</span>{canManage && <button type="button" onClick={() => { setEditingCategory(category); setCategoryDraft({ category_key: category.category_key, name: category.name, description: category.description, target_patterns: String(category.target_patterns), sort_order: String(category.sort_order) }); setCategoryEditor(true); }} className="rounded-md border p-2" title="Edit category"><Pencil className="size-3.5"/></button>}{canManage && category.status === "active" && <button type="button" onClick={async () => { const result = await supabase?.from("help_buddy_library_categories").update({ status: "archived" }).eq("id", category.id); if (result?.error) toast.error(result.error.message); else { toast.success("Category archived; existing records are retained."); await reload(); } }} className="rounded-md border p-2" title="Archive category"><Archive className="size-3.5"/></button>}</div></div>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">Archiving removes a category from active selection without deleting its response history. Target counts are planning goals, not completed records.</p>
    </Panel>}

    {viewSlug === "memory-management" && <>
      <Panel><div className="mb-2 flex items-center gap-2"><Brain className="size-5 text-primary"/><h3 className="font-semibold">Your saved Help Buddy memories</h3></div><p className="text-sm text-muted-foreground">Personal memories are isolated by profile. Conversation messages remain in conversation history; only selected, useful context belongs here.</p>
        <form onSubmit={saveMemory} className="mt-4 grid gap-2 sm:grid-cols-[180px_1fr_1fr_auto]"><select className="rounded-md border bg-background px-3 py-2 text-sm" value={memoryDraft.memory_type} onChange={(e) => setMemoryDraft({ ...memoryDraft, memory_type: e.target.value })}><option value="preference">Preference</option><option value="fact">Fact</option><option value="decision">Decision</option><option value="commitment">Commitment</option><option value="project_context">Project context</option><option value="workflow_context">Workflow context</option><option value="conversation_summary">Conversation summary</option></select><input className="rounded-md border bg-background px-3 py-2 text-sm" value={memoryDraft.title} onChange={(e) => setMemoryDraft({ ...memoryDraft, title: e.target.value })} placeholder="Memory title" required/><input className="rounded-md border bg-background px-3 py-2 text-sm" value={memoryDraft.content} onChange={(e) => setMemoryDraft({ ...memoryDraft, content: e.target.value })} placeholder="What should Help Buddy remember?" required/><button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"><Plus className="mr-1 inline size-4"/>{editingMemory ? "Update" : "Save"}</button>{editingMemory && <button type="button" onClick={() => { setEditingMemory(null); setMemoryDraft({ title: "", content: "", memory_type: "preference" }); }} className="rounded-md border px-3 py-2 text-sm">Cancel</button>}</form>
      </Panel>
      <Panel><div className="divide-y">{memories.map((memory) => <div key={memory.id} className="flex items-start justify-between gap-3 py-3"><div><b className="text-sm">{memory.title}</b><p className="mt-1 text-sm text-muted-foreground">{memory.content}</p><p className="mt-1 text-[11px] text-muted-foreground">{memory.memory_type} · Importance {memory.importance} · Updated {new Date(memory.updated_at).toLocaleDateString()}</p></div><div className="flex gap-1"><button type="button" onClick={() => { setEditingMemory(memory); setMemoryDraft({ title: memory.title, content: memory.content, memory_type: memory.memory_type }); }} className="rounded-md border p-2" title="Edit memory"><Pencil className="size-4"/></button><button type="button" onClick={() => void forgetMemory(memory)} className="rounded-md border p-2 text-muted-foreground hover:text-destructive" title="Forget this memory"><Trash2 className="size-4"/></button></div></div>)}{!memories.length && <p className="py-6 text-sm text-muted-foreground">No personal memories saved yet.</p>}</div></Panel>
    </>}

    {viewSlug === "semantic-and-vector-search" && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Panel><Database className="mb-2 size-5 text-primary"/><b>pgvector 0.8.2</b><p className="text-xs text-muted-foreground">Enabled in the Supabase extensions schema.</p></Panel>
      {[[vectorCounts.responses,"Response embeddings"],[vectorCounts.memories,"Memory embeddings"],[vectorCounts.qa,"Q&A embeddings"],[vectorCounts.articles,"Knowledge article embeddings"]].map(([count,label]) => <Panel key={String(label)}><b className="text-2xl tabular-nums">{count}</b><p className="text-xs text-muted-foreground">{label}</p></Panel>)}
      <Panel className="sm:col-span-2 xl:col-span-4"><h3 className="font-semibold">Embedding and retrieval status</h3><p className="mt-1 text-sm text-muted-foreground">The 384-dimensional vector columns, HNSW indexes and similarity-search functions are installed. Embedding counts are currently {vectorCounts.responses + vectorCounts.memories + vectorCounts.qa + vectorCounts.articles}; a compatible embedding-generation provider still needs to be configured before content can be vectorized. The chosen model must remain consistent across all indexed content.</p></Panel>
    </div>}

    {viewSlug === "knowledge-scenarios" && <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><BookOpen className="size-5 text-primary"/><h3 className="font-semibold">Knowledge scenario library</h3></div>{canManage && <button type="button" onClick={openQaNew} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground"><Plus className="size-3"/>Add scenario</button>}</div>
      <div className="mb-3 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/50 p-3"><b className="text-2xl">{qaCount}</b><p className="text-xs text-muted-foreground">Q&A entries loaded</p></div><div className="rounded-lg bg-muted/50 p-3"><b className="text-2xl">{qaEntries.filter((q) => q.status === "published").length}</b><p className="text-xs text-muted-foreground">Published scenarios</p></div><div className="rounded-lg bg-muted/50 p-3"><b className="text-2xl">{articleCount}</b><p className="text-xs text-muted-foreground">Published knowledge articles</p></div></div>
      <div className="divide-y">{qaEntries.filter((q) => q.status !== "archived").map((entry) => <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{entry.question}</b><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{entry.status}</span></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.answer_markdown}</p><p className="mt-1 text-[10px] text-muted-foreground">{entry.intent_key} · {knowledgeBases.find((b) => b.id === entry.knowledge_base_id)?.name ?? "Knowledge Base"} · v{entry.version}</p></div>{canManage && <div className="flex gap-1"><button type="button" onClick={() => openQaEdit(entry)} className="rounded-md border p-2" title="Edit scenario"><Pencil className="size-3.5"/></button><button type="button" onClick={() => void archiveQa(entry)} className="rounded-md border p-2" title="Archive scenario"><Archive className="size-3.5"/></button></div>}</div>)}{!qaEntries.length && <p className="py-6 text-sm text-muted-foreground">No Q&A scenarios are visible yet.</p>}</div>
      <p className="mt-3 text-xs text-muted-foreground">Existing article-derived entries are starter records, not the completed curated 1,000-scenario suite. Draft, review and approval before publication are recommended.</p>
    </Panel>}

    {viewSlug === "unanswered-question-review" && <Panel><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Unanswered question review queue</h3><span className="rounded-full bg-muted px-2 py-1 text-xs">{unansweredRows.filter((q) => q.status === "open").length} open</span></div><p className="mb-3 text-sm text-muted-foreground">Review questions Help Buddy could not answer confidently. Convert useful questions into approved Q&A scenarios, or mark them resolved after review.</p><div className="divide-y">{unansweredRows.map((item) => <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{item.question}</b><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{item.status}</span></div><p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(item.created_at).toLocaleString()} · User {item.profile_id.slice(0, 8)}…</p>{item.resolution_notes && <p className="mt-1 text-xs text-muted-foreground">{item.resolution_notes}</p>}</div>{canManage && item.status === "open" && <button type="button" onClick={() => void resolveUnanswered(item)} className="rounded-md border px-3 py-2 text-xs hover:bg-accent">Mark reviewed</button>}</div>)}{!unansweredRows.length && <p className="py-6 text-sm text-muted-foreground">No unanswered questions are waiting for review.</p>}</div></Panel>}
    {viewSlug === "response-analytics" && <Panel><h3 className="font-semibold">Response usage analytics</h3><p className="text-sm text-muted-foreground">Response selection logging is ready in the database. Live analytics will populate once the Help Buddy runtime records selected templates and variants.</p></Panel>}
    {viewSlug === "response-audit-and-history" && <Panel><div className="mb-2 flex items-center gap-2"><ShieldCheck className="size-5 text-primary"/><h3 className="font-semibold">Version and change history</h3></div><p className="mb-3 text-sm text-muted-foreground">Append-only change snapshots for Help Buddy categories, response templates and Q&A scenarios. Access is limited to knowledge administrators.</p><div className="divide-y">{auditRows.map((row) => <div key={String(row.id)} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{String(row.entity_type)} · {String(row.operation)}</b><span className="text-xs text-muted-foreground">{new Date(String(row.created_at)).toLocaleString()}</span></div><p className="mt-1 text-xs text-muted-foreground">Record: {String(row.entity_id)} · Actor: {String(row.actor_profile_id ?? "System")}</p><details className="mt-2 text-xs"><summary className="cursor-pointer">View before / after snapshot</summary><pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2">{JSON.stringify({ before: row.old_record, after: row.new_record }, null, 2)}</pre></details></div>)}{!auditRows.length && <p className="py-6 text-sm text-muted-foreground">No management changes have been recorded yet.</p>}</div></Panel>}

    {qaEditor && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3"><form onSubmit={saveQa} className="max-h-[92vh] w-full max-w-3xl space-y-3 overflow-y-auto rounded-2xl border bg-background p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{editingQa ? "Edit knowledge scenario" : "Add knowledge scenario"}</h3><button type="button" onClick={() => setQaEditor(false)} className="rounded-md border px-3 py-1 text-sm">Close</button></div><label className="grid gap-1 text-xs">Knowledge Base<select required className="rounded-md border bg-background px-3 py-2 text-sm" value={qaDraft.knowledge_base_id} onChange={(e) => setQaDraft({ ...qaDraft, knowledge_base_id: e.target.value })}><option value="">Select a Knowledge Base</option>{knowledgeBases.map((base) => <option key={base.id} value={base.id}>{base.name}</option>)}</select></label><label className="grid gap-1 text-xs">Primary question<input required className="rounded-md border bg-background px-3 py-2 text-sm" value={qaDraft.question} onChange={(e) => setQaDraft({ ...qaDraft, question: e.target.value })}/></label><label className="grid gap-1 text-xs">Alternate phrasings<textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" value={qaDraft.alternate_questions} onChange={(e) => setQaDraft({ ...qaDraft, alternate_questions: e.target.value })} placeholder="One alternate question per line"/></label><label className="grid gap-1 text-xs">Verified answer<textarea required className="min-h-36 rounded-md border bg-background px-3 py-2 text-sm" value={qaDraft.answer_markdown} onChange={(e) => setQaDraft({ ...qaDraft, answer_markdown: e.target.value })}/></label><div className="grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs">Intent key<input required className="rounded-md border bg-background px-3 py-2 text-sm" value={qaDraft.intent_key} onChange={(e) => setQaDraft({ ...qaDraft, intent_key: e.target.value })}/></label><label className="grid gap-1 text-xs">Tags (comma-separated)<input className="rounded-md border bg-background px-3 py-2 text-sm" value={qaDraft.tags} onChange={(e) => setQaDraft({ ...qaDraft, tags: e.target.value })}/></label><label className="grid gap-1 text-xs">Visibility<select className="rounded-md border bg-background px-3 py-2 text-sm" value={qaDraft.visibility} onChange={(e) => setQaDraft({ ...qaDraft, visibility: e.target.value })}>{["public_internal","department","restricted","founder_only","assistant_private"].map((v) => <option key={v}>{v}</option>)}</select></label><label className="grid gap-1 text-xs">Status<select className="rounded-md border bg-background px-3 py-2 text-sm" value={qaDraft.status} onChange={(e) => setQaDraft({ ...qaDraft, status: e.target.value })}>{["draft","review","published","archived"].map((v) => <option key={v}>{v}</option>)}</select></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setQaEditor(false)} className="rounded-md border px-3 py-2 text-sm">Cancel</button><button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Save scenario</button></div></form></div>}
    {categoryEditor && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3"><form onSubmit={async (event) => { event.preventDefault(); if (!supabase || !canManage) return; const payload = { category_key: categoryDraft.category_key.trim(), name: categoryDraft.name.trim(), description: categoryDraft.description.trim(), target_patterns: Math.max(0, Number(categoryDraft.target_patterns) || 0), sort_order: Number(categoryDraft.sort_order) || 0 }; const result = editingCategory ? await supabase.from("help_buddy_library_categories").update(payload).eq("id", editingCategory.id) : await supabase.from("help_buddy_library_categories").insert(payload); if (result.error) toast.error(result.error.message); else { toast.success(editingCategory ? "Category updated." : "Category added."); setCategoryEditor(false); await reload(); } }} className="w-full max-w-lg space-y-3 rounded-xl border bg-background p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-semibold">{editingCategory ? "Edit category" : "Add category"}</h3><button type="button" onClick={() => setCategoryEditor(false)} className="rounded-md border px-3 py-1 text-xs">Close</button></div><label className="grid gap-1 text-xs">Category key<input required disabled={!!editingCategory} className="rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60" value={categoryDraft.category_key} onChange={(e) => setCategoryDraft({ ...categoryDraft, category_key: e.target.value })} placeholder="small_talk"/></label><label className="grid gap-1 text-xs">Display name<input required className="rounded-md border bg-background px-3 py-2 text-sm" value={categoryDraft.name} onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })}/></label><label className="grid gap-1 text-xs">Description<textarea className="min-h-16 rounded-md border bg-background px-3 py-2 text-sm" value={categoryDraft.description} onChange={(e) => setCategoryDraft({ ...categoryDraft, description: e.target.value })}/></label><div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-xs">Target patterns<input type="number" min="0" className="rounded-md border bg-background px-3 py-2 text-sm" value={categoryDraft.target_patterns} onChange={(e) => setCategoryDraft({ ...categoryDraft, target_patterns: e.target.value })}/></label><label className="grid gap-1 text-xs">Sort order<input type="number" className="rounded-md border bg-background px-3 py-2 text-sm" value={categoryDraft.sort_order} onChange={(e) => setCategoryDraft({ ...categoryDraft, sort_order: e.target.value })}/></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setCategoryEditor(false)} className="rounded-md border px-3 py-2 text-sm">Cancel</button><button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Save category</button></div></form></div>}
    {showEditor && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" role="presentation"><form onSubmit={saveTemplate} className="max-h-[92vh] w-full max-w-3xl space-y-3 overflow-y-auto rounded-2xl border bg-background p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Response template editor">
      <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{editing ? "Edit response template" : "Add response template"}</h3><button type="button" onClick={() => setShowEditor(false)} className="rounded-md border px-3 py-1 text-sm">Close</button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs">Title<input required className="rounded-md border bg-background px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label>
        <label className="grid gap-1 text-xs">Intent key<input required className="rounded-md border bg-background px-3 py-2 text-sm" value={form.intent_key} onChange={(e) => setForm({ ...form, intent_key: e.target.value })} placeholder="greeting.hello"/></label>
        <label className="grid gap-1 text-xs">Category<select required className="rounded-md border bg-background px-3 py-2 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">Select category</option>{categories.filter((c) => c.status === "active").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs">Tone<select className="rounded-md border bg-background px-3 py-2 text-sm" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>{["friendly","professional","playful","patient","supportive","reassuring","clear","warm"].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="grid gap-1 text-xs">Audience<select className="rounded-md border bg-background px-3 py-2 text-sm" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>{["all","employee","contractor","manager","tenant_admin","admin"].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="grid gap-1 text-xs">Status<select className="rounded-md border bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["draft","review","published","archived"].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="grid gap-1 text-xs">Repeat policy<select className="rounded-md border bg-background px-3 py-2 text-sm" value={form.repeat_policy} onChange={(e) => setForm({ ...form, repeat_policy: e.target.value })}>{["rotate","contextual","once_per_session","repeat_after_cooldown"].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="grid gap-1 text-xs">Cooldown turns<input type="number" min="0" className="rounded-md border bg-background px-3 py-2 text-sm" value={form.cooldown_turns} onChange={(e) => setForm({ ...form, cooldown_turns: e.target.value })}/></label>
        <label className="grid gap-1 text-xs">Visibility<select className="rounded-md border bg-background px-3 py-2 text-sm" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>{["internal","organization","tenant","private"].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="grid gap-1 text-xs">Escalation level<input className="rounded-md border bg-background px-3 py-2 text-sm" value={form.escalation_level} onChange={(e) => setForm({ ...form, escalation_level: e.target.value })} placeholder="local_admin / tenant_admin / global_admin"/></label>
      </div>
      <label className="grid gap-1 text-xs">Example user phrases <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" value={form.examples} onChange={(e) => setForm({ ...form, examples: e.target.value })} placeholder="One phrase per line"/></label>
      <label className="grid gap-1 text-xs">Response variations <textarea required className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm" value={form.responses} onChange={(e) => setForm({ ...form, responses: e.target.value })} placeholder="One response per line"/></label>
      <label className="grid gap-1 text-xs">Follow-up variations <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" value={form.followups} onChange={(e) => setForm({ ...form, followups: e.target.value })} placeholder="One follow-up per line"/></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requires_permission_check} onChange={(e) => setForm({ ...form, requires_permission_check: e.target.checked })}/> Require permission check before using this response</label>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowEditor(false)} className="rounded-md border px-3 py-2 text-sm">Cancel</button><button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save template</button></div>
    </form></div>}
  </div>;
}
