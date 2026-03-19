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
});
