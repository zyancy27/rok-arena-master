/**
 * Arena Test Page — renders 3 different procedural arenas side by side
 * to verify biome generation diversity.
 */
import { Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ArenaStructures3D } from '@/components/battles/tactical-map/ArenaStructures3D';
import { ArenaLighting } from '@/components/battles/tactical-map/ArenaLighting';
import { generateZones } from '@/lib/tactical-zones';

const SCENARIOS = [
  {
    title: 'Infested Holy Forest',
    locationName: 'Dense Infested Holy Forest',
    terrainTags: ['forest', 'holy', 'infested'],
  },
  {
    title: 'Dam Turbine Platform',
    locationName: 'Industrial Dam Turbine Platform',
    terrainTags: ['industrial', 'bridge'],
  },
  {
    title: 'Volcanic Cave System',
    locationName: 'Collapsed Volcanic Cavern',
    terrainTags: ['cave', 'volcanic'],
  },
];

function ArenaPreview({ title, locationName, terrainTags }: typeof SCENARIOS[number]) {
  const zones = generateZonesForTerrain(terrainTags);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold text-foreground text-center">{title}</h2>
      <p className="text-xs text-muted-foreground text-center mb-1">
        Tags: {terrainTags.join(', ')}
      </p>
      <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/20 border border-border">
        <Canvas
          camera={{ position: [0, 12, 12], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ArenaLighting arenaState={undefined} />
          <ArenaStructures3D
            zones={zones}
            features={[]}
            terrainTags={terrainTags}
            arenaState={undefined}
            locationName={locationName}
          />
          <OrbitControls
            enablePan={false}
            minDistance={5}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Canvas>
      </div>
    </div>
  );
}

export default function ArenaTest() {
  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
        Arena Procedural Generation Test
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {SCENARIOS.map((s) => (
          <Suspense key={s.title} fallback={<div className="aspect-square bg-muted rounded-lg animate-pulse" />}>
            <ArenaPreview {...s} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}
