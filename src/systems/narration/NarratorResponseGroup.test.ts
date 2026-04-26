import { describe, it, expect, vi, beforeEach } from 'vitest';

const playCueById = vi.fn();
vi.mock('@/lib/audio/narration-sound-manager', () => ({
  getNarrationSoundManager: () => ({ playCueById }),
}));

import { pickCueForAct, dispatchResponseGroupCues, __resetResponseGroupForTests } from './NarratorResponseGroup';

describe('NarratorResponseGroup', () => {
  beforeEach(() => {
    __resetResponseGroupForTests();
    playCueById.mockClear();
    vi.useFakeTimers();
  });

  it('picks cue ids from text', () => {
    expect(pickCueForAct('A massive explosion rocks the room')).toBe('explosion');
    expect(pickCueForAct('blades clash and ring')).toBe('sword_clash');
    expect(pickCueForAct('she casts a spell')).toBe('magic');
    expect(pickCueForAct('nothing notable happens here')).toBeNull();
  });

  it('dispatches at most maxCues per group, in act order', () => {
    dispatchResponseGroupCues({
      responseGroupId: 'g1',
      acts: [
        { messageId: 'a', actIndex: 0, speakerType: 'narrator', text: 'an explosion erupts' },
        { messageId: 'b', actIndex: 1, speakerType: 'npc', text: 'their blades clash' },
        { messageId: 'c', actIndex: 2, speakerType: 'narrator', text: 'flame crackles softly' },
        { messageId: 'd', actIndex: 3, speakerType: 'narrator', text: 'thunder cracks above' },
      ],
    }, { perActDelay: 100, maxCues: 3 });

    vi.advanceTimersByTime(5000);
    expect(playCueById).toHaveBeenCalledTimes(3);
    expect(playCueById.mock.calls.map(c => c[0])).toEqual(['explosion', 'sword_clash', 'fire_crackle']);
  });

  it('does not redispatch the same group twice', () => {
    const group = {
      responseGroupId: 'g2',
      acts: [{ messageId: 'a', actIndex: 0, speakerType: 'narrator' as const, text: 'an explosion' }],
    };
    dispatchResponseGroupCues(group, { perActDelay: 0, maxCues: 1 });
    dispatchResponseGroupCues(group, { perActDelay: 0, maxCues: 1 });
    vi.advanceTimersByTime(2000);
    expect(playCueById).toHaveBeenCalledTimes(1);
  });
});
