import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { POWER_TIERS } from '@/lib/game-constants';
import { CHARACTER_STATS, DEFAULT_STATS, getTierBaseStats, type CharacterStats } from '@/lib/character-stats';
import { getGravityClass, calculateGravityStatModifiers } from '@/lib/planet-physics';
import { parseTerrainFromLore, generateTerrainVisuals, getTerrainSummary } from '@/lib/planet-terrain';
import StatSlider from './StatSlider';
import OwnershipNotice from '@/components/legal/OwnershipNotice';
import { useAutoSave } from '@/hooks/use-auto-save';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import { ArrowLeft, Save, Sparkles, Camera, Brain, Crosshair, Dumbbell, Flame, Zap, Shield, Heart, Target, Wand2, Smile, Lightbulb, Globe, Mountain, Thermometer, FileText, Loader2 } from 'lucide-react';

const iconMap = {
  Brain: <Brain className="w-4 h-4" />,
  Crosshair: <Crosshair className="w-4 h-4" />,
  Dumbbell: <Dumbbell className="w-4 h-4" />,
  Flame: <Flame className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
  Heart: <Heart className="w-4 h-4" />,
  Target: <Target className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
};

interface CharacterFormData {
  name: string;
  level: number;
  lore: string;
  powers: string;
  abilities: string;
  home_planet: string;
  home_moon: string;
  race: string;
  sub_race: string;
  age: string;
  image_url: string;
  personality: string;
  mentality: string;
}

interface CharacterFormProps {
  initialData?: CharacterFormData & { id: string } & Partial<CharacterStats>;
  mode: 'create' | 'edit';
}

export default function CharacterForm({ initialData, mode }: CharacterFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingNotes, setIsParsingNotes] = useState(false);
  const [characterNotes, setCharacterNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [planetGravity, setPlanetGravity] = useState<number | null>(null);
  const [planetData, setPlanetData] = useState<{
    description: string | null;
    gravity: number | null;
    orbital_distance: number | null;
  } | null>(null);
  const [availablePlanets, setAvailablePlanets] = useState<{ name: string; display_name: string | null; moon_count?: number | null }[]>([]);
  const [availableMoons, setAvailableMoons] = useState<{ name: string; display_name: string | null; planet_name: string }[]>([]);
  const [availableRaces, setAvailableRaces] = useState<{ id: string; name: string; typical_physiology: string | null; typical_abilities: string | null }[]>([]);
  const [useCustomPlanet, setUseCustomPlanet] = useState(false);
  const [useCustomMoon, setUseCustomMoon] = useState(false);
  const [useCustomRace, setUseCustomRace] = useState(false);
  
  const [formData, setFormData] = useState<CharacterFormData>({
    name: initialData?.name || '',
    level: initialData?.level || 1,
    lore: initialData?.lore || '',
    powers: initialData?.powers || '',
    abilities: initialData?.abilities || '',
    home_planet: initialData?.home_planet || '',
    home_moon: (initialData as any)?.home_moon || '',
    race: initialData?.race || '',
    sub_race: initialData?.sub_race || '',
    age: initialData?.age || '',
    image_url: initialData?.image_url || '',
    personality: (initialData as any)?.personality || '',
    mentality: (initialData as any)?.mentality || '',
  });

  const [stats, setStats] = useState<CharacterStats>({
    stat_intelligence: initialData?.stat_intelligence ?? DEFAULT_STATS.stat_intelligence,
    stat_battle_iq: (initialData as any)?.stat_battle_iq ?? DEFAULT_STATS.stat_battle_iq,
    stat_strength: initialData?.stat_strength ?? DEFAULT_STATS.stat_strength,
    stat_power: initialData?.stat_power ?? DEFAULT_STATS.stat_power,
    stat_speed: initialData?.stat_speed ?? DEFAULT_STATS.stat_speed,
    stat_durability: initialData?.stat_durability ?? DEFAULT_STATS.stat_durability,
    stat_stamina: initialData?.stat_stamina ?? DEFAULT_STATS.stat_stamina,
    stat_skill: initialData?.stat_skill ?? DEFAULT_STATS.stat_skill,
    stat_luck: initialData?.stat_luck ?? DEFAULT_STATS.stat_luck,
  });

  // Fetch available planets, moons, and races
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Fetch planets
      const { data: planets } = await supabase
        .from('planet_customizations')
        .select('planet_name, display_name, moon_count')
        .eq('user_id', user.id)
        .order('planet_name');

      if (planets) {
        setAvailablePlanets(planets.map(p => ({ name: p.planet_name, display_name: p.display_name, moon_count: p.moon_count })));
        
        // If editing and planet is not in list, enable custom mode
        if (initialData?.home_planet && !planets.some(p => p.planet_name === initialData.home_planet)) {
          setUseCustomPlanet(true);
        }
      }

      // Fetch moons
      const { data: moons } = await supabase
        .from('moon_customizations')
        .select('moon_name, display_name, planet_name')
        .eq('user_id', user.id)
        .order('moon_name');

      if (moons) {
        setAvailableMoons(moons.map(m => ({ name: m.moon_name, display_name: m.display_name, planet_name: m.planet_name })));
        
        // If editing and moon is not in list, enable custom mode
        if ((initialData as any)?.home_moon && !moons.some(m => m.moon_name === (initialData as any)?.home_moon)) {
          setUseCustomMoon(true);
        }
      }

      // Fetch races
      const { data: races } = await supabase
        .from('races')
        .select('id, name, typical_physiology, typical_abilities')
        .eq('user_id', user.id)
        .order('name');

      if (races) {
        setAvailableRaces(races);
        
        // If editing and race is not in list, enable custom mode
        if (initialData?.race && !races.some(r => r.name === initialData.race)) {
          setUseCustomRace(true);
        }
      }
    };

    fetchData();
  }, [user, initialData?.home_planet, initialData?.race]);

  // Fetch planet data when home_planet changes
  useEffect(() => {
    const fetchPlanetData = async () => {
      if (!formData.home_planet.trim() || !user) {
        setPlanetGravity(null);
        setPlanetData(null);
        return;
      }

      const { data } = await supabase
        .from('planet_customizations')
        .select('gravity, description, orbital_distance')
        .eq('planet_name', formData.home_planet.trim())
        .eq('user_id', user.id)
        .maybeSingle();

      setPlanetGravity(data?.gravity ?? null);
      setPlanetData(data);
    };

    fetchPlanetData();
  }, [formData.home_planet, user]);

  const gravityClass = planetGravity ? getGravityClass(planetGravity) : null;
  const gravityModifiers = planetGravity ? calculateGravityStatModifiers(planetGravity) : null;
  
  // Parse terrain from planet description
  const terrainFeatures = planetData?.description ? parseTerrainFromLore(planetData.description) : null;
  const terrainVisuals = terrainFeatures ? generateTerrainVisuals(terrainFeatures, '#3B82F6') : null;
  const terrainSummary = terrainFeatures ? getTerrainSummary(terrainFeatures) : null;

  const handleStatChange = (key: keyof CharacterStats, value: number) => {
    setStats(prev => ({ ...prev, [key]: value }));
  };

  const applyTierBaseStats = () => {
    const tierStats = getTierBaseStats(formData.level);
    setStats(tierStats);
    toast.success(`Applied Tier ${formData.level} base stats`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
    }
  };

  const handleChange = (field: keyof CharacterFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // AI Auto-fill from notes
  const handleAutoFillFromNotes = async () => {
    if (!characterNotes.trim()) {
      toast.error('Please enter your character notes first');
      return;
    }

    setIsParsingNotes(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-character-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: characterNotes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse notes');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const parsed = result.data;
        
        // Update form data with parsed values (only if they exist)
        setFormData(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          race: parsed.race || prev.race,
          sub_race: parsed.sub_race || prev.sub_race,
          age: parsed.age?.toString() || prev.age,
          home_planet: parsed.home_planet || prev.home_planet,
          powers: parsed.powers || prev.powers,
          abilities: parsed.abilities || prev.abilities,
          personality: parsed.personality || prev.personality,
          mentality: parsed.mentality || prev.mentality,
          lore: parsed.lore || prev.lore,
          level: parsed.level || prev.level,
        }));

        // Enable custom inputs if parsed values don't match existing options
        if (parsed.race && !availableRaces.find(r => r.name === parsed.race)) {
          setUseCustomRace(true);
        }
        if (parsed.home_planet && !availablePlanets.find(p => p.name === parsed.home_planet)) {
          setUseCustomPlanet(true);
        }

        toast.success('Character information extracted! Review and adjust as needed.');
      }
    } catch (error: any) {
      console.error('Auto-fill error:', error);
      toast.error(error.message || 'Failed to parse character notes');
    } finally {
      setIsParsingNotes(false);
    }
  };

  // Memoize data for auto-save (edit mode only)
  const autoSaveData = useMemo(() => ({
    formData,
    stats,
  }), [formData, stats]);

  // Auto-save callback for edit mode
  const handleAutoSave = useCallback(async (data: { formData: CharacterFormData; stats: CharacterStats }) => {
    if (!initialData?.id || !user || !data.formData.name.trim()) return;
    
    const characterData = {
      name: data.formData.name.trim(),
      level: data.formData.level,
      lore: data.formData.lore.trim() || null,
      powers: data.formData.powers.trim() || null,
      abilities: data.formData.abilities.trim() || null,
      home_planet: data.formData.home_planet.trim() || null,
      race: data.formData.race.trim() || null,
      sub_race: data.formData.sub_race.trim() || null,
      age: data.formData.age ? parseInt(data.formData.age) : null,
      personality: data.formData.personality.trim() || null,
      mentality: data.formData.mentality.trim() || null,
      ...data.stats,
    };

    const { error } = await supabase
      .from('characters')
      .update(characterData)
      .eq('id', initialData.id);

    if (error) throw error;
  }, [initialData?.id, user]);

  // Auto-save hook (only enabled in edit mode)
  const { isSaving: autoSaving, lastSaved, canUndo, undo } = useAutoSave({
    data: autoSaveData,
    onSave: handleAutoSave,
    debounceMs: 2000,
    enabled: mode === 'edit' && !!initialData?.id && !!formData.name.trim(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Character name is required');
      return;
    }

    setIsLoading(true);

    try {
      let imageUrl = formData.image_url;

      // Upload image if changed
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('character-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('character-images')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      }

      // Auto-create planet if it doesn't exist
      const planetName = formData.home_planet.trim();
      if (planetName) {
        const existingPlanet = availablePlanets.find(
          p => p.name.toLowerCase() === planetName.toLowerCase()
        );

        if (!existingPlanet) {
          // Get or create the user's default solar system
          let solarSystemId: string | null = null;
          
          const { data: existingSystems } = await supabase
            .from('solar_systems')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1);

          if (existingSystems && existingSystems.length > 0) {
            solarSystemId = existingSystems[0].id;
          } else {
            // Create a default solar system
            const { data: newSystem, error: systemError } = await supabase
              .from('solar_systems')
              .insert({
                user_id: user.id,
                name: 'My Galaxy',
                description: 'Auto-created galaxy',
              })
              .select('id')
              .single();

            if (systemError) {
              console.error('Failed to create solar system:', systemError);
            } else {
              solarSystemId = newSystem.id;
            }
          }

          // Create the planet with basic info
          if (solarSystemId) {
            const { error: planetError } = await supabase
              .from('planet_customizations')
              .insert({
                user_id: user.id,
                planet_name: planetName,
                display_name: planetName,
                solar_system_id: solarSystemId,
                gravity: 1.0,
                radius: 1.0,
                orbital_distance: 1.0,
              });

            if (planetError) {
              console.error('Failed to auto-create planet:', planetError);
            } else {
              toast.info(`Planet "${planetName}" added to your Solar System Map!`);
            }
          }
        }
      }

      const moonName = formData.home_moon.trim();
      
      // Auto-create moon if needed
      if (moonName && planetName) {
        const existingMoon = availableMoons.find(
          m => m.name.toLowerCase() === moonName.toLowerCase() && m.planet_name.toLowerCase() === planetName.toLowerCase()
        );
        
        if (!existingMoon) {
          // Get solar system id
          const { data: existingSystems } = await supabase
            .from('solar_systems')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1);

          const solarSystemId = existingSystems?.[0]?.id;
          
          if (solarSystemId) {
            const { error: moonError } = await supabase
              .from('moon_customizations')
              .insert({
                user_id: user.id,
                planet_name: planetName,
                moon_name: moonName,
                display_name: moonName,
                solar_system_id: solarSystemId,
              });

            if (!moonError) {
              toast.info(`Moon "${moonName}" added to ${planetName}!`);
            }
          }
        }
      }

      const characterData = {
        name: formData.name.trim(),
        level: formData.level,
        lore: formData.lore.trim() || null,
        powers: formData.powers.trim() || null,
        abilities: formData.abilities.trim() || null,
        home_planet: planetName || null,
        home_moon: moonName || null,
        race: formData.race.trim() || null,
        sub_race: formData.sub_race.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        image_url: imageUrl || null,
        personality: formData.personality.trim() || null,
        mentality: formData.mentality.trim() || null,
        user_id: user.id,
        ...stats,
      };

      if (mode === 'create') {
        const { error } = await supabase
          .from('characters')
          .insert(characterData);

        if (error) throw error;
        toast.success('Character created successfully!');
      } else if (initialData?.id) {
        const { error } = await supabase
          .from('characters')
          .update(characterData)
          .eq('id', initialData.id);

        if (error) throw error;
        toast.success('Character updated successfully!');
      }

      navigate('/hub');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save character');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card className="bg-card-gradient border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                {mode === 'create' ? 'Create New Character' : 'Edit Character'}
              </CardTitle>
              <CardDescription>
                Define your character's identity and powers according to R.O.K. rules.
                Remember: one base power only!
              </CardDescription>
            </div>
            {mode === 'edit' && (
              <AutoSaveIndicator
                isSaving={autoSaving}
                lastSaved={lastSaved}
                canUndo={canUndo}
                onUndo={undo}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Character Image */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/30">
                  <AvatarImage 
                    src={imageFile ? URL.createObjectURL(imageFile) : (formData.image_url || undefined)} 
                  />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                    {formData.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="image-upload"
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/80 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Upload a character portrait</p>
                <p className="text-xs">Max 5MB, JPG/PNG recommended</p>
              </div>
            </div>

            {/* AI Auto-fill from Notes */}
            {mode === 'create' && (
              <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">Quick Fill from Notes</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Paste your character notes, descriptions, or ideas below and let AI extract the information to auto-fill the form.
                </p>
                <Textarea
                  placeholder="Paste your character notes here... e.g., 'My character is named Kira, a 500-year-old celestial being from Planet Aethoria. She has the power of light manipulation and can create solid constructs from pure energy...'"
                  value={characterNotes}
                  onChange={(e) => setCharacterNotes(e.target.value)}
                  rows={5}
                  className="bg-background"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAutoFillFromNotes}
                  disabled={isParsingNotes || !characterNotes.trim()}
                  className="w-full"
                >
                  {isParsingNotes ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting Character Info...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Auto-Fill from Notes
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Character Name *</Label>
                <Input
                  id="name"
                  placeholder="Zephyr Stormborn"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Power Tier *</Label>
                <Select
                  value={formData.level.toString()}
                  onValueChange={(value) => handleChange('level', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {POWER_TIERS.map((tier) => (
                      <SelectItem key={tier.level} value={tier.level.toString()}>
                        Tier {tier.level}: {tier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Race & Origin */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="race">Race</Label>
                {availableRaces.length > 0 && !useCustomRace ? (
                  <Select
                    value={formData.race}
                    onValueChange={(value) => {
                      if (value === '__custom__') {
                        setUseCustomRace(true);
                        handleChange('race', '');
                      } else {
                        handleChange('race', value);
                        // Auto-fill suggestions from race data
                        const selectedRace = availableRaces.find(r => r.name === value);
                        if (selectedRace) {
                          toast.info(`Race "${value}" selected - check abilities/physiology suggestions below!`);
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a race..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {availableRaces.map((race) => (
                        <SelectItem key={race.id} value={race.name}>
                          {race.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__" className="text-muted-foreground border-t mt-1 pt-2">
                        + Enter custom race...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="race"
                      placeholder="Celestial"
                      value={formData.race}
                      onChange={(e) => handleChange('race', e.target.value)}
                      className="flex-1"
                    />
                    {availableRaces.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUseCustomRace(false);
                          handleChange('race', '');
                        }}
                      >
                        Select
                      </Button>
                    )}
                  </div>
                )}
                {availableRaces.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tip: Create races in the Races page to select them here
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub_race">Sub-Race</Label>
                <Input
                  id="sub_race"
                  placeholder="Stormkin"
                  value={formData.sub_race}
                  onChange={(e) => handleChange('sub_race', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="500"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                />
              </div>
            </div>

            {/* Race Info Panel - shows when a race is selected */}
            {formData.race && availableRaces.find(r => r.name === formData.race) && (
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Race Traits: {formData.race}
                </div>
                {(() => {
                  const selectedRace = availableRaces.find(r => r.name === formData.race);
                  if (!selectedRace) return null;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {selectedRace.typical_physiology && (
                        <div className="p-2 rounded bg-background/50 border-l-2 border-accent">
                          <span className="font-medium text-accent">Typical Physiology</span>
                          <p className="text-muted-foreground mt-1">{selectedRace.typical_physiology}</p>
                        </div>
                      )}
                      {selectedRace.typical_abilities && (
                        <div className="p-2 rounded bg-background/50 border-l-2 border-primary">
                          <span className="font-medium text-primary">Typical Abilities</span>
                          <p className="text-muted-foreground mt-1">{selectedRace.typical_abilities}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground italic">
                  Use these as inspiration for your character's powers and lore!
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="home_location" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Home Location
              </Label>
              {(availablePlanets.length > 0 || availableMoons.length > 0) && !useCustomPlanet ? (
                <div className="space-y-2">
                  <Select
                    value={formData.home_moon ? `moon:${formData.home_planet}:${formData.home_moon}` : formData.home_planet}
                    onValueChange={(value) => {
                      if (value === '__custom__') {
                        setUseCustomPlanet(true);
                        handleChange('home_planet', '');
                        handleChange('home_moon', '');
                      } else if (value.startsWith('moon:')) {
                        // Format: moon:planet_name:moon_name
                        const parts = value.split(':');
                        handleChange('home_planet', parts[1]);
                        handleChange('home_moon', parts[2]);
                      } else {
                        handleChange('home_planet', value);
                        handleChange('home_moon', '');
                      }
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select planet or moon..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50 max-h-[300px]">
                      {/* Planets with their moons grouped */}
                      {availablePlanets.map((planet) => {
                        const planetMoons = availableMoons.filter(m => 
                          m.planet_name.toLowerCase() === planet.name.toLowerCase()
                        );
                        return (
                          <div key={planet.name}>
                            <SelectItem value={planet.name} className="font-medium">
                              🪐 {planet.display_name || planet.name}
                            </SelectItem>
                            {planetMoons.map((moon) => (
                              <SelectItem 
                                key={`${planet.name}-${moon.name}`} 
                                value={`moon:${planet.name}:${moon.name}`}
                                className="pl-6 text-muted-foreground"
                              >
                                ↳ 🌙 {moon.display_name || moon.name}
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                      <SelectItem value="__custom__" className="text-muted-foreground border-t mt-1 pt-2">
                        + Enter custom location...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Show selected location info */}
                  {formData.home_planet && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {formData.home_moon ? (
                        <>🌙 Living on moon <span className="text-primary">{formData.home_moon}</span> orbiting <span className="text-primary">{formData.home_planet}</span></>
                      ) : (
                        <>🪐 Living on planet <span className="text-primary">{formData.home_planet}</span></>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="home_planet"
                      placeholder="Enter planet name..."
                      value={formData.home_planet}
                      onChange={(e) => handleChange('home_planet', e.target.value)}
                      className="flex-1"
                    />
                    {(availablePlanets.length > 0 || availableMoons.length > 0) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUseCustomPlanet(false);
                          handleChange('home_planet', '');
                          handleChange('home_moon', '');
                        }}
                      >
                        Select Existing
                      </Button>
                    )}
                  </div>
                  {formData.home_planet.trim() && (() => {
                    const homeLower = formData.home_planet.trim().toLowerCase();
                    const isShip = ['ship', 'vessel', 'cruiser', 'destroyer', 'carrier', 'frigate', 'corvette', 'battleship', 'dreadnought', 'starship', 'spacecraft', 'shuttle', 'station', 'ark', 'flagship', 'warship', 'gunship'].some(k => homeLower.includes(k));
                    const isFleet = ['fleet', 'armada', 'flotilla', 'squadron', 'navy', 'convoy', 'taskforce', 'task force', 'battle group', 'battlegroup'].some(k => homeLower.includes(k));
                    const isNewPlanet = !availablePlanets.some(p => p.name.toLowerCase() === homeLower);
                    
                    if (isFleet) {
                      return (
                        <p className="text-xs text-cyan-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Fleet will appear as ships orbiting in your Solar System Map!
                        </p>
                      );
                    } else if (isShip) {
                      return (
                        <p className="text-xs text-cyan-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Ship will appear orbiting in your Solar System Map!
                        </p>
                      );
                    } else if (isNewPlanet) {
                      return (
                        <p className="text-xs text-primary flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          New planet will be auto-added to your Solar System Map!
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {/* Moon input when in custom mode and planet is set */}
                  {formData.home_planet.trim() && (() => {
                    const homeLower = formData.home_planet.trim().toLowerCase();
                    const isShip = ['ship', 'vessel', 'cruiser', 'destroyer', 'carrier', 'frigate', 'corvette', 'battleship', 'dreadnought', 'starship', 'spacecraft', 'shuttle', 'station', 'ark', 'flagship', 'warship', 'gunship'].some(k => homeLower.includes(k));
                    const isFleet = ['fleet', 'armada', 'flotilla', 'squadron', 'navy', 'convoy', 'taskforce', 'task force', 'battle group', 'battlegroup'].some(k => homeLower.includes(k));
                    
                    if (isShip || isFleet) return null;
                    
                    return (
                      <div className="pt-2 border-t border-border/50">
                        <Label htmlFor="home_moon" className="text-xs text-muted-foreground mb-1 block">
                          Moon (optional)
                        </Label>
                        <Input
                          id="home_moon"
                          placeholder="Enter moon name if living on a moon..."
                          value={formData.home_moon}
                          onChange={(e) => handleChange('home_moon', e.target.value)}
                          className="text-sm"
                        />
                        {formData.home_moon.trim() && (
                          <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                            <Sparkles className="w-3 h-3" />
                            Moon will orbit {formData.home_planet} in your Solar System!
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  {availablePlanets.length === 0 && availableMoons.length === 0 && !formData.home_planet.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Enter a planet name, ship, or fleet - it will appear in your Solar System Map
                    </p>
                  )}
                </div>
              )}
              {/* Planet Info Panel - shows when planet data exists */}
              {(gravityClass || terrainFeatures) && (
                <div className="mt-3 p-4 rounded-lg border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Globe className="w-4 h-4 text-primary" />
                    Planet Environment
                  </div>
                  
                  {/* Gravity info */}
                  {gravityClass && gravityModifiers && (
                    <div 
                      className="p-2 rounded border-l-2"
                      style={{ 
                        backgroundColor: gravityClass.color + '10', 
                        borderColor: gravityClass.color 
                      }}
                    >
                      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: gravityClass.color }}>
                        <span>{gravityClass.name} ({planetGravity?.toFixed(2)}g)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{gravityModifiers.description}</p>
                    </div>
                  )}
                  
                  {/* Terrain summary */}
                  {terrainSummary && (
                    <div className="p-2 rounded bg-background/50 border-l-2 border-accent">
                      <div className="flex items-center gap-2 text-xs font-medium text-accent">
                        <Mountain className="w-3 h-3" />
                        Terrain
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{terrainSummary}</p>
                    </div>
                  )}
                  
                  {/* Physiology hints */}
                  {terrainVisuals && terrainVisuals.physiologyHints.length > 0 && (
                    <div className="p-2 rounded bg-background/50 border-l-2 border-primary">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
                        <Thermometer className="w-3 h-3" />
                        Suggested Physiology Adaptations
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {terrainVisuals.physiologyHints.map((hint, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-primary/50">•</span>
                            {hint}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lore">Lore & Backstory</Label>
              <Textarea
                id="lore"
                placeholder="Tell the story of your character's origins, motivations, and journey..."
                value={formData.lore}
                onChange={(e) => handleChange('lore', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="powers">
                Base Power
                <span className="text-xs text-muted-foreground ml-2">
                  (Remember: ONE base power only per R.O.K. rules)
                </span>
              </Label>
              <Textarea
                id="powers"
                placeholder="Describe your character's single base power in detail..."
                value={formData.powers}
                onChange={(e) => handleChange('powers', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abilities">Abilities & Techniques</Label>
              <Textarea
                id="abilities"
                placeholder="List the specific techniques and abilities derived from your base power..."
                value={formData.abilities}
                onChange={(e) => handleChange('abilities', e.target.value)}
                rows={4}
              />
            </div>

            {/* Personality & Mentality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="personality" className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-accent" />
                  Personality
                </Label>
                <Textarea
                  id="personality"
                  placeholder="Describe your character's personality traits, demeanor, and how they interact with others..."
                  value={formData.personality}
                  onChange={(e) => handleChange('personality', e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mentality" className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-cosmic-gold" />
                  Mentality
                </Label>
                <Textarea
                  id="mentality"
                  placeholder="Describe your character's mindset, beliefs, motivations, and psychological traits..."
                  value={formData.mentality}
                  onChange={(e) => handleChange('mentality', e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {/* Character Stats */}
            <Accordion type="single" collapsible defaultValue="stats">
              <AccordionItem value="stats" className="border-border">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Character Stats (0-100)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-muted-foreground">
                      Set your character's attributes on a scale of 0 (none) to 100 (absolute mastery).
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={applyTierBaseStats}
                      className="shrink-0"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      Use Tier {formData.level} Defaults
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground/70 italic mb-4">
                    Not sure what stats to use? Click the button above to apply balanced stats for your power tier.
                  </p>
                  
                  {/* Character Philosophy Note */}
                  <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 mb-6">
                    <div className="flex items-start gap-3">
                      <Heart className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">Create with Heart, Not Strategy</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          You're not making characters to simply beat other characters. Set your stats to match how you truly see your character — it's okay if they aren't the strongest or most intelligent. 
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This game is about bringing the characters in your heart and mind to life. Don't inflate stats just to win battles. If winning means that much to you, create a separate character for that purpose.
                        </p>
                        <p className="text-xs text-primary/80 italic">
                          Authenticity creates the best stories.
                        </p>
                      </div>
                    </div>
                  </div>
                  {CHARACTER_STATS.map((stat) => (
                    <StatSlider
                      key={stat.key}
                      name={stat.name}
                      description={stat.description}
                      value={stats[stat.key as keyof CharacterStats]}
                      onChange={(v) => handleStatChange(stat.key as keyof CharacterStats, v)}
                      icon={iconMap[stat.icon as keyof typeof iconMap]}
                      color={stat.color}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Ownership Notice */}
            <OwnershipNotice variant="card" />

            <Button type="submit" className="w-full glow-primary" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create Character' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
