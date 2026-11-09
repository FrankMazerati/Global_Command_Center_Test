import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import {
  dashboardPages,
  getDashboardPage,
  resolveMenuItem,
  filterRecords,
} from "@/lib/dashboard-pages";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it.each(dashboardPages)("resolves the $title reference page", (page) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(`/section/${page.slug}`).at(-1)?.routeId).toBe("/section/$slug");
    expect(getDashboardPage(page.slug)?.title).toBe(page.title);
  });
  it("maps identity menu entries to their reference pages", () => {
    expect(resolveMenuItem("Global User ID", "people-workforce")).toBe("global-user-id");
    expect(resolveMenuItem("Global Company ID", "people-workforce")).toBe("global-company-id");
    expect(resolveMenuItem("IntelliDirectory", "people-workforce")).toBe("intellidirectory");
  });
  it("filters demo records by both status and query", () => {
    const rows = [
      { id: "1", name: "Frank", detail: "Architect", region: "Chicago", status: "Active" },
      { id: "2", name: "Ava", detail: "Engineer", region: "London", status: "Pending" },
    ];
    expect(filterRecords(rows, "Chicago", "Active").map((r) => r.id)).toEqual(["1"]);
    expect(filterRecords(rows, "Frank", "Pending")).toEqual([]);
  });
});
