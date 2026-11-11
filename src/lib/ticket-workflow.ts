export const TICKET_STATUSES = [
  "new",
  "accepted",
  "in_progress",
  "waiting",
  "escalated",
  "resolved",
  "closed",
  "cancelled",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketAction =
  | "accept"
  | "start"
  | "wait_requester"
  | "wait_internal"
  | "resume"
  | "escalate"
  | "resolve"
  | "close"
  | "reopen"
  | "cancel"
  | "assign"
  | "set_priority";

export function validateTicketDetails(input: {
  title: string;
  description: string;
  category: string;
}): string | null {
  const title = input.title.trim();
  const description = input.description.trim();
  const category = input.category.trim();
  if (title.length < 5 || title.length > 240) {
    return "Ticket title must contain 5 to 240 characters.";
  }
  if (description.length < 10 || description.length > 10000) {
    return "Ticket details must contain 10 to 10,000 characters.";
  }
  if (category.length < 2 || category.length > 100) {
    return "Ticket category must contain 2 to 100 characters.";
  }
  return null;
}

const ACTIONS_BY_STATUS: Record<TicketStatus, readonly TicketAction[]> = {
  new: [
    "accept",
    "start",
    "wait_requester",
    "wait_internal",
    "escalate",
    "cancel",
    "assign",
    "set_priority",
  ],
  accepted: [
    "start",
    "wait_requester",
    "wait_internal",
    "escalate",
    "resolve",
    "cancel",
    "assign",
    "set_priority",
  ],
  in_progress: [
    "wait_requester",
    "wait_internal",
    "escalate",
    "resolve",
    "cancel",
    "assign",
    "set_priority",
  ],
  waiting: ["resume", "escalate", "resolve", "cancel", "assign", "set_priority"],
  escalated: [
    "start",
    "wait_requester",
    "wait_internal",
    "resolve",
    "cancel",
    "assign",
    "set_priority",
  ],
  resolved: ["close", "reopen", "set_priority"],
  closed: ["reopen", "set_priority"],
  cancelled: [],
};

const REASON_REQUIRED: ReadonlySet<TicketAction> = new Set([
  "wait_requester",
  "wait_internal",
  "escalate",
  "resolve",
  "reopen",
  "cancel",
]);

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  new: "New",
  accepted: "Accepted",
  in_progress: "In progress",
  waiting: "Waiting",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const TICKET_ACTION_LABELS: Record<TicketAction, string> = {
  accept: "Accept ticket",
  start: "Start work",
  wait_requester: "Wait for requester",
  wait_internal: "Wait for internal team",
  resume: "Resume work",
  escalate: "Escalate",
  resolve: "Resolve ticket",
  close: "Close ticket",
  reopen: "Reopen ticket",
  cancel: "Cancel ticket",
  assign: "Assign",
  set_priority: "Change priority",
};

export function getTicketActions(status: string): TicketAction[] {
  if (!TICKET_STATUSES.includes(status as TicketStatus)) return [];
  return [...ACTIONS_BY_STATUS[status as TicketStatus]];
}

export function ticketActionNeedsReason(action: TicketAction): boolean {
  return REASON_REQUIRED.has(action);
}

export function validateTicketAction(
  status: string,
  action: TicketAction,
  reason = "",
): string | null {
  if (!TICKET_STATUSES.includes(status as TicketStatus))
    return "This ticket has an unsupported status.";
  if (!ACTIONS_BY_STATUS[status as TicketStatus].includes(action)) {
    return `“${TICKET_ACTION_LABELS[action]}” is not available while this ticket is ${TICKET_STATUS_LABELS[status as TicketStatus].toLowerCase()}.`;
  }
  if (REASON_REQUIRED.has(action) && reason.trim().length < 20) {
    return "Add a reason of at least 20 characters before applying this action.";
  }
  if (reason.length > 2000) return "The reason must be 2,000 characters or fewer.";
  return null;
}
