import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Award, BriefcaseBusiness, Building2, CalendarDays, Clock3, Mail, MapPin, Phone, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type RecordRow = Record<string, unknown>;
const value = (v: unknown) => v === null || v === undefined || v === "" ? "Not provided" : String(v);
const fullName = (p: RecordRow) => value(p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Employee profile");

export function EmployeeProfileWorkspace() {
  const [profile, setProfile] = useState<RecordRow | null>(null);
  const [badges, setBadges] = useState<RecordRow[]>([]);
  const [stars, setStars] = useState(0);
  const [xp, setXp] = useState(0);
  const [groups, setGroups] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", work_phone: "", location_city: "", location_region: "", country_code: "", timezone: "", avatar_url: "" });

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = getSupabaseClient();
      if (!supabase) { setError("Secure profile service is not configured."); setLoading(false); return; }
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) { setError("Sign in to view your employee profile."); setLoading(false); return; }
      const profileResult = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
      if (!active) return;
      if (profileResult.error) { setError(profileResult.error.message); setLoading(false); return; }
      if (!profileResult.data) { setError("Your authenticated account does not yet have an employee profile. Contact an administrator."); setLoading(false); return; }
      const p = profileResult.data as RecordRow;
      setProfile(p);
      setEditForm({ display_name: String(p.display_name ?? ""), work_phone: String(p.work_phone ?? ""), location_city: String(p.location_city ?? ""), location_region: String(p.location_region ?? ""), country_code: String(p.country_code ?? ""), timezone: String(p.timezone ?? ""), avatar_url: String(p.avatar_url ?? "") });
      const [badgeResult, starResult, xpResult, groupResult] = await Promise.all([
        supabase.from("employee_badge_progress").select("id,badge_id,current_level,progress_value,level_started_at,last_awarded_at").eq("profile_id", auth.user.id),
        supabase.from("employee_star_transactions").select("stars_delta").eq("profile_id", auth.user.id),
        supabase.from("employee_xp_transactions").select("xp_delta").eq("profile_id", auth.user.id),
        supabase.from("group_memberships").select("group_id,expires_at,created_at,groups(id,name,group_key,group_type,description)").eq("profile_id", auth.user.id),
      ]);
      if (!active) return;
      if (!badgeResult.error && badgeResult.data?.length) {
        const catalog = await supabase.from("badge_catalog").select("id,badge_key,badge_name,description,category,max_level,is_active").in("id", badgeResult.data.map((b) => b.badge_id));
        const byId = new Map((catalog.data ?? []).map((b) => [b.id, b]));
        setBadges(badgeResult.data.map((b) => ({ ...b, badge: byId.get(b.badge_id) ?? null })));
      }
      if (!starResult.error) setStars((starResult.data ?? []).reduce((sum, row) => sum + Number(row.stars_delta ?? 0), 0));
      if (!xpResult.error) setXp((xpResult.data ?? []).reduce((sum, row) => sum + Number(row.xp_delta ?? 0), 0));
      if (!groupResult.error) setGroups((groupResult.data ?? []) as unknown as RecordRow[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);


  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }
    const { data, error: updateError } = await supabase.from("profiles").update({
      display_name: editForm.display_name.trim() || null,
      work_phone: editForm.work_phone.trim() || null,
      location_city: editForm.location_city.trim() || null,
      location_region: editForm.location_region.trim() || null,
      country_code: editForm.country_code.trim().toUpperCase() || null,
      timezone: editForm.timezone.trim() || null,
      avatar_url: editForm.avatar_url.trim() || null,
    }).eq("id", profile.id).select("*").single();
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    if (data) setProfile(data as RecordRow);
    setEditing(false);
  };

  const fields = useMemo(() => profile ? [
    ["Employee Global ID", profile.employee_global_id], ["Company Global ID", profile.company_global_id],
    ["Work email", profile.work_email], ["Work phone", profile.work_phone], ["Job title", profile.job_title],
    ["Department ID", profile.department_id], ["Organizational unit ID", profile.organizational_unit_id],
    ["Manager profile ID", profile.manager_profile_id], ["Employment status", profile.member_status],
    ["City", profile.location_city], ["Region", profile.location_region], ["Country", profile.country_code],
    ["Time zone", profile.timezone], ["Organization ID", profile.organization_id], ["Tenant ID", profile.tenant_id],
  ] as [string, unknown][] : [], [profile]);

  if (loading) return <section className="rounded-xl border border-sky-300/20 bg-slate-950/70 p-6 text-sky-100">Loading your secure employee profile…</section>;
  if (error) return <section role="alert" className="rounded-xl border border-amber-400/30 bg-amber-950/20 p-5 text-amber-100"><h2 className="font-semibold">Profile unavailable</h2><p className="mt-2 text-sm">{error}</p></section>;
  if (!profile) return null;

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-sky-300/25 bg-gradient-to-br from-[#07162a] via-[#0b2440] to-[#101b32] text-white shadow-xl">
      <div className="h-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"/>
      <div className="flex flex-wrap items-center gap-4 p-5 sm:p-7">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-sky-200/30 bg-sky-400/10 text-3xl font-bold text-sky-100">
          {profile.avatar_url ? <img src={String(profile.avatar_url)} alt="" className="h-full w-full object-cover"/> : fullName(profile).slice(0,1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">My employee profile</div>
          <h1 className="mt-1 text-2xl font-bold">{fullName(profile)}</h1>
          <p className="mt-1 text-sm text-slate-300">{value(profile.job_title)} · {value(profile.member_status)}</p>
          <p className="mt-1 text-xs text-slate-400">{value(profile.employee_global_id)}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"><Star className="mx-auto size-5 text-amber-300"/><strong className="mt-1 block text-xl">{stars}</strong><span className="text-[10px] text-slate-300">Stars</span></div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"><Sparkles className="mx-auto size-5 text-cyan-300"/><strong className="mt-1 block text-xl">{xp}</strong><span className="text-[10px] text-slate-300">XP</span></div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"><Award className="mx-auto size-5 text-violet-300"/><strong className="mt-1 block text-xl">{badges.length}</strong><span className="text-[10px] text-slate-300">Badges</span></div>
        </div>
        <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-lg border border-sky-200/30 px-3 py-2 text-sm text-sky-100 hover:bg-white/10">{editing ? "Close editor" : "Edit my profile"}</button>
      </div>
      {editing && <form onSubmit={saveProfile} className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-2">
        {([["display_name","Display name"],["work_phone","Work phone"],["location_city","City"],["location_region","State / region"],["country_code","Country code"],["timezone","Time zone"],["avatar_url","Avatar image URL"]] as const).map(([key,label]) => <label key={key} className="grid gap-1 text-xs text-slate-300">{label}<input value={editForm[key]} onChange={(e) => setEditForm((v) => ({...v,[key]:e.target.value}))} className="h-10 rounded-md border border-white/15 bg-slate-950/60 px-3 text-sm text-white"/></label>)}
        <div className="flex items-end"><button disabled={saving} className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button></div>
      </form>}
    </section>
    <section className="grid gap-4 lg:grid-cols-[1.4fr_.8fr_.8fr]">
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><BriefcaseBusiness className="size-5 text-primary"/>Identity and employment</h2>
        <dl className="grid gap-3 sm:grid-cols-2">{fields.map(([label, field]) => <div key={label} className="min-w-0 rounded-lg border bg-background/60 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value(field)}</dd></div>)}</dl>
      </div>
      <div className="space-y-4">
        <section className="rounded-xl border bg-card p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold"><Award className="size-5 text-violet-500"/>Badges and achievements</h2>
          {badges.length ? <div className="space-y-2">{badges.map((b) => { const badge = b.badge as RecordRow | null; return <div key={String(b.id)} className="flex items-center gap-3 rounded-lg border p-3"><span className="grid size-10 place-items-center rounded-full bg-violet-500/10 text-violet-500"><Award className="size-5"/></span><div className="min-w-0 flex-1"><div className="font-medium">{value(badge?.badge_name ?? b.badge_id)}</div><p className="text-xs text-muted-foreground">{value(badge?.description)}</p><p className="text-xs text-muted-foreground">Level {value(b.current_level)} · Progress {value(b.progress_value)}</p></div></div>; })}</div> : <p className="text-sm text-muted-foreground">No badges have been recorded yet.</p>}
        </section>
        <section className="rounded-xl border bg-card p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold"><Users className="size-5 text-primary"/>Group memberships</h2>
          {groups.length ? <div className="space-y-2">{groups.map((m) => { const g = m.groups as RecordRow | null; const expired = Boolean(m.expires_at && new Date(String(m.expires_at)).getTime() <= Date.now()); return <div key={String(m.group_id)} className="rounded-lg border p-3"><div className="font-medium">{value(g?.name ?? m.group_id)}</div><p className="text-xs text-muted-foreground">{value(g?.group_type)} · {expired ? "Expired" : "Active membership"}</p></div>; })}</div> : <p className="text-sm text-muted-foreground">No group memberships are currently visible to your account.</p>}
        </section>
      </div>
    </section>
    <p className="text-xs text-muted-foreground">Profile, recognition, and membership information is loaded from the authenticated account's Supabase records. Fields that are not populated are shown as unavailable; no sample values are invented.</p>
  </div>;
}
