/**
 * Tester Slash Commands
 * ─────────────────────────────────────────────────────────────────────
 * Inline commands for the tester/developer profile.
 *
 *   /campaign           — switch to immersive campaign mode (default)
 *   /analysis           — switch to system/analysis mode
 *   /feedback <text>    — log system-level tester feedback
 *   /flag <text>        — flag the previous narrator response (narrator-level)
 *   /donotlearn         — mark current campaign as do_not_learn
 *
 * Commands return a parsed action; the chat surface routes them to the
 * appropriate handler (mode toggle, DB write, campaign update).
 */

export type SlashCommand =
  | { kind: 'mode'; mode: 'campaign' | 'analysis' }
  | { kind: 'feedback'; text: string; category?: string }
  | { kind: 'flag'; text: string }
  | { kind: 'donotlearn' }
  | { kind: 'unknown'; raw: string }
  | null;

const FEEDBACK_CATEGORY_HINTS: Record<string, string> = {
  parser: 'parser_failure',
  roll: 'roll_clarity',
  narrator: 'narrator_consistency',
  map: 'map_readability',
  pacing: 'pacing',
  ux: 'ux_confusion',
  memory: 'memory_promotion',
  npc: 'npc_behavior',
};

function inferCategory(text: string): string | undefined {
  const t = text.toLowerCase();
  for (const [hint, cat] of Object.entries(FEEDBACK_CATEGORY_HINTS)) {
    if (t.includes(hint)) return cat;
  }
  return undefined;
}

/**
 * Parse a chat input. Returns null if it isn't a slash command.
 */
export function parseSlashCommand(raw: string): SlashCommand {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return null;

  const [head, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(' ').trim();
  const cmd = head.toLowerCase();

  switch (cmd) {
    case '/campaign':
      return { kind: 'mode', mode: 'campaign' };
    case '/analysis':
    case '/analyze':
    case '/test':
      return { kind: 'mode', mode: 'analysis' };
    case '/feedback':
      if (!arg) return { kind: 'unknown', raw: trimmed };
      return { kind: 'feedback', text: arg, category: inferCategory(arg) };
    case '/flag':
      if (!arg) return { kind: 'unknown', raw: trimmed };
      return { kind: 'flag', text: arg };
    case '/donotlearn':
    case '/dnl':
      return { kind: 'donotlearn' };
    default:
      return { kind: 'unknown', raw: trimmed };
  }
}

/**
 * Quick check used by the chat input to decide whether to route through
 * the slash-command handler before sending to the narrator.
 */
export function isSlashCommand(raw: string): boolean {
  return raw.trim().startsWith('/');
}
