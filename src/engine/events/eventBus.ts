/**
 * Battle Event Bus
 *
 * Decoupled publish/subscribe system for battle events.
 * Systems emit events; other systems listen and react.
 * Each battle instance gets its own bus (no cross-contamination).
 */

import type { BattleEventMap, BattleEventType } from './battleEvents';

type Listener<T extends BattleEventType> = (payload: BattleEventMap[T]) => void;

export class BattleEventBus {
  private listeners = new Map<BattleEventType, Set<Listener<any>>>();
  private history: Array<{ type: BattleEventType; payload: any; timestamp: number }> = [];
  private maxHistory = 200;

  /** Subscribe to an event type. Returns an unsubscribe function. */
  on<T extends BattleEventType>(type: T, listener: Listener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /** Subscribe to an event type, auto-unsubscribe after first call. */
  once<T extends BattleEventType>(type: T, listener: Listener<T>): () => void {
    const wrapper: Listener<T> = (payload) => {
      unsub();
      listener(payload);
    };
    const unsub = this.on(type, wrapper);
    return unsub;
  }

  /** Emit an event to all registered listeners. */
  emit<T extends BattleEventType>(type: T, payload: BattleEventMap[T]): void {
    // Record history
    this.history.push({ type, payload, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    const set = this.listeners.get(type);
    if (!set) return;

    for (const listener of set) {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[BattleEventBus] Error in listener for "${type}":`, err);
      }
    }
  }

  /** Get recent event history (for debugging / narrator context). */
  getHistory(limit?: number): Array<{ type: BattleEventType; payload: any; timestamp: number }> {
    const n = limit ?? this.history.length;
    return this.history.slice(-n);
  }

  /** Get history filtered by event type. */
  getHistoryByType<T extends BattleEventType>(
    type: T,
    limit?: number,
  ): Array<{ payload: BattleEventMap[T]; timestamp: number }> {
    const filtered = this.history
      .filter(e => e.type === type)
      .map(e => ({ payload: e.payload as BattleEventMap[T], timestamp: e.timestamp }));
    return limit ? filtered.slice(-limit) : filtered;
  }

  /** Remove all listeners (cleanup on battle end). */
  destroy(): void {
    this.listeners.clear();
    this.history = [];
  }
}

/** Factory — one bus per battle instance */
export function createBattleEventBus(): BattleEventBus {
  return new BattleEventBus();
}
