import { useEffect, useState } from "react";
import { Plus, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

type Group = { id: string; name: string; group_key: string; group_type: string | null; description: string | null; is_privileged: boolean; organization_id: string | null; tenant_id: string | null };
type Membership = { group_id: string; profile_id: string; expires_at: string | null; created_at: string; groups?: { name?: string; group_key?: string; group_type?: string } | null };
type Person = { id: string; display_name: string | null; work_email: string | null; job_title: string | null };

export function GroupMembershipWorkspace() {
  const [profileId, setProfileId] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [targetProfileId, setTargetProfileId] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase is not configured."); setLoading(false); return; }
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { setError("Sign in to manage your own group memberships."); setLoading(false); return; }
    setProfileId(auth.user.id);
    setTargetProfileId((current) => current || auth.user.id);
    const [groupResult, membershipResult] = await Promise.all([
      supabase.from("groups").select("id,name,group_key,group_type,description,is_privileged,organization_id,tenant_id").order("name"),
      supabase.from("group_memberships").select("group_id,profile_id,expires_at,created_at,groups(name,group_key,group_type)").eq("profile_id", auth.user.id),
    ]);
    if (groupResult.error) setError(groupResult.error.message);
    else setGroups((groupResult.data ?? []) as Group[]);
    if (membershipResult.error) setError((current) => current ? current + " · " + membershipResult.error.message : membershipResult.error.message);
    else setMemberships((membershipResult.data ?? []) as unknown as Membership[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [targetProfileId]);

  const add = async () => {
    if (!selectedGroup) return;
    const group = groups.find((item) => item.id === selectedGroup);
    if (!group) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }
    const { error: insertError } = await supabase.from("group_memberships").insert({
      group_id: group.id,
      profile_id: targetProfileId,
      added_by: profileId,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setSaving(false);
    if (insertError) { setError(insertError.message); toast.error("Membership could not be added. The server's authorization policy may require an administrator approval."); return; }
    toast.success("Group membership added.");
    setSelectedGroup(""); setExpiresAt(""); setLoading(true); await load();
  };

  const remove = async (groupId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("group_memberships").delete().eq("group_id", groupId).eq("profile_id", targetProfileId);
    if (deleteError) { setError(deleteError.message); toast.error("Membership could not be removed. Contact an authorized directory administrator."); return; }
    toast.success("Group membership removed."); setMemberships((current) => current.filter((item) => item.group_id !== groupId));
  };

  if (loading) return <section className="rounded-xl border bg-card p-5">Loading group memberships…</section>;
  return <section className="space-y-4 rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wider text-primary">Active Directory · Groups and Organization</div><h2 className="mt-1 text-xl font-semibold">Group membership management</h2><p className="mt-1 text-sm text-muted-foreground">Select an employee to review and manage memberships. Available people and write actions are limited by organization scope and server-side authorization.</p></div><button type="button" onClick={() => { setLoading(true); void load(); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RefreshCw className="size-4"/>Refresh</button></div>
    {error && <div role="alert" className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm">{error}</div>}
    <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
      <label className="grid gap-1 text-sm">Employee / profile<select value={targetProfileId} onChange={(e) => setTargetProfileId(e.target.value)} className="h-10 rounded-md border bg-background px-3">{people.map((p) => <option key={p.id} value={p.id}>{p.display_name || p.work_email || p.id}{p.job_title ? " · " + p.job_title : ""}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Available group<select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="h-10 rounded-md border bg-background px-3"><option value="">Select a group</option>{groups.filter((g) => !memberships.some((m) => m.group_id === g.id)).map((g) => <option key={g.id} value={g.id}>{g.name}{g.is_privileged ? " · Privileged" : ""}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Optional expiry<input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-10 rounded-md border bg-background px-3"/></label>
      <div className="flex items-end"><button type="button" disabled={!selectedGroup || saving} onClick={() => void add()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"><Plus className="size-4"/>{saving ? "Adding…" : "Request / Add"}</button></div>
    </div>
    <div className="space-y-2">{memberships.length ? memberships.map((m) => { const expired = Boolean(m.expires_at && new Date(m.expires_at).getTime() <= Date.now()); return <div key={m.group_id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Users className="size-5"/></span><div className="min-w-0 flex-1"><div className="font-medium">{m.groups?.name ?? m.group_id}</div><div className="text-xs text-muted-foreground">{m.groups?.group_key ?? "Group"} · {expired ? "Expired membership" : m.expires_at ? "Expires " + new Date(m.expires_at).toLocaleString() : "No expiry set"}</div></div><button type="button" onClick={() => void remove(m.group_id)} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5"/>Remove membership</button></div>; }) : <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No memberships are currently visible for this profile.</div>}</div>
    <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0"/>Privileged group assignments must be approved by an authorized administrator. A rejected database operation is shown as a denial; this page does not bypass RLS or grant itself additional access.</p>
  </section>;
}
