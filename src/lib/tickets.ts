import { getSupabaseClient } from "@/lib/supabase";
import type { TicketAction, TicketPriority } from "@/lib/ticket-workflow";

export interface TicketRecord {
  id: string;
  ticket_number: number | string;
  organization_id: string;
  tenant_id: string | null;
  requester_profile_id: string;
  assigned_profile_id: string | null;
  department_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  opened_at: string | null;
  first_response_at: string | null;
  response_due_at: string | null;
  resolution_due_at: string | null;
  response_breached_at: string | null;
  resolution_breached_at: string | null;
  requester_wait_started_at: string | null;
  requester_wait_seconds: number | null;
  waiting_on: string | null;
  current_step: number | null;
  total_steps: number | null;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_summary: string | null;
}

export interface TicketProfile {
  id: string;
  organization_id: string;
  tenant_id: string | null;
  department_id: string | null;
  display_name: string | null;
  job_title: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_profile_id: string;
  body: string;
  visibility: string;
  created_at: string;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface TicketApproval {
  id: string;
  ticket_id: string;
  requested_by: string;
  approver_profile_id: string | null;
  permission_key: string;
  reason: string;
  status: "pending" | "approved" | "denied";
  decision_reason: string | null;
  requested_at: string;
  decided_at: string | null;
}

export interface TicketAuditEvent {
  id: string;
  actor_profile_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  outcome: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("The Supabase client is not configured in this environment.");
  return supabase;
}

function unwrapTicket(data: unknown): TicketRecord {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || !("id" in row)) {
    throw new Error("The ticket operation completed without returning a ticket record.");
  }
  return row as TicketRecord;
}

export async function loadCurrentTicketProfile(): Promise<TicketProfile> {
  const supabase = client();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Sign in to access ticket records.");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,organization_id,tenant_id,department_id,display_name,job_title")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.organization_id) {
    throw new Error("Your account does not have an active organization profile for ticket work.");
  }
  return data as TicketProfile;
}

export async function listTicketsForPage(
  pageSlug: string,
  profile: TicketProfile,
): Promise<TicketRecord[]> {
  const supabase = client();
  let query = supabase
    .from("tickets")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (pageSlug === "my-tickets") query = query.eq("requester_profile_id", profile.id);
  if (pageSlug === "my-assigned-tickets") query = query.eq("assigned_profile_id", profile.id);
  if (pageSlug === "other-users-tickets") query = query.neq("requester_profile_id", profile.id);
  if (pageSlug === "team-tickets") {
    if (!profile.department_id) return [];
    query = query.eq("department_id", profile.department_id);
  }
  if (pageSlug === "ticket-history")
    query = query.in("status", ["resolved", "closed", "cancelled"]);
  if (pageSlug === "command-queue")
    query = query.not("status", "in", "(resolved,closed,cancelled)");

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as TicketRecord[];
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseTicketNumber(value: string): number | null {
  const normalized = value.trim().replace(/^(?:TKT[-#\s]*)/i, "");
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function findTicketByReference(reference: string): Promise<TicketRecord | null> {
  const supabase = client();
  const value = reference.trim();
  if (!value) return null;
  let query = supabase.from("tickets").select("*").limit(1);
  if (isUuid(value)) query = query.eq("id", value);
  else {
    const ticketNumber = parseTicketNumber(value);
    if (ticketNumber === null) return null;
    query = query.eq("ticket_number", ticketNumber);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TicketRecord | null) ?? null;
}

export async function createPortalTicket(input: {
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
}): Promise<TicketRecord> {
  const { data, error } = await client().rpc("create_ticket", {
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_priority: input.priority,
    p_category: input.category,
  });
  if (error) throw new Error(error.message);
  return unwrapTicket(data);
}

export async function updateTicketDetails(input: {
  ticketId: string;
  title: string;
  description: string;
  category: string;
}): Promise<TicketRecord> {
  const { data, error } = await client().rpc("update_ticket_details", {
    p_ticket_id: input.ticketId,
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_category: input.category.trim(),
  });
  if (error) throw new Error(error.message);
  return unwrapTicket(data);
}

export async function applyTicketTransition(input: {
  ticketId: string;
  action: TicketAction;
  reason?: string;
  assigneeProfileId?: string;
  priority?: TicketPriority;
}): Promise<TicketRecord> {
  const { data, error } = await client().rpc("apply_ticket_transition", {
    p_ticket_id: input.ticketId,
    p_action: input.action,
    p_reason: input.reason?.trim() || null,
    p_assignee_profile_id: input.assigneeProfileId ?? null,
    p_priority: input.priority ?? null,
  });
  if (error) throw new Error(error.message);
  return unwrapTicket(data);
}

export async function loadTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data, error } = await client()
    .from("ticket_conversation_messages")
    .select("id,ticket_id,author_profile_id,body,visibility,created_at,updated_at,metadata")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as TicketMessage[];
}

export async function addTicketMessage(input: {
  ticket: TicketRecord;
  profileId: string;
  body: string;
  visibility: "public" | "internal";
}): Promise<void> {
  const { error } = await client()
    .from("ticket_conversation_messages")
    .insert({
      organization_id: input.ticket.organization_id,
      tenant_id: input.ticket.tenant_id,
      ticket_id: input.ticket.id,
      author_profile_id: input.profileId,
      channel: input.visibility === "public" ? "customer" : "internal",
      body: input.body.trim(),
      visibility: input.visibility === "public" ? "customer" : "internal",
      metadata: { source: "ticket-workspace" },
    });
  if (error) throw new Error(error.message);
}

export async function loadTicketAudit(ticketId: string): Promise<TicketAuditEvent[]> {
  const { data, error } = await client()
    .from("ticket_lifecycle_events")
    .select("id,actor_profile_id,event_key,from_status,to_status,reason,metadata,created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((event) => ({
    id: event.id as string,
    actor_profile_id: (event.actor_profile_id as string | null) ?? null,
    action: `ticket.${event.event_key as string}`,
    resource_type: "ticket",
    resource_id: ticketId,
    outcome: "recorded",
    event_data: {
      ...((event.metadata as Record<string, unknown> | null) ?? {}),
      reason: event.reason,
      ...(event.from_status !== event.to_status
        ? {
            changed_fields: ["status"],
            before: { status: event.from_status },
            after: { status: event.to_status },
          }
        : {}),
    },
    created_at: event.created_at as string,
  })) as TicketAuditEvent[];
}

export async function listAssignableProfiles(ticket: TicketRecord): Promise<TicketProfile[]> {
  let query = client()
    .from("profiles")
    .select("id,organization_id,tenant_id,department_id,display_name,job_title")
    .eq("organization_id", ticket.organization_id)
    .limit(200);
  query =
    ticket.tenant_id === null
      ? query.is("tenant_id", null)
      : query.eq("tenant_id", ticket.tenant_id);
  const { data, error } = await query.order("display_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TicketProfile[];
}

export async function canDecideTicketApprovals(profileId: string): Promise<boolean> {
  const managerRoles = [
    "super_admin",
    "global_admin",
    "organization_admin",
    "service_desk_manager",
    "it_manager",
  ];
  const { data, error } = await client()
    .from("profile_roles")
    .select("role_id,roles!inner(role_key)")
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .in("roles.role_key", managerRoles)
    .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1);
  if (error) return false;
  return Boolean(data?.length);
}

export async function loadTicketApprovals(ticketId: string): Promise<TicketApproval[]> {
  const { data, error } = await client()
    .from("ticket_approval_requests")
    .select("id,ticket_id,requested_by,approver_profile_id,permission_key,reason,status,decision_reason,requested_at,decided_at")
    .eq("ticket_id", ticketId)
    .order("requested_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as TicketApproval[];
}

export async function requestTicketApproval(input: {
  ticketId: string;
  permissionKey: string;
  reason: string;
}): Promise<TicketApproval> {
  const { data, error } = await client().rpc("request_ticket_approval", {
    p_ticket_id: input.ticketId,
    p_permission_key: input.permissionKey.trim(),
    p_reason: input.reason.trim(),
  });
  if (error) throw new Error(error.message);
  return unwrapTicketApproval(data);
}

export async function decideTicketApproval(input: {
  approvalId: string;
  decision: "approved" | "denied";
  reason: string;
}): Promise<TicketApproval> {
  const { data, error } = await client().rpc("decide_ticket_approval", {
    p_approval_id: input.approvalId,
    p_decision: input.decision,
    p_reason: input.reason.trim(),
  });
  if (error) throw new Error(error.message);
  return unwrapTicketApproval(data);
}

function unwrapTicketApproval(data: unknown): TicketApproval {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || !("id" in row)) {
    throw new Error("The approval operation completed without returning an approval record.");
  }
  return row as TicketApproval;
}

