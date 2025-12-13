import { cookies } from "next/headers";

/**
 * Check if the current request has valid master admin authentication
 */
export function isMasterAuthenticated(): boolean {
  const cookieStore = cookies();
  const authCookie = cookieStore.get("michelle-master-auth");
  return authCookie?.value === "authenticated";
}

/**
 * Verify master authentication and return 401 if not authenticated
 */
export function verifyMasterAuth(): boolean {
  if (!isMasterAuthenticated()) {
    return false;
  }
  return true;
}
