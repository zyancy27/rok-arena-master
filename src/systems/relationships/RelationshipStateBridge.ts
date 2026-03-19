import type { RelationshipContextEntry, RelationshipContextPacket } from '@/systems/types/PipelineTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const RelationshipStateBridge = {
  normalize(relationships: unknown[] = []): RelationshipContextPacket {
    const entries = relationships.reduce<RelationshipContextEntry[]>((acc, entry) => {
      if (!isRecord(entry)) return acc;

      const entityId = typeof entry.entityId === 'string'
        ? entry.entityId
        : typeof entry.entity_id === 'string'
          ? entry.entity_id
          : typeof entry.npc_id === 'string'
            ? entry.npc_id
            : null;

      if (!entityId) return acc;

      const tags = Array.isArray(entry.tags)
        ? entry.tags.filter((tag): tag is string => typeof tag === 'string')
        : [];

      acc.push({
        entityId,
        disposition: typeof entry.disposition === 'string' ? entry.disposition : undefined,
        trustLevel: typeof entry.trustLevel === 'number'
          ? entry.trustLevel
          : typeof entry.trust_level === 'number'
            ? entry.trust_level
            : 0,
        notes: typeof entry.notes === 'string' ? entry.notes : undefined,
        tags,
      });
      return acc;
    }, []);

    return {
      entries,
      summary: entries.slice(0, 3).map((entry) => `${entry.entityId}:${entry.disposition ?? 'neutral'}:${entry.trustLevel}`),
    };
  },
};
