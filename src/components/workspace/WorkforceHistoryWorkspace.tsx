import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, FileText, Search, Users, UserPlus, ClipboardList } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type PersonRow = {
  id: string; employee_id: string; display_name: string; job_title: string;
  department_id: string | null; employment_status: string; employment_type: string;
  work_email: string; location_city: string | null; location_region: string | null;
};
type CandidateRow = {
  id: string; candidate_number: string; first_name: string; last_name: string;
  email: string; headline: string | null; candidate_status: string; years_experience: number;
  candidate_source: string;
};
type RequisitionRow = {
  id: string; requisition_number: string; title: string; requisition_status: string;
  employment_type: string; opened_at: string; location_city: string | null;
};
type ApplicationRow = {
  id: string; application_number: string; candidate_id: string; requisition_id: string;
  application_status: string; stage: string; fit_score: number | null; applied_at: string;
};
type AssignmentRow = {
  id: string; assignment_number: string; workforce_person_id: string; customer_account_id: string;
  role_title: string; project_name: string; assignment_status: string; starts_at: string; ends_at: string | null;
};
type EventRow = {
  id: string; workforce_person_id: string; event_number: string; event_type: string;
  event_date: string; previous_title: string | null; new_title: string | null; notes: string | null;
};
type DocumentRow = {
  id: string; document_number: string; module_key: string; document_type: string;
  title: string; workforce_person_id: string | null; candidate_id: string | null;
  effective_date: string | null; document_status: string;
};
const dateText = (value: string | null | undefined) =>
  value ? new Date(value + (value.length === 10 ? "T00:00:00" : "")).toLocaleDateString() : "—";
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function WorkforceHistoryWorkspace({ title, pageSlug }: { title: string; pageSlug: string }) {
  const isHire = pageSlug.startsWith("intellihire") || pageSlug.includes("recruit") || pageSlug.includes("candidate");
  const isStaff = pageSlug.startsWith("intellistaff") || pageSlug.includes("staffing");
  const moduleKey = isHire ? "intellihire" : isStaff ? "intellistaff" : "intelliwork";
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [requisitions, setRequisitions] = useState<RequisitionRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({
    people: 0, activePeople: 0, employmentEvents: 0, documents: 0,
    staffing: 0, candidates: 0, requisitions: 0, applications: 0, interviews: 0,
  });

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not configured for this workspace.");
      setLoading(false);
      return () => { active = false; };
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      const countQueries = await Promise.all([
        supabase.from("workforce_people").select("id", { count: "exact", head: true }),
        supabase.from("workforce_people").select("id", { count: "exact", head: true }).eq("employment_status", "active"),
        supabase.from("workforce_employment_events").select("id", { count: "exact", head: true }),
        supabase.from("workforce_documents").select("id", { count: "exact", head: true }).eq("module_key", moduleKey),
        supabase.from("workforce_staffing_assignments").select("id", { count: "exact", head: true }),
        supabase.from("intellihire_candidates").select("id", { count: "exact", head: true }),
        supabase.from("intellihire_requisitions").select("id", { count: "exact", head: true }),
        supabase.from("intellihire_applications").select("id", { count: "exact", head: true }),
        supabase.from("intellihire_interviews").select("id", { count: "exact", head: true }),
      ]);
      const [peopleResult, candidateResult, requisitionResult, applicationResult,
        assignmentResult, eventResult, documentResult] = await Promise.all([
        isHire ? Promise.resolve({ data: [], error: null }) :
          supabase.from("workforce_people")
            .select("id,employee_id,display_name,job_title,department_id,employment_status,employment_type,work_email,location_city,location_region")
            .order("created_at", { ascending: false }).limit(150),
        isHire ? supabase.from("intellihire_candidates")
          .select("id,candidate_number,first_name,last_name,email,headline,candidate_status,years_experience,candidate_source")
          .order("created_at", { ascending: false }).limit(150) :
          Promise.resolve({ data: [], error: null }),
        isHire ? supabase.from("intellihire_requisitions")
          .select("id,requisition_number,title,requisition_status,employment_type,opened_at,location_city")
          .order("opened_at", { ascending: false }).limit(100) :
          Promise.resolve({ data: [], error: null }),
        isHire ? supabase.from("intellihire_applications")
          .select("id,application_number,candidate_id,requisition_id,application_status,stage,fit_score,applied_at")
          .order("applied_at", { ascending: false }).limit(100) :
          Promise.resolve({ data: [], error: null }),
        isStaff ? supabase.from("workforce_staffing_assignments")
          .select("id,assignment_number,workforce_person_id,customer_account_id,role_title,project_name,assignment_status,starts_at,ends_at")
          .order("starts_at", { ascending: false }).limit(150) :
          Promise.resolve({ data: [], error: null }),
        !isHire && !isStaff ? supabase.from("workforce_employment_events")
          .select("id,workforce_person_id,event_number,event_type,event_date,previous_title,new_title,notes")
          .order("event_date", { ascending: false }).limit(100) :
          Promise.resolve({ data: [], error: null }),
        supabase.from("workforce_documents")
          .select("id,document_number,module_key,document_type,title,workforce_person_id,candidate_id,effective_date,document_status")
          .eq("module_key", moduleKey).order("created_at", { ascending: false }).limit(100),
      ]);
      if (!active) return;
      const errors = [...countQueries,peopleResult,candidateResult,requisitionResult,applicationResult,assignmentResult,eventResult,documentResult]
        .filter((result) => result.error);
      if (errors.length) {
        setError(errors[0].error?.message ?? "Unable to load workforce records.");
        setLoading(false);
        return;
      }
      setCounts({
        people: countQueries[0].count ?? 0,
        activePeople: countQueries[1].count ?? 0,
        employmentEvents: countQueries[2].count ?? 0,
        documents: countQueries[3].count ?? 0,
        staffing: countQueries[4].count ?? 0,
        candidates: countQueries[5].count ?? 0,
        requisitions: countQueries[6].count ?? 0,
        applications: countQueries[7].count ?? 0,
        interviews: countQueries[8].count ?? 0,
      });
      setPeople((peopleResult.data ?? []) as PersonRow[]);
      setCandidates((candidateResult.data ?? []) as CandidateRow[]);
      setRequisitions((requisitionResult.data ?? []) as RequisitionRow[]);
      setApplications((applicationResult.data ?? []) as ApplicationRow[]);
      setAssignments((assignmentResult.data ?? []) as AssignmentRow[]);
      setEvents((eventResult.data ?? []) as EventRow[]);
      setDocuments((documentResult.data ?? []) as DocumentRow[]);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [moduleKey, isHire, isStaff]);

  const term = search.trim().toLowerCase();
  const visiblePeople = useMemo(() => people.filter((person) =>
    [person.employee_id,person.display_name,person.job_title,person.work_email,person.employment_status]
      .some((value) => String(value ?? "").toLowerCase().includes(term))), [people,term]);
  const visibleCandidates = useMemo(() => candidates.filter((candidate) =>
    [candidate.candidate_number,candidate.first_name,candidate.last_name,candidate.email,candidate.headline,candidate.candidate_status]
      .some((value) => String(value ?? "").toLowerCase().includes(term))), [candidates,term]);
  const visibleAssignments = useMemo(() => assignments.filter((assignment) =>
    [assignment.assignment_number,assignment.role_title,assignment.project_name,assignment.assignment_status]
      .some((value) => String(value ?? "").toLowerCase().includes(term))), [assignments,term]);
  const visibleApplications = useMemo(() => applications.filter((application) =>
    [application.application_number,application.application_status,application.stage,application.candidate_id,application.requisition_id]
      .some((value) => String(value ?? "").toLowerCase().includes(term))), [applications,term]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-card">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">IntelliSphere Workforce · Company history</div>
        <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-300">Connected workforce, hiring, staffing, and employment records from the company's February 2020 founding through current operations.</p>
      </section>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Unable to load workforce history: {error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "People in directory", value: counts.people, icon: Users },
          { label: "Active employees", value: counts.activePeople, icon: BriefcaseBusiness },
          { label: isHire ? "Candidate profiles" : isStaff ? "Staffing assignments" : "Employment events", value: isHire ? counts.candidates : isStaff ? counts.staffing : counts.employmentEvents, icon: isHire ? UserPlus : ClipboardList },
          { label: moduleKey + " documents", value: counts.documents, icon: FileText },
        ].map((metric) => {
          const Icon = metric.icon;
          return <div key={metric.label} className="rounded-xl border bg-card p-4 shadow-card">
            <Icon className="mb-3 size-5 text-primary" />
            <span className="text-xs text-muted-foreground">{metric.label}</span>
            <b className="mt-1 block text-2xl">{loading ? "—" : metric.value.toLocaleString()}</b>
          </div>;
        })}
      </div>
      <section className="rounded-xl border bg-card p-4 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{isHire ? "Candidates and hiring pipeline" : isStaff ? "Customer staffing assignments" : "Employee directory and employment history"}</h3>
            <p className="text-sm text-muted-foreground">{isHire ? "Candidate profiles, requisitions, applications, and interviews." : isStaff ? "People assigned to customer accounts and projects." : "Employee records, career events, and employment documents."}</p>
          </div>
          <div className="flex min-w-[220px] items-center gap-2 rounded-md border px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input className="w-full bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records…" />
          </div>
        </div>
        {loading ? <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">Loading workforce records from Supabase…</div> :
          isHire ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3"><span className="text-xs text-muted-foreground">Requisitions</span><b className="mt-1 block text-2xl">{counts.requisitions.toLocaleString()}</b></div>
                <div className="rounded-lg border p-3"><span className="text-xs text-muted-foreground">Applications</span><b className="mt-1 block text-2xl">{counts.applications.toLocaleString()}</b></div>
                <div className="rounded-lg border p-3"><span className="text-xs text-muted-foreground">Interviews</span><b className="mt-1 block text-2xl">{counts.interviews.toLocaleString()}</b></div>
              </div>
              <div className="overflow-auto rounded-lg border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Candidate</th><th className="px-3 py-3">Headline</th><th className="px-3 py-3">Experience</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Status</th></tr></thead>
                  <tbody>{visibleCandidates.slice(0,150).map((candidate) => <tr key={candidate.id} className="border-t"><td className="px-3 py-3"><b>{candidate.first_name} {candidate.last_name}</b><div className="text-xs text-muted-foreground">{candidate.candidate_number} · {candidate.email}</div></td><td className="px-3 py-3">{candidate.headline ?? "—"}</td><td className="px-3 py-3">{Number(candidate.years_experience).toFixed(1)} yrs</td><td className="px-3 py-3">{label(candidate.candidate_source)}</td><td className="px-3 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs">{label(candidate.candidate_status)}</span></td></tr>)}</tbody>
                </table>
              </div>
              <div className="overflow-auto rounded-lg border">
                <div className="border-b px-3 py-3 font-semibold">Recent applications</div>
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Application</th><th className="px-3 py-3">Candidate ID</th><th className="px-3 py-3">Requisition ID</th><th className="px-3 py-3">Stage</th><th className="px-3 py-3">Fit score</th><th className="px-3 py-3">Applied</th></tr></thead>
                  <tbody>{visibleApplications.slice(0,100).map((application) => <tr key={application.id} className="border-t"><td className="px-3 py-3 font-medium">{application.application_number}<div className="text-xs text-muted-foreground">{label(application.application_status)}</div></td><td className="px-3 py-3 text-xs">{application.candidate_id.slice(0,8)}…</td><td className="px-3 py-3 text-xs">{application.requisition_id.slice(0,8)}…</td><td className="px-3 py-3">{label(application.stage)}</td><td className="px-3 py-3">{application.fit_score == null ? "—" : Number(application.fit_score).toFixed(0)}</td><td className="px-3 py-3">{dateText(application.applied_at)}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="overflow-auto rounded-lg border">
                <div className="border-b px-3 py-3 font-semibold">Recent requisitions</div>
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Requisition</th><th className="px-3 py-3">Position</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Opened</th><th className="px-3 py-3">Status</th></tr></thead>
                  <tbody>{requisitions.slice(0,100).map((req) => <tr key={req.id} className="border-t"><td className="px-3 py-3 font-medium">{req.requisition_number}</td><td className="px-3 py-3">{req.title}</td><td className="px-3 py-3">{label(req.employment_type)}</td><td className="px-3 py-3">{dateText(req.opened_at)}</td><td className="px-3 py-3">{label(req.requisition_status)}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          ) : isStaff ? (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Assignment</th><th className="px-3 py-3">Person ID</th><th className="px-3 py-3">Customer account</th><th className="px-3 py-3">Role / project</th><th className="px-3 py-3">Start</th><th className="px-3 py-3">End</th><th className="px-3 py-3">Status</th></tr></thead>
                <tbody>{visibleAssignments.slice(0,150).map((assignment) => <tr key={assignment.id} className="border-t"><td className="px-3 py-3 font-medium">{assignment.assignment_number}</td><td className="px-3 py-3 text-xs">{assignment.workforce_person_id.slice(0,8)}…</td><td className="px-3 py-3">{assignment.customer_account_id.slice(0,8)}…</td><td className="px-3 py-3"><b>{assignment.role_title}</b><div className="text-xs text-muted-foreground">{assignment.project_name}</div></td><td className="px-3 py-3">{dateText(assignment.starts_at)}</td><td className="px-3 py-3">{dateText(assignment.ends_at)}</td><td className="px-3 py-3">{label(assignment.assignment_status)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="overflow-auto rounded-lg border">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Employee</th><th className="px-3 py-3">Position</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Location</th></tr></thead>
                  <tbody>{visiblePeople.slice(0,150).map((person) => <tr key={person.id} className="border-t"><td className="px-3 py-3"><b>{person.display_name}</b><div className="text-xs text-muted-foreground">{person.employee_id}</div></td><td className="px-3 py-3">{person.job_title}</td><td className="px-3 py-3">{person.work_email}</td><td className="px-3 py-3">{label(person.employment_type)}</td><td className="px-3 py-3">{label(person.employment_status)}</td><td className="px-3 py-3">{person.location_city ?? "—"}{person.location_region ? ", "+person.location_region : ""}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="overflow-auto rounded-lg border">
                <div className="border-b px-3 py-3 font-semibold">Recent employment events</div>
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Event</th><th className="px-3 py-3">Person ID</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">New position</th><th className="px-3 py-3">Notes</th></tr></thead>
                  <tbody>{events.slice(0,100).map((event) => <tr key={event.id} className="border-t"><td className="px-3 py-3 font-medium">{label(event.event_type)}</td><td className="px-3 py-3 text-xs">{event.workforce_person_id.slice(0,8)}…</td><td className="px-3 py-3">{dateText(event.event_date)}</td><td className="px-3 py-3">{event.new_title ?? "—"}</td><td className="px-3 py-3">{event.notes ?? "—"}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
      </section>
      <section className="rounded-xl border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2"><FileText className="size-4 text-primary" /><h3 className="font-semibold">Latest {label(moduleKey)} documents</h3></div>
        <div className="overflow-auto rounded-lg border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Document</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Related record</th><th className="px-3 py-3">Effective</th><th className="px-3 py-3">Status</th></tr></thead>
            <tbody>{documents.slice(0,100).map((document) => <tr key={document.id} className="border-t"><td className="px-3 py-3"><b>{document.title}</b><div className="text-xs text-muted-foreground">{document.document_number}</div></td><td className="px-3 py-3">{label(document.document_type)}</td><td className="px-3 py-3 text-xs">{document.workforce_person_id?.slice(0,8) ?? document.candidate_id?.slice(0,8) ?? "—"}…</td><td className="px-3 py-3">{dateText(document.effective_date)}</td><td className="px-3 py-3">{label(document.document_status)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
