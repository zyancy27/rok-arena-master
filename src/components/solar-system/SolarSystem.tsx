import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Sun from './Sun';
import Planet from './Planet';
import OrbitRing from './OrbitRing';
import CameraController from './CameraController';
import ZoomTransitionController from './ZoomTransitionController';
import WarpTransition from './WarpTransition';
import PlanetMenu from './PlanetMenu';
import CharacterList from './CharacterList';
import PlanetEditor, { PlanetCustomization } from './PlanetEditor';
import SunEditor, { SunCustomization, getColorFromTemperature, getSunLuminosityFromTemperature, getSunSizeFromTemperature } from './SunEditor';
import CreatePlanetDialog from './CreatePlanetDialog';
import SolarSystemSelector, { SolarSystemData } from './SolarSystemSelector';
import GalaxyView from './GalaxyView';
import GiantCharacter, { isPlanetSizedCharacter, getCharacterGender, getCosmicColor } from './GiantCharacter';

import { getHabitableZone } from './Sun';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Globe, Sparkles } from 'lucide-react';
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
  solar_system_id?: string | null;
  lore?: string | null;
  powers?: string | null;
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
  solar_system_id?: string | null;
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

type ViewState = 'galaxy' | 'my-galaxy' | 'zooming' | 'menu' | 'zooming-in' | 'characters' | 'editor' | 'sun-editor' | 'create-planet';

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

interface SolarSystemProps {
  viewSystemId?: string | null;
}

export default function SolarSystem({ viewSystemId }: SolarSystemProps) {
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
  
  // Solar system state
  const [solarSystems, setSolarSystems] = useState<SolarSystemData[]>([]);
  const [currentSystem, setCurrentSystem] = useState<SolarSystemData | null>(null);
  const [isViewingFriend, setIsViewingFriend] = useState(false);
  
  // Camera animation state
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null);
  const [cameraLookAt, setCameraLookAt] = useState<THREE.Vector3 | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const [controlsEnabled, setControlsEnabled] = useState(true);
  
  // Warp transition state
  const [warpActive, setWarpActive] = useState(false);
  const [warpDirection, setWarpDirection] = useState<'in' | 'out'>('out');
  const [pendingSystemId, setPendingSystemId] = useState<string | null>(null);

  // Fetch solar systems first
  useEffect(() => {
    fetchSolarSystems();
  }, [user, viewSystemId]);

  // Fetch data when current system changes
  useEffect(() => {
    if (currentSystem) {
      fetchCharacters();
      fetchCustomizations();
      fetchSunData();
    }
  }, [currentSystem]);

  const fetchSolarSystems = async () => {
    const { data, error } = await supabase
      .from('solar_systems')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch solar systems:', error);
      setLoading(false);
      return;
    }

    setSolarSystems(data || []);
    
    // If viewing a specific system (from friend link), use that
    if (viewSystemId && data) {
      const viewSystem = data.find(s => s.id === viewSystemId);
      if (viewSystem) {
        setCurrentSystem(viewSystem);
        setIsViewingFriend(viewSystem.user_id !== user?.id);
        return;
      }
    }
    
    // Set current system - prefer user's first system, or first available
    if (data && data.length > 0) {
      const userSystem = data.find(s => s.user_id === user?.id);
      setCurrentSystem(userSystem || data[0]);
      setIsViewingFriend(false);
    } else if (user) {
      // Auto-create a default system for the user
      await createDefaultSystem();
    } else {
      setLoading(false);
    }
  };

  const createDefaultSystem = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('solar_systems')
      .insert({
        user_id: user.id,
        name: 'My Galaxy',
        description: 'My first solar system',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create default system:', error);
      setLoading(false);
      return;
    }

    setSolarSystems([data]);
    setCurrentSystem(data);
  };

  const fetchCharacters = async () => {
    if (!currentSystem) {
      setLoading(false);
      return;
    }

    // Fetch characters that belong to this system OR have a home_planet matching a planet in this system
    let query = supabase
      .from('characters')
      .select('id, name, level, race, home_planet, user_id, solar_system_id, lore, powers')
      .order('created_at', { ascending: false });

    // Filter by solar_system_id if set, otherwise show characters with planets in this system
    const { data: charData, error: charError } = await query;

    if (charError || !charData) {
      setLoading(false);
      return;
    }

    // Filter characters: 
    // 1. Those explicitly in this system via solar_system_id
    // 2. Those owned by the system owner with no solar_system_id (default to their system)
    // 3. Those with home_planet matching a planet in this system
    const systemCharacters = charData.filter(c => 
      c.solar_system_id === currentSystem.id || 
      (!c.solar_system_id && c.user_id === currentSystem.user_id) ||
      (!c.solar_system_id && planetCustomizations[c.home_planet || ''])
    );

    const userIds = [...new Set(systemCharacters.map(c => c.user_id))];

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds.length > 0 ? userIds : ['']);

    const profileMap = new Map(profilesData?.map(p => [p.id, p.username]) || []);

    const charactersWithProfiles = systemCharacters.map(char => ({
      ...char,
      username: profileMap.get(char.user_id),
    }));

    setCharacters(charactersWithProfiles);
    setLoading(false);
  };

  const fetchCustomizations = async () => {
    if (!currentSystem) return;
    
    const { data } = await supabase
      .from('planet_customizations')
      .select('planet_name, display_name, description, color, has_rings, moon_count, gravity, radius, orbital_distance, solar_system_id')
      .eq('solar_system_id', currentSystem.id);

    if (data) {
      const customMap: Record<string, StoredCustomization> = {};
      data.forEach(c => {
        customMap[c.planet_name] = c;
      });
      setPlanetCustomizations(customMap);
    } else {
      setPlanetCustomizations({});
    }
  };

  const fetchSunData = async () => {
    if (!currentSystem) return;
    
    const { data } = await supabase
      .from('sun_customizations')
      .select('name, description, color, temperature')
      .eq('solar_system_id', currentSystem.id)
      .maybeSingle();

    if (data) {
      setSunData({
        name: data.name || 'Sol',
        description: data.description || '',
        color: data.color || '#FDB813',
        temperature: data.temperature || 5778,
      });
    } else {
      // Reset to defaults for new/different system
      setSunData({
        name: 'Sol',
        description: '',
        color: '#FDB813',
        temperature: 5778,
      });
    }
  };

  // Calculate sun's visual radius based on temperature
  const sunRadius = useMemo(() => {
    const baseSize = 2;
    const sizeMultiplier = getSunSizeFromTemperature(sunData.temperature);
    // Include outer glow in the "safe" radius (1.3x core + some buffer)
    return baseSize * sizeMultiplier * 1.5;
  }, [sunData.temperature]);

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

    // Minimum safe orbit starts outside the sun's visual radius + buffer
    const minOrbitRadius = sunRadius + 2;

    sortedPlanets.forEach(([name, count]) => {
      const customization = planetCustomizations[name];
      
      // Use orbital_distance if set, otherwise use sequential positioning
      // Orbital distance in AU-like units (1 = closest, 10 = farthest)
      const orbitalDistance = customization?.orbital_distance ?? (1 + defaultOrbitIndex * 0.8);
      // Scale to 3D units: start from safe distance outside the sun
      // Base orbit = minOrbitRadius + (distance * scale factor)
      const orbitRadius = minOrbitRadius + orbitalDistance * 4;
      
      // Calculate orbital speed using Kepler's third law (faster for closer planets)
      const orbitSpeed = 0.3 / Math.pow(orbitalDistance, 0.5);
      
      // Planet size: use radius if customized, otherwise based on character count
      // Radius values: 0.5 = small (Mars-like), 1 = Earth-like, 2 = Neptune-like, 3 = Jupiter-like
      const customRadius = customization?.radius;
      const planetSize = customRadius 
        ? 0.3 + customRadius * 0.4 // Range: 0.5 (r=0.5) to 1.5 (r=3)
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

  // Identify planet-sized characters that should be rendered as giant humanoid figures
  const giantCharacters = useMemo(() => {
    return characters.filter(char => isPlanetSizedCharacter({
      level: char.level,
      lore: char.lore,
      powers: char.powers,
      race: char.race,
    })).map((char, index) => {
      // Calculate orbit - place between planet orbits or in outer region
      const baseOrbit = planets.length > 0 
        ? Math.max(...planets.map(p => p.orbitRadius)) + 5 + index * 3
        : 8 + index * 3;
      
      // Size scales with power tier
      const sizeMultiplier = char.level >= 6 ? 2.5 : char.level >= 5 ? 2 : 1.5;
      const size = sizeMultiplier;
      
      // Orbital speed - slower for larger/more powerful beings
      const orbitSpeed = 0.08 / Math.pow(char.level, 0.3);
      
      return {
        ...char,
        orbitRadius: baseOrbit,
        size,
        orbitSpeed,
        isMale: getCharacterGender(char) === 'male',
        color: getCosmicColor(char.level),
      };
    });
  }, [characters, planets]);

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
    if (!selectedPlanet || !user || !currentSystem) return;

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
        solar_system_id: currentSystem.id,
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
        solar_system_id: currentSystem.id,
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
    if (!user || !currentSystem) return;

    const { error } = await supabase
      .from('sun_customizations')
      .upsert({
        user_id: user.id,
        name: data.name,
        description: data.description,
        color: data.color,
        temperature: data.temperature,
        solar_system_id: currentSystem.id,
      }, {
        onConflict: 'user_id,solar_system_id',
      });

    if (error) throw error;

    // Update local state
    setSunData(data);
  };

  const handleSunEditorBack = useCallback(() => {
    setViewState('galaxy');
  }, []);

  const handleViewGalaxy = useCallback(() => {
    // Trigger warp out transition
    setWarpDirection('out');
    setWarpActive(true);
  }, []);

  const handleWarpTransitionEnd = useCallback(() => {
    setWarpActive(false);
    
    if (warpDirection === 'out') {
      // Transitioning to galaxy view
      setViewState('my-galaxy');
    } else if (warpDirection === 'in' && pendingSystemId) {
      // Transitioning into a solar system
      const system = solarSystems.find(s => s.id === pendingSystemId);
      if (system) {
        const isChangingSystem = system.id !== currentSystem?.id;
        setCurrentSystem(system);
        setIsViewingFriend(system.user_id !== user?.id);
        setViewState('galaxy');
        // Only trigger loading if actually changing to a different system
        if (isChangingSystem) {
          setLoading(true);
        }
      }
      setPendingSystemId(null);
    } else if (warpDirection === 'in') {
      // Returning to current system (no pending ID means same system)
      setViewState('galaxy');
    }
  }, [warpDirection, pendingSystemId, solarSystems, user, currentSystem]);

  const handleExitGalaxy = useCallback(() => {
    // Use warp transition to return
    setWarpDirection('in');
    setPendingSystemId(currentSystem?.id || null);
    setWarpActive(true);
  }, [currentSystem]);

  const handleEnterSystemFromGalaxy = useCallback((systemId: string) => {
    // Trigger warp in transition, then switch system
    setWarpDirection('in');
    setPendingSystemId(systemId);
    setWarpActive(true);
  }, []);

  const handleCreatePlanet = useCallback(() => {
    setViewState('create-planet');
  }, []);

  const handleCreatePlanetSuccess = useCallback(() => {
    fetchCustomizations();
    fetchCharacters();
    setViewState('galaxy');
  }, [currentSystem]);

  const handleDeletePlanet = useCallback(async () => {
    if (!selectedPlanet || !user || !currentSystem) return;
    
    const { error } = await supabase
      .from('planet_customizations')
      .delete()
      .eq('user_id', user.id)
      .eq('planet_name', selectedPlanet.name)
      .eq('solar_system_id', currentSystem.id);

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
  }, [selectedPlanet, user, currentSystem, handleBackToGalaxy]);

  const handleSystemChange = useCallback((system: SolarSystemData) => {
    setCurrentSystem(system);
    setSelectedPlanet(null);
    setViewState('galaxy');
    setLoading(true);
  }, []);

  const handleSystemCreated = useCallback(() => {
    fetchSolarSystems();
  }, []);

  const handleSystemDeleted = useCallback(() => {
    fetchSolarSystems();
  }, []);

  const selectedCharacters = selectedPlanet
    ? characters.filter(c => (c.home_planet || 'Unknown') === selectedPlanet.name)
    : [];

  if (loading && viewState !== 'my-galaxy') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading solar system...</p>
        </div>
      </div>
    );
  }

  // Show Galaxy View when in my-galaxy mode
  if (viewState === 'my-galaxy') {
    return (
      <>
        <WarpTransition 
          isActive={warpActive} 
          direction={warpDirection}
          onTransitionEnd={handleWarpTransitionEnd}
        />
        <GalaxyView
          currentSystemId={currentSystem?.id || null}
          onEnterSystem={handleEnterSystemFromGalaxy}
          onBack={handleExitGalaxy}
        />
      </>
    );
  }

  return (
    <>
      {/* Warp transition overlay */}
      <WarpTransition 
        isActive={warpActive} 
        direction={warpDirection}
        onTransitionEnd={handleWarpTransitionEnd}
      />
    <div className="h-[calc(100vh-8rem)] relative">
      {/* Viewing Friend Banner */}
      {isViewingFriend && currentSystem && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-primary/20 border-b border-primary/30 py-2 px-4 text-center">
          <p className="text-sm">
            Viewing <span className="font-semibold">{currentSystem.name}</span> (read-only)
            <Button
              variant="link"
              size="sm"
              className="ml-2"
              onClick={() => {
                const userSystem = solarSystems.find(s => s.user_id === user?.id);
                if (userSystem) {
                  setCurrentSystem(userSystem);
                  setIsViewingFriend(false);
                }
              }}
            >
              Return to your system
            </Button>
          </p>
        </div>
      )}

      {/* Action Buttons - hide when viewing friend's system */}
      {!isViewingFriend && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button variant="outline" onClick={handleViewGalaxy}>
            <Sparkles className="w-4 h-4 mr-2" />
            My Galaxy
          </Button>
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
      )}

      {/* Header */}
      <div className={`absolute ${isViewingFriend ? 'top-14' : 'top-4'} left-4 z-10 space-y-2`}>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent">
          Solar System Map
        </h1>
        <SolarSystemSelector
          systems={solarSystems}
          currentSystem={currentSystem}
          onSystemChange={handleSystemChange}
          onSystemCreated={handleSystemCreated}
          onSystemDeleted={handleSystemDeleted}
        />
        <p className="text-muted-foreground text-sm">
          {viewState === 'zooming' || viewState === 'zooming-in' 
            ? 'Traveling...' 
            : isViewingFriend 
              ? 'Viewing friend\'s solar system'
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
            key={`sun-${sunData.temperature}-${sunData.color}`}
            color={sunData.color}
            temperature={sunData.temperature}
            onClick={handleSunClick}
          />

          {planets.map((planet) => {
            const sunLuminosity = getSunLuminosityFromTemperature(sunData.temperature);
            const habitableZone = getHabitableZone(sunData.temperature);
            // Create a unique key that includes customization values to force re-render
            const planetKey = `${planet.name}-${planet.orbitRadius}-${planet.planetSize}-${planet.color}`;
            return (
              <group key={planetKey}>
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

          {/* Render planet-sized characters as giant humanoid figures */}
          {giantCharacters.map((giant) => (
            <group key={`giant-${giant.id}`}>
              <OrbitRing radius={giant.orbitRadius} color={giant.color} opacity={0.3} />
              <GiantCharacter
                name={giant.name}
                orbitRadius={giant.orbitRadius}
                orbitSpeed={giant.orbitSpeed}
                size={giant.size}
                color={giant.color}
                isMale={giant.isMale}
                level={giant.level}
              />
            </group>
          ))}
        </Suspense>

        {/* Zoom transition detector */}
        <ZoomTransitionController
          onZoomOutThreshold={handleViewGalaxy}
          threshold={48}
          enabled={controlsEnabled && viewState === 'galaxy'}
        />

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
      {viewState === 'create-planet' && currentSystem && (
        <CreatePlanetDialog
          onSuccess={handleCreatePlanetSuccess}
          onBack={() => setViewState('galaxy')}
          existingPlanets={planets.map(p => p.name)}
          solarSystemId={currentSystem.id}
        />
      )}

      {/* Empty state */}
      {planets.length === 0 && viewState === 'galaxy' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center space-y-4 pointer-events-auto">
            <p className="text-muted-foreground text-lg">
              Your solar system is empty. Create your first planet or character!
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
    </>
  );
}
