import { Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import Sun from './Sun';
import Planet from './Planet';
import OrbitRing from './OrbitRing';
import PlanetMenu from './PlanetMenu';
import CharacterList from './CharacterList';
import PlanetEditor from './PlanetEditor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Character {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
  user_id: string;
  username?: string;
}

interface PlanetData {
  name: string;
  description: string;
  color: string;
  orbitRadius: number;
  planetSize: number;
  orbitSpeed: number;
  characterCount: number;
}

type ViewState = 'galaxy' | 'menu' | 'characters' | 'editor';

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
  const [planetCustomizations, setPlanetCustomizations] = useState<Record<string, { description: string; color: string }>>({});

  useEffect(() => {
    fetchCharacters();
  }, []);

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

  // Group characters by planet
  const planets = useMemo(() => {
    const planetMap = new Map<string, number>();
    
    characters.forEach(char => {
      const planet = char.home_planet || 'Unknown';
      planetMap.set(planet, (planetMap.get(planet) || 0) + 1);
    });

    const planetArray: PlanetData[] = [];
    let orbitRadius = 5;

    planetMap.forEach((count, name) => {
      const customization = planetCustomizations[name];
      planetArray.push({
        name,
        description: customization?.description || '',
        color: customization?.color || getPlanetColor(name),
        orbitRadius,
        planetSize: Math.min(0.5 + count * 0.15, 1.5),
        orbitSpeed: 0.3 - (orbitRadius * 0.015),
        characterCount: count,
      });
      orbitRadius += 3;
    });

    return planetArray;
  }, [characters, planetCustomizations]);

  const handlePlanetClick = (planet: PlanetData) => {
    setSelectedPlanet(planet);
    setViewState('menu');
  };

  const handleViewCharacters = () => {
    setViewState('characters');
  };

  const handleEditPlanet = () => {
    setViewState('editor');
  };

  const handleBack = () => {
    if (viewState === 'menu') {
      setSelectedPlanet(null);
      setViewState('galaxy');
    } else {
      setViewState('menu');
    }
  };

  const handleBackToGalaxy = () => {
    setSelectedPlanet(null);
    setViewState('galaxy');
  };

  const handleSavePlanet = (data: { name: string; description: string; color: string }) => {
    if (selectedPlanet) {
      setPlanetCustomizations(prev => ({
        ...prev,
        [selectedPlanet.name]: {
          description: data.description,
          color: data.color,
        },
      }));
    }
  };

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
      {/* Create Character Button */}
      <div className="absolute top-4 right-4 z-10">
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
          Click a planet to explore its inhabitants
        </p>
      </div>

      {/* 3D Canvas */}
      <Canvas className="!absolute inset-0">
        <PerspectiveCamera makeDefault position={[0, 15, 20]} fov={60} />
        <ambientLight intensity={0.2} />
        
        <Suspense fallback={null}>
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <Sun />

          {planets.map((planet) => (
            <group key={planet.name}>
              <OrbitRing radius={planet.orbitRadius} />
              <Planet
                name={planet.name}
                orbitRadius={planet.orbitRadius}
                planetSize={planet.planetSize}
                orbitSpeed={planet.orbitSpeed}
                color={planet.color}
                characterCount={planet.characterCount}
                onClick={() => handlePlanetClick(planet)}
                isSelected={selectedPlanet?.name === planet.name}
              />
            </group>
          ))}
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={10}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>

      {/* Planet Menu Overlay */}
      {viewState === 'menu' && selectedPlanet && (
        <PlanetMenu
          planetName={selectedPlanet.name}
          characterCount={selectedPlanet.characterCount}
          onViewCharacters={handleViewCharacters}
          onEditPlanet={handleEditPlanet}
          onBack={handleBack}
        />
      )}

      {/* Character List View */}
      {viewState === 'characters' && selectedPlanet && (
        <CharacterList
          planetName={selectedPlanet.name}
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
            description: selectedPlanet.description,
            color: selectedPlanet.color,
          }}
          onSave={handleSavePlanet}
          onBack={handleBack}
        />
      )}

      {/* Empty state */}
      {planets.length === 0 && viewState === 'galaxy' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center space-y-4 pointer-events-auto">
            <p className="text-muted-foreground text-lg">
              The galaxy is empty. Create your first character to populate it!
            </p>
            <Button asChild>
              <Link to="/characters/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Character
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
