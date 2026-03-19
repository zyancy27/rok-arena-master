import type { MemoryContextEntry, MemoryContextPacket } from '@/systems/types/PipelineTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const MemoryStateBridge = {
  normalize(events: unknown[] = []): MemoryContextPacket {
    const entries = events.reduce<MemoryContextEntry[]>((acc, event) => {
      if (typeof event === 'string') {
        acc.push({ type: event, intensity: 40 });
        return acc;
      }

      if (!isRecord(event) || typeof event.type !== 'string') {
        return acc;
      }

      acc.push({
        subjectId: typeof event.subjectId === 'string' ? event.subjectId : typeof event.subject_id === 'string' ? event.subject_id : undefined,
        type: event.type,
        intensity: typeof event.intensity === 'number' ? event.intensity : 40,
        valence: typeof event.valence === 'number' ? event.valence : undefined,
        timestamp: typeof event.timestamp === 'number' ? event.timestamp : undefined,
        notes: typeof event.notes === 'string' ? event.notes : undefined,
      });
      return acc;
    }, []);

    return {
      entries,
      summary: entries.slice(0, 3).map((entry) => `${entry.type}:${entry.intensity}`),
    };
  },
};
