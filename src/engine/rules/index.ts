// Rule Engine — Public API

export { evaluateRules, aggregateRuleResults } from './ruleEngine';
export type { CombatRule, RuleContext, RuleResult } from './ruleEngine';

// Individual rules
export { ruleChargeAttack } from './rule_chargeAttack';
export { ruleInvalidAbility } from './rule_invalidAbility';
export { ruleConcentration } from './rule_concentration';
export { ruleEnvironmentInteraction } from './rule_environmentInteraction';
export { ruleConstructCreation } from './rule_constructCreation';
export { ruleTurnValidation } from './rule_turnValidation';

/**
 * Default rule set — all built-in rules in priority order.
 * Import this and pass to evaluateRules() for standard combat.
 */
import { ruleTurnValidation } from './rule_turnValidation';
import { ruleChargeAttack } from './rule_chargeAttack';
import { ruleInvalidAbility } from './rule_invalidAbility';
import { ruleConstructCreation } from './rule_constructCreation';
import { ruleEnvironmentInteraction } from './rule_environmentInteraction';
import { ruleConcentration } from './rule_concentration';

export const DEFAULT_COMBAT_RULES = [
  ruleTurnValidation,
  ruleChargeAttack,
  ruleInvalidAbility,
  ruleConstructCreation,
  ruleEnvironmentInteraction,
  ruleConcentration,
];
