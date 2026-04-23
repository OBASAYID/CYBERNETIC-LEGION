import { useState } from "react";
import { getStoredUserRole } from "@/lib/auth-storage";

/**
 * Role from the last successful gate login. Dashboard remounts after auth, so a single read is enough.
 * Missing role is treated as non-admin in the UI.
 */
export function useUserRole() {
  return useState<"admin" | "user" | null>(() => getStoredUserRole())[0];
}
