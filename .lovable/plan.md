Goal

Insert a new Intent Engine layer before narration and resolution so raw player text is normalized into one structured `Intent` object first, and narration only describes resolved outcomes rather than interpreting raw input.

What I found

- There is already an older intent layer in `src/engine/intent/` (`interpretMove`, `classifyAction`, `detectTargets`) plus the Battle Brain context builder.
- Battle still directly interprets raw text in `BattleView.tsx` (`interpretMove`, hit detection, dice logic, direct narrator calls).
- Campaign builds narrative context from raw text and sends narrator requests directly from `CampaignView.tsx`.
- The Battle Brain already has a good insertion point: `buildUnifiedContext()` currently derives intent/classification from raw text.
- No backend schema change is needed.
- You selected `Per-message debug UI` for debug visibility. Rollout scope was left unanswered, so I will plan for shared architecture that supports both, with wiring aimed at both Battle and Campaign in the same refactor.

Implementation plan

1. Create the new intent system in `src/systems/intent/`

- Add:
  - `IntentEngine.ts`
  - `IntentParser.ts`
  - `IntentClassifier.ts`
  - `IntentContextResolver.ts`
- Standardize and export the new `Intent` type there.
- `IntentEngine` becomes the public entry point:  
`raw user text + runtime context -> structured Intent`
- Keep existing `src/engine/intent/*` intact and use them as adapters where useful instead of rewriting battle logic from scratch.

2. Define one canonical Intent contract

- Implement the requested shape exactly, including fallback-safe defaults.
- Add a lightweight engine context input for:
  - mode (`battle`, `campaign`, `dialogue`, etc.)
  - actor
  - possible targets
  - equipped/default tool
  - nearby enemies / NPCs / objects
- Include confidence/fallback metadata internally if helpful, but keep the outward `Intent` contract stable.

3. Build the intent pipeline as layered adapters

- `IntentClassifier`
  - determines primary type
  - sets `isCombatAction`
  - sets `requiresRoll`
  - reuses signals from existing `interpretMove`, `classifyAction`, hit detection, and current context mode
- `IntentParser`
  - extracts `target`, `tool`, `method`
  - infers `intensity`, `precision`, `riskLevel`, `emotionalTone`
- `IntentContextResolver`
  - fills missing target/tool from current game state
  - resolves defaults like nearest enemy / equipped weapon
  - applies fallback to `observe` or `interact` when uncertain
- `IntentEngine`
  - orchestrates classifier -> parser -> context resolver
  - returns a valid `Intent` every time

4. Insert the new layer before narration and resolution

- Battle:
  - refactor `BattleView.tsx` send flow so raw text goes to `IntentEngine` first
  - pass the resulting `Intent` into combat/dice resolution instead of re-decoding raw text in multiple places
- Campaign:
  - refactor `CampaignView.tsx` send flow so intent is built before `useCampaignCombat`, narrative context building, and narrator requests
- Battle Brain:
  - update `battleBrainContext.ts` / `battleBrainTypes.ts` so unified context carries the new `Intent`
  - stop relying on `MoveIntent` as the primary cross-system contract
  - keep compatibility by deriving legacy combat structures from the new `Intent` when needed

5. Make narration consume intent/result, not raw player text

- Update the narrator request-building path so narrator input is based on:
  - structured intent
  - combat/world resolution result
  - existing narrative context
- Rule: narrator may still receive the original text as reference metadata if needed, but it must not be the thing that gets interpreted for gameplay meaning.
- For campaign narrator prompts, replace “player action raw text as meaning source” with “structured intent + resolved outcome + raw text as flavor/reference only”.

6. Route combat vs non-combat cleanly

- If `intent.isCombatAction`:
  - send through battle/campaign combat resolution
- Otherwise:
  - send through world / social / observation / interaction handling
- This routing should happen once, centrally, before narrator generation.

7. Add per-message intent debug UI

- Add a new `intentDebug` setting in user settings.
- When enabled, show a compact expandable debug card near each locally processed player action:
  - parsed intent object
  - classification summary
  - inferred target/tool/method
  - fallback notes if defaults were applied
- Keep this hidden by default and mobile-friendly.

8. Preserve compatibility and minimize risk

- Do not delete:
  - `src/engine/intent/*`
  - Battle Brain
  - combat hooks
  - narrator systems
- Instead:
  - wrap existing heuristics inside the new intent system
  - migrate callers to use `IntentEngine`
  - leave legacy functions available until all call sites are switched

Files to add/edit

- New:
  - `src/systems/intent/IntentEngine.ts`
  - `src/systems/intent/IntentParser.ts`
  - `src/systems/intent/IntentClassifier.ts`
  - `src/systems/intent/IntentContextResolver.ts`
- Likely edit:
  - `src/engine/battleBrain/battleBrainTypes.ts`
  - `src/engine/battleBrain/battleBrainContext.ts`
  - `src/engine/battleBrain/ComprehensiveBattleBrain.ts`
  - `src/pages/BattleView.tsx`
  - `src/pages/CampaignView.tsx`
  - `src/hooks/use-campaign-combat.ts`
  - `src/hooks/use-campaign-narrative.ts`
  - `src/lib/story-orchestrator.ts`
  - `src/lib/settings-defaults.ts`
  - settings UI file(s), likely `src/components/settings/DeveloperTab.tsx` or a dedicated debug/settings surface

Technical notes

- Best fit is to make `Intent` the new app-level contract and treat current `MoveIntent` as an internal legacy helper.
- In `battleBrainContext.ts`, the current `interpretMove(input.rawText)` + `classifyAction(input.rawText)` path should be replaced by:  
`IntentEngine.resolve(...)` first, then derive any legacy combat structures from that.
- The largest behavior risk is BattleView, because it currently performs direct validation, hit detection, and narrator prompting from raw text. That should be collapsed into one pre-resolution intent step.
- Campaign already has clearer orchestration boundaries, so it should share the same engine with a campaign-specific context resolver adapter.

Acceptance criteria

- Every player action produces a valid `Intent`.
- Narration is generated from resolved intent/outcome, not from raw text interpretation.
- Battle and Campaign both use the same intent entry point.
- Combat vs non-combat routing happens from `intent.isCombatAction`.
- Unclear inputs safely fall back to `observe` or `interact`.
- Per-message debug UI can show the parsed intent when `intentDebug` is enabled.
- ==================================================
- 10. CHARACTER CONTEXT INTEGRATION
- ==================================================

Introduce a Character Context layer that is used AFTER intent parsing and BEFORE resolution.

&nbsp;

Create:

&nbsp;

src/systems/character/

- CharacterContextResolver.ts

&nbsp;

Responsibilities:

- provide current character stats

- provide equipped items

- provide abilities

- provide status effects

- provide stamina/energy state

&nbsp;

IMPORTANT RULE:

- IntentEngine must NOT depend on character stats

- CharacterContext is applied AFTER intent is created

&nbsp;

==================================================

11. RESOLUTION LAYER

==================================================

&nbsp;

Create:

&nbsp;

src/systems/resolution/

- ActionResolver.ts

&nbsp;

This system:

- takes Intent + CharacterContext

- determines outcome

- calculates success/failure

- applies environment factors if available

&nbsp;

Output should include:

&nbsp;

type ActionResult = {

  success: boolean

  effectiveness: number

  impact: string

  consequences: string[]

}

&nbsp;

==================================================

FLOW UPDATE

==================================================

&nbsp;

New pipeline:

&nbsp;

user input

→ IntentEngine

→ CharacterContextResolver

→ ActionResolver

→ NarrationOrchestrator