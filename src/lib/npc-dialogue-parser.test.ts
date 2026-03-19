import { describe, expect, it } from 'vitest';
import { parseNarratorMessage } from './npc-dialogue-parser';

describe('npc-dialogue-parser', () => {
  it('splits narration from named npc dialogue', () => {
    expect(
      parseNarratorMessage('Rain needles across the broken glass. Master Eldrin says, "Gone."'),
    ).toEqual([
      { type: 'narration', text: 'Rain needles across the broken glass.' },
      { type: 'npc_dialogue', speakerName: 'Master Eldrin', dialogue: 'Gone.' },
    ]);
  });

  it('infers the speaker for pronoun-attributed follow-up dialogue from nearby context', () => {
    expect(
      parseNarratorMessage('Master Eldrin looks up. "Gone," he says.'),
    ).toEqual([
      { type: 'narration', text: 'Master Eldrin looks up.' },
      { type: 'npc_dialogue', speakerName: 'Master Eldrin', dialogue: 'Gone,' },
    ]);
  });

  it('keeps unattributed quoted text inside narration as a safe fallback', () => {
    expect(
      parseNarratorMessage('The old hall answers with a thin echo: "not all doors stay shut."'),
    ).toEqual([
      { type: 'narration', text: 'The old hall answers with a thin echo: "not all doors stay shut."' },
    ]);
  });

  it('extracts dialogue when character acts then speaks without a speech verb', () => {
    const result = parseNarratorMessage(
      'Master Eldrin shivers, pulling his shoulders up. "I... it isn\'t art."',
    );
    expect(result).toEqual([
      { type: 'npc_dialogue', speakerName: 'Master Eldrin', dialogue: "I... it isn't art." },
    ]);
  });

  it('attributes dialogue to the closest named character in action-then-speech', () => {
    const result = parseNarratorMessage(
      'Master Eldrin watches from across the room. Lyra Vance settles into her chair. "The energy signatures are unlike anything cataloged."',
    );
    // Lyra Vance is the closest named character to the dialogue
    expect(result.length).toBeGreaterThanOrEqual(1);
    const dialogueSegment = result.find(s => s.type === 'npc_dialogue');
    expect(dialogueSegment).toBeDefined();
    expect(dialogueSegment!.type).toBe('npc_dialogue');
    if (dialogueSegment!.type === 'npc_dialogue') {
      expect(dialogueSegment!.speakerName).toBe('Lyra Vance');
      expect(dialogueSegment!.dialogue).toContain('energy signatures');
    }
  });

  it('handles bold markdown names with action-then-speech pattern', () => {
    const result = parseNarratorMessage(
      '**Silas Thorne** still facing his door, doesn\'t turn. "It\'s not just light."',
    );
    expect(result).toEqual([
      { type: 'npc_dialogue', speakerName: 'Silas Thorne', dialogue: "It's not just light." },
    ]);
  });

  it('splits multiple character dialogues in a single narration block', () => {
    const result = parseNarratorMessage(
      'The tavern grows quiet. Master Eldrin says, "We must leave." Lyra Vance nods slowly. "Agreed. The wards won\'t hold."',
    );
    const npcSegments = result.filter(s => s.type === 'npc_dialogue');
    expect(npcSegments.length).toBe(2);
  });

  it('preserves narration between character dialogues', () => {
    const result = parseNarratorMessage(
      'Master Eldrin says, "Stay alert." The wind howls through the corridor. Lyra Vance grips her staff. "Something is coming."',
    );
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result[0]).toEqual({ type: 'npc_dialogue', speakerName: 'Master Eldrin', dialogue: 'Stay alert.' });
    expect(result.some(s => s.type === 'narration')).toBe(true);
  });
});
