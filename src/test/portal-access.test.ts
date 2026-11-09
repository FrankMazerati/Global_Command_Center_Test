import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canEnterCommandCenter,
  canUseLegacyWorkspace,
  isPortalId,
  PORTAL_IDS,
  verifyPortalMembership,
} from "@/lib/portal-access";

function fakeClient(result: unknown): SupabaseClient {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from } as unknown as SupabaseClient;
}

describe("portal access", () => {
  it("defines separate identities for all five portals", () => {
    expect(PORTAL_IDS).toEqual([
      "intellistack",
      "intellistaff",
      "intelliwork",
      "intellihire",
      "tenant",
    ]);
    expect(isPortalId("intellistaff")).toBe(true);
    expect(isPortalId("intelliwork")).toBe(true);
    expect(isPortalId("intellihire")).toBe(true);
    expect(isPortalId("unknown")).toBe(false);
    expect(isPortalId(null)).toBe(false);
  });

  it("allows only an exact account-to-portal assignment", async () => {
    expect(
      await verifyPortalMembership(
        fakeClient({ data: { portal: "intelliwork" }, error: null }),
        "user-1",
        "intelliwork",
      ),
    ).toEqual({ allowed: true });

    expect(
      await verifyPortalMembership(
        fakeClient({ data: { portal: "intellihire" }, error: null }),
        "user-1",
        "intelliwork",
      ),
    ).toEqual({ allowed: false, reason: "wrong_portal" });
  });

  it("denies missing memberships and backend/schema errors", async () => {
    expect(
      await verifyPortalMembership(
        fakeClient({ data: null, error: null }),
        "user-1",
        "intellistaff",
      ),
    ).toEqual({ allowed: false, reason: "wrong_portal" });

    expect(
      await verifyPortalMembership(
        fakeClient({ data: null, error: new Error("table unavailable") }),
        "user-1",
        "intellistaff",
      ),
    ).toEqual({ allowed: false, reason: "unavailable" });
  });

  it("keeps Command Center access with IntelliStack and excludes workforce portals from legacy routes", () => {
    expect(canEnterCommandCenter("intellistack")).toBe(true);
    expect(canEnterCommandCenter("tenant")).toBe(false);
    expect(canEnterCommandCenter("intellistaff")).toBe(false);
    expect(canEnterCommandCenter("intelliwork")).toBe(false);
    expect(canEnterCommandCenter("intellihire")).toBe(false);
    expect(canUseLegacyWorkspace("intellistack")).toBe(true);
    expect(canUseLegacyWorkspace("tenant")).toBe(true);
    expect(canUseLegacyWorkspace("intellistaff")).toBe(false);
    expect(canUseLegacyWorkspace("intelliwork")).toBe(false);
    expect(canUseLegacyWorkspace("intellihire")).toBe(false);
    expect(canUseLegacyWorkspace(null)).toBe(false);
  });
});
