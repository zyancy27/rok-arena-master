// Device-local fingerprint / face unlock using the browser's platform authenticator (WebAuthn).
// The device verifies the user's biometric, then we restore that user's saved session on this device.
import { supabase } from '@/integrations/supabase/client';

const KEY = 'rok-biometric-login';
export const REMEMBERED_EMAIL_KEY = 'rok-remembered-email';
export const NO_REMEMBER_KEY = 'rok-no-remember';
export const TAB_ALIVE_KEY = 'rok-tab-alive';

interface BiometricRecord {
  credentialId: string;
  userId: string;
  email: string;
  label: string;
  refreshToken: string;
}

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function getBiometricRecord(): BiometricRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BiometricRecord) : null;
  } catch {
    return null;
  }
}

export async function isBiometricSupported(): Promise<boolean> {
  try {
    return (
      typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

export async function enableBiometric(label: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error('Sign in first.');
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'YourOCRP' },
      user: {
        id: new TextEncoder().encode(session.user.id),
        name: session.user.email ?? label,
        displayName: label,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Fingerprint setup was cancelled.');
  const record: BiometricRecord = {
    credentialId: b64(cred.rawId),
    userId: session.user.id,
    email: session.user.email ?? '',
    label,
    refreshToken: session.refresh_token,
  };
  localStorage.setItem(KEY, JSON.stringify(record));
}

export function disableBiometric() {
  localStorage.removeItem(KEY);
}

/** Keep the saved session fresh as tokens rotate. */
export function syncBiometricToken(userId: string, refreshToken: string) {
  const rec = getBiometricRecord();
  if (rec && rec.userId === userId && rec.refreshToken !== refreshToken) {
    localStorage.setItem(KEY, JSON.stringify({ ...rec, refreshToken }));
  }
}

export async function signInWithBiometric(): Promise<void> {
  const rec = getBiometricRecord();
  if (!rec) throw new Error('Fingerprint login is not set up on this device.');
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: unb64(rec.credentialId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  if (!assertion) throw new Error('Fingerprint check was cancelled.');
  const { error } = await supabase.auth.refreshSession({ refresh_token: rec.refreshToken });
  if (error) {
    disableBiometric();
    throw new Error('Your saved login expired. Sign in with your password, then turn fingerprint on again.');
  }
}

/** Sign out on this device without revoking the session saved for fingerprint unlock. */
export function softSignOut() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
    .forEach((k) => localStorage.removeItem(k));
}
