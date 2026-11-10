import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen, Bot, Clock3, Database, FileText,
  Library, MessageCircle, RefreshCw, Search, Send, ShieldCheck, Ticket,
  Users, Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseClient } from "@/lib/supabase";
import { ALL_DESTINATIONS } from "@/lib/nav";

type KnowledgeBase = {
  id: string;
  kb_key: string;
  name: string;
  description: string | null;
  visibility: string;
};
type KnowledgeArticle = {
  id: string;
  knowledge_base_id: string;
  title: string;
  summary: string | null;
  body_md: string;
  updated_at: string;
};
type Message = {
  id: string;
  sender_type: "user" | "assistant" | string;
  content: string;
  citations: Array<Record<string, unknown>>;
  created_at: string;
};

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border bg-card p-4 shadow-card sm:p-5 ${className}`}>{children}</section>;
}

export function KnowledgeSpacesWorkspace({ title, pageSlug }: { title: string; pageSlug: string }) {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [query, setQuery] = useState("");
  const [baseFilter, setBaseFilter] = useState("all");
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("The secure data connection is not configured.");
      setLoading(false);
      return () => { live = false; };
    }
    Promise.all([
      supabase.from("knowledge_bases").select("id,kb_key,name,description,visibility").eq("status", "active").order("name"),
      supabase.from("knowledge_articles").select("id,knowledge_base_id,title,summary,body_md,updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(300),
    ]).then(([baseResult, articleResult]) => {
      if (!live) return;
      if (baseResult.error) setError(baseResult.error.message);
      else setBases((baseResult.data ?? []) as KnowledgeBase[]);
      if (articleResult.error) setError(articleResult.error.message);
      else setArticles((articleResult.data ?? []) as KnowledgeArticle[]);
      setLoading(false);
    }).catch((reason) => {
      if (live) {
        setError(reason instanceof Error ? reason.message : "Knowledge sources could not be loaded.");
        setLoading(false);
      }
    });
    return () => { live = false; };
  }, []);

  const visibleBases = useMemo(() => {
    const category = pageSlug.includes("getting-started") || pageSlug.includes("platform")
      ? ["getting_started"]
      : pageSlug.includes("faqs") || pageSlug.includes("troubleshooting") || pageSlug.includes("support") || pageSlug.includes("account-and-access") || pageSlug.includes("intellidesk") || pageSlug.includes("help-desk-procedures")
        ? ["help_desk"]
        : pageSlug.includes("executive") || pageSlug.includes("global-administration") || pageSlug.includes("ceo") || pageSlug.includes("cfo")
          ? ["business_stakeholders"]
          : pageSlug.includes("development-history") || pageSlug.includes("project-intelligence") || pageSlug.includes("architecture") || pageSlug.includes("api-and-integration") || pageSlug.includes("active-directory-procedures") || pageSlug.includes("device-and-asset-procedures") || pageSlug.includes("marketplace-and-licensing") || pageSlug.includes("noc-and-soc") || pageSlug.includes("security-and-incident")
            ? ["idea_ledger", "platform_reference"]
            : pageSlug.includes("help-buddy-knowledge")
              ? ["helpbuddy_ai"]
              : pageSlug.includes("maximus-knowledge")
                ? ["maximus_ai"]
                : pageSlug.includes("optimus-knowledge")
                  ? ["optimus_ai"]
                  : pageSlug.includes("trinity-knowledge")
                    ? ["trinity_ai"]
                    : [];
    return bases.filter((base) => (baseFilter === "all" || base.id === baseFilter) &&
      (!category.length || category.includes(base.kb_key)));
  }, [bases, baseFilter, pageSlug]);

  const visibleArticles = useMemo(() => {
    const allowed = new Set(visibleBases.map((base) => base.id));
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => allowed.has(article.knowledge_base_id) &&
      (!needle || `${article.title} ${article.summary ?? ""} ${article.body_md}`.toLowerCase().includes(needle)));
  }, [articles, visibleBases, query]);

  const baseName = (id: string) => bases.find((base) => base.id === id)?.name ?? "Knowledge Space";

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Library className="size-5" /></span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Institutional knowledge</div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">Search authorized knowledge collections and open source articles.</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1">{bases.length} accessible spaces</span>
            <span className="rounded-full border px-2.5 py-1">{articles.length} accessible articles</span>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles, procedures, answers and guides…" />
          </div>
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={baseFilter} onChange={(event) => setBaseFilter(event.target.value)}>
            <option value="all">All accessible spaces</option>
            {bases.map((base) => <option key={base.id} value={base.id}>{base.name}</option>)}
          </select>
        </div>
      </Panel>

      {error && <Panel className="border-destructive/30 text-sm text-destructive">Knowledge data could not be fully loaded: {error}</Panel>}
      {loading ? <Panel><p className="text-sm text-muted-foreground">Loading authorized Knowledge Spaces…</p></Panel> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleBases.map((base) => (
                <button key={base.id} type="button" onClick={() => { setBaseFilter(base.id); setSelected(null); }}
                  className={`rounded-xl border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 ${baseFilter === base.id ? "border-primary bg-primary/5" : "bg-card"}`}>
                  <div className="mb-2 flex items-center justify-between"><BookOpen className="size-5 text-primary" /><span className="text-[10px] uppercase tracking-wide text-muted-foreground">{base.visibility.replaceAll("_", " ")}</span></div>
                  <h3 className="font-semibold">{base.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{base.description ?? "Authorized knowledge collection."}</p>
                  <p className="mt-3 text-xs font-medium text-primary">{articles.filter((article) => article.knowledge_base_id === base.id).length} articles · Browse space</p>
                </button>
              ))}
            </div>
            <Panel>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Knowledge articles</h3>
                <span className="text-xs text-muted-foreground">{visibleArticles.length} results</span>
              </div>
              <div className="divide-y">
                {visibleArticles.slice(0, 80).map((article) => (
                  <button key={article.id} type="button" onClick={() => setSelected(article)} className="flex w-full items-start gap-3 py-3 text-left hover:bg-muted/40">
                    <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{article.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{article.summary ?? article.body_md.slice(0, 160)}</span>
                      <span className="mt-1 block text-[11px] text-primary">{baseName(article.knowledge_base_id)}</span>
                    </span>
                  </button>
                ))}
                {!visibleArticles.length && <p className="py-6 text-center text-sm text-muted-foreground">No matching articles are available in the spaces your account can access.</p>}
              </div>
            </Panel>
          </div>
          <aside className="space-y-3">
            {selected ? (
              <Panel>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div><div className="text-xs font-semibold uppercase tracking-wider text-primary">Article detail</div><h3 className="font-semibold">{selected.title}</h3></div>
                  <button type="button" onClick={() => setSelected(null)} className="text-xs text-muted-foreground">Close</button>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">{baseName(selected.knowledge_base_id)} · Updated {new Date(selected.updated_at).toLocaleDateString()}</p>
                {selected.summary && <p className="mb-3 text-sm font-medium">{selected.summary}</p>}
                <div className="whitespace-pre-wrap break-words text-sm leading-6">{selected.body_md}</div>
              </Panel>
            ) : (
              <Panel>
                <div className="mb-2 flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h3 className="font-semibold">Permission-aware knowledge</h3></div>
                <p className="text-sm text-muted-foreground">Only published articles and Knowledge Spaces authorized by your organization, tenant, role and personal permissions are returned.</p>
                <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">Restricted and assistant-private material is not exposed through this user-facing browser view.</div>
              </Panel>
            )}
            <Panel>
              <h3 className="mb-2 font-semibold">Ask Help Buddy</h3>
              <p className="mb-3 text-sm text-muted-foreground">Ask a question in natural language. Help Buddy can search the knowledge available to your account and point to the source.</p>
              <Link to="/m/$section/$group/$page" params={{ section: "help-buddy", group: "help-buddy-workspace", page: "conversation-workspace" }} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><MessageCircle className="size-4" /> Open conversation</Link>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}

async function findGroundedAnswer(question: string, userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { text: "I can't reach the secure information service right now. Please try again later.", citations: [], unresolved: true };
  const lower = question.toLowerCase();

  if (/(knowledge base|knowledge space|where.*knowledge|find.*knowledge)/i.test(question)) {
    const spaces = ALL_DESTINATIONS.filter((destination) => destination.section.slug === "knowledge-spaces");
    const first = spaces.find((destination) => destination.page.slug === "all-knowledge-spaces") ?? spaces[0];
    return {
      text: `You can find Knowledge Spaces in the hamburger menu under Knowledge Spaces. Open “All Knowledge Spaces” to browse authorized collections, or use the search field to find an article. ${first ? "I can take you directly to that workspace." : ""}`,
      citations: first ? [{ type: "navigation", title: "All Knowledge Spaces", path: `/m/${first.section.slug}/${first.group.slug}/${first.page.slug}` }] : [],
      unresolved: false,
    };
  }

  if (/(ticket|case|request)/i.test(lower)) {
    const { data, error } = await supabase.from("tickets").select("id,ticket_number,title,status,priority,opened_at,updated_at,requester_profile_id,assigned_profile_id").order("updated_at", { ascending: false }).limit(200);
    if (!error && data) {
      const mine = /(my ticket|my request|assigned to me)/i.test(lower);
      const candidates = data.filter((row) => (!mine || row.requester_profile_id === userId || row.assigned_profile_id === userId) &&
        (lower.includes(String(row.ticket_number)) || lower.includes(String(row.title).toLowerCase()) || mine));
      if (candidates.length) {
        const ticket = candidates[0]!;
        return { text: `I found ticket #${ticket.ticket_number}: “${ticket.title}”. Current status: ${ticket.status}; priority: ${ticket.priority}. Last updated ${new Date(ticket.updated_at).toLocaleString()}.`, citations: [{ type: "ticket", id: ticket.id, title: `Ticket #${ticket.ticket_number}` }], unresolved: false };
      }
    }
  }

  if (/(user|employee|person|where is|who is)/i.test(lower)) {
    const name = question.replace(/^(where is|where can i find|find|look up|who is|show me)\s+/i, "").replace(/\b(user|employee|person|profile|account)\b/ig, "").trim();
    if (name.length > 2) {
      const { data, error } = await supabase.from("profiles").select("id,display_name,job_title,department_id,organization_id,tenant_id").limit(200);
      if (!error && data) {
        const match = data.find((row) => String(row.display_name ?? "").toLowerCase().includes(name.toLowerCase()));
        if (match) return { text: `I found ${match.display_name}${match.job_title ? `, listed as ${match.job_title}` : ""}. Your current access allows me to show this directory information. Open the authorized user profile for more details.`, citations: [{ type: "directory_profile", id: match.id, title: String(match.display_name) }], unresolved: false };
      }
    }
  }

  const { data: articles, error: articleError } = await supabase.from("knowledge_articles").select("id,knowledge_base_id,title,summary,body_md,updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(300);
  if (!articleError && articles?.length) {
    const terms = lower.split(/[^a-z0-9]+/).filter((word) => word.length > 2);
    const scored = articles.map((article) => {
      const haystack = `${article.title} ${article.summary ?? ""} ${article.body_md}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? (String(article.title).toLowerCase().includes(term) ? 4 : 1) : 0), 0);
      return { article, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    if (scored.length) {
      const { article } = scored[0]!;
      const { data: base } = await supabase.from("knowledge_bases").select("name").eq("id", article.knowledge_base_id).maybeSingle();
      const excerpt = String(article.summary ?? article.body_md).replace(/[#*_\n]+/g, " ").slice(0, 560);
      return { text: `I found a relevant knowledge article: “${article.title}”. ${excerpt}`, citations: [{ type: "knowledge_article", id: article.id, title: article.title, knowledge_base: base?.name ?? "Authorized Knowledge Space" }], unresolved: false };
    }
  }

  return {
    text: "I couldn't find a verified answer in the Knowledge Spaces or records available to your account. I won't guess. I've marked this as an unanswered question for Help Buddy's knowledge review.",
    citations: [{ type: "unanswered_question", question, created_at: new Date().toISOString() }],
    unresolved: true,
  };
}

export function HelpBuddyConversation({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [sessionContext, setSessionContext] = useState<{ organization_id: string; tenant_id: string | null } | null>(null);
  const [status, setStatus] = useState("Connecting to authorized knowledge sources…");
  const [unansweredCount, setUnansweredCount] = useState(0);

  useEffect(() => {
    let live = true;
    const init = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) { setStatus("Secure data connection is unavailable."); return; }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setStatus("Sign in to start a private Help Buddy conversation."); return; }
      setProfileId(auth.user.id);
      const [{ data: assistant }, { data: profile }] = await Promise.all([
        supabase.from("assistants").select("id,status").eq("assistant_key", "helpbuddy").maybeSingle(),
        supabase.from("profiles").select("organization_id,tenant_id").eq("id", auth.user.id).maybeSingle(),
      ]);
      if (!live) return;
      if (!assistant) { setStatus("Help Buddy's assistant record is not configured."); return; }
      setAssistantId(assistant.id);
      if (profile?.organization_id) setSessionContext({ organization_id: profile.organization_id, tenant_id: profile.tenant_id });
      const { data: existing } = await supabase.from("assistant_sessions").select("id").eq("assistant_id", assistant.id).eq("profile_id", auth.user.id).order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (existing?.id) {
        setSessionId(existing.id);
        const { data: history } = await supabase.from("assistant_messages").select("id,sender_type,content,citations,created_at").eq("session_id", existing.id).order("created_at", { ascending: true }).limit(100);
        if (live && history) {
          const parsed = history as Message[];
          setMessages(parsed);
          setUnansweredCount(parsed.filter((message) => message.citations?.some((citation) => citation.type === "unanswered_question")).length);
        }
      }
      setStatus(assistant.status === "active"
        ? "Connected · role-aware knowledge retrieval"
        : "Knowledge retrieval connected · conversational AI service is awaiting activation");
    };
    void init();
    return () => { live = false; };
  }, []);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || sending) return;
    setDraft("");
    setSending(true);
    const tempUser: Message = { id: crypto.randomUUID(), sender_type: "user", content: question, citations: [], created_at: new Date().toISOString() };
    setMessages((current) => [...current, tempUser]);
    try {
      const supabase = getSupabaseClient();
      if (!supabase || !profileId || !assistantId) throw new Error("Help Buddy's conversation store is not ready.");
      let activeSessionId = sessionId;
      if (!activeSessionId && sessionContext) {
        const { data: created, error: createError } = await supabase.from("assistant_sessions").insert({
          assistant_id: assistantId, profile_id: profileId, organization_id: sessionContext.organization_id,
          tenant_id: sessionContext.tenant_id, session_status: "active", context_metadata: { origin: "help-buddy-workspace" },
        }).select("id").single();
        if (createError) throw createError;
        activeSessionId = created.id;
        setSessionId(created.id);
      }
      if (activeSessionId) {
        await supabase.from("assistant_messages").insert({ session_id: activeSessionId, sender_type: "user", content: question, sensitivity: "internal", citations: [] });
      }
      const answer = await findGroundedAnswer(question, profileId);
      const assistantMessage: Message = { id: crypto.randomUUID(), sender_type: "assistant", content: answer.text, citations: answer.citations, created_at: new Date().toISOString() };
      setMessages((current) => [...current, assistantMessage]);
      if (answer.unresolved) setUnansweredCount((count) => count + 1);
      if (activeSessionId) {
        const { error: saveError } = await supabase.from("assistant_messages").insert({
          session_id: activeSessionId, sender_type: "assistant", content: answer.text, sensitivity: "internal", citations: answer.citations,
        });
        if (saveError) setStatus("Answer generated; conversation history could not be saved under current permissions.");
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The request could not be completed.";
      setMessages((current) => [...current, { id: crypto.randomUUID(), sender_type: "assistant", content: message, citations: [], created_at: new Date().toISOString() }]);
      setStatus("Conversation storage is unavailable; the current exchange remains on screen.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex min-h-[420px] flex-col ${compact ? "max-h-[560px]" : "min-h-[560px]"}`}>
      <div className="flex items-center gap-3 border-b pb-3">
        <span className="grid size-10 place-items-center rounded-full border border-sky-300/40 bg-sky-100 text-sky-700"><Bot className="size-5" /></span>
        <div className="min-w-0 flex-1"><h3 className="font-semibold">Help Buddy Conversation</h3><p className="text-xs text-muted-foreground">{status}</p></div>
        <span className="rounded-full border px-2 py-1 text-[10px]">{unansweredCount} unanswered</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {!messages.length && (
          <div className="rounded-xl bg-primary/5 p-4">
            <p className="font-medium">Hello! I'm Help Buddy.</p>
            <p className="mt-1 text-sm text-muted-foreground">Ask where to find something, how to complete a task, or ask about a ticket or user record you are authorized to access. I'll show the source when I find a verified answer.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Where do I find the Knowledge Base?", "How do I search for a user?", "What is the status of my tickets?"].map((sample) => <button key={sample} type="button" onClick={() => setDraft(sample)} className="rounded-full border bg-background px-3 py-1.5 text-xs hover:border-primary">{sample}</button>)}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`max-w-[92%] rounded-xl p-3 text-sm ${message.sender_type === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto border bg-card"}`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.citations?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.citations.map((citation, index) => <span key={index} className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] opacity-80">{String(citation.title ?? citation.knowledge_base ?? citation.type ?? "Source")}</span>)}
              </div>
            )}
            <time className="mt-2 block text-[10px] opacity-60">{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
          </div>
        ))}
        {sending && <div className="rounded-xl border bg-muted/50 p-3 text-xs text-muted-foreground">Help Buddy is checking authorized sources…</div>}
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t pt-3">
        <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} placeholder="Ask Help Buddy a question…" aria-label="Message Help Buddy" className="min-h-11 resize-none" />
        <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send message"><Send className="size-4" /></Button>
      </form>
      <p className="pt-2 text-[10px] text-muted-foreground">Answers are grounded in records your account can access. This build does not invent missing information or bypass role and tenant permissions.</p>
    </div>
  );
}

export function HelpBuddyWorkspace({ title, pageSlug }: { title: string; pageSlug: string }) {
  const [vocabulary, setVocabulary] = useState<Array<Record<string, unknown>>>([]);
  const [knowledgeBaseCount, setKnowledgeBaseCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState("Not checked");
  const [syncDetail, setSyncDetail] = useState("");
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    const supabase = getSupabaseClient();
    if (!supabase) return () => { live = false; };
    if (pageSlug === "conversational-library") {
      Promise.all([
        supabase.from("assistant_vocabulary_entries").select("category,intent_key,phrase,canonical_meaning,suggested_response_style,tags").eq("assistant_key", "helpbuddy").eq("status", "active").order("category"),
        supabase.from("knowledge_bases").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("knowledge_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
      ]).then(([vocabularyResult, baseResult, articleResult]) => {
        if (!live) return;
        setVocabulary((vocabularyResult.data ?? []) as Array<Record<string, unknown>>);
        setKnowledgeBaseCount(baseResult.count ?? 0);
        setArticleCount(articleResult.count ?? 0);
      });
    }
    if (pageSlug === "conversation-history" || pageSlug === "unanswered-questions") {
      setLoading(true);
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user || !live) return;
        const { data: assistant } = await supabase.from("assistants").select("id").eq("assistant_key", "helpbuddy").maybeSingle();
        if (!assistant) { if (live) setLoading(false); return; }
        const { data: sessions } = await supabase.from("assistant_sessions").select("id,started_at,session_status").eq("assistant_id", assistant.id).eq("profile_id", data.user.id).order("started_at", { ascending: false }).limit(30);
        const sessionIds = (sessions ?? []).map((session) => session.id);
        if (!sessionIds.length) { if (live) setLoading(false); return; }
        const { data: rows } = await supabase.from("assistant_messages").select("id,session_id,sender_type,content,citations,created_at").in("session_id", sessionIds).order("created_at", { ascending: false }).limit(100);
        if (live) {
          const messages = (rows ?? []) as Array<Record<string, unknown>>;
          setHistory(pageSlug === "unanswered-questions" ? messages.filter((row) => Array.isArray(row.citations) && (row.citations as Array<Record<string, unknown>>).some((citation) => citation.type === "unanswered_question")) : messages);
          setLoading(false);
        }
      });
    }
    return () => { live = false; };
  }, [pageSlug]);

  const checkSync = async () => {
    setSyncStatus("Checking…");
    const supabase = getSupabaseClient();
    if (!supabase) { setSyncStatus("Unavailable"); return; }
    const { data, error } = await supabase.functions.invoke("intellisync-api", { body: { action: "health" } });
    if (error) {
      setSyncStatus("Permission or connection check failed");
      setSyncDetail(error.message);
      return;
    }
    setSyncStatus("Connected");
    setSyncDetail(JSON.stringify(data, null, 2));
  };

  if (pageSlug === "conversation-workspace" || pageSlug === "help-buddy-overview") {
    return <Panel><div className="mb-4 flex items-center gap-2"><Bot className="size-5 text-primary" /><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-xs text-muted-foreground">One Help Buddy experience: character, conversation, workflow guidance and user assistance.</p></div></div><HelpBuddyConversation /></Panel>;
  }

  if (pageSlug === "conversational-library") {
    return <div className="space-y-4"><Panel><div className="flex items-center gap-3"><Library className="size-6 text-primary" /><div><h2 className="text-lg font-semibold">Help Buddy Conversational Library</h2><p className="text-sm text-muted-foreground">Intent vocabulary, response patterns and approved conversational guidance.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/50 p-3"><b className="text-2xl">{vocabulary.length}</b><p className="text-xs text-muted-foreground">Active vocabulary entries</p></div><div className="rounded-lg bg-muted/50 p-3"><b className="text-2xl">{knowledgeBaseCount}</b><p className="text-xs text-muted-foreground">Accessible Knowledge Spaces</p></div><div className="rounded-lg bg-muted/50 p-3"><b className="text-2xl">{articleCount}</b><p className="text-xs text-muted-foreground">Accessible published articles</p></div></div></Panel><Panel><h3 className="mb-3 font-semibold">Conversational intents</h3><div className="divide-y">{vocabulary.map((entry,index) => <div key={index} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{String(entry.phrase)}</b><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">{String(entry.category)}</span></div><p className="mt-1 text-xs text-muted-foreground">{String(entry.canonical_meaning)}</p></div>)}{!vocabulary.length && <p className="text-sm text-muted-foreground">No active Help Buddy vocabulary entries are available to this account.</p>}</div></Panel><Panel className="text-xs text-muted-foreground">The HelpBuddy Private Knowledge Base is protected as assistant-private content. Its contents must be retrieved by the authorized assistant runtime, not exposed directly to a user's browser session.</Panel></div>;
  }

  if (pageSlug === "conversation-history" || pageSlug === "unanswered-questions") {
    return <Panel><div className="mb-3 flex items-center gap-2"><Clock3 className="size-5 text-primary" /><h2 className="font-semibold">{title}</h2></div>{loading ? <p className="text-sm text-muted-foreground">Loading your conversation records…</p> : <div className="divide-y">{history.map((row) => <div key={String(row.id)} className="py-3"><p className="whitespace-pre-wrap text-sm">{String(row.content)}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Date(String(row.created_at)).toLocaleString()} · {String(row.sender_type)}</p></div>)}{!history.length && <p className="py-5 text-sm text-muted-foreground">No records are available in this view yet.</p>}</div>}</Panel>;
  }

  if (pageSlug === "connected-knowledge-sources") {
    return <div className="space-y-4"><Panel><div className="mb-3 flex items-center gap-2"><Database className="size-5 text-primary" /><h2 className="font-semibold">Help Buddy connected sources</h2></div><div className="grid gap-2 sm:grid-cols-2">{[{name:"Knowledge Spaces",detail:"Published articles and authorized collections",icon:BookOpen},{name:"IntelliDesk",detail:"Ticket status and requester/assignee context",icon:Ticket},{name:"User Directory",detail:"Role- and tenant-scoped user records",icon:Users},{name:"IntelliSync",detail:"Authorized system events and synchronization health",icon:RefreshCw}].map((source) => <div key={source.name} className="flex items-center gap-3 rounded-lg border p-3"><source.icon className="size-5 text-primary" /><div><b className="text-sm">{source.name}</b><p className="text-xs text-muted-foreground">{source.detail}</p></div></div>)}</div><Button className="mt-4" variant="outline" onClick={() => void checkSync()}><RefreshCw className="mr-2 size-4" /> Check IntelliSync connection</Button><p className="mt-2 text-xs text-muted-foreground">{syncStatus}</p>{syncDetail && <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-[11px]">{syncDetail}</pre>}</Panel><Panel className="text-sm text-muted-foreground">Source reads remain subject to Supabase row-level security and the user's company, tenant, department and role permissions. IntelliSync health and event visibility are permission-controlled.</Panel></div>;
  }

  if (pageSlug === "response-and-event-rules") {
    const rules = [
      ["Ticket assigned", "Notify the assigned user, summarize the request and offer to open the ticket."],
      ["Workflow checkpoint completed", "Confirm only after the source record verifies completion; then offer the next step."],
      ["Approval required", "Notify the authorized approver and provide a secure review action."],
      ["Task overdue", "Give the owner a contextual reminder and show escalation options."],
      ["Security event", "Use an alert state, provide authorized details and route to the approved response process."],
      ["Work completed", "Celebrate verified completion and link to the ticket and audit record."],
    ];
    return <Panel><div className="mb-3 flex items-center gap-2"><Workflow className="size-5 text-primary" /><h2 className="font-semibold">Automatic conversation response rules</h2></div><div className="space-y-2">{rules.map(([event,response]) => <div key={event} className="rounded-lg border p-3"><b className="text-sm">{event}</b><p className="mt-1 text-sm text-muted-foreground">{response}</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">These response rules are defined here. Live event-trigger execution requires the Help Buddy assistant runtime to be activated and subscribed to approved IntelliSync events.</p></Panel>;
  }

  return <div className="space-y-4"><Panel><div className="flex items-center gap-3"><Bot className="size-6 text-primary" /><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">Help Buddy is the single user-facing conversational and workflow-guidance assistant.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Link to="/m/$section/$group/$page" params={{section:"help-buddy",group:"help-buddy-workspace",page:"conversation-workspace"}} className="rounded-lg border p-3 hover:border-primary"><MessageCircle className="mb-2 size-5 text-primary" /><b className="block text-sm">Start a conversation</b><span className="text-xs text-muted-foreground">Ask questions and find authorized information.</span></Link><Link to="/m/$section/$group/$page" params={{section:"help-buddy",group:"help-buddy-workspace",page:"conversational-library"}} className="rounded-lg border p-3 hover:border-primary"><Library className="mb-2 size-5 text-primary" /><b className="block text-sm">Conversational library</b><span className="text-xs text-muted-foreground">Review intent vocabulary and response guidance.</span></Link></div></Panel></div>;
}
