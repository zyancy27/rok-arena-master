/**
 * LiveTypingRegistry
 *
 * Singleton registry that controls whether a given narrator/NPC message
 * should reveal its text with a typing animation. Designed to:
 *
 *  - Animate ONLY messages that arrive after the registry was mounted
 *    (so reloading the page or scrolling through history does not replay
 *    old typewriters).
 *  - Persist completion per messageId so re-renders / virtualization /
 *    React StrictMode re-mounts do not restart a finished animation.
 *  - Honour `prefers-reduced-motion` globally.
 *
 * The registry intentionally lives outside React state so it survives
 * component remounts and so it can be queried synchronously by hooks.
 */

const completedMessageIds = new Set<string>();
let sessionStartedAt = Date.now();
let prefersReducedMotion = false;

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  try {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mql.matches;
    mql.addEventListener?.('change', (e) => {
      prefersReducedMotion = e.matches;
    });
  } catch {
    // ignore
  }
}

/** Reset session start — useful for tests. */
export function __resetLiveTypingRegistryForTests() {
  completedMessageIds.clear();
  sessionStartedAt = Date.now();
}

/**
 * Decide whether this messageId should animate.
 *
 * Rules:
 *  - prefers-reduced-motion → never animate.
 *  - Already marked completed → never animate (hydration-safe).
 *  - createdAt older than session start → never animate (history hydrate).
 *  - Otherwise animate.
 */
export function shouldAnimateMessage(args: {
  messageId: string;
  createdAt?: string | number | Date | null;
}): boolean {
  if (prefersReducedMotion) return false;
  if (completedMessageIds.has(args.messageId)) return false;

  if (args.createdAt != null) {
    const ts = args.createdAt instanceof Date
      ? args.createdAt.getTime()
      : typeof args.createdAt === 'number'
        ? args.createdAt
        : Date.parse(args.createdAt);
    if (!Number.isNaN(ts) && ts < sessionStartedAt - 1500) {
      // older than this app session → already-existing message
      return false;
    }
  }

  return true;
}

export function markMessageTyped(messageId: string) {
  completedMessageIds.add(messageId);
}

export function isMessageTyped(messageId: string): boolean {
  return completedMessageIds.has(messageId);
}

export function getReducedMotion(): boolean {
  return prefersReducedMotion;
}
