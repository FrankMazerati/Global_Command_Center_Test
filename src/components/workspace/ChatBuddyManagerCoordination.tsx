import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseClient } from "@/lib/supabase";
import { decideWorkItemApproval } from "@/lib/command-work";

type Approval = {
  id: string; work_item_id: string; requested_by_profile_id: string;
  approver_profile_id: string | null; status: string; reason: string;
  decision_reason: string | null; requested_at: string;
};
type WorkItem = { id: string; title: string; description: string | null; priority: string; status: string };

export function ChatBuddyManagerCoordination() {
  const supabase = getSupabaseClient();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [items, setItems] = useState<Record<string, WorkItem>>({});
  const [userId, setUserId] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!supabase) { setError("The secure database connection is unavailable."); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in to view manager coordination.");
      setUserId(auth.user.id);
      const { data, error: approvalError } = await supabase.from("command_work_item_approvals")
        .select("id,work_item_id,requested_by_profile_id,approver_profile_id,status,reason,decision_reason,requested_at")
        .order("requested_at", { ascending: false }).limit(200);
      if (approvalError) throw approvalError;
      const rows = (data ?? []) as Approval[];
      setApprovals(rows);
      const ids = [...new Set(rows.map((row) => row.work_item_id))];
      if (ids.length) {
        const { data: workRows, error: workError } = await supabase.from("command_work_items")
          .select("id,title,description,priority,status").in("id", ids);
        if (workError) throw workError;
        setItems(Object.fromEntries(((workRows ?? []) as WorkItem[]).map((row) => [row.id, row])));
      } else setItems({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Manager approvals could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, [supabase]);

  async function decide(approval: Approval, decision: "approved" | "denied") {
    const reason = (reasons[approval.id] ?? "").trim();
    if (reason.length < 4) { setError("Enter a decision note of at least four characters."); return; }
    setBusyId(approval.id);
    setError(null);
    try {
      await decideWorkItemApproval(approval.id, decision, reason);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your decision could not be saved. Check your approval permissions.");
    } finally { setBusyId(null); }
  }

  const pending = approvals.filter((row) => row.status === "pending");
  const decided = approvals.filter((row) => row.status !== "pending");
  return <div className="space-y-4">
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><ClipboardCheck className="size-6" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Chat Buddy · Team coordination</p><h2 className="text-xl font-semibold">Manager approvals</h2><p className="text-sm text-muted-foreground">Review approval requests for work items visible to your account. Decisions are checked by database permissions.</p></div><Button type="button" size="icon" variant="outline" className="ml-auto" onClick={() => void reload()} disabled={loading} aria-label="Refresh approvals"><RefreshCw className="size-4" /></Button></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg bg-muted/60 p-3"><div className="text-2xl font-semibold tabular-nums">{pending.length}</div><div className="text-xs text-muted-foreground">Pending</div></div><div className="rounded-lg bg-muted/60 p-3"><div className="text-2xl font-semibold tabular-nums">{decided.length}</div><div className="text-xs text-muted-foreground">Decided</div></div></div>
    </section>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {loading ? <section className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Loading approval requests…</section> : <>
      <section className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><ShieldAlert className="size-4 text-primary" /> Pending requests</h3>
        {pending.length ? <div className="space-y-3">{pending.map((approval) => {
          const item = items[approval.work_item_id];
          const canAttemptDecision = approval.requested_by_profile_id !== userId;
          return <article key={approval.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{item?.title ?? "Work item"}</b><span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] text-amber-700">Pending</span></div>
            {item?.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
            <p className="mt-2 text-sm">{approval.reason}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Requested {new Date(approval.requested_at).toLocaleString()} · {approval.approver_profile_id ? "Assigned approver" : "Organization administrator approval"}</p>
            {canAttemptDecision ? <div className="mt-3 space-y-2"><Textarea rows={2} maxLength={1000} placeholder="Decision note (at least 4 characters)" value={reasons[approval.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [approval.id]: event.target.value }))} /><div className="flex flex-wrap justify-end gap-2"><Button type="button" size="sm" variant="outline" disabled={busyId === approval.id} onClick={() => void decide(approval,"denied")}><XCircle className="mr-1 size-3.5" />Deny</Button><Button type="button" size="sm" disabled={busyId === approval.id} onClick={() => void decide(approval,"approved")}><CheckCircle2 className="mr-1 size-3.5" />{busyId === approval.id ? "Saving…" : "Approve"}</Button></div></div> : <p className="mt-2 text-xs text-muted-foreground">You requested this approval; another authorized manager must decide it.</p>}
          </article>;
        })}</div> : <p className="py-5 text-center text-sm text-muted-foreground">No pending approval requests are visible to your account.</p>}
      </section>
      <section className="rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">Decision history</h3>{decided.length ? <div className="divide-y">{decided.map((approval) => <div key={approval.id} className="py-3"><div className="flex items-center justify-between gap-2"><b className="text-sm">{items[approval.work_item_id]?.title ?? "Work item"}</b><span className="text-xs capitalize text-muted-foreground">{approval.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{approval.decision_reason ?? "No decision note recorded."}</p></div>)}</div> : <p className="py-4 text-sm text-muted-foreground">No decisions have been recorded yet.</p>}</section>
    </>}
  </div>;
}
