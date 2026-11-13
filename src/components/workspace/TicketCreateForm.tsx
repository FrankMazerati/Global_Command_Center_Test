import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPortalTicket, type TicketRecord } from "@/lib/tickets";
import { validateTicketDetails, type TicketPriority } from "@/lib/ticket-workflow";

const CATEGORIES = [
  "Service Request",
  "Identity & Access",
  "Security & Compliance",
  "Network & Connectivity",
  "Endpoint & Device",
  "Software & Productivity",
  "Knowledge & Workflow",
  "Hardware",
  "Finance & Billing",
];
const DEFAULT_CATEGORY = CATEGORIES[0]!;
const PRIORITIES: TicketPriority[] = ["critical", "high", "medium", "low"];

export function TicketCreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (ticket: TicketRecord) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const validationError = validateTicketDetails({ title, description, category });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const ticket = await createPortalTicket({ title, description, category, priority });
      setTitle("");
      setDescription("");
      setCategory(DEFAULT_CATEGORY);
      setPriority("medium");
      onCreated(ticket);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ticket creation failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Subject</span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={5}
            maxLength={240}
            required
            autoComplete="off"
            aria-label="Ticket subject"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Ticket category"
          >
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span className="font-medium">What happened, and what help do you need?</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          minLength={10}
          maxLength={10000}
          required
          rows={4}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Ticket details"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-44 space-y-1 text-sm">
          <span className="font-medium">Requested priority</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TicketPriority)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Requested priority"
          >
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create ticket"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        The database derives your organization, tenant, and requester identity from your signed-in
        profile. Ticket-level access remains subject to the existing Supabase grants and row-level
        security.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  );
}
