/**
 * Resolution Engine — Public API
 *
 * Unified outcome resolution layer. Wraps existing d20 combat
 * and campaign-action-rolls into normalized outcome bands.
 */

export {
  type OutcomeBand,
  type ResolutionMode,
  type ConsequenceCategory,
  type ConsequenceOption,
  type NormalizedOutcome,
  OUTCOME_BAND_LABELS,
  OUTCOME_BAND_DESCRIPTIONS,
  wrapDiceRoll,
  wrapHitDetermination,
  wrapActionRoll,
  createCustomOutcome,
} from './outcomeBands';

export {
  type FailForwardSuggestion,
  getFailForwardSuggestion,
  formatFailForwardForNarrator,
  buildConsequenceTags,
} from './failForward';
