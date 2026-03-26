

# Plan: Fix Possible Thoughts Default State & Reinforce Item Pickup

## Summary
Three changes: (1) Possible thoughts panel starts collapsed by default, (2) it re-collapses when a message is sent, and (3) reinforce item pickup enforcement in the story-orchestrator which currently has zero item handling.

---

## Changes

### 1. Possible Thoughts — Default Collapsed & Re-collapse on Send
**File: `src/components/campaigns/CampaignResponseSuggestions.tsx`**
- Change `useState(false)` to `useState(true)` so the panel starts collapsed
- Add an `onCollapse` callback prop (or handle internally) — expose a way for the parent to force collapse
- Alternative simpler approach: add a `forceCollapsed` prop controlled by the parent, set to `true` after send, reset when new suggestions arrive

**File: `src/pages/CampaignView.tsx`**
- Track a `suggestionsCollapsed` state, default `true`
- Set `suggestionsCollapsed = true` inside `handleSendMessage` and `handleConfirmSuggestedResponse`
- Pass it as a prop to `CampaignResponseSuggestions`
- When new suggestions load (in the fetch callback), keep it collapsed — user must manually open

### 2. Story Orchestrator — Add Item Pickup Support
**File: `supabase/functions/story-orchestrator/index.ts`**
- The story-orchestrator calls battle-narrator which already has item enforcement, but the orchestrator's own response processing may not be forwarding `itemsFound`/`itemsUsed` back to the client
- Verify the orchestrator passes through `itemsFound` and `itemsUsed` from the battle-narrator response
- If not, add passthrough so CampaignView receives and processes them

### 3. Update Test
**File: `src/components/campaigns/CampaignResponseSuggestions.test.tsx`**
- Update tests to account for the default-collapsed state

---

## Technical Details

The `CampaignResponseSuggestions` component will accept a new `collapsed` / `onToggleCollapse` controlled prop pair, replacing the internal `useState`. The parent (`CampaignView`) owns the state and sets it to `true` after any message send. The user can toggle it open manually. New suggestions arriving do NOT auto-open the panel.

