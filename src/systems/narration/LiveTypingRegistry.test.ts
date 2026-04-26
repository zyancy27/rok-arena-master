import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldAnimateMessage,
  markMessageTyped,
  isMessageTyped,
  __resetLiveTypingRegistryForTests,
} from './LiveTypingRegistry';

describe('LiveTypingRegistry', () => {
  beforeEach(() => __resetLiveTypingRegistryForTests());

  it('animates a fresh message', () => {
    expect(shouldAnimateMessage({ messageId: 'm1', createdAt: new Date() })).toBe(true);
  });

  it('does not animate a message older than the session', () => {
    const old = new Date(Date.now() - 60_000).toISOString();
    expect(shouldAnimateMessage({ messageId: 'old', createdAt: old })).toBe(false);
  });

  it('does not re-animate once typed', () => {
    expect(shouldAnimateMessage({ messageId: 'm2', createdAt: new Date() })).toBe(true);
    markMessageTyped('m2');
    expect(isMessageTyped('m2')).toBe(true);
    expect(shouldAnimateMessage({ messageId: 'm2', createdAt: new Date() })).toBe(false);
  });

  it('animates when no createdAt is provided (live stream)', () => {
    expect(shouldAnimateMessage({ messageId: 'live' })).toBe(true);
  });
});
