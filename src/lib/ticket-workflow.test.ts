import { describe, expect, it } from "vitest";

import {
  getTicketActions,
  TICKET_STATUSES,
  validateTicketAction,
  validateTicketDetails,
} from "@/lib/ticket-workflow";

describe("ticket workflow contract", () => {
  it("includes every database lifecycle status, including offered", () => {
    expect(TICKET_STATUSES).toEqual([
      "new",
      "offered",
      "accepted",
      "in_progress",
      "waiting",
      "escalated",
      "resolved",
      "closed",
      "cancelled",
    ]);
  });

  it("allows an authorized worker workflow to accept an offered ticket", () => {
    expect(getTicketActions("offered")).toContain("accept");
    expect(validateTicketAction("offered", "accept")).toBeNull();
  });

  it("rejects actions that are not valid for the current state", () => {
    expect(validateTicketAction("closed", "start")).toContain("not available");
    expect(getTicketActions("cancelled")).toEqual([]);
  });

  it("requires a meaningful reason for sensitive lifecycle actions", () => {
    expect(validateTicketAction("in_progress", "resolve", "fixed")).toContain("20 characters");
    expect(
      validateTicketAction(
        "in_progress",
        "resolve",
        "Replaced the failed network switch and verified connectivity.",
      ),
    ).toBeNull();
  });

  it("rejects whitespace-only ticket fields after trimming", () => {
    expect(
      validateTicketDetails({
        title: "     ",
        description: "          ",
        category: "  ",
      }),
    ).not.toBeNull();
  });

  it("matches the database title bounds (4 to 180 characters)", () => {
    expect(
      validateTicketDetails({
        title: "T".repeat(181),
        description: "D".repeat(10),
        category: "Network",
      }),
    ).toContain("4 to 180");
    expect(
      validateTicketDetails({
        title: "Four",
        description: "D".repeat(10),
        category: "Network",
      }),
    ).toBeNull();
  });

  it("rejects descriptions and categories outside the UI contract", () => {
    expect(
      validateTicketDetails({
        title: "Network outage",
        description: "D".repeat(10001),
        category: "Network",
      }),
    ).toContain("10,000");
    expect(
      validateTicketDetails({
        title: "Network outage",
        description: "Users cannot reach the shared drive.",
        category: "N",
      }),
    ).toContain("2 to 100");
  });

  it("validates ticket title, description, and category before submission", () => {
    expect(
      validateTicketDetails({
        title: "Network outage",
        description: "Users cannot reach the shared drive.",
        category: "Network",
      }),
    ).toBeNull();
    expect(
      validateTicketDetails({
        title: "Bad",
        description: "Short",
        category: "N",
      }),
    ).not.toBeNull();
  });
});
