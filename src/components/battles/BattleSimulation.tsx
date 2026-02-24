import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Play, Swords, Sparkles } from 'lucide-react';

interface Character {
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

interface BattleSimulationProps {
  characters: Character[];
}

export default function BattleSimulation({ characters }: BattleSimulationProps) {
  const [character1Id, setCharacter1Id] = useState<string>('');
  const [character2Id, setCharacter2Id] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const character1 = characters.find(c => c.id === character1Id);
  const character2 = characters.find(c => c.id === character2Id);

  const runSimulation = async () => {
    if (!character1 || !character2) {
      toast.error('Please select both characters');
      return;
    }

    if (character1.id === character2.id) {
      toast.error('Please select two different characters');
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
          turnCount: 10,
        },
      });

      if (error) throw error;

      if (data?.turns && data.turns.length > 0) {
        setResult(data);
        // Show first turn immediately
        setCurrentTurn(0);
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
    // Start from first turn (index 0)
    setCurrentTurn(0);

    // Auto-play through all turns - start from turn 1 since turn 0 is already shown
    let turn = 0;
    const interval = setInterval(() => {
      turn++;
      if (turn >= result.turns.length) {
        clearInterval(interval);
        setIsPlaying(false);
        // Set to last index to ensure all turns are visible
        setCurrentTurn(result.turns.length - 1);
        toast.success('Battle simulation complete!');
      } else {
        setCurrentTurn(turn);
      }
    }, 2000); // 2 seconds per turn
  };

  const getCharacterForTurn = (turn: SimulationTurn) => {
    if (turn.attacker === character1?.name) return character1;
    if (turn.attacker === character2?.name) return character2;
    // Fallback: odd turns = char1, even turns = char2
    return turn.turnNumber % 2 === 1 ? character1 : character2;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          EvE Battle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col [&_[data-radix-scroll-area-viewport]]:!overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            EvE Battle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Character Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fighter 1</label>
              <Select value={character1Id} onValueChange={setCharacter1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select character" />
                </SelectTrigger>
                <SelectContent>
                  {characters.map(char => (
                    <SelectItem key={char.id} value={char.id}>
                      <div className="flex items-center gap-2">
                        <span>{char.name}</span>
                        <Badge variant="secondary" className="text-xs">Tier {char.level}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {character1 && (
                <Card className="p-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={character1.image_url || undefined} />
                      <AvatarFallback>{character1.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium">{character1.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {character1.powers || 'No powers listed'}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fighter 2</label>
              <Select value={character2Id} onValueChange={setCharacter2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select character" />
                </SelectTrigger>
                <SelectContent>
                  {characters.map(char => (
                    <SelectItem key={char.id} value={char.id}>
                      <div className="flex items-center gap-2">
                        <span>{char.name}</span>
                        <Badge variant="secondary" className="text-xs">Tier {char.level}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {character2 && (
                <Card className="p-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={character2.image_url || undefined} />
                      <AvatarFallback>{character2.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium">{character2.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {character2.powers || 'No powers listed'}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={runSimulation} 
              disabled={!character1Id || !character2Id || isSimulating}
              className="flex-1"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Simulating Battle...
                </>
              ) : (
                <>
                  <Swords className="h-4 w-4 mr-2" />
                  Run Simulation (10 turns each)
                </>
              )}
            </Button>

            {result && !isPlaying && currentTurn < result.turns.length - 1 && (
              <Button onClick={playSimulation} variant="secondary">
                <Play className="h-4 w-4 mr-2" />
                Play ({result.turns.length} turns)
              </Button>
            )}
          </div>

          {/* Simulation Results */}
          {result && (
            <ScrollArea className="flex-1 min-h-[300px] max-h-[50vh] border rounded-lg scrollbar-thin">
              <div className="p-4 space-y-3">
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
          )}

          {/* Loading State */}
          {isSimulating && (
            <div className="flex-1 flex items-center justify-center">
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
      </DialogContent>
    </Dialog>
  );
}
