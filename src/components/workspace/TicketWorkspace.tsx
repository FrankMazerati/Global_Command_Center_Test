import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileText,
  Mail,
  MessageSquare,
  NotebookPen,
  Signature,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { StatusBadge, type BuildStatus } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWork } from "@/lib/work-context";
import { cn } from "@/lib/utils";

// The ticket is the working context: every tool opens beside the ticket instead of navigating away.
interface Tool {
  id: string;
  label: string;
  icon: LucideIcon;
  status: BuildStatus;
  purpose: string;
  helpBuddyTab?: string;
}

const TOOLS: Tool[] = [
  {
    id: "directory",
    label: "Active Directory",
    icon: Users,
    status: "Awaiting integration",
    purpose:
      "Look up the requester, review devices, licenses and groups, and submit an access or permission request linked to this ticket.",
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    status: "Awaiting configuration",
    purpose:
      "Draft and send email to the requester from an authorized connected account; replies attach to this ticket.",
  },
  {
    id: "chat",
    label: "IntelliChat",
    icon: MessageSquare,
    status: "Awaiting integration",
    purpose: "Message the requester or another technician without leaving the ticket.",
  },
  {
    id: "calendar",
    label: "IntelliCalendar",
    icon: CalendarDays,
    status: "Awaiting integration",
    purpose: "Schedule follow-up work; the appointment is linked to this ticket.",
  },
  {
    id: "documents",
    label: "IntelliDrive",
    icon: FileText,
    status: "Awaiting integration",
    purpose: "Open authorized documents and attach evidence to this ticket.",
  },
  {
    id: "approvals",
    label: "Sign-off & approval",
    icon: Signature,
    status: "Awaiting integration",
    purpose:
      "Technician signature, manager review and signature, then closure into the permanent audit archive.",
  },
  {
    id: "notes",
    label: "Notes",
    icon: NotebookPen,
    status: "Built",
    purpose: "Private and ticket notes.",
    helpBuddyTab: "notes",
  },
  {
    id: "checklist",
    label: "Checklist",
    icon: CheckSquare,
    status: "Built",
    purpose: "Track required steps.",
    helpBuddyTab: "workflow",
  },
  {
    id: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
    status: "Built",
    purpose: "Find guides without losing the ticket.",
    helpBuddyTab: "knowledge",
  },
];

export function TicketWorkspace() {
  const w = useWork();
  const [tool, setTool] = useState<string>("directory");
  const [ticketInput, setTicketInput] = useState("");
  const current = TOOLS.find((t) => t.id === tool)!;

  if (!w.activeTicketId) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <Ticket className="mb-2 size-7 text-primary" />
        <h2 className="font-semibold">Open a ticket to start working</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The ticket becomes your working context. Directory, email, calendar, documents, knowledge
          and approvals all open beside it.
        </p>
        <form
          className="flex max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (ticketInput.trim()) w.setActiveTicketId(ticketInput.trim().toUpperCase());
          }}
        >
          <Input
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value)}
            placeholder="Ticket ID, e.g. TKT-1042"
            aria-label="Ticket ID"
          />
          <Button type="submit">Open</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Ticket details load from your existing records once the backend is connected.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_minmax(320px,420px)]">
      <section className="rounded-xl border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Ticket className="size-5" />
          </span>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Active ticket</div>
            <div className="font-display text-xl font-bold">{w.activeTicketId}</div>
          </div>
          <StatusBadge status="Awaiting integration" />
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {["Requester", "Status", "Priority", "SLA", "Assigned technician", "Category"].map(
            (f) => (
              <div key={f}>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {f}
                </div>
                <div className="text-sm text-muted-foreground/80">Loads from ticket record</div>
              </div>
            ),
          )}
        </div>
        <div className="border-t px-5 py-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tools for this ticket
          </div>
          <div className="flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => (t.helpBuddyTab ? w.openHelpBuddy(t.helpBuddyTab) : setTool(t.id))}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent",
                  tool === t.id && !t.helpBuddyTab && "border-primary bg-primary/10 text-primary",
                )}
              >
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside
        className="rounded-xl border bg-card shadow-card"
        aria-label={`${current.label} panel`}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <current.icon className="size-5 text-primary" />
          <h2 className="flex-1 font-semibold">{current.label}</h2>
          <StatusBadge status={current.status} />
        </div>
        <div className="space-y-3 p-4 text-sm">
          <p className="text-muted-foreground">{current.purpose}</p>
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Linked to <span className="font-semibold text-foreground">{w.activeTicketId}</span>.
            This panel connects to your existing backend in a later phase, using the same
            permissions as the full module.
          </p>
        </div>
      </aside>
    </div>
  );
}
