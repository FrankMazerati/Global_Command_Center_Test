import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays, CalendarClock, ChevronLeft, ChevronRight, Clock3, MapPin,
  Plus, Search, Trash2, Pencil, X, Users, ListFilter, Sparkles, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  category: string;
  owner_id: string;
};

type ViewMode = "month" | "week" | "day";
const categories = ["Meeting", "Focus time", "Personal", "Deadline", "Company", "Out of office"];
const categoryTone: Record<string, string> = {
  Meeting: "border-sky-400/40 bg-sky-400/15 text-sky-200",
  "Focus time": "border-violet-400/40 bg-violet-400/15 text-violet-200",
  Personal: "border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-200",
  Deadline: "border-rose-400/40 bg-rose-400/15 text-rose-200",
  Company: "border-cyan-300/40 bg-cyan-300/15 text-cyan-100",
  "Out of office": "border-amber-300/40 bg-amber-300/15 text-amber-100",
};
const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const atLocalInput = (d: Date) => `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
};
const sameDay = (a: Date, b: Date) => dateKey(a) === dateKey(b);
const prettyTime = (value: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));

export function IntelliCalendarWorkspace() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", start_at: atLocalInput(new Date(Date.now() + 3600000)),
    end_at: atLocalInput(new Date(Date.now() + 7200000)), all_day: false,
    location: "", category: "Meeting",
  });

  const supabase = getSupabaseClient();
  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoadError("Supabase is not configured. Calendar data is unavailable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const auth = await supabase.auth.getUser();
    if (auth.error || !auth.data.user) {
      setUserId(null);
      setEvents([]);
      setLoadError("Sign in to view your calendar. Your events are never shown from a shared demo account.");
      setLoading(false);
      return;
    }
    setUserId(auth.data.user.id);
    const result = await supabase.from("calendar_events").select("*")
      .gte("end_at", new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1).toISOString())
      .lte("start_at", new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1).toISOString())
      .order("start_at", { ascending: true }).limit(500);
    if (result.error) setLoadError(result.error.message.includes("calendar_events")
      ? "The IntelliCalendar database migration has not been applied yet. Event storage is not active."
      : result.error.message);
    else setEvents((result.data ?? []) as CalendarEvent[]);
    setLoading(false);
  }, [cursor, supabase]);

  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => events.filter((event) => {
    const matchesText = !query.trim() || [event.title, event.description, event.location]
      .some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase()));
    return matchesText && (categoryFilter === "All" || event.category === categoryFilter);
  }), [events, query, categoryFilter]);

  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const firstCell = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(firstCell);
      date.setDate(firstCell.getDate() + i);
      return date;
    });
  }, [cursor]);

  const visibleDays = useMemo(() => {
    if (view === "day") return [new Date(cursor)];
    if (view === "week") return Array.from({ length: 7 }, (_, i) => {
      const d = startOfWeek(cursor); d.setDate(d.getDate() + i); return d;
    });
    return monthCells;
  }, [view, cursor, monthCells]);

  const move = (direction: number) => {
    const next = new Date(cursor);
    if (view === "day") next.setDate(next.getDate() + direction);
    else if (view === "week") next.setDate(next.getDate() + direction * 7);
    else next.setMonth(next.getMonth() + direction);
    setCursor(next);
  };
  const openNew = (date = cursor) => {
    const start = new Date(date); start.setHours(9, 0, 0, 0);
    const end = new Date(start); end.setHours(10, 0, 0, 0);
    setEditingId(null);
    setForm({ title: "", description: "", start_at: atLocalInput(start), end_at: atLocalInput(end), all_day: false, location: "", category: "Meeting" });
    setEditorOpen(true);
  };
  const openEdit = (event: CalendarEvent) => {
    setEditingId(event.id);
    setForm({ title: event.title, description: event.description ?? "", start_at: atLocalInput(new Date(event.start_at)), end_at: atLocalInput(new Date(event.end_at)), all_day: event.all_day, location: event.location ?? "", category: event.category });
    setEditorOpen(true);
  };
  const saveEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !userId) { toast.error("Sign in before saving calendar events."); return; }
    if (!form.title.trim() || new Date(form.end_at) <= new Date(form.start_at)) {
      toast.error("Add a title and make sure the end is after the start."); return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(), description: form.description.trim() || null,
      start_at: new Date(form.start_at).toISOString(), end_at: new Date(form.end_at).toISOString(),
      all_day: form.all_day, location: form.location.trim() || null,
      category: form.category, owner_id: userId,
    };
    const result = editingId
      ? await supabase.from("calendar_events").update(payload).eq("id", editingId).select().single()
      : await supabase.from("calendar_events").insert(payload).select().single();
    setSaving(false);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(editingId ? "Calendar event updated." : "Calendar event created.");
    setEditorOpen(false);
    await refresh();
  };
  const deleteEvent = async (event: CalendarEvent) => {
    if (!supabase || !window.confirm(`Delete “${event.title}”?`)) return;
    const result = await supabase.from("calendar_events").delete().eq("id", event.id);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success("Event deleted.");
    await refresh();
  };

  const eventsFor = (day: Date) => filtered.filter((event) => sameDay(new Date(event.start_at), day));
  const heading = view === "month"
    ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(cursor)
    : view === "week"
      ? `${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(visibleDays[0])} – ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(visibleDays[6])}`
      : new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(cursor);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-sky-300/25 bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,.2),transparent_45%),linear-gradient(135deg,#071326,#0b1b34_58%,#08111f)] p-5 shadow-[0_18px_60px_rgba(0,0,0,.3)] sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full border border-sky-300/10" />
        <div className="pointer-events-none absolute -right-4 -top-8 size-48 rounded-full border border-sky-300/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.28em] text-sky-300"><CalendarDays className="size-4" /> IntelliStack Systems · Collaboration</div>
            <h2 className="font-display text-3xl font-bold tracking-wide text-white sm:text-4xl">IntelliCalendar</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">One world. One schedule. One intelligent network.</p>
            <p className="mt-1 text-xs text-slate-400">See everything, connect everything, work smarter.</p>
          </div>
          <button onClick={() => openNew()} className="inline-flex items-center gap-2 rounded-xl border border-sky-300/40 bg-sky-400/15 px-4 py-3 text-sm font-semibold text-sky-100 shadow-[0_0_24px_rgba(56,189,248,.12)] transition hover:bg-sky-400/25"><Plus className="size-4" /> Create event</button>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["MY CALENDAR", "Personal schedule", CalendarDays],
            ["SMART SCHEDULING", "Plan with context", Sparkles],
            ["TEAM COORDINATION", "Shared work ahead", Users],
            ["GLOBAL TIME", "Time-zone aware", Clock3],
          ].map(([label, sub, Icon]) => { const FeatureIcon = Icon as LucideIcon; return <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[.045] p-3 backdrop-blur"><FeatureIcon className="mb-2 size-4 text-sky-300" /><div className="text-[9px] font-bold tracking-[.16em] text-sky-200">{String(label)}</div><div className="mt-1 text-xs text-slate-400">{String(sub)}</div></div>; })}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-300/15 bg-[#09172a]/90 p-3 shadow-[0_14px_45px_rgba(0,0,0,.2)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button aria-label="Previous period" onClick={() => move(-1)} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:border-sky-300/40 hover:text-sky-200"><ChevronLeft className="size-4" /></button>
            <button aria-label="Next period" onClick={() => move(1)} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:border-sky-300/40 hover:text-sky-200"><ChevronRight className="size-4" /></button>
            <button onClick={() => setCursor(new Date())} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-300/40">Today</button>
            <h3 className="ml-1 font-display text-lg font-semibold text-white">{heading}</h3>
          </div>
          <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
            {(["day", "week", "month"] as const).map((mode) => <button key={mode} onClick={() => setView(mode)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${view === mode ? "bg-sky-400/20 text-sky-200 shadow-inner" : "text-slate-400 hover:text-white"}`}>{mode}</button>)}
          </div>
        </div>
        <div className="my-4 flex flex-wrap gap-2">
          <label className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"><Search className="size-4 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events, people, locations…" className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500" /></label>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300"><ListFilter className="size-4 text-sky-300" /><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent outline-none"><option>All</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        </div>
        {loadError && <div role="status" className="mb-4 rounded-xl border border-amber-300/25 bg-amber-300/5 p-3 text-sm text-amber-100"><strong>Calendar connection:</strong> {loadError}</div>}
        {loading ? <div className="grid min-h-64 place-items-center text-sm text-slate-400"><span className="animate-pulse">Synchronizing calendar records…</span></div> : (
          <div className="overflow-x-auto">
            <div className={`grid min-w-[620px] grid-cols-7 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 ${view === "month" ? "" : "min-h-[430px]"}`}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="bg-[#10243c] px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[.18em] text-sky-200">{day}</div>)}
              {visibleDays.map((day) => {
                const dayEvents = eventsFor(day);
                const inMonth = day.getMonth() === cursor.getMonth();
                return <div key={dateKey(day)} className={`group min-h-[112px] bg-[#0a1a2d] p-2 transition hover:bg-[#10243c] ${view === "month" && !inMonth ? "opacity-45" : ""} ${sameDay(day, new Date()) ? "ring-1 ring-inset ring-sky-400/60" : ""} `}>
                  <div className="mb-2 flex items-center justify-between"><span className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${sameDay(day, new Date()) ? "bg-sky-400 text-slate-950" : "text-slate-300"}`}>{day.getDate()}</span><button aria-label={`Add event on ${dateKey(day)}`} onClick={() => openNew(day)} className="rounded-md p-1 text-slate-500 opacity-0 transition hover:bg-sky-300/10 hover:text-sky-200 group-hover:opacity-100"><Plus className="size-3.5" /></button></div>
                  <div className="space-y-1">{dayEvents.slice(0, view === "month" ? 3 : 8).map((event) => <button key={event.id} onClick={() => openEdit(event)} className={`block w-full truncate rounded-md border px-2 py-1 text-left text-[10px] font-medium ${categoryTone[event.category] ?? categoryTone.Meeting}`} title={event.title}>{!event.all_day && <span className="mr-1 opacity-75">{prettyTime(event.start_at)}</span>}{event.title}</button>)}{dayEvents.length > (view === "month" ? 3 : 8) && <div className="px-1 text-[10px] text-sky-300">+{dayEvents.length - (view === "month" ? 3 : 8)} more</div>}</div>
                </div>;
              })}
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-white/10 pt-4">{categories.map((category) => <span key={category} className="flex items-center gap-1.5 text-[10px] text-slate-400"><i className={`size-2 rounded-full ${categoryTone[category]?.split(" ")[1] ?? "bg-sky-400"}`} />{category}</span>)}</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-sky-300/15 bg-[#09172a]/90 p-4">
          <div className="mb-3 flex items-center justify-between"><div><div className="font-display text-sm font-semibold text-white">Upcoming schedule</div><p className="text-xs text-slate-500">Your next recorded events</p></div><CalendarClock className="size-5 text-sky-300" /></div>
          {filtered.filter((event) => new Date(event.end_at) >= new Date()).slice(0, 6).length ? filtered.filter((event) => new Date(event.end_at) >= new Date()).slice(0, 6).map((event) => <div key={event.id} className="flex items-center gap-3 border-t border-white/5 py-3"><div className="min-w-14 rounded-lg bg-sky-400/10 px-2 py-2 text-center"><div className="text-[9px] uppercase text-sky-300">{new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(event.start_at))}</div><div className="font-display text-lg font-bold text-white">{new Date(event.start_at).getDate()}</div></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-100">{event.title}</div><div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-400"><span>{prettyTime(event.start_at)} – {prettyTime(event.end_at)}</span>{event.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{event.location}</span>}</div></div><button aria-label={`Edit ${event.title}`} onClick={() => openEdit(event)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-sky-200"><Pencil className="size-4" /></button><button aria-label={`Delete ${event.title}`} onClick={() => void deleteEvent(event)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-400/10 hover:text-rose-200"><Trash2 className="size-4" /></button></div>) : <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No upcoming events are recorded in this calendar.</div>}
        </div>
        <div className="rounded-2xl border border-sky-300/15 bg-[linear-gradient(145deg,#0b1d33,#091426)] p-4"><div className="mb-3 flex items-center gap-2"><Sparkles className="size-4 text-sky-300" /><h3 className="font-display text-sm font-semibold text-white">Connected intelligence</h3></div><p className="text-xs leading-5 text-slate-400">IntelliCalendar is designed to coordinate with Chat Buddy, IntelliChat, IntelliMail, IntelliTasks and the Command Center. External Microsoft 365 and Google synchronization will remain clearly marked as disconnected until an authorized connection is configured.</p><div className="mt-4 space-y-2">{["Chat Buddy · scheduling assistance", "IntelliChat · meeting conversations", "IntelliTasks · follow-up actions", "Global Directory · attendee identity"].map((item) => <div key={item} className="rounded-lg border border-white/5 bg-white/[.03] px-3 py-2 text-xs text-slate-300">{item}</div>)}</div><p className="mt-4 border-t border-white/10 pt-3 text-[10px] italic text-slate-500">Think beyond locally, connect everything globally, powered by intelligence.</p></div>
      </section>

      {editorOpen && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditorOpen(false); }}><form onSubmit={saveEvent} className="my-auto w-full max-w-xl space-y-4 rounded-2xl border border-sky-300/25 bg-[#0b1b30] p-5 shadow-[0_25px_90px_rgba(0,0,0,.65)]"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">{editingId ? "Update schedule" : "New schedule entry"}</div><h3 className="mt-1 font-display text-xl font-bold text-white">{editingId ? "Edit event" : "Create event"}</h3></div><button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X className="size-4" /></button></div><label className="block space-y-1 text-xs text-slate-300">Event title<input required maxLength={180} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-300/50" placeholder="Quarterly operations review" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-slate-300">Starts<input required type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white" /></label><label className="space-y-1 text-xs text-slate-300">Ends<input required type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white" /></label></div><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={form.all_day} onChange={(e) => setForm({ ...form, all_day: e.target.checked })} /> All-day event</label><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-slate-300">Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-white/10 bg-[#10243c] px-3 py-2.5 text-sm text-white">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="space-y-1 text-xs text-slate-300">Location<input maxLength={240} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white" placeholder="Conference room or video link" /></label></div><label className="block space-y-1 text-xs text-slate-300">Description<textarea rows={3} maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white" placeholder="Agenda, preparation and notes…" /></label><div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3"><button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button><button disabled={saving || !userId} className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save changes" : "Create event"}</button></div></form></div>}
    </div>
  );
}
