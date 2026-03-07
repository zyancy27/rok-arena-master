import { describe, it, expect } from 'vitest';
import { assignMaterial, detectBiome, getLightingProfile } from '@/lib/map/visual-identity';
import { interpretMutations } from '@/lib/map/mutation/mutation-interpreter';
import { createMutationMemory, recordMutations } from '@/lib/map/mutation/mutation-memory';
import { applyMutationPipeline } from '@/lib/map/mutation/mutation-apply';
import { createMutationEngine, processMutationEvent } from '@/lib/map/mutation/NarratorTerrainMutationEngine';

describe('VisualIdentitySystem', () => {
  it('assigns material with correct properties for forest biome', () => {
    const mat = assignMaterial('forest', 'tree_trunk', 'structure', 42);
    expect(mat).toBeDefined();
    expect(mat.color).toBeTruthy();
    expect(mat.roughness).toBeGreaterThan(0);
    expect(mat.roughness).toBeLessThanOrEqual(1);
  });

  it('detects biome from location name', () => {
    expect(detectBiome('Infested Holy Forest')).toBe('infested');
    expect(detectBiome('Industrial Dam Complex')).toBe('industrial');
    expect(detectBiome('Volcanic Crater')).toBe('volcanic');
    expect(detectBiome('Glass Skybridge')).toBe('urban');
  });

  it('returns lighting profile for each biome', () => {
    const profile = getLightingProfile('forest');
    expect(profile).toBeDefined();
    expect(profile.ambientColor).toBeTruthy();
    expect(profile.keyIntensity).toBeGreaterThan(0);
  });

  it('applies metal material for pipe keywords', () => {
    const mat = assignMaterial('industrial', 'rusted_pipe', 'prop', 7);
    expect(mat.metalness).toBeGreaterThan(0.2);
  });
});

describe('NarratorTerrainMutationEngine', () => {
  it('interprets narrator text into mutations', () => {
    const mutations = interpretMutations({
      text: 'The bridge begins to crack and the glass shatters',
      source: 'narrator',
      zoneIds: ['zone-1'],
      zoneLabels: { 'zone-1': 'Glass Bridge' },
    });
    expect(mutations.length).toBeGreaterThanOrEqual(1);
    expect(mutations.some(m => m.type === 'structure_damage' || m.type === 'terrain_crack')).toBe(true);
  });

  it('interprets fire-related text', () => {
    const mutations = interpretMutations({
      text: 'Flames spread across the ground',
      source: 'narrator',
      zoneIds: ['z1'],
      zoneLabels: {},
    });
    expect(mutations.some(m => m.type === 'surface_burn')).toBe(true);
  });

  it('creates and uses mutation memory', () => {
    const memory = createMutationMemory();
    expect(memory.log).toHaveLength(0);
    const mutations = interpretMutations({
      text: 'The floor collapses',
      source: 'narrator',
      zoneIds: ['zone-a'],
      zoneLabels: {},
    });
    const updated = recordMutations(memory, mutations, 1);
    expect(updated.log.length).toBeGreaterThan(0);
  });

  it('full engine pipeline processes without error', () => {
    const zones = [
      { id: 'z1', label: 'Center Bridge', x: 50, y: 50, width: 20, height: 10, terrain: 'bridge' as any, elevation: 'ground' as any },
    ];
    const engine = createMutationEngine(zones as any);
    const result = processMutationEvent(engine, {
      text: 'The support cables snap and the bridge buckles',
      source: 'narrator',
      turnNumber: 3,
      arenaState: { stability: 40, hazardPressure: 60, momentum: 50, environmentalPressure: 55 },
    });
    expect(result.output.hadMutations).toBe(true);
    expect(result.output.zones).toBeDefined();
    expect(result.output.sceneInstructions.length).toBeGreaterThanOrEqual(0);
  });
});
