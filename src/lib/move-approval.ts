/**
 * Move Approval Helpers
 *
 * Provides:
 *  - normalizeMoveText / hashMoveText for dedupe across re-validation attempts
 *  - inferApprovalFromProse as a safety net when the structured `moveApproved`
 *    boolean is missing but the narrator text clearly approves the move
 *
 * The structured boolean from the edge function is always the source of
 * truth. Prose inference is only a fallback to break "text says approved
 * but boolean missing" loops.
 */

const APPROVAL_PATTERNS: RegExp[] = [
  /\bmove\s+(is\s+)?(approved|allowed|accepted|valid)\b/i,
  /\b(approved|allowed|accepted)\b[^.?!]*\bmove\b/i,
  /\b(i|the\s+narrator)\s+(approve|allow|accept)\b/i,
  /\bthat\s+(works|makes\s+sense|is\s+fair|is\s+valid)\b/i,
  /\byou\s+may\s+(proceed|do\s+(this|that|so))\b/i,
  /\bgo\s+ahead\b.*\b(move|action|attempt)\b/i,
  /\bpermitted\b/i,
];

const REJECTION_PATTERNS: RegExp[] = [
  /\bnot\s+(approved|allowed|accepted|valid|permitted)\b/i,
  /\b(reject|denied|disallow|cannot\s+do)\b/i,
  /\bdoes\s+not\s+(connect|fit|match|align)\b/i,
];

export function normalizeMoveText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lightweight non-cryptographic hash for dedupe purposes. */
export function hashMoveText(text: string | null | undefined): string {
  const norm = normalizeMoveText(text);
  if (!norm) return '';
  let h = 2166136261;
  for (let i = 0; i < norm.length; i += 1) {
    h ^= norm.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function isSameMoveText(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeMoveText(a) === normalizeMoveText(b);
}

/**
 * Returns true if the narrator's prose clearly approves the move.
 * Used only as a fallback when the structured `moveApproved` field is null.
 */
export function inferApprovalFromProse(answer: string | null | undefined): boolean {
  if (!answer || typeof answer !== 'string') return false;
  const text = answer.trim();
  if (text.length === 0) return false;

  // Reject signals win over approval signals — fail safe.
  for (const re of REJECTION_PATTERNS) {
    if (re.test(text)) return false;
  }
  for (const re of APPROVAL_PATTERNS) {
    if (re.test(text)) return true;
  }
  return false;
}
