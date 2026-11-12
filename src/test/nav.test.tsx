import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { ALL_DESTINATIONS, findPage, findSection, NAV } from "@/lib/nav";
import { routeTree } from "@/routeTree.gen";

describe("hamburger navigation", () => {
  it("has the 30 PDF workspaces in the documented order", () => {
    expect(NAV.map((s) => s.title)).toEqual([
      "My Business Center",
      "My Workspace",
      "Global ID Center",
      "Identity & Access Management",
      "New Active Directory",
      "IntelliStack Configuration Center",
      "IntelliDesk Command Center",
      "IntelliBase",
      "IntelliStack Marketplace",
      "Help Buddy",
      "Collaboration & Productivity",
      "AI Systems & Intelligence",
      "IntelliStaff",
      "NOC — Network Operations Center",
      "SOC — Security Operations Center",
      "Reports, Governance, Audit & Administration",
      "Tenant Desk",
      "Connector Hub",
      "IntelliSync",
      "Automation Center",
      "API & Developer Center",
      "Data Management Center",
      "Workflow Center",
      "Notification Center",
      "Command & Control Center",
      "Global Search",
      "Calendar & Scheduling Center",
      "War Room & Emergency Operations Center",
      "AI Model & Provider Management",
      "Global Reporting & Analytics",
    ]);
  });

  it("keeps navigation to three levels and gives every new page a unique route", () => {
    expect(NAV).toHaveLength(30);
    expect(NAV.every((section) => section.groups.length > 0)).toBe(true);
    expect(NAV.every((section) => section.groups.every((group) => group.pages.length > 0))).toBe(
      true,
    );
    const urls = NAV.flatMap((section) =>
      section.groups.flatMap((group) =>
        group.pages.map((page) => `/m/${section.slug}/${group.slug}/${page.slug}`),
      ),
    );
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("resolves only destinations from the PDF menu", () => {
    for (const destination of ALL_DESTINATIONS) {
      expect(findPage(destination.section.slug, destination.group.slug, destination.page.slug)).toEqual(destination);
    }
    expect(findSection("business-products")).toBeUndefined();
    expect(findSection("knowledge-spaces")).toBeUndefined();
  });

  it("includes the required Help Buddy, IntelliBase, and Workflow destinations", () => {
    expect(NAV.find((section) => section.title === "Help Buddy")).toBeDefined();
    expect(
      NAV.find((section) => section.title === "IntelliBase")?.groups.flatMap((group) =>
        group.pages.map((page) => page.title),
      ),
    ).toContain("Welcome");
    expect(
      NAV.find((section) => section.title === "Workflow Center")?.groups.length,
    ).toBeGreaterThan(0);
  });

  it("does not include deferred Tenant Selection or Tenant Guests", () => {
    const titles = ALL_DESTINATIONS.map((d) => d.page.title);
    expect(titles).not.toContain("Tenant Selection");
    expect(titles).not.toContain("Tenant Guests");
  });

  it("lists only the new menu destinations in search and quick picks", () => {
    expect(ALL_DESTINATIONS.every((destination) => NAV.includes(destination.section))).toBe(true);
    expect(ALL_DESTINATIONS.some((destination) => destination.section.slug === "knowledge-spaces")).toBe(false);
    expect(ALL_DESTINATIONS.some((destination) => destination.section.slug === "business-products")).toBe(false);
  });

  it("gives every destination a unique URL that resolves to a page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const urls = ALL_DESTINATIONS.map((d) => `/m/${d.section.slug}/${d.group.slug}/${d.page.slug}`);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(router.matchRoutes(url).at(-1)?.routeId).toBe("/m/$section/$group/$page");
    }
    expect(router.matchRoutes("/m/soc-security-operations-center").at(-1)?.routeId).not.toBe(
      rootRouteId,
    );
  });
});
