import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ClipboardList, Clock3, Search, ShieldCheck, Workflow } from "lucide-react";
import { toast } from "sonner";

type Template = {
  id: string;
  name: string;
  category: string;
  description: string;
  steps: string[];
  priority?: boolean;
};

const TEMPLATES: Template[] = [
  { id: "IAM-001", name: "Create a new user", category: "Identity & Access Management", description: "Create an identity record and prepare approved access, groups, and licensing.", priority: true, steps: ["Validate requester and approval", "Create identity record and Global User ID", "Assign company, tenant, department, and manager", "Apply approved roles and security groups", "Verify account status and record the audit event"] },
  { id: "IAM-002", name: "Modify user information or role", category: "Identity & Access Management", description: "Update identity attributes and role assignments with approval and audit history.", steps: ["Verify the user's identity", "Review requested changes and authority", "Apply approved profile or role updates", "Confirm access reflects the new role", "Record the change and notify the requester"] },
  { id: "IAM-003", name: "Request or change permissions", category: "Identity & Access Management", description: "Route access requests to the correct owner and apply least-privilege permissions.", steps: ["Capture resource and business justification", "Identify the resource owner", "Obtain required approval", "Apply the minimum approved permission", "Verify access and record evidence"] },
  { id: "IAM-004", name: "Password and MFA recovery", category: "Identity & Access Management", description: "Guide identity verification and secure account recovery.", steps: ["Verify identity using approved policy", "Check account state and recovery eligibility", "Complete authorized password or MFA reset", "Require secure re-authentication", "Confirm recovery and close the request"] },
  { id: "IAM-005", name: "Deactivate, reactivate, or remove account", category: "Identity & Access Management", description: "Control account state changes and preserve required records.", steps: ["Verify request and effective date", "Check legal, HR, and manager approvals", "Disable or reactivate account as authorized", "Review sessions, groups, licenses, and assets", "Record evidence and notify stakeholders"] },
  { id: "EMP-001", name: "Employee onboarding", category: "Employee Lifecycle", description: "Coordinate the employee's identity, equipment, applications, training, and first-day readiness.", priority: true, steps: ["Confirm accepted offer and start date", "Create user identity and directory account", "Assign groups, email, and approved applications", "Assign and prepare device and peripherals", "Deliver access instructions and required training", "Obtain manager confirmation of readiness"] },
  { id: "EMP-002", name: "Employee offboarding", category: "Employee Lifecycle", description: "Coordinate approved access removal, asset recovery, and records retention.", priority: true, steps: ["Confirm departure and effective time", "Obtain HR and manager authorization", "Disable sign-in and revoke active sessions", "Reclaim licenses and recover equipment", "Transfer approved business data and ownership", "Verify completion and preserve audit evidence"] },
  { id: "EMP-003", name: "Employee transfer or promotion", category: "Employee Lifecycle", description: "Align department, manager, role, permissions, and equipment with the new position.", steps: ["Confirm effective date and new reporting line", "Review current access and responsibilities", "Approve new role and permission set", "Update directory and group memberships", "Verify required tools and remove obsolete access", "Notify employee and manager"] },
  { id: "EMP-004", name: "Contractor onboarding or offboarding", category: "Employee Lifecycle", description: "Manage time-bound contractor access and return obligations.", steps: ["Validate sponsor, contract, and end date", "Create or disable the contractor identity", "Grant only sponsor-approved access", "Track equipment and license assignment or return", "Confirm expiry and preserve sponsor sign-off"] },
  { id: "ITSM-001", name: "Incident reporting and resolution", category: "IT Service Management", description: "Capture impact, prioritize response, resolve, verify, and close an incident.", priority: true, steps: ["Capture incident details and affected users", "Classify impact, urgency, and priority", "Assign owner and response target", "Investigate and document actions", "Verify service restoration with requester", "Resolve and close with audit history"] },
  { id: "ITSM-002", name: "General IT service request", category: "IT Service Management", description: "Route a standard service request through fulfillment and confirmation.", steps: ["Capture request and business need", "Validate eligibility and approvals", "Assign fulfillment team", "Complete requested service", "Confirm delivery and close request"] },
  { id: "ITSM-003", name: "Software installation request", category: "IT Service Management", description: "Check compatibility, license entitlement, approval, and installation.", priority: true, steps: ["Identify application and target device", "Check security and compatibility requirements", "Confirm license and Marketplace entitlement", "Obtain required approval", "Install or provision through approved method", "Verify launch and record version"] },
  { id: "ITSM-004", name: "Hardware repair or replacement", category: "IT Service Management", description: "Diagnose hardware issues and coordinate repair, replacement, and asset updates.", steps: ["Capture symptoms and asset details", "Perform approved diagnostic checks", "Determine repair or replacement path", "Obtain approval and arrange logistics", "Update asset assignment and verify operation"] },
  { id: "ITSM-005", name: "Technical troubleshooting and escalation", category: "IT Service Management", description: "Use documented diagnostics, evidence, and controlled escalation.", steps: ["Capture symptoms and scope", "Search approved Knowledge Base guidance", "Run safe diagnostic steps", "Document findings and evidence", "Escalate with complete handoff context", "Confirm resolution with requester"] },
  { id: "AST-001", name: "New device deployment", category: "Device & Asset Management", description: "Prepare, secure, assign, and verify a new endpoint.", steps: ["Confirm approved device request", "Register asset and serial number", "Apply approved configuration and security baseline", "Assign user and required applications", "Verify compliance and user receipt"] },
  { id: "AST-002", name: "Device replacement or upgrade", category: "Device & Asset Management", description: "Coordinate replacement, data transfer, and inventory reconciliation.", steps: ["Validate replacement approval", "Identify old and replacement assets", "Prepare replacement and approved data transfer", "Assign replacement device", "Recover old device and update inventory"] },
  { id: "AST-003", name: "Equipment return and recovery", category: "Device & Asset Management", description: "Track equipment return, condition, sanitization, and reassignment.", steps: ["Create return checklist and due date", "Notify assigned user and manager", "Receive and inspect equipment", "Sanitize and update asset condition", "Close return record and reconcile inventory"] },
  { id: "AST-004", name: "Lost, stolen, or damaged equipment", category: "Device & Asset Management", description: "Coordinate reporting, containment, replacement, and evidence.", steps: ["Capture incident and asset identity", "Notify security and asset owner", "Apply approved remote lock or containment", "Assess replacement and insurance requirements", "Update inventory and close with evidence"] },
  { id: "MKT-001", name: "Application purchase or subscription request", category: "Applications, Licensing & Marketplace", description: "Route a catalog purchase through entitlement, budget, and approval checks.", priority: true, steps: ["Select application and subscription level", "Check existing entitlement and seat availability", "Validate budget and purchasing authority", "Obtain manager or finance approval", "Record order and subscription ownership"] },
  { id: "MKT-002", name: "Application provisioning", category: "Applications, Licensing & Marketplace", description: "Provision an approved Marketplace product to the correct user or tenant.", priority: true, steps: ["Verify approved order and entitlement", "Resolve target user, tenant, and role", "Provision the application or service", "Apply access and configuration", "Verify availability and notify requester"] },
  { id: "MKT-003", name: "License assignment or reclamation", category: "Applications, Licensing & Marketplace", description: "Assign available licenses or reclaim unused entitlements.", steps: ["Identify user and product entitlement", "Check seat availability and policy", "Approve assignment or reclamation", "Apply license change", "Reconcile Marketplace and directory records"] },
  { id: "MKT-004", name: "Subscription upgrade, downgrade, or cancellation", category: "Applications, Licensing & Marketplace", description: "Manage subscription changes with proration, access, and renewal checks.", steps: ["Capture requested plan change and effective date", "Review contract, billing, and seat impact", "Obtain authorized approval", "Apply plan or cancellation change", "Reconcile entitlements and confirm outcome"] },
  { id: "COL-001", name: "Email and mailbox provisioning", category: "Collaboration & Productivity", description: "Prepare a mailbox and approved mail features for a user.", steps: ["Validate identity and mailbox request", "Check license and naming policy", "Provision mailbox and approved settings", "Apply access and retention policy", "Verify delivery and notify user"] },
  { id: "COL-002", name: "Shared drive or folder access", category: "Collaboration & Productivity", description: "Grant scoped access to shared files and workspaces.", steps: ["Identify resource and business need", "Confirm data owner and classification", "Obtain owner approval", "Apply least-privilege access", "Verify access and record review date"] },
  { id: "COL-003", name: "Calendar, collaboration, and communication setup", category: "Collaboration & Productivity", description: "Set up approved collaboration tools and team memberships.", steps: ["Identify user, team, and required tools", "Confirm entitlements and approvals", "Provision memberships and preferences", "Verify invitations and access", "Provide quick-start guidance"] },
  { id: "SEC-001", name: "Suspicious account activity investigation", category: "Security & Compliance Operations", description: "Triage suspicious identity activity and coordinate authorized containment.", steps: ["Capture alert and affected identity", "Validate event context and severity", "Notify authorized security owner", "Contain account or sessions if approved", "Document findings and disposition"] },
  { id: "SEC-002", name: "Access review and authorization", category: "Security & Compliance Operations", description: "Review access against role, ownership, and least-privilege policy.", steps: ["Define review scope and owner", "Collect current access assignments", "Review business justification", "Approve, modify, or revoke access", "Record reviewer decision and evidence"] },
  { id: "SEC-003", name: "Security incident reporting and remediation", category: "Security & Compliance Operations", description: "Track security incident response, remediation, verification, and closure.", steps: ["Create incident and preserve initial evidence", "Classify severity and assign response owner", "Approve and coordinate containment", "Track remediation tasks and dependencies", "Verify recovery and complete incident review"] },
  { id: "BIZ-001", name: "Purchase or expense approval", category: "Business Operations & Approvals", description: "Route a purchase or expense through budget owner and finance approval.", steps: ["Capture amount, purpose, and supporting documents", "Validate policy and budget availability", "Route to authorized approver", "Record decision and purchase reference", "Notify requester and reconcile records"] },
  { id: "BIZ-002", name: "New vendor or service provider onboarding", category: "Business Operations & Approvals", description: "Coordinate vendor review, risk checks, approvals, and service setup.", steps: ["Capture vendor profile and service scope", "Collect required tax, legal, and security documents", "Complete risk and compliance review", "Obtain procurement and business approval", "Create vendor record and review schedule"] },
];

const CATEGORIES = [
  "All categories",
  "Identity & Access Management",
  "Employee Lifecycle",
  "IT Service Management",
  "Device & Asset Management",
  "Applications, Licensing & Marketplace",
  "Collaboration & Productivity",
  "Security & Compliance Operations",
  "Business Operations & Approvals",
];

export function WorkflowCenter({ title }: { title: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [selected, setSelected] = useState<Template>(TEMPLATES[0]);
  const filtered = useMemo(() => TEMPLATES.filter((template) =>
    (category === "All categories" || template.category === category) &&
    (query.trim() === "" || `${template.name} ${template.id} ${template.description} ${template.category}`.toLowerCase().includes(query.toLowerCase()))
  ), [category, query]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Workflow className="size-4" /> Workflow Center</div>
            <h2 className="mt-1 text-2xl font-bold">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Reusable, versioned workflow templates for identity, employee lifecycle, service desk, assets, Marketplace, collaboration, security, and business operations.</p>
          </div>
          <div className="rounded-lg border bg-background px-4 py-3 text-right">
            <b className="block text-2xl tabular-nums">{TEMPLATES.length}</b>
            <span className="text-xs text-muted-foreground">Initial templates</span>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border bg-background/60 p-3"><ClipboardList className="mb-1 size-4 text-primary"/><b className="block text-sm">Template</b><span className="text-xs text-muted-foreground">Reusable process definition</span></div>
          <div className="rounded-lg border bg-background/60 p-3"><Workflow className="mb-1 size-4 text-primary"/><b className="block text-sm">Workflow instance</b><span className="text-xs text-muted-foreground">A specific run for a person or request</span></div>
          <div className="rounded-lg border bg-background/60 p-3"><CheckCircle2 className="mb-1 size-4 text-primary"/><b className="block text-sm">Tasks & checkpoints</b><span className="text-xs text-muted-foreground">Assigned actions with verifiable completion</span></div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border bg-background px-3"><Search className="size-4 text-muted-foreground"/><input className="w-full bg-transparent py-2 text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates…" aria-label="Search workflow templates"/></label>
          <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter workflow category">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{filtered.length} templates shown</span><span>·</span><span>8 categories</span><span>·</span><span>Versioned definitions</span>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.85fr)]">
        <section className="grid content-start gap-3 sm:grid-cols-2" aria-label="Workflow template catalog">
          {filtered.map((template) => (
            <button key={template.id} type="button" onClick={() => setSelected(template)} className={`rounded-xl border bg-card p-4 text-left shadow-card transition hover:border-primary/50 hover:bg-accent/30 ${selected.id === template.id ? "border-primary ring-1 ring-primary/30" : ""}`}>
              <div className="flex items-start justify-between gap-2"><span className="text-[11px] font-semibold tracking-wider text-primary">{template.id}</span>{template.priority && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Core workflow</span>}</div>
              <b className="mt-2 block text-sm">{template.name}</b>
              <span className="mt-1 block text-xs text-muted-foreground">{template.category}</span>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{template.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">View checkpoints <span aria-hidden="true">→</span></span>
            </button>
          ))}
          {filtered.length === 0 && <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground sm:col-span-2">No templates match this search.</div>}
        </section>

        <aside className="h-fit rounded-xl border bg-card p-5 shadow-card" aria-label="Selected workflow template">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><BookOpen className="size-4"/> Template details</div>
          <h2 className="mt-2 text-lg font-bold">{selected.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{selected.id} · {selected.category}</p>
          <p className="mt-3 text-sm text-muted-foreground">{selected.description}</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><CheckCircle2 className="size-4"/> Tasks and checkpoints</div>
          <ol className="mt-2 space-y-2">{selected.steps.map((step, index) => <li key={step} className="flex gap-2 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span><span>{step}</span></li>)}</ol>
          <div className="mt-4 rounded-lg border border-amber-300/50 bg-amber-50/60 p-3 text-xs text-amber-900"><div className="flex items-center gap-1 font-semibold"><Clock3 className="size-3.5"/> Execution integration pending</div><p className="mt-1">These are reusable template definitions. Starting and persisting live workflow instances requires the Workflow Companion and IntelliSync backend integration.</p></div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4"/> Approval and evidence requirements must be enforced by role and tenant permissions.</div>
          <button type="button" onClick={() => toast.info("Template selected. Workflow instance creation will be enabled when the execution backend is connected.")} className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Select template</button>
        </aside>
      </div>
    </div>
  );
}
