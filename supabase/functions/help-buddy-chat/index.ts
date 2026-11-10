import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\\s]/g, " ").replace(/\\s+/g, " ").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign-in is required." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json({ error: "Conversation service configuration is incomplete." }, 503);
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Your session is invalid or has expired." }, 401);
  const profileId = authData.user.id;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "A valid JSON request is required." }, 400); }

  if (body.action === "feedback") {
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const rating = Number(body.rating);
    const feedbackType = typeof body.feedbackType === "string" ? body.feedbackType : "answer_quality";
    const comment = typeof body.comment === "string" ? body.comment.slice(0, 2000) : null;
    if (!messageId || ![-1, 1].includes(rating)) return json({ error: "A message and valid rating are required." }, 400);
    const { data: message } = await supabase.from("assistant_messages")
      .select("id,session_id").eq("id", messageId).eq("sender_type", "assistant").maybeSingle();
    if (!message) return json({ error: "That answer is not available to this account." }, 404);
    const { error } = await supabase.from("help_buddy_feedback").upsert({
      session_id: message.session_id, message_id: message.id, profile_id: profileId,
      rating, feedback_type: feedbackType, comment,
    }, { onConflict: "profile_id,message_id" });
    if (error) return json({ error: "Feedback could not be saved.", detail: error.message }, 400);
    return json({ ok: true });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 5000) return json({ error: "Enter a question between 1 and 5,000 characters." }, 400);
  const [{ data: profile }, { data: assistant }] = await Promise.all([
    supabase.from("profiles").select("organization_id,tenant_id,member_status").eq("id", profileId).maybeSingle(),
    supabase.from("assistants").select("id,status").eq("assistant_key", "helpbuddy").maybeSingle(),
  ]);
  if (!profile || profile.member_status !== "active") return json({ error: "Your active user profile could not be verified." }, 403);
  if (!assistant || assistant.status !== "active") return json({ error: "Help Buddy's knowledge service is not activated yet." }, 503);

  let sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  if (sessionId) {
    const { data: session } = await supabase.from("assistant_sessions").select("id")
      .eq("id", sessionId).eq("profile_id", profileId).maybeSingle();
    if (!session) return json({ error: "That conversation is not available to this account." }, 404);
  } else {
    const { data: session, error } = await supabase.from("assistant_sessions").insert({
      assistant_id: assistant.id, profile_id: profileId,
      organization_id: profile.organization_id, tenant_id: profile.tenant_id,
      session_status: "active", channel: "workspace", title: question.slice(0, 100),
      context_metadata: { origin: "help-buddy-edge-runtime" },
    }).select("id").single();
    if (error || !session) return json({ error: "A conversation could not be started.", detail: error?.message }, 400);
    sessionId = session.id;
  }

  const { data: userMessage, error: userMessageError } = await supabase.from("assistant_messages").insert({
    session_id: sessionId, sender_type: "user", content: question,
    sensitivity: "internal", citations: [], message_kind: "chat",
  }).select("id,created_at").single();
  if (userMessageError || !userMessage) return json({ error: "Your question could not be saved.", detail: userMessageError?.message }, 400);

  let answerText = "";
  let citations: Record<string, unknown>[] = [];
  let confidence = 0;
  let intentKey = "knowledge_lookup";
  let unresolved = false;

  if (/(where.*(knowledge|knowledge base|knowledge space)|find.*(knowledge|knowledge base|knowledge space)|knowledge spaces?)/i.test(question)) {
    answerText = "You can find Knowledge Spaces in the hamburger menu under Knowledge Spaces. Open All Knowledge Spaces to browse the collections your account is authorized to access, or use Knowledge Search to find a published article.";
    citations = [{ type: "navigation", title: "Knowledge Spaces", path: "/m/knowledge-spaces/knowledge-spaces-workspace/all-knowledge-spaces" }];
    confidence = 1;
    intentKey = "navigation.knowledge_spaces";
  } else {
    const { data: matches, error: searchError } = await supabase.rpc("help_buddy_search_qa", {
      search_query: question, max_results: 5,
    });
    if (searchError) return json({ error: "The authorized knowledge search could not be completed.", detail: searchError.message }, 503);
    const best = Array.isArray(matches) ? matches[0] : null;
    if (best && Number(best.rank_score) >= Number(best.confidence_threshold)) {
      answerText = best.answer_markdown;
      confidence = Number(best.rank_score);
      intentKey = best.intent_key || "knowledge_lookup";
      citations = [{ type: "knowledge_article", id: best.source_article_id, title: best.question, knowledge_base_id: best.knowledge_base_id }];
    } else {
      unresolved = true;
      answerText = "I couldn't find a verified answer in the Knowledge Spaces available to your account. I won't guess. I've recorded this as an unanswered question so it can be reviewed and added to the approved conversational library.";
      citations = [{ type: "unanswered_question", question, created_at: new Date().toISOString() }];
    }
  }

  const { data: assistantMessage, error: assistantMessageError } = await supabase.from("assistant_messages").insert({
    session_id: sessionId, sender_type: "assistant", content: answerText,
    sensitivity: "internal", citations, message_kind: unresolved ? "suggestion" : "chat",
    intent_key: intentKey, confidence_score: confidence,
    retrieval_metadata: { engine: "knowledge-grounded-search", unresolved, matched_sources: citations.length },
    in_reply_to: userMessage.id,
  }).select("id,created_at").single();
  if (assistantMessageError || !assistantMessage) return json({ error: "The answer was created but could not be saved to conversation history.", detail: assistantMessageError?.message }, 500);

  if (unresolved) {
    const { error } = await supabase.from("help_buddy_unanswered_questions").insert({
      session_id: sessionId, message_id: userMessage.id, profile_id: profileId,
      organization_id: profile.organization_id, tenant_id: profile.tenant_id,
      question, normalized_question: normalizeQuestion(question),
    });
    if (error) return json({ error: "The unanswered question could not be queued.", detail: error.message }, 500);
  }

  return json({
    ok: true, sessionId,
    userMessage: { id: userMessage.id, sender_type: "user", content: question, citations: [], created_at: userMessage.created_at },
    assistantMessage: { id: assistantMessage.id, sender_type: "assistant", content: answerText, citations,
      created_at: assistantMessage.created_at, confidence_score: confidence, intent_key: intentKey, unresolved },
    service: "knowledge-grounded",
    generativeModel: "not-configured",
  });
});
