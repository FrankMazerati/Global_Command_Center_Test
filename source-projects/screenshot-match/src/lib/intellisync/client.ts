import { supabase } from "@/integrations/supabase/client";
import { deriveHealth, dueEvents, handlers, nextState, type SyncEvent, type SyncEventType } from "./engine";

/** Persistence + processing for IntelliSync, backed by Lovable Cloud tables. */

export async function listConnections() {
  const { data, error } = await supabase.from("sync_connections").select("*").order("category");
  if (error) throw error;
  return data;
}

export async function listRecentEvents(limit = 50) {
  const { data, error } = await supabase.from("sync_events").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

/** Queue a sync event (requires a signed-in user). */
export async function emit(connectionId: string, type: SyncEventType, entity: { type: string; id?: string }, payload: Record<string, unknown> = {}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in required to emit sync events");
  const { data, error } = await supabase
    .from("sync_events")
    .insert({ connection_id: connectionId, event_type: type, entity_type: entity.type, entity_id: entity.id ?? null, payload: payload as never, actor_id: u.user.id })
    .select()
    .single();
  if (error) throw error;
  await supabase.from("sync_audit").insert({ event_id: data.id, connection_id: connectionId, action: "queued", actor_id: u.user.id });
  return data;
}

/** Process due events through registered handlers with retry + audit. */
export async function processDue() {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("sync_events").select("*").in("status", ["pending", "failed"]).limit(100);
  if (error) throw error;
  for (const ev of dueEvents(data as SyncEvent[])) {
    const h = handlers.get(ev.connection_id);
    let ok = false;
    let err: string | null = null;
    if (!h) err = "No handler registered for this connection";
    else {
      try { await h(ev); ok = true; } catch (e) { err = e instanceof Error ? e.message : String(e); }
    }
    const s = nextState(ev, ok);
    await supabase.from("sync_events").update({ ...s, last_error: err, processed_at: ok ? new Date().toISOString() : null }).eq("id", ev.id);
    await supabase.from("sync_audit").insert({ event_id: ev.id, connection_id: ev.connection_id, action: s.status, detail: { error: err } as never, actor_id: u.user?.id ?? null });
  }
}

/** Reconciliation: recompute each connection's health from its recent events. */
export async function reconcileHealth() {
  const conns = await listConnections();
  for (const c of conns) {
    const { data } = await supabase.from("sync_events").select("status").eq("connection_id", c.id).order("created_at", { ascending: false }).limit(20);
    const status = deriveHealth((data ?? []) as { status: SyncEvent["status"] }[]);
    await supabase.from("sync_connections").update({ status, updated_at: new Date().toISOString() }).eq("id", c.id);
  }
}
