import { MemoryStateBridge } from '@/systems/memory/MemoryStateBridge';

export const MemoryContextResolver = {
  resolve(memoryEvents: unknown[] = []) {
    return MemoryStateBridge.normalize(memoryEvents);
  },
};
