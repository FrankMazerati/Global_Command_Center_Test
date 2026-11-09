import { describe, expect, it } from "vitest";
import {
  allDestinations,
  canRoleSee,
  externalSections,
  findDestination,
  menuSections,
  nativeSections,
  orderedSections,
  searchDestinations,
  sectionsForRole,
} from "@/lib/menu-spec";

describe("master menu structure", () => {
  it("has the thirteen native sections plus a separate external block", () => {
    expect(nativeSections).toHaveLength(13);
    expect(nativeSections.map((section) => section.title)).toEqual([
      "My Business Center",
      "Command Center",
      "New Active Directory",
      "Productivity",
      "Communication",
      "Collaboration",
      "Knowledge Base",
      "AI Systems",
      "Network Operations Center",
      "Security",
      "Governance",
      "Audit",
      "Settings",
    ]);
    expect(externalSections).toHaveLength(1);
    expect(externalSections[0]?.external).toBe(true);
  });

  it("gives every destination its own stable, unique address", () => {
    const slugs = allDestinations.map((destination) => destination.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9-]+$/.test(slug))).toBe(true);
    expect(allDestinations.length).toBeGreaterThan(200);
    expect(findDestination("new-active-directory-create-user")?.label).toBe("Create User");
    expect(findDestination("network-operations-network-topology")?.label).toBe("Network Topology");
  });

  it("keeps tenant operational work inside IntelliDesk's Tenant Desk", () => {
    const tenantDesk = menuSections
      .find((section) => section.id === "command-center")
      ?.groups.find((group) => group.name === "Tenant Desk");
    expect(tenantDesk?.destinations).toHaveLength(7);
    // Tenant *operational work* lives only in Tenant Desk; tenant business and
    // knowledge records are owned by their own applications.
    const operational = [
      "Tenant Tickets",
      "Tenant Service Requests",
      "Tenant Work Queues",
      "Tenant Escalations",
      "Tenant Support History",
      "Tenant Activity",
    ];
    const misplaced = allDestinations.filter(
      (destination) =>
        operational.includes(destination.label) && destination.groupName !== "Tenant Desk",
    );
    expect(misplaced).toHaveLength(0);
  });

  it("keeps Settings as the final native destination", () => {
    const ordered = orderedSections([]);
    const native = ordered.filter((section) => !section.external);
    expect(native[native.length - 1]?.title).toBe("Settings");
    // an explicit user order still cannot move Settings off the end
    const reordered = orderedSections(["settings", "audit", "security"]);
    const tail = reordered.filter((section) => !section.external).slice(-1)[0];
    expect(tail?.title).toBe("Settings");
  });

  it("never mixes external connectors into the native list", () => {
    const ordered = orderedSections([]);
    const firstExternal = ordered.findIndex((section) => section.external);
    expect(ordered.slice(firstExternal).every((section) => section.external)).toBe(true);
  });

  it("filters navigation by role", () => {
    const technicianSections = sectionsForRole("technician").map((section) => section.title);
    expect(technicianSections).toContain("Command Center");
    expect(technicianSections).not.toContain("Governance");

    const managerSections = sectionsForRole("manager").map((section) => section.title);
    expect(managerSections).toContain("Governance");
    expect(managerSections).toContain("My Business Center");

    const business = menuSections.find((section) => section.id === "business-center");
    expect(business ? canRoleSee(business, "technician") : false).toBe(false);
    expect(business ? canRoleSee(business, "administrator") : false).toBe(true);
  });

  it("searches across sections, groups and owners", () => {
    expect(searchDestinations("vulnerability").map((item) => item.label)).toContain(
      "Vulnerability Management",
    );
    expect(searchDestinations("intellidrive").length).toBeGreaterThan(0);
    expect(searchDestinations("").length).toBe(0);
    expect(searchDestinations("zzzz-no-such-place")).toHaveLength(0);
  });
});
