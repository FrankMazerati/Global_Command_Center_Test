import type { SupabaseClient } from "@supabase/supabase-js";

export const PORTAL_IDS = [
  "intellistack",
  "intellistaff",
  "intelliwork",
  "intellihire",
  "tenant",
] as const;

export type PortalId = (typeof PORTAL_IDS)[number];

export type PortalAccessResult =
  { allowed: true } | { allowed: false; reason: "wrong_portal" | "unavailable" };

const LEGACY_WORKSPACE_PORTALS = ["intellistack", "tenant"] as const;

export function isPortalId(value: string | null): value is PortalId {
  return value !== null && PORTAL_IDS.includes(value as PortalId);
}

export function canUseLegacyWorkspace(
  portal: string | null,
): portal is (typeof LEGACY_WORKSPACE_PORTALS)[number] {
  return (
    portal !== null &&
    LEGACY_WORKSPACE_PORTALS.includes(portal as (typeof LEGACY_WORKSPACE_PORTALS)[number])
  );
}

export function canEnterCommandCenter(portal: string | null): portal is "intellistack" {
  return portal === "intellistack";
}

/**
 * Fail closed unless the authenticated Supabase identity has the exact portal
 * assignment. The table's RLS policy only exposes the current user's own row.
 */
export async function verifyPortalMembership(
  client: SupabaseClient,
  userId: string,
  expectedPortal: PortalId,
): Promise<PortalAccessResult> {
  try {
    const { data, error } = await client
      .from("user_portal_memberships")
      .select("portal")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return { allowed: false, reason: "unavailable" };
    if (data?.portal !== expectedPortal) {
      return { allowed: false, reason: "wrong_portal" };
    }
    return { allowed: true };
  } catch {
    return { allowed: false, reason: "unavailable" };
  }
}
