export interface CombatIntentContextOptions {
  possibleTargets?: string[];
}

export interface CombatIntentContext {
  isQuestion: boolean;
  isSpeculative: boolean;
  isObservation: boolean;
  isInventoryContext: boolean;
  hasAttackVerb: boolean;
  hasAbilityVerb: boolean;
  hasActionDeclaration: boolean;
  hasDirectedTarget: boolean;
  mentionsWeapon: boolean;
  mentionsDomain: boolean;
  explicitAttack: boolean;
  explicitAbility: boolean;
  suppressCombat: boolean;
  reasons: string[];
}

const QUESTION_START = /^\s*(is|are|am|was|were|what|why|how|does|do|did|can|could|should|would|will|who|whom|whose|where|when)\b/i;
const QUESTION_PHRASES = /\b(is this|are we|what is|why is|how does|how do|does this|do you think|can [a-z][\w'-]* explain whether|could this be|would this be|is it)\b/i;
const SPECULATIVE_PATTERNS = /\b(maybe|perhaps|i think|i guess|i wonder|wonder if|seems like|looks like|sounds like|might be|could be|something to do with|sort of|kind of)\b/i;
const OBSERVATION_PATTERNS = /\b(examine|inspect|study|observe|analyze|check|search|investigate|look at|look over|ask|explain|discuss|talk about|interpret|identify|read about)\b/i;
const INVENTORY_PATTERNS = /\b(i have|i buy|i bought|i sell|i sold|i trade|i traded|i carry|i carried|there is|there's|there are|on the table|in my bag|inventory|craft|repair|sharpen|clean)\b/i;
const ATTACK_VERBS = /\b(attack|strike|stab|slash|shoot|punch|kick|smash|lunge|swing|blast|pierce|impale|cleave|slice|thrust|grapple|tackle|choke|cut(?:\s+at)?|threaten|throw|hurl|launch)\b/i;
const RANGED_ATTACK_PATTERNS = /\b(throw|hurl|launch|fire)\b(?:[\w'-]+\s+){0,6}\b(at|toward|towards|against)\b/i;
const ABILITY_VERBS = /\b(cast|channel|invoke|manifest|conjure|summon|project|unleash|manipulate|warp|bend|teleport|phase|slow|freeze|ignite|heal|shield|barrier|rupture)\b/i;
const DOMAIN_USE_PATTERNS = /\buse\b.{0,28}\b(space(?:-time)?|time(?:-space)?|time magic|space magic|temporal|chrono|spatial|gravity|fire|ice|lightning|wind|earth|psychic|energy|void)\b/i;
const WEAPON_NOUNS = /\b(knife|dagger|blade|sword|katana|axe|spear|staff|gun|bow|arrow|crossbow|pistol|rifle|hammer|club)\b/i;
const DOMAIN_NOUNS = /\b(space(?:-time)?|time(?:-space)?|time magic|space magic|temporal|chrono|spatial|dimension(?:al)?|portal|warp|gravity|fire|ice|lightning|wind|earth|psychic|energy|void)\b/i;
const ACTION_SUBJECT = /\b(i|we|my character)\b/i;
const HOSTILE_TARGET_WORDS = /\b(him|her|them|it|enemy|guard|cultist|attacker|opponent|foe|bandit|target)\b/i;
const DIRECTED_PREPOSITION = /\b(at|toward|towards|against)\s+(?:the\s+|a\s+|an\s+|my\s+|his\s+|her\s+|their\s+)?[a-z][\w'-]*(?:\s+[a-z][\w'-]*){0,2}\b/i;
const DIRECT_OBJECT_AFTER_ATTACK = /\b(attack|strike|stab|slash|shoot|punch|kick|smash|lunge|swing|blast|pierce|impale|cleave|slice|thrust|grapple|tackle|choke|cut(?:\s+at)?|threaten)\s+(?:at\s+)?(?:the\s+|a\s+|an\s+|my\s+|his\s+|her\s+|their\s+)?[a-z][\w'-]*(?:\s+[a-z][\w'-]*){0,2}\b/i;
const DIRECT_OBJECT_AFTER_ABILITY = /\b(cast|channel|invoke|manifest|conjure|summon|project|unleash|manipulate|warp|bend|teleport|phase|slow|freeze|ignite|heal|shield|barrier|rupture|use)\b.{0,28}\b(?:the\s+|a\s+|an\s+|my\s+|his\s+|her\s+|their\s+)?[a-z][\w'-]*(?:\s+[a-z][\w'-]*){0,2}\b/i;
const DECLARED_ATTACK_FRAME = /^\s*(?:\*+)?\s*(?:i|we|my character)?[\w\s,'"-]{0,24}\b(attack|strike|stab|slash|shoot|punch|kick|smash|lunge|swing|blast|pierce|impale|cleave|slice|thrust|grapple|tackle|choke|cut(?:\s+at)?|threaten|throw|hurl|launch|fire)\b/i;
const DECLARED_ABILITY_FRAME = /^\s*(?:\*+)?\s*(?:i|we|my character)?[\w\s,'"-]{0,24}\b(cast|channel|invoke|manifest|conjure|summon|project|unleash|manipulate|warp|bend|teleport|phase|slow|freeze|ignite|heal|shield|barrier|rupture|use)\b/i;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function analyzeCombatIntentContext(rawText: string, options: CombatIntentContextOptions = {}): CombatIntentContext {
  const text = rawText.toLowerCase().trim();
  const possibleTargets = (options.possibleTargets || []).map((target) => target.toLowerCase()).filter(Boolean);

  const isQuestion = QUESTION_START.test(text) || QUESTION_PHRASES.test(text) || text.includes('?');
  const isSpeculative = SPECULATIVE_PATTERNS.test(text);
  const isObservation = OBSERVATION_PATTERNS.test(text);
  const isInventoryContext = INVENTORY_PATTERNS.test(text);
  const hasAttackVerb = ATTACK_VERBS.test(text) || RANGED_ATTACK_PATTERNS.test(text);
  const hasAbilityVerb = ABILITY_VERBS.test(text) || DOMAIN_USE_PATTERNS.test(text);
  const mentionsWeapon = WEAPON_NOUNS.test(text);
  const mentionsDomain = DOMAIN_NOUNS.test(text);
  const hasActionDeclaration = (
    (!isQuestion && !isSpeculative)
    && (DECLARED_ATTACK_FRAME.test(text) || DECLARED_ABILITY_FRAME.test(text) || (ACTION_SUBJECT.test(text) && (hasAttackVerb || hasAbilityVerb)))
  );

  const mentionsKnownTarget = possibleTargets.some((target) => new RegExp(`\\b${escapeRegex(target)}\\b`, 'i').test(text));
  const hasDirectedTarget = mentionsKnownTarget
    || HOSTILE_TARGET_WORDS.test(text)
    || DIRECTED_PREPOSITION.test(text)
    || DIRECT_OBJECT_AFTER_ATTACK.test(text)
    || DIRECT_OBJECT_AFTER_ABILITY.test(text);

  const explicitAttack = !isQuestion && !isSpeculative && hasAttackVerb && hasActionDeclaration;
  const explicitAbility = !isQuestion
    && !isSpeculative
    && hasActionDeclaration
    && (ABILITY_VERBS.test(text) || DOMAIN_USE_PATTERNS.test(text))
    && (mentionsDomain || /\b(magic|spell|power|ability|technique)\b/i.test(text) || hasDirectedTarget);

  const reasons: string[] = [];
  if (isQuestion) reasons.push('interrogative phrasing');
  if (isSpeculative) reasons.push('speculative phrasing');
  if (isObservation) reasons.push('observation or inquiry phrasing');
  if (isInventoryContext) reasons.push('inventory or descriptive context');
  if ((mentionsWeapon || mentionsDomain) && !explicitAttack && !explicitAbility) reasons.push('noun-only combat signal without action');

  const suppressCombat = !explicitAttack && !explicitAbility && (
    isQuestion
    || isSpeculative
    || isObservation
    || isInventoryContext
    || ((mentionsWeapon || mentionsDomain) && !hasAttackVerb && !hasAbilityVerb)
  );

  return {
    isQuestion,
    isSpeculative,
    isObservation,
    isInventoryContext,
    hasAttackVerb,
    hasAbilityVerb,
    hasActionDeclaration,
    hasDirectedTarget,
    mentionsWeapon,
    mentionsDomain,
    explicitAttack,
    explicitAbility,
    suppressCombat,
    reasons,
  };
}
