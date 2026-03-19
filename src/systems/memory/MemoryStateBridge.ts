import type { MemoryContextEntry, MemoryContextPacket } from '@/systems/types/PipelineTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const MemoryStateBridge = {
  normalize(events: unknown[] = []): MemoryContextPacket {
    const entries: MemoryContextEntry[] = events
      .map((event) => {
        if (typeof event === 'string') {
          return { type: event, intensity: 40 } satisfies MemoryContextEntry;
        }

        if (!isRecord(event) || typeof event.type !== 'string') {
          return null;
        }

        return {
          subjectId: typeof event.subjectId === 'string' ? event.subjectId : typeof event.subject_id === 'string' ? event.subject_id : undefined,
          type: event.type,
          intensity: typeof event.intensity === 'number' ? event.intensity : 40,
          valence: typeof event.valence === 'number' ? event.valence : undefined,
          timestamp: typeof event.timestamp === 'number' ? event.timestamp : undefined,
          notes: typeof event.notes === 'string' ? event.notes : undefined,
        } satisfies MemoryContextEntry;
      })
      .filter((entry): entry is MemoryContextEntry => Boolean(entry));

    return {
      entries,
      summary: entries.slice(0, 3).map((entry) => `${entry.type}:${entry.intensity}`),
    };
  },
};
