import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Sun from './Sun';
import Planet from './Planet';
import OrbitRing from './OrbitRing';
import CameraController from './CameraController';
import PlanetMenu from './PlanetMenu';
import CharacterList from './CharacterList';
import PlanetEditor, { PlanetCustomization } from './PlanetEditor';
import SunEditor, { SunCustomization, getColorFromTemperature, getSunLuminosityFromTemperature } from './SunEditor';
import CreatePlanetDialog from './CreatePlanetDialog';
import { getHabitableZone } from './Sun';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Character {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
  user_id: string;
  username?: string;
}

interface StoredCustomization {
  planet_name: string;
  display_name: string | null;
  description: string | null;
  color: string | null;
  has_rings: boolean | null;
  moon_count: number | null;
  gravity: number | null;
  radius: number | null;
  orbital_distance: number | null;
}

interface PlanetData {
  name: string;
  displayName: string;
  description: string;
  color: string;
  orbitRadius: number;
  planetSize: number;
  orbitSpeed: number;
  characterCount: number;
  hasRings: boolean | null;
  moonCount: number | null;
  gravity: number | null;
  radius: number | null;
  orbitalDistance: number | null;
  isUserCreated?: boolean;
}

type ViewState = 'galaxy' | 'zooming' | 'menu' | 'zooming-in' | 'characters' | 'editor' | 'sun-editor' | 'create-planet';

interface SunData {
  name: string;
  description: string;
  color: string;
  temperature: number;
}

// Default camera positions
const GALAXY_CAMERA_POSITION = new THREE.Vector3(0, 15, 20);
const GALAXY_LOOK_AT = new THREE.Vector3(0, 0, 0);

// Generate consistent planet colors based on name
function getPlanetColor(name: string): string {
  const colors = [
    '#DC2626', '#D97706', '#059669', '#0891B2',
    '#7C3AED', '#DB2777', '#14B8A6', '#475569',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function SolarSystem() {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>('galaxy');
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [planetCustomizations, setPlanetCustomizations] = useState<Record<string, StoredCustomization>>({});
  const [sunData, setSunData] = useState<SunData>({
    name: 'Sol',
    description: '',
    color: '#FDB813',
    temperature: 5778,
  });
  
  // Camera animation state
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null);
  const [cameraLookAt, setCameraLookAt] = useState<THREE.Vector3 | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const [controlsEnabled, setControlsEnabled] = useState(true);

  useEffect(() => {
    fetchCharacters();
    fetchCustomizations();
    fetchSunData();
  }, [user]);

  const fetchCharacters = async () => {
    const { data: charData, error: charError } = await supabase
      .from('characters')
      .select('id, name, level, race, home_planet, user_id')
      .order('created_at', { ascending: false });

    if (charError || !charData) {
      setLoading(false);
      return;
    }

    const userIds = [...new Set(charData.map(c => c.user_id))];

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    const profileMap = new Map(profilesData?.map(p => [p.id, p.username]) || []);

    const charactersWithProfiles = charData.map(char => ({
      ...char,
      username: profileMap.get(char.user_id),
    }));

    setCharacters(charactersWithProfiles);
    setLoading(false);
  };

  const fetchCustomizations = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('planet_customizations')
      .select('planet_name, display_name, description, color, has_rings, moon_count, gravity, radius, orbital_distance')
      .eq('user_id', user.id);

    if (data) {
      const customMap: Record<string, StoredCustomization> = {};
      data.forEach(c => {
        customMap[c.planet_name] = c;
      });
      setPlanetCustomizations(customMap);
    }
  };

  const fetchSunData = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('sun_customizations')
      .select('name, description, color, temperature')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSunData({
        name: data.name || 'Sol',
        description: data.description || '',
        color: data.color || '#FDB813',
        temperature: data.temperature || 5778,
      });
    }
  };

  // Group characters by planet with physics-based orbital positioning
  // Also include user-created planets that have no characters yet
  const planets = useMemo(() => {
    const planetMap = new Map<string, number>();
    
    // Add planets from characters
    characters.forEach(char => {
      const planet = char.home_planet || 'Unknown';
      planetMap.set(planet, (planetMap.get(planet) || 0) + 1);
    });

    // Add user-created planets that don't have characters yet
    Object.keys(planetCustomizations).forEach(planetName => {
      if (!planetMap.has(planetName)) {
        planetMap.set(planetName, 0);
      }
    });

    const planetArray: PlanetData[] = [];
    let defaultOrbitIndex = 0;

    // Sort by orbital distance if defined, otherwise use default sequential
    const sortedPlanets = Array.from(planetMap.entries()).sort((a, b) => {
      const customA = planetCustomizations[a[0]];
      const customB = planetCustomizations[b[0]];
      const distA = customA?.orbital_distance ?? (defaultOrbitIndex + 1);
      const distB = customB?.orbital_distance ?? (defaultOrbitIndex + 1);
      return distA - distB;
    });

    sortedPlanets.forEach(([name, count]) => {
      const customization = planetCustomizations[name];
      
      // Use orbital_distance if set, otherwise use sequential positioning
      const orbitalDistance = customization?.orbital_distance ?? (1 + defaultOrbitIndex * 0.8);
      const orbitRadius = orbitalDistance * 5; // Scale AU to 3D units
      
      // Calculate orbital speed using Kepler's third law (faster for closer planets)
      const orbitSpeed = 0.3 / Math.pow(orbitalDistance, 0.5);
      
      // Planet size: use radius if customized, otherwise based on character count
      const customRadius = customization?.radius;
      const planetSize = customRadius 
        ? Math.min(customRadius * 0.5, 1.5) 
        : Math.min(0.5 + Math.max(count, 1) * 0.15, 1.5);
      
      planetArray.push({
        name,
        displayName: customization?.display_name || name,
        description: customization?.description || '',
        color: customization?.color || getPlanetColor(name),
        orbitRadius,
        planetSize,
        orbitSpeed,
        characterCount: count,
        hasRings: customization?.has_rings ?? null,
        moonCount: customization?.moon_count ?? null,
        gravity: customization?.gravity ?? null,
        radius: customization?.radius ?? null,
        orbitalDistance: customization?.orbital_distance ?? null,
        isUserCreated: !!customization,
      });
      
      defaultOrbitIndex++;
    });

    return planetArray;
  }, [characters, planetCustomizations]);

  const handlePlanetClick = useCallback((planet: PlanetData, position: { x: number; y: number; z: number }) => {
    setSelectedPlanet(planet);
    setViewState('zooming');
    setControlsEnabled(false);
    
    // Calculate camera position to zoom toward planet
    const planetPos = new THREE.Vector3(position.x, position.y, position.z);
    const direction = planetPos.clone().normalize();
    const distance = planet.planetSize * 6;
    const cameraPos = planetPos.clone().add(
      new THREE.Vector3(direction.x * distance, distance * 0.5, direction.z * distance + distance)
    );
    
    setCameraTarget(cameraPos);
    setCameraLookAt(planetPos);
    setIsZooming(true);
  }, []);

  const handleZoomComplete = useCallback(() => {
    setIsZooming(false);
    if (viewState === 'zooming') {
      setViewState('menu');
    } else if (viewState === 'zooming-in') {
      setViewState('characters');
    }
  }, [viewState]);

  const handleViewCharacters = useCallback(() => {
    // Zoom in even closer for character view
    if (cameraLookAt) {
      const closePos = cameraLookAt.clone().add(new THREE.Vector3(0, 1, 3));
      setCameraTarget(closePos);
      setIsZooming(true);
      setViewState('zooming-in');
    }
  }, [cameraLookAt]);

  const handleEditPlanet = () => {
    setViewState('editor');
  };

  const handleBack = useCallback(() => {
    if (viewState === 'menu') {
      // Zoom back to galaxy view
      setCameraTarget(GALAXY_CAMERA_POSITION.clone());
      setCameraLookAt(GALAXY_LOOK_AT.clone());
      setIsZooming(true);
      setViewState('zooming');
      
      // After zoom completes, reset to galaxy
      setTimeout(() => {
        setSelectedPlanet(null);
        setViewState('galaxy');
        setControlsEnabled(true);
        setIsZooming(false);
      }, 1200);
    } else {
      setViewState('menu');
    }
  }, [viewState]);

  const handleBackToGalaxy = useCallback(() => {
    setCameraTarget(GALAXY_CAMERA_POSITION.clone());
    setCameraLookAt(GALAXY_LOOK_AT.clone());
    setIsZooming(true);
    
    setTimeout(() => {
      setSelectedPlanet(null);
      setViewState('galaxy');
      setControlsEnabled(true);
      setIsZooming(false);
    }, 1200);
  }, []);

  const handleSavePlanet = async (data: PlanetCustomization) => {
    if (!selectedPlanet || !user) return;

    const { error } = await supabase
      .from('planet_customizations')
      .upsert({
        user_id: user.id,
        planet_name: selectedPlanet.name,
        display_name: data.displayName,
        description: data.description,
        color: data.color,
        has_rings: data.hasRings,
        moon_count: data.moonCount,
        gravity: data.gravity,
        radius: data.radius,
        orbital_distance: data.orbitalDistance,
      }, {
        onConflict: 'user_id,planet_name',
      });

    if (error) throw error;

    // Update local state
    setPlanetCustomizations(prev => ({
      ...prev,
      [selectedPlanet.name]: {
        planet_name: selectedPlanet.name,
        display_name: data.displayName,
        description: data.description,
        color: data.color,
        has_rings: data.hasRings,
        moon_count: data.moonCount,
        gravity: data.gravity,
        radius: data.radius,
        orbital_distance: data.orbitalDistance,
      },
    }));

    // Update selected planet
    setSelectedPlanet(prev => prev ? {
      ...prev,
      displayName: data.displayName,
      description: data.description,
      color: data.color,
      hasRings: data.hasRings,
      moonCount: data.moonCount,
      gravity: data.gravity,
      radius: data.radius,
      orbitalDistance: data.orbitalDistance,
    } : null);
  };

  const handleSunClick = useCallback(() => {
    setViewState('sun-editor');
  }, []);

  const handleSaveSun = async (data: SunCustomization) => {
    if (!user) return;

    const { error } = await supabase
      .from('sun_customizations')
      .upsert({
        user_id: user.id,
        name: data.name,
        description: data.description,
        color: data.color,
        temperature: data.temperature,
      }, {
        onConflict: 'user_id',
      });

    if (error) throw error;

    // Update local state
    setSunData(data);
  };

  const handleSunEditorBack = useCallback(() => {
    setViewState('galaxy');
  }, []);

  const handleCreatePlanet = useCallback(() => {
    setViewState('create-planet');
  }, []);

  const handleCreatePlanetSuccess = useCallback(() => {
    fetchCustomizations();
    setViewState('galaxy');
  }, []);

  const handleDeletePlanet = useCallback(async () => {
    if (!selectedPlanet || !user) return;
    
    const { error } = await supabase
      .from('planet_customizations')
      .delete()
      .eq('user_id', user.id)
      .eq('planet_name', selectedPlanet.name);

    if (error) {
      toast.error('Failed to delete planet');
      throw error;
    }

    // Update local state
    setPlanetCustomizations(prev => {
      const updated = { ...prev };
      delete updated[selectedPlanet.name];
      return updated;
    });

    toast.success(`${selectedPlanet.displayName} has been deleted`);
    handleBackToGalaxy();
  }, [selectedPlanet, user, handleBackToGalaxy]);

  const selectedCharacters = selectedPlanet
    ? characters.filter(c => (c.home_planet || 'Unknown') === selectedPlanet.name)
    : [];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading the galaxy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] relative">
      {/* Action Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="outline" onClick={handleCreatePlanet}>
          <Globe className="w-4 h-4 mr-2" />
          Create Planet
        </Button>
        <Button asChild>
          <Link to="/characters/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Character
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent">
          Galaxy Map
        </h1>
        <p className="text-muted-foreground text-sm">
          {viewState === 'zooming' || viewState === 'zooming-in' 
            ? 'Traveling...' 
            : 'Click a planet or the sun to customize'}
        </p>
      </div>

      {/* Zoom transition overlay */}
      {(viewState === 'zooming' || viewState === 'zooming-in') && (
        <div className="absolute inset-0 z-5 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-background/30 animate-pulse" />
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas className="!absolute inset-0">
        <PerspectiveCamera makeDefault position={[0, 15, 20]} fov={60} />
        <ambientLight intensity={0.2} />
        
        <CameraController
          targetPosition={cameraTarget}
          targetLookAt={cameraLookAt}
          isZooming={isZooming}
          onZoomComplete={handleZoomComplete}
        />
        
        <Suspense fallback={null}>
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <Sun 
            color={sunData.color}
            temperature={sunData.temperature}
            onClick={handleSunClick}
          />

          {planets.map((planet) => {
            const sunLuminosity = getSunLuminosityFromTemperature(sunData.temperature);
            const habitableZone = getHabitableZone(sunData.temperature);
            return (
              <group key={planet.name}>
                <OrbitRing radius={planet.orbitRadius} />
                <Planet
                  name={planet.displayName}
                  orbitRadius={planet.orbitRadius}
                  planetSize={planet.planetSize}
                  orbitSpeed={planet.orbitSpeed}
                  color={planet.color}
                  characterCount={planet.characterCount}
                  onClick={(pos) => handlePlanetClick(planet, pos)}
                  isSelected={selectedPlanet?.name === planet.name}
                  hasRingsOverride={planet.hasRings}
                  moonCountOverride={planet.moonCount}
                  sunTemperature={sunData.temperature}
                  sunLuminosity={sunLuminosity}
                  habitableZoneInner={habitableZone.inner}
                  habitableZoneOuter={habitableZone.outer}
                  gravity={planet.gravity}
                  description={planet.description}
                />
              </group>
            );
          })}
        </Suspense>

        <OrbitControls
          enabled={controlsEnabled}
          enablePan={false}
          minDistance={10}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>

      {/* Planet Menu Overlay */}
      {viewState === 'menu' && selectedPlanet && (
        <PlanetMenu
          planetName={selectedPlanet.displayName}
          characterCount={selectedPlanet.characterCount}
          onViewCharacters={handleViewCharacters}
          onEditPlanet={handleEditPlanet}
          onDeletePlanet={handleDeletePlanet}
          onBack={handleBack}
          canDelete={selectedPlanet.isUserCreated === true}
        />
      )}

      {/* Character List View */}
      {viewState === 'characters' && selectedPlanet && (
        <CharacterList
          planetName={selectedPlanet.displayName}
          characters={selectedCharacters}
          onBack={handleBackToGalaxy}
          isUserOwned={selectedCharacters.every(c => c.user_id === user?.id)}
        />
      )}

      {/* Planet Editor View */}
      {viewState === 'editor' && selectedPlanet && (
        <PlanetEditor
          planet={{
            name: selectedPlanet.name,
            displayName: selectedPlanet.displayName,
            description: selectedPlanet.description,
            color: selectedPlanet.color,
            hasRings: selectedPlanet.hasRings,
            moonCount: selectedPlanet.moonCount,
            gravity: selectedPlanet.gravity,
            radius: selectedPlanet.radius,
            orbitalDistance: selectedPlanet.orbitalDistance,
          }}
          onSave={handleSavePlanet}
          onBack={handleBack}
        />
      )}

      {/* Sun Editor View */}
      {viewState === 'sun-editor' && (
        <SunEditor
          sun={sunData}
          onSave={handleSaveSun}
          onBack={handleSunEditorBack}
        />
      )}

      {/* Create Planet Dialog */}
      {viewState === 'create-planet' && (
        <CreatePlanetDialog
          onSuccess={handleCreatePlanetSuccess}
          onBack={() => setViewState('galaxy')}
          existingPlanets={planets.map(p => p.name)}
        />
      )}

      {/* Empty state */}
      {planets.length === 0 && viewState === 'galaxy' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center space-y-4 pointer-events-auto">
            <p className="text-muted-foreground text-lg">
              The galaxy is empty. Create your first planet or character!
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleCreatePlanet}>
                <Globe className="w-4 h-4 mr-2" />
                Create Planet
              </Button>
              <Button asChild>
                <Link to="/characters/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Character
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
