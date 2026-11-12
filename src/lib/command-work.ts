import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

export type CommandWorkStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "waiting_approval"
  | "completed"
  | "cancelled";
export type CommandWorkPriority = "critical" | "high" | "medium" | "low";

export interface CommandWorkItem {
  id: string;
  organization_id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  status: CommandWorkStatus;
  priority: CommandWorkPriority;
  created_by_profile_id: string;
  assignee_profile_id: string | null;
  due_at: string | null;
  source_type: "manual" | "chat_buddy" | "ticket" | "workflow" | "calendar" | "integration";
  source_id: string | null;
  assistant_session_id: string | null;
  workflow_run_id: string | null;
  requires_approval: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChatBuddyMessage {
  id: string;
  sender_type: string;
  content: string;
  created_at: string;
  message_kind: string;
}

interface ProfileContext {
  id: string;
  organization_id: string;
  tenant_id: string | null;
}

async function currentProfile(client: SupabaseClient): Promise<ProfileContext> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in is required to access workspace data.");
  const { data, error } = await client
    .from("profiles")
    .select("id,organization_id,tenant_id,member_status")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.member_status !== "active" || !data.organization_id) {
    throw new Error("Your active organization membership is not available.");
  }
  return {
    id: data.id as string,
    organization_id: data.organization_id as string,
    tenant_id: (data.tenant_id as string | null) ?? null,
  };
}

export async function getChatBuddySessionId(): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const profile = await currentProfile(client);
  const { data: assistant, error: assistantError } = await client
    .from("assistants")
    .select("id")
    .eq("assistant_key", "helpbuddy")
    .eq("status", "active")
    .single();
  if (assistantError) throw assistantError;

  const { data: existing, error: sessionError } = await client
    .from("assistant_sessions")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("assistant_id", assistant.id)
    .eq("session_status", "active")
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await client
    .from("assistant_sessions")
    .insert({
      assistant_id: assistant.id,
      profile_id: profile.id,
      organization_id: profile.organization_id,
      tenant_id: profile.tenant_id,
      session_status: "active",
      channel: "workspace",
      title: "Chat Buddy",
      context_metadata: { source: "command_center" },
    })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id as string;
}

export async function loadChatBuddyMessages(): Promise<ChatBuddyMessage[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const sessionId = await getChatBuddySessionId();
  const { data, error } = await client
    .from("assistant_messages")
    .select("id,sender_type,content,created_at,message_kind")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ChatBuddyMessage[];
}

export async function saveChatBuddyMessage(content: string): Promise<ChatBuddyMessage> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 10000) throw new Error("Message must be between 1 and 10,000 characters.");
  const sessionId = await getChatBuddySessionId();
  const { data, error } = await client
    .from("assistant_messages")
    .insert({
      session_id: sessionId,
      sender_type: "user",
      content: trimmed,
      message_kind: "chat",
      sensitivity: "standard",
    })
    .select("id,sender_type,content,created_at,message_kind")
    .single();
  if (error) throw error;
  const { error: updateError } = await client
    .from("assistant_sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (updateError) throw updateError;
  return data as ChatBuddyMessage;
}

export async function listCommandWorkItems(): Promise<CommandWorkItem[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const profile = await currentProfile(client);
  const { data, error } = await client
    .from("command_work_items")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("sort_order", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as CommandWorkItem[];
}

export async function createCommandWorkItem(input: {
  title: string;
  description?: string;
  priority?: CommandWorkPriority;
  dueAt?: string | null;
  assigneeProfileId?: string | null;
  sourceType?: CommandWorkItem["source_type"];
  assistantSessionId?: string | null;
  workflowRunId?: string | null;
  sortOrder?: number;
}): Promise<CommandWorkItem> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const profile = await currentProfile(client);
  const { data, error } = await client
    .from("command_work_items")
    .insert({
      organization_id: profile.organization_id,
      tenant_id: profile.tenant_id,
      title: input.title.trim(),
      description: input.description ?? null,
      priority: input.priority ?? "medium",
      created_by_profile_id: profile.id,
      assignee_profile_id: input.assigneeProfileId ?? profile.id,
      due_at: input.dueAt ?? null,
      source_type: input.sourceType ?? "manual",
      assistant_session_id: input.assistantSessionId ?? null,
      workflow_run_id: input.workflowRunId ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  const item = data as CommandWorkItem;
  await client.from("command_work_item_events").insert({
    work_item_id: item.id,
    organization_id: item.organization_id,
    tenant_id: item.tenant_id,
    actor_profile_id: profile.id,
    event_type: "created",
    to_value: { status: item.status, priority: item.priority, assignee_profile_id: item.assignee_profile_id },
  });
  return item;
}

export async function updateCommandWorkItem(
  id: string,
  patch: Partial<Pick<CommandWorkItem, "title" | "description" | "status" | "priority" | "assignee_profile_id" | "due_at" | "sort_order">>,
): Promise<CommandWorkItem> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const profile = await currentProfile(client);
  const { data: before, error: readError } = await client
    .from("command_work_items")
    .select("*")
    .eq("id", id)
    .single();
  if (readError) throw readError;
  const nextStatus = patch.status ?? before.status;
  const { data, error } = await client
    .from("command_work_items")
    .update({
      ...patch,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  const after = data as CommandWorkItem;
  await client.from("command_work_item_events").insert({
    work_item_id: id,
    organization_id: after.organization_id,
    tenant_id: after.tenant_id,
    actor_profile_id: profile.id,
    event_type: patch.status === "completed" ? "completed" : patch.status === "open" ? "reopened" : "updated",
    from_value: { status: before.status, priority: before.priority, assignee_profile_id: before.assignee_profile_id },
    to_value: { status: after.status, priority: after.priority, assignee_profile_id: after.assignee_profile_id },
  });
  return after;
}

export async function deleteCommandWorkItem(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const { error } = await client.from("command_work_items").delete().eq("id", id);
  if (error) throw error;
}
