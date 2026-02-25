import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserSettings } from '@/hooks/use-user-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getTierName } from '@/lib/game-constants';
import { generateBattleEnvironment, BattleEnvironment } from '@/lib/battle-environment';
import EmergencyLocationGenerator from '@/components/battles/EmergencyLocationGenerator';
import SaveLocationPrompt from '@/components/battles/SaveLocationPrompt';
import EnvironmentChatBackground from '@/components/battles/EnvironmentChatBackground';
import BattlefieldEffectsOverlay from '@/components/battles/BattlefieldEffectsOverlay';
import { useBattlefieldEffects } from '@/components/battles/useBattlefieldEffects';
import AICharacterNotePanel from '@/components/battles/AICharacterNotePanel';
import { useCharacterAINotes } from '@/hooks/use-character-ai-notes';
import {
  ArrowLeft,
  Swords,
  Sparkles,
  Loader2,
  Play,
  RefreshCw,
  MapPin,
  Globe,
  Zap,
  Mic,
  Brain,
} from 'lucide-react';

interface UserCharacter {
  id: string;
  name: string;
  level: number;
  image_url: string | null;
  powers: string | null;
  abilities: string | null;
  personality?: string | null;
  mentality?: string | null;
  stat_speed?: number | null;
  stat_strength?: number | null;
  stat_skill?: number | null;
}

interface SimulationTurn {
  turnNumber: number;
  attacker: string;
  action: string;
}

interface SimulationResult {
  turns: SimulationTurn[];
  summary: string;
}

interface PlanetData {
  planet_name: string;
  display_name: string | null;
  gravity: number | null;
  description: string | null;
}

export default function EvEBattle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);
  const [character1, setCharacter1] = useState<UserCharacter | null>(null);
  const [character2, setCharacter2] = useState<UserCharacter | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Location setup
  const [battleLocation, setBattleLocation] = useState('');
  const [availablePlanets, setAvailablePlanets] = useState<PlanetData[]>([]);
  const [selectedPlanetData, setSelectedPlanetData] = useState<PlanetData | null>(null);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const { settings: userSettings } = useUserSettings();
  const dynamicEnvironment = userSettings.battle.dynamicBattlefieldEffects;
  const narratorFrequency = userSettings.battle.narratorFrequency;
  const [battleEnvironment, setBattleEnvironment] = useState<BattleEnvironment | null>(null);

  // Emergency location
  const [emergencyLocation, setEmergencyLocation] = useState<any>(null);
  const [showSaveLocationPrompt, setShowSaveLocationPrompt] = useState(false);

  // AI Character Notes
  const [showAINotePanel, setShowAINotePanel] = useState<'char1' | 'char2' | null>(null);
  const { getNotesForBattle: getChar1Notes } = useCharacterAINotes(character1?.id || null);
  const { getNotesForBattle: getChar2Notes } = useCharacterAINotes(character2?.id || null);

  // Battlefield effects
  const { activeEffects: battlefieldEffects, processMessage: processBattlefieldEffect } = useBattlefieldEffects();

  useEffect(() => {
    if (user) {
      fetchUserCharacters();
      fetchUserPlanets();
    }
  }, [user]);

  useEffect(() => {
    if (battleLocation && dynamicEnvironment) {
      const env = generateBattleEnvironment(battleLocation, null, null);
      setBattleEnvironment(env);
    }
  }, [battleLocation, dynamicEnvironment]);

  const fetchUserCharacters = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, level, image_url, powers, abilities, personality, mentality, stat_speed, stat_strength, stat_skill')
      .eq('user_id', user?.id)
      .order('name');
    if (data) setUserCharacters(data as UserCharacter[]);
  };

  const fetchUserPlanets = async () => {
    if (!user) return;
    const { data: systems } = await supabase
      .from('solar_systems')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    if (systems && systems.length > 0) {
      const { data: planets } = await supabase
        .from('planet_customizations')
        .select('planet_name, display_name, gravity, description')
        .eq('solar_system_id', systems[0].id);
      if (planets) setAvailablePlanets(planets as PlanetData[]);
    }
  };

  const runSimulation = async () => {
    if (!character1 || !character2) {
      toast.error('Please select both characters');
      return;
    }
    if (character1.id === character2.id) {
      toast.error('Please select two different characters');
      return;
    }
    if (!battleLocation.trim()) {
      toast.error('Please enter a battle location');
      return;
    }

    setIsSimulating(true);
    setResult(null);
    setCurrentTurn(0);
    setIsPlaying(false);

    try {
      const { data, error } = await supabase.functions.invoke('battle-simulation', {
        body: {
          character1: {
            name: character1.name,
            level: character1.level,
            powers: character1.powers,
            abilities: character1.abilities,
            personality: character1.personality,
            mentality: character1.mentality,
            stat_speed: character1.stat_speed,
            stat_strength: character1.stat_strength,
            stat_skill: character1.stat_skill,
          },
          character2: {
            name: character2.name,
            level: character2.level,
            powers: character2.powers,
            abilities: character2.abilities,
            personality: character2.personality,
            mentality: character2.mentality,
            stat_speed: character2.stat_speed,
            stat_strength: character2.stat_strength,
            stat_skill: character2.stat_skill,
          },
          battleLocation,
          turnCount: 10,
          character1AINotes: getChar1Notes(),
          character2AINotes: getChar2Notes(),
        },
      });

      if (error) throw error;

      if (data?.turns && data.turns.length > 0) {
        setResult(data);
        setCurrentTurn(0);

        // Process battlefield effects from simulation
        data.turns.forEach((turn: SimulationTurn) => {
          processBattlefieldEffect(turn.action);
        });

        toast.success(`Battle simulation ready! ${data.turns.length} turns generated.`);
      } else {
        throw new Error('Invalid simulation response');
      }
    } catch (err) {
      console.error('Simulation error:', err);
      toast.error('Failed to run simulation');
    } finally {
      setIsSimulating(false);
    }
  };

  const playSimulation = () => {
    if (!result) return;
    setIsPlaying(true);
    setCurrentTurn(0);

    let turn = 0;
    const interval = setInterval(() => {
      turn++;
      if (turn >= result.turns.length) {
        clearInterval(interval);
        setIsPlaying(false);
        setCurrentTurn(result.turns.length - 1);
        toast.success('Battle simulation complete!');
      } else {
        setCurrentTurn(turn);
      }
    }, 2000);
  };

  const resetBattle = () => {
    if (battleLocation.trim() && result) {
      setShowSaveLocationPrompt(true);
    }
    setResult(null);
    setCurrentTurn(0);
    setIsPlaying(false);
    setBattleLocation('');
    setSelectedPlanetData(null);
    setBattleEnvironment(null);
    setUseCustomLocation(false);
    setEmergencyLocation(null);
  };

  const getCharacterForTurn = (turn: SimulationTurn) => {
    if (turn.attacker === character1?.name) return character1;
    if (turn.attacker === character2?.name) return character2;
    return turn.turnNumber % 2 === 1 ? character1 : character2;
  };

  if (userCharacters.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Swords className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Create Characters First</h2>
        <p className="text-muted-foreground mb-4">
          You need at least two characters to run an EvE battle simulation.
        </p>
        <Button asChild>
          <Link to="/characters/new">Create Character</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Save Location Prompt */}
      <SaveLocationPrompt
        open={showSaveLocationPrompt}
        onOpenChange={setShowSaveLocationPrompt}
        locationName={emergencyLocation?.name || battleLocation}
        locationDescription={emergencyLocation?.description}
        isEmergency={!!emergencyLocation}
        hazardDescription={emergencyLocation?.hazards}
        countdownSeconds={emergencyLocation?.countdownTurns ? emergencyLocation.countdownTurns * 60 : undefined}
        initialTags={emergencyLocation?.tags || []}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/battles')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {result && (
          <Button variant="outline" onClick={resetBattle}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Battle
          </Button>
        )}
      </div>

      <Card className="bg-card-gradient border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            EvE Battle Simulation
            <Badge variant="outline" className="ml-2">AI Narrated</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!result ? (
            <div className="space-y-6">
              {/* Character Selection */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Fighter 1 */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Fighter 1</label>
                  <Select
                    value={character1?.id || ''}
                    onValueChange={(id) => setCharacter1(userCharacters.find(c => c.id === id) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select character" />
                    </SelectTrigger>
                    <SelectContent>
                      {userCharacters.map((char) => (
                        <SelectItem key={char.id} value={char.id}>
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            {char.name} (Tier {char.level})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {character1 && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={character1.image_url || undefined} />
                          <AvatarFallback>{character1.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{character1.name}</p>
                          <p className="text-xs text-muted-foreground">{getTierName(character1.level)}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {character1.powers || 'No powers listed'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fighter 2 */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Fighter 2</label>
                  <Select
                    value={character2?.id || ''}
                    onValueChange={(id) => setCharacter2(userCharacters.find(c => c.id === id) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select character" />
                    </SelectTrigger>
                    <SelectContent>
                      {userCharacters.filter(c => c.id !== character1?.id).map((char) => (
                        <SelectItem key={char.id} value={char.id}>
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            {char.name} (Tier {char.level})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {character2 && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={character2.image_url || undefined} />
                          <AvatarFallback>{character2.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{character2.name}</p>
                          <p className="text-xs text-muted-foreground">{getTierName(character2.level)}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {character2.powers || 'No powers listed'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Battle Location */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Battle Location
                </label>

                {availablePlanets.length > 0 && !useCustomLocation ? (
                  <div className="space-y-2">
                    <Select
                      value={selectedPlanetData?.planet_name || ''}
                      onValueChange={(value) => {
                        if (value === '__custom__') {
                          setUseCustomLocation(true);
                          setSelectedPlanetData(null);
                          setBattleLocation('');
                        } else {
                          const planet = availablePlanets.find(p => p.planet_name === value);
                          if (planet) {
                            setSelectedPlanetData(planet);
                            setBattleLocation(planet.display_name || planet.planet_name);
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a planet from your solar system..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlanets.map((planet) => (
                          <SelectItem key={planet.planet_name} value={planet.planet_name}>
                            <span className="flex items-center gap-2">
                              <Globe className="w-3 h-3 text-primary" />
                              {planet.display_name || planet.planet_name}
                              {planet.gravity && (
                                <Badge variant="outline" className="text-xs ml-2">
                                  {planet.gravity.toFixed(1)}g
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-muted-foreground border-t mt-1 pt-2">
                          + Enter custom location...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter battle location (e.g., Volcanic Mountains, Crystal Caverns)"
                        value={battleLocation}
                        onChange={(e) => setBattleLocation(e.target.value)}
                        className="flex-1"
                      />
                      {availablePlanets.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUseCustomLocation(false);
                            setBattleLocation('');
                          }}
                        >
                          <Globe className="w-4 h-4 mr-1" />
                          Select Planet
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Emergency Location Generator */}
                <EmergencyLocationGenerator
                  character1Name={character1?.name}
                  character2Name={character2?.name}
                  character1Level={character1?.level}
                  character2Level={character2?.level}
                  battleType="EvE"
                  planetName={selectedPlanetData?.display_name || selectedPlanetData?.planet_name}
                  planetDescription={selectedPlanetData?.description || undefined}
                  planetGravity={selectedPlanetData?.gravity}
                  onLocationGenerated={(loc) => {
                    setEmergencyLocation(loc);
                    setBattleLocation(loc.name);
                  }}
                  onSaveLocation={(loc) => {
                    setEmergencyLocation(loc);
                    setShowSaveLocationPrompt(true);
                  }}
                />


                {battleEnvironment && dynamicEnvironment && (
                  <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Globe className="w-4 h-4 text-amber-500" />
                      Environment: {battleEnvironment.shortSummary}
                    </div>
                  </div>
                )}
              </div>

              {/* Start Button */}
              <Button
                onClick={runSimulation}
                disabled={!character1 || !character2 || !battleLocation.trim() || isSimulating}
                className="w-full"
                size="lg"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Simulating Battle...
                  </>
                ) : (
                  <>
                    <Swords className="h-5 w-5 mr-2" />
                    Run EvE Simulation (10 turns each)
                  </>
                )}
              </Button>

              {/* Loading State */}
              {isSimulating && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Generating 10-turn battle...</p>
                    <p className="text-xs text-muted-foreground">
                      {character1?.name} vs {character2?.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Battle Header */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowAINotePanel('char1')}
                  title="Click to add AI character notes"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                    <AvatarImage src={character1?.image_url || undefined} />
                    <AvatarFallback>{character1?.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{character1?.name}</p>
                    <Badge variant="outline" className="text-xs">{getTierName(character1?.level || 1)}</Badge>
                    <p className="text-[10px] text-primary mt-0.5">📝 AI notes</p>
                  </div>
                </div>
                <Swords className="w-6 h-6 text-primary" />
                <div
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowAINotePanel('char2')}
                  title="Click to add AI character notes"
                >
                  <div className="text-right">
                    <p className="font-medium">{character2?.name}</p>
                    <Badge variant="outline" className="text-xs">{getTierName(character2?.level || 1)}</Badge>
                    <p className="text-[10px] text-primary mt-0.5">📝 AI notes</p>
                  </div>
                  <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                    <AvatarImage src={character2?.image_url || undefined} />
                    <AvatarFallback>{character2?.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Location & Environment Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{battleLocation}</span>
                {battleEnvironment && (
                  <Badge variant="outline" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    {battleEnvironment.gravity.toFixed(1)}g
                  </Badge>
                )}
              </div>

              {/* Play Button */}
              {!isPlaying && currentTurn < result.turns.length - 1 && (
                <Button onClick={playSimulation} variant="secondary" className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Play All ({result.turns.length} turns)
                </Button>
              )}

              {/* Simulation Results */}
              <div className="relative">
                {battleLocation && (
                  <EnvironmentChatBackground location={battleLocation} />
                )}
                {battlefieldEffects.length > 0 && (
                  <BattlefieldEffectsOverlay effects={battlefieldEffects} />
                )}
                <ScrollArea className="h-[500px] rounded-lg border border-border p-4 relative z-10" ref={scrollRef}>
                  <div className="space-y-4">
                    {result.turns.slice(0, currentTurn + 1).map((turn, index) => {
                      const char = getCharacterForTurn(turn);
                      const isChar1 = char?.id === character1?.id;

                      return (
                        <div
                          key={index}
                          className={`flex gap-3 ${isChar1 ? '' : 'flex-row-reverse'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={char?.image_url || undefined} />
                            <AvatarFallback className={isChar1 ? 'bg-primary/20' : 'bg-secondary'}>
                              {char?.name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <Card className={`flex-1 max-w-[80%] ${isChar1 ? 'bg-primary/5 border-primary/20' : 'bg-secondary/50'}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{turn.attacker}</span>
                                <Badge variant="outline" className="text-xs">
                                  Turn {turn.turnNumber}
                                </Badge>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{turn.action}</p>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}

                    {/* Summary */}
                    {currentTurn >= result.turns.length - 1 && result.summary && (
                      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 mt-4">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Battle Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{result.summary}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Character Note Panels */}
      {character1 && (
        <AICharacterNotePanel
          open={showAINotePanel === 'char1'}
          onOpenChange={(open) => setShowAINotePanel(open ? 'char1' : null)}
          characterId={character1.id}
          characterName={character1.name}
        />
      )}
      {character2 && (
        <AICharacterNotePanel
          open={showAINotePanel === 'char2'}
          onOpenChange={(open) => setShowAINotePanel(open ? 'char2' : null)}
          characterId={character2.id}
          characterName={character2.name}
        />
      )}
    </div>
  );
}
