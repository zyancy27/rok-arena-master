/**
 * Lightweight session-only gate for internal pages (admin, feature checklist).
 *
 * NOTE: This is a UX gate, not a security boundary. Real authorization for
 * privileged actions (role changes, mod actions) is enforced server-side via
 * RLS and SECURITY DEFINER functions like admin_set_user_role.
 */

const STORAGE_KEY = 'ocrp-internal-gate-unlocked';
const PASSWORD = 'Veyra-94!Moon_Rift#27';

export function isInternalUnlocked(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function tryUnlockInternal(input: string): boolean {
  if (input === PASSWORD) {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    return true;
  }
  return false;
}

export function lockInternal(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
