import { describe, expect, it } from "vitest";

import {
  getTicketActions,
  validateTicketAction,
  validateTicketDetails,
} from "@/lib/ticket-workflow";

describe("ticket lifecycle actions", () => {
  it("allows an authorized user to start a new ticket", () => {
    expect(getTicketActions("new")).toContain("start");
    expect(validateTicketAction("new", "start")).toBeNull();
  });

  it("requires a meaningful reason for escalations and resolutions", () => {
    expect(validateTicketAction("in_progress", "escalate", "urgent")).toContain("20 characters");
    expect(
      validateTicketAction(
        "in_progress",
        "resolve",
        "Verified fix deployed and requester confirmed service is restored.",
      ),
    ).toBeNull();
  });

  it("does not offer an invalid action for a terminal ticket", () => {
    expect(getTicketActions("cancelled")).toEqual([]);
    expect(
      validateTicketAction("closed", "cancel", "The request was withdrawn by the requester."),
    ).toContain("not available");
  });

  it("requires a closed or resolved ticket to be explicitly reopened", () => {
    expect(getTicketActions("closed")).toContain("reopen");
    expect(
      validateTicketAction(
        "closed",
        "reopen",
        "The resolution did not address the reported issue.",
      ),
    ).toBeNull();
    expect(validateTicketAction("closed", "start")).toContain("not available");
  });

  it("fails closed for unknown status values", () => {
    expect(getTicketActions("unknown-status")).toEqual([]);
    expect(validateTicketAction("unknown-status", "start")).toContain("unsupported status");
  });
});

describe("ticket detail validation", () => {
  it("accepts useful ticket details and rejects short or overlong values", () => {
    expect(
      validateTicketDetails({
        title: "Network access request",
        description: "The user cannot reach the company VPN.",
        category: "Network & Connectivity",
      }),
    ).toBeNull();
    expect(
      validateTicketDetails({ title: "bad", description: "Too short", category: "IT" }),
    ).toContain("title must contain");
    expect(
      validateTicketDetails({
        title: "A useful title",
        description: "x".repeat(10001),
        category: "IT",
      }),
    ).toContain("10 to 10,000");
  });
});
