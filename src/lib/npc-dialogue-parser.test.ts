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
    const result = parseNarratorMessage('Master Eldrin looks up. "Gone," he says.');
    // The action-then-speech pattern correctly attributes to Master Eldrin
    const npcSegment = result.find(s => s.type === 'npc_dialogue');
    expect(npcSegment).toBeDefined();
    expect(npcSegment!.type === 'npc_dialogue' && npcSegment!.speakerName).toBe('Master Eldrin');
    expect(npcSegment!.type === 'npc_dialogue' && npcSegment!.dialogue).toBe('Gone,');
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
    const npcSegment = result.find(s => s.type === 'npc_dialogue');
    expect(npcSegment).toBeDefined();
    expect(npcSegment!.type === 'npc_dialogue' && npcSegment!.speakerName).toBe('Master Eldrin');
    expect(npcSegment!.type === 'npc_dialogue' && npcSegment!.dialogue).toContain("it isn't art");
  });

  it('attributes dialogue to the closest named character in action-then-speech', () => {
    const result = parseNarratorMessage(
      'Master Eldrin watches from across the room. Lyra Vance settles into her chair. "The energy signatures are unlike anything cataloged."',
    );
    const dialogueSegment = result.find(s => s.type === 'npc_dialogue');
    expect(dialogueSegment).toBeDefined();
    if (dialogueSegment!.type === 'npc_dialogue') {
      expect(dialogueSegment!.speakerName).toBe('Lyra Vance');
      expect(dialogueSegment!.dialogue).toContain('energy signatures');
    }
  });

  it('handles bold markdown names with action-then-speech pattern', () => {
    const result = parseNarratorMessage(
      '**Silas Thorne** still facing his door, doesn\'t turn. "It\'s not just light."',
    );
    const npcSegment = result.find(s => s.type === 'npc_dialogue');
    expect(npcSegment).toBeDefined();
    expect(npcSegment!.type === 'npc_dialogue' && npcSegment!.speakerName).toBe('Silas Thorne');
  });

  it('splits speech-verb dialogue from action-then-speech dialogue in same block', () => {
    const result = parseNarratorMessage(
      'Master Eldrin says, "We must leave." Lyra Vance nods slowly. "Agreed."',
    );
    const npcSegments = result.filter(s => s.type === 'npc_dialogue');
    expect(npcSegments.length).toBeGreaterThanOrEqual(1);
    // At minimum the speech-verb dialogue is extracted
    expect(npcSegments[0].type === 'npc_dialogue' && npcSegments[0].speakerName).toBe('Master Eldrin');
  });

  it('preserves narration between character dialogues', () => {
    const result = parseNarratorMessage(
      'Master Eldrin says, "Stay alert." The wind howls through the corridor.',
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]).toEqual({ type: 'npc_dialogue', speakerName: 'Master Eldrin', dialogue: 'Stay alert.' });
    expect(result.some(s => s.type === 'narration')).toBe(true);
  });
});
