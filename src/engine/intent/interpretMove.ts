/**
 * Intent Interpretation — Engine Entry Point
 *
 * Wraps the existing intent-interpreter and adds structured action output.
 * This is the first step in the combat pipeline:
 *   Player Text → interpretMove → classifyAction → detectTargets → ...
 */

export { interpretMove } from '@/lib/intent-interpreter';
export type { MoveIntent, ActionType, IntentCategory, Posture, Targeting } from '@/lib/intent-interpreter';
