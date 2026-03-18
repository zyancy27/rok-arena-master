Goal: replace the current partially split narration flow with one centralized Narration Orchestrator that owns playback state, progress, highlighting, cue timing, tap-to-narrate, and future effect checkpoints across both Campaign and Battle.

What I found

- A controller already exists (`NarrationController`), but it is not yet the true source of truth.
- Campaign already uses `useNarrationController`, but Battle still uses the older `useNarratorVoice` + `useNarrationAmbient` path.
- Ambient cue timing is currently duplicated and partly wrong:
  - `NarrationController` calls `soundTrigger.prepare(text)`, but also calls `narrationSoundManager.processNarration(text)`, which schedules cues from text render time.
  - `NarrationSoundTriggerSystem.updateFromCharIndex()` currently marks cues fired but does not actually trigger them.
- Highlighting is sentence-based only, not exact phrase/range based.
- Tap-to-narrate currently starts immediately from sentence index; there is no confirmation flow.
- Settings already contain most required audio toggles, but not “ask before tap to narrate” or a narration debug toggle.

Implementation plan

1. Centralize around a new orchestrator layer

- Introduce `NarrationOrchestrator` as the new public singleton in `src/systems/narration/`.
- Keep existing systems, but refactor them under the orchestrator:
  - `SpeechPlaybackManager`: wraps current `SpeechManager`
  - `NarrationHighlightManager`: upgraded to map phrase/range + sentence fallback
  - `NarrationSoundSync`: replaces current render-time cue scheduling with boundary-driven checkpoints
  - `TapToNarrateController`: resolves tap target, confirmation policy, restart origin
- Preserve current exports temporarily for compatibility, but move consumers to the orchestrator API.
- ENFORCEMENT RULE:
- No system outside of NarrationOrchestrator is allowed to directly trigger:
- &nbsp;

- speech playback

- &nbsp;

- sound cues

- &nbsp;

- highlighting updates

- &nbsp;

- narration state changes

All such actions must be routed through the orchestrator.

This prevents desynchronization and duplicated triggers across Campaign and Battle.

2. Make speech progress the single source of truth

- The orchestrator owns:
- &nbsp;

- playback lifecycle state (state machine)
- active message id
- playback state
- current char index
- current phrase/range
- current highlight range
- active checkpoint list
- tap restart origin

State machine must include:

- idle
- starting
- playing
- paused
- stopping
- finished

&nbsp;

All narration transitions must respect this state machine to prevent:

- overlapping playback
- duplicate triggers
- desynced highlights
- Boundary/poll progress from the speech layer becomes the only driver for:
  - highlight updates
  - cue firing
  - future visual/map/effect checkpoints
- HARD RULE:  
Completely remove any behavior where narration, sound, or cues are triggered during text render.  
Narration must ONLY be processed and advanced via speech playback progress.  
Rendering text must never:
  - trigger sound
  - schedule cues
  - start narration

3. Fix the sound timing architecture

- Refactor `NarrationSoundTriggerSystem` into checkpoint-based `NarrationSoundSync`.
- ARCHITECTURE CLARIFICATION:
- - NarrationSoundSync is responsible for WHEN sounds trigger (based on speech progress)
- - narration-sound-manager is responsible ONLY for playback (audio engine)

Remove or fully replace NarrationSoundTriggerSystem logic to avoid duplicate cue triggering.

- Parse narrator text into ordered checkpoints:
  - phrase
  - trigger index / range
  - cue type
  - volume
  - one-shot vs persistent
  - cooldown
  - triggered flag
- Trigger cues only when spoken progress reaches/passes the checkpoint.
- Stop/rebuild checkpoints on:
  - new message
  - replay
  - tap restart
  - page/scene change
- Keep `narration-sound-manager` as the playback engine, but stop it from scheduling by raw text-render timing.

4. Upgrade highlighting to follow spoken ranges

- Extend `NarrationHighlightManager` to compute exact phrase/word ranges when possible, with clean sentence fallback.
- Add range confidence handling:
- - each highlight range should include a confidence score
- - high confidence → word/phrase highlighting
- - low confidence → fallback to sentence-level highlighting

This prevents visual glitches when exact matching is unreliable.

- Expose active range data, not just sentence index.
- Update `NarratorMessageContent` to support:
  - exact active span highlighting when available
  - sentence fallback when exact matching is not reliable
  - correct reset/restart behavior after tap restarts

5. Implement tap-to-narrate confirmation flow
  INTERRUPT PRIORITY RULE:  
  If narration is currently playing and the user confirms a new tap target:
  - immediately stop current playback (no delay)
  - reset orchestrator state
  - restart narration from the new target

Do not queue or delay the new narration.

The system must feel instant and responsive.

- Add settings:
  - `askBeforeTapToNarrate`
  - optional `narrationDebug`
  - optional `narrationHighlightEnabled`
- Since you chose “Always ask”, tapping a narrator segment should always open a lightweight confirm dialog before restart.
- Tap resolution should map to nearest phrase boundary first, sentence boundary second.
- If narration is already active and the user confirms another tap target, orchestrator stops current playback immediately and restarts from that target.

6. Migrate both Campaign and Battle to the same hook

- Replace Battle’s legacy `useNarratorVoice` + direct `useNarrationAmbient` timing calls with the centralized orchestrator hook.
- Keep old hook implementation only as a temporary wrapper or deprecate it after migration.
- Wire both `CampaignView` and `BattleView` to the same orchestrator state model so:
  - play/replay buttons
  - auto-read
  - pause/resume
  - active highlighting
  - tap restarts  
  all behave identically.

7. Reset and lifecycle rules

- Ensure orchestrator hard-resets on:
  - new narrator message
  - replay
  - tap restart
  - route/scene changes

8. Global Orchestrator Authority

&nbsp;

NarrationOrchestrator must be the single authority for:

- narration playback

- highlight updates

- sound cue triggering

- tap-to-narrate control

&nbsp;

No other system (Campaign, Battle, UI components, or legacy hooks) may independently:

- start narration

- trigger sounds

- update highlight state

&nbsp;

All existing systems must be refactored to call the orchestrator API instead.

&nbsp;

This ensures consistent behavior across Campaign and Battle and prevents desynchronization.