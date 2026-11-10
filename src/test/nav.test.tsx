import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { ALL_DESTINATIONS, NAV } from "@/lib/nav";
import { routeTree } from "@/routeTree.gen";

describe("hamburger navigation", () => {
  it("has the eleven approved primary areas in order", () => {
    expect(NAV.map((s) => s.title)).toEqual([
      "Home & Command Center",
      "Business Products",
      "Identity & Access Management",
      "Productivity & Collaboration",
      "Service Desk & Enterprise Operations",
      "Security, Risk & Governance",
      "AI & Business Intelligence",
      "Employee & Manager Workspace",
      "Account & Administration",
      "Knowledge Spaces",
      "Help Buddy",
    ]);
  });

  it("exposes Workflow Center, Knowledge Spaces, and a dedicated Help Buddy category", () => {
    const home = NAV.find((section) => section.title === "Home & Command Center");
    const workflow = home?.groups.find((group) => group.title === "Workflow Center");
    expect(workflow?.pages.map((page) => page.title)).toContain("Workflow Templates");
    expect(workflow?.pages.map((page) => page.title)).toContain("Template Builder");
    const knowledge = NAV.find((section) => section.title === "Knowledge Spaces");
    expect(knowledge?.groups.find((group) => group.title === "Workflow Knowledge Library")?.pages.map((page) => page.title)).toContain("Workflow Library");
    const helpBuddy = NAV.find((section) => section.title === "Help Buddy");
    expect(helpBuddy?.groups.find((group) => group.title === "Help Buddy Workspace")?.pages.map((page) => page.title)).toContain("Conversational Library");
    expect(helpBuddy?.groups.flatMap((group) => group.pages.map((page) => page.title))).not.toContain("Workflow Companion");
  });

  it("does not include deferred Tenant Selection or Tenant Guests", () => {
    const titles = ALL_DESTINATIONS.map((d) => d.page.title);
    expect(titles).not.toContain("Tenant Selection");
    expect(titles).not.toContain("Tenant Guests");
  });

  it("lists IntelliDrive only once", () => {
    expect(ALL_DESTINATIONS.filter((d) => d.page.title === "IntelliDrive")).toHaveLength(1);
  });

  it("gives every destination a unique URL that resolves to a page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const urls = ALL_DESTINATIONS.map((d) => `/m/${d.section.slug}/${d.group.slug}/${d.page.slug}`);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(router.matchRoutes(url).at(-1)?.routeId).toBe("/m/$section/$group/$page");
    }
    expect(router.matchRoutes("/m/security-risk-and-governance").at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
