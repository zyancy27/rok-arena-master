import { RelationshipStateBridge } from '@/systems/relationships/RelationshipStateBridge';

export const RelationshipContextResolver = {
  resolve(relationships: unknown[] = []) {
    return RelationshipStateBridge.normalize(relationships);
  },
};
