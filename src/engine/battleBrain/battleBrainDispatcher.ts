/**
 * Battle Brain Dispatcher
 *
 * Receives BrainOutput and dispatches UI signals and state mutations
 * to the appropriate consumers. Acts as the "write" phase after resolution.
 */

import type { BrainOutput, UISignal, StateMutation, TraceEntry } from './battleBrainTypes';
import type { BattleEventBus } from '../events/eventBus';

// ─── UI Signal Dispatcher ───────────────────────────────────────

export type UISignalHandler = (signal: UISignal) => void;

export class BattleBrainDispatcher {
  private uiHandlers = new Map<string, Set<UISignalHandler>>();
  private traceLog: TraceEntry[] = [];
  private traceEnabled = false;

  setTraceEnabled(enabled: boolean): void {
    this.traceEnabled = enabled;
  }

  /** Register a UI signal handler for a specific signal type */
  onUI(type: string, handler: UISignalHandler): () => void {
    if (!this.uiHandlers.has(type)) {
      this.uiHandlers.set(type, new Set());
    }
    this.uiHandlers.get(type)!.add(handler);
    return () => {
      this.uiHandlers.get(type)?.delete(handler);
    };
  }

  /** Register a handler for all UI signals */
  onAnyUI(handler: UISignalHandler): () => void {
    return this.onUI('*', handler);
  }

  /** Dispatch all UI signals from a BrainOutput */
  dispatchOutput(output: BrainOutput): void {
    // Sort signals: immediate first, then normal, then deferred
    const priorityOrder = { immediate: 0, normal: 1, deferred: 2 };
    const sorted = [...output.uiSignals].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    for (const signal of sorted) {
      this.dispatchSignal(signal);
    }

    if (this.traceEnabled && output.trace) {
      this.traceLog.push(...output.trace);
    }
  }

  /** Dispatch a single UI signal */
  private dispatchSignal(signal: UISignal): void {
    // Specific handlers
    const handlers = this.uiHandlers.get(signal.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(signal);
        } catch (err) {
          console.error(`[BrainDispatcher] Error in UI handler for "${signal.type}":`, err);
        }
      }
    }

    // Wildcard handlers
    const wildcardHandlers = this.uiHandlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(signal);
        } catch (err) {
          console.error(`[BrainDispatcher] Error in wildcard UI handler:`, err);
        }
      }
    }
  }

  /** Get trace log (debug mode) */
  getTraceLog(): TraceEntry[] {
    return [...this.traceLog];
  }

  /** Clear trace log */
  clearTrace(): void {
    this.traceLog = [];
  }

  /** Remove all handlers (cleanup) */
  destroy(): void {
    this.uiHandlers.clear();
    this.traceLog = [];
  }
}

export function createBattleBrainDispatcher(): BattleBrainDispatcher {
  return new BattleBrainDispatcher();
}
