
# Speech-to-Text Feature Implementation

## Overview

This plan adds a speech-to-text button to the battle chat inputs, allowing users to dictate their battle actions instead of typing. The feature will use the browser's built-in Web Speech API (SpeechRecognition) for simplicity and no additional setup/API keys required.

## Technical Approach

### Option Analysis

| Approach | Pros | Cons |
|----------|------|------|
| **Web Speech API (Recommended)** | Free, no API keys, built into browsers, works offline in Chrome | Limited browser support (mainly Chrome/Edge), accuracy varies |
| ElevenLabs STT | Higher accuracy, advanced features | Requires API key setup, costs money, more complex |
| Whisper/OpenAI | Excellent accuracy | Requires backend processing, API costs |

**Recommendation**: Start with the **Web Speech API** since it's free, requires no configuration, and provides a good user experience. This can be enhanced later with ElevenLabs if higher accuracy is needed.

## Implementation Details

### 1. Create Speech-to-Text Hook

Create a reusable `useSpeechToText` hook that encapsulates the Web Speech API logic.

**File**: `src/hooks/use-speech-to-text.ts`

Features:
- Start/stop listening toggle
- Real-time transcript updates
- Error handling (browser not supported, permission denied)
- Auto-stop after silence
- Continuous listening mode for longer dictation

```text
Hook State:
- isListening: boolean
- transcript: string
- isSupported: boolean
- error: string | null

Methods:
- startListening()
- stopListening()
- resetTranscript()
```

### 2. Create Speech Input Button Component

Create a reusable microphone button component.

**File**: `src/components/ui/speech-input-button.tsx`

Features:
- Microphone icon that changes to indicate listening state
- Pulsing animation when actively listening
- Tooltip showing "Click to speak" or "Listening..."
- Accessible (ARIA labels)
- Graceful degradation when not supported

### 3. Update MockBattle.tsx

Add the speech-to-text button next to the Send button in the chat input area (around line 2905-2927).

Changes:
- Import the new hook and component
- Add state for speech transcript
- Append transcript to input field when speaking ends
- Show microphone button between input and send

### 4. Update BattleView.tsx

Add the same speech-to-text functionality to the PvP battle chat inputs (around lines 1868-1891 and 1934-1950).

Changes:
- Same pattern as MockBattle
- Apply to both in-universe and out-of-universe chat inputs
- Include mobile view input as well

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/use-speech-to-text.ts` | Create | Speech recognition hook |
| `src/components/ui/speech-input-button.tsx` | Create | Microphone button component |
| `src/pages/MockBattle.tsx` | Edit | Add speech button to chat input |
| `src/pages/BattleView.tsx` | Edit | Add speech button to all chat inputs |

## Technical Considerations

### Browser Compatibility
- **Fully Supported**: Chrome (desktop/Android), Edge, Safari (iOS 14.5+)
- **Not Supported**: Firefox (requires flag), older browsers
- Will show graceful fallback message for unsupported browsers

### Permissions
- Microphone permission is requested on first use
- Clear error message if permission is denied

### UX Flow
1. User clicks microphone button
2. Browser prompts for mic permission (first time only)
3. Button shows "listening" state with pulse animation
4. User speaks their battle action
5. Text appears in input field as they speak
6. User clicks button again or pauses to stop
7. User can edit the text before sending

## User Interface Preview

The input area will look like:

```text
+--------------------------------------------------+  +-----+  +------+
|  Describe your action...                         |  | Mic |  | Send |
+--------------------------------------------------+  +-----+  +------+
                                                        ^
                                                   New button
```

When listening, the microphone button will:
- Change color (primary to red)
- Show a pulsing animation
- Display "Listening..." tooltip

## No Database Changes Required

This feature is purely client-side and requires no backend modifications.
