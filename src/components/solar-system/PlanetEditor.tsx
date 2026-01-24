import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Loader2, Globe, Orbit, Weight, Ruler, Moon, Users, Plus, Trash2, Edit2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getGravityClass, 
  calculateGravityStatModifiers, 
  PLANET_PRESETS,
  type PlanetPhysics 
} from '@/lib/planet-physics';
import { useAutoSave } from '@/hooks/use-auto-save';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export interface PlanetCustomization {
  name: string;
  displayName: string;
  description: string;
  color: string;
  hasRings: boolean | null;
  moonCount: number | null;
  gravity: number | null;
  radius: number | null;
  orbitalDistance: number | null;
}

export interface MoonData {
  id?: string;
  moon_name: string;
  display_name: string | null;
  planet_name: string;
  color: string | null;
  gravity?: number | null;
  radius?: number | null;
  description?: string | null;
}

export interface CharacterData {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
  home_moon: string | null;
  user_id: string;
}

interface PlanetEditorProps {
  planet: PlanetCustomization;
  moons: MoonData[];
  allMoons: MoonData[]; // All moons in the solar system for transfer picker
  characters: CharacterData[];
  allPlanets: string[];
  solarSystemId: string;
  onSave: (data: PlanetCustomization) => Promise<void>;
  onMoonsChange: () => void;
  onCharactersChange: () => void;
  onBack: () => void;
}

const PLANET_COLORS = [
  { name: 'Crimson', value: '#DC2626' },
  { name: 'Amber', value: '#D97706' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Rose', value: '#DB2777' },
  { name: 'Slate', value: '#475569' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Indigo', value: '#6366F1' },
];

const MOON_COLORS = [
  { name: 'Gray', value: '#9CA3AF' },
  { name: 'Silver', value: '#C0C0C0' },
  { name: 'Ice', value: '#E0F2FE' },
  { name: 'Rust', value: '#B45309' },
  { name: 'Gold', value: '#FBBF24' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Blue', value: '#60A5FA' },
  { name: 'Green', value: '#4ADE80' },
];

export default function PlanetEditor({ 
  planet, 
  moons, 
  allMoons,
  characters, 
  allPlanets, 
  solarSystemId, 
  onSave, 
  onMoonsChange, 
  onCharactersChange, 
  onBack 
}: PlanetEditorProps) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(planet.displayName || planet.name);
  const [description, setDescription] = useState(planet.description);
  const [color, setColor] = useState(planet.color);
  const [hasRings, setHasRings] = useState<boolean>(planet.hasRings ?? false);
  const [customizeRings, setCustomizeRings] = useState(planet.hasRings !== null);
  const [moonCount, setMoonCount] = useState<number>(planet.moonCount ?? 0);
  const [customizeMoons, setCustomizeMoons] = useState(planet.moonCount !== null);
  const [saving, setSaving] = useState(false);
  
  // Physics properties
  const [gravity, setGravity] = useState<number>(planet.gravity ?? 1.0);
  const [radius, setRadius] = useState<number>(planet.radius ?? 1.0);
  const [orbitalDistance, setOrbitalDistance] = useState<number>(planet.orbitalDistance ?? 1.0);
  const [customizePhysics, setCustomizePhysics] = useState(
    planet.gravity !== null || planet.radius !== null || planet.orbitalDistance !== null
  );

  // Moon editing state
  const [editingMoon, setEditingMoon] = useState<MoonData | null>(null);
  const [newMoonName, setNewMoonName] = useState('');
  const [newMoonColor, setNewMoonColor] = useState('#9CA3AF');
  const [savingMoon, setSavingMoon] = useState(false);
  const [showAddMoon, setShowAddMoon] = useState(false);

  // Character transfer state
  const [transferringCharacter, setTransferringCharacter] = useState<CharacterData | null>(null);
  const [targetPlanet, setTargetPlanet] = useState<string>('');
  const [targetMoon, setTargetMoon] = useState<string>('');

  const gravityClass = getGravityClass(gravity);
  const statModifiers = calculateGravityStatModifiers(gravity);

  // Filter characters on this planet
  const planetCharacters = characters.filter(c => c.home_planet === planet.name);

  // Memoize the current data for auto-save
  const currentData = useMemo<PlanetCustomization>(() => ({
    name: planet.name,
    displayName: displayName.trim() || planet.name,
    description,
    color,
    hasRings: customizeRings ? hasRings : null,
    moonCount: customizeMoons ? moonCount : null,
    gravity: customizePhysics ? gravity : null,
    radius: customizePhysics ? radius : null,
    orbitalDistance: customizePhysics ? orbitalDistance : null,
  }), [planet.name, displayName, description, color, customizeRings, hasRings, customizeMoons, moonCount, customizePhysics, gravity, radius, orbitalDistance]);

  // Auto-save hook
  const { isSaving: autoSaving, lastSaved, canUndo, undo, saveNow } = useAutoSave({
    data: currentData,
    onSave,
    debounceMs: 1500,
    enabled: true,
  });

  const applyPreset = (presetName: string) => {
    const preset = PLANET_PRESETS[presetName];
    if (preset) {
      setGravity(preset.gravity);
      setRadius(preset.radius);
      setOrbitalDistance(preset.orbitalDistance);
      toast.success(`Applied ${presetName} preset`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveNow();
      toast.success('Planet customization saved!');
      onBack();
    } catch (error) {
      toast.error('Failed to save customization');
    } finally {
      setSaving(false);
    }
  };

  // Moon handlers
  const handleAddMoon = async () => {
    if (!newMoonName.trim() || !user) return;
    
    setSavingMoon(true);
    try {
      const { error } = await supabase
        .from('moon_customizations')
        .insert({
          user_id: user.id,
          planet_name: planet.name,
          moon_name: newMoonName.trim(),
          display_name: newMoonName.trim(),
          color: newMoonColor,
          solar_system_id: solarSystemId,
        });

      if (error) throw error;

      toast.success(`Moon "${newMoonName}" created!`);
      setNewMoonName('');
      setNewMoonColor('#9CA3AF');
      setShowAddMoon(false);
      onMoonsChange();
    } catch (error) {
      console.error('Error adding moon:', error);
      toast.error('Failed to create moon');
    } finally {
      setSavingMoon(false);
    }
  };

  const handleSaveMoon = async () => {
    if (!editingMoon || !user) return;
    
    setSavingMoon(true);
    try {
      const { error } = await supabase
        .from('moon_customizations')
        .update({
          display_name: editingMoon.display_name,
          color: editingMoon.color,
          description: editingMoon.description,
        })
        .eq('planet_name', planet.name)
        .eq('moon_name', editingMoon.moon_name)
        .eq('solar_system_id', solarSystemId);

      if (error) throw error;

      toast.success('Moon updated!');
      setEditingMoon(null);
      onMoonsChange();
    } catch (error) {
      console.error('Error saving moon:', error);
      toast.error('Failed to update moon');
    } finally {
      setSavingMoon(false);
    }
  };

  const handleDeleteMoon = async (moonName: string) => {
    if (!user) return;
    
    // Check if any characters live on this moon
    const moonResidents = characters.filter(c => c.home_moon === moonName && c.home_planet === planet.name);
    if (moonResidents.length > 0) {
      toast.error(`Cannot delete moon with ${moonResidents.length} resident(s). Reassign them first.`);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('moon_customizations')
        .delete()
        .eq('planet_name', planet.name)
        .eq('moon_name', moonName)
        .eq('solar_system_id', solarSystemId);

      if (error) throw error;

      toast.success('Moon deleted');
      onMoonsChange();
    } catch (error) {
      console.error('Error deleting moon:', error);
      toast.error('Failed to delete moon');
    }
  };

  // Character transfer handler
  const handleTransferCharacter = async () => {
    if (!transferringCharacter || !targetPlanet) return;
    
    try {
      const updateData: { home_planet: string; home_moon: string | null } = {
        home_planet: targetPlanet,
        home_moon: targetMoon || null,
      };

      const { error } = await supabase
        .from('characters')
        .update(updateData)
        .eq('id', transferringCharacter.id);

      if (error) throw error;

      toast.success(`${transferringCharacter.name} moved to ${targetPlanet}${targetMoon ? ` (${targetMoon})` : ''}`);
      setTransferringCharacter(null);
      setTargetPlanet('');
      setTargetMoon('');
      onCharactersChange();
    } catch (error) {
      console.error('Error transferring character:', error);
      toast.error('Failed to move character');
    }
  };

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-md overflow-auto animate-fade-in">
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        <Card className="bg-card-gradient border-border">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit -ml-2 mb-2"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Customize Planet</CardTitle>
                <CardDescription>
                  Personalize {planet.name}'s appearance, moons, and residents
                </CardDescription>
              </div>
              <AutoSaveIndicator
                isSaving={autoSaving}
                lastSaved={lastSaved}
                canUndo={canUndo}
                onUndo={undo}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="appearance" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="appearance">
                  <Globe className="w-4 h-4 mr-2" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger value="moons">
                  <Moon className="w-4 h-4 mr-2" />
                  Moons ({moons.length})
                </TabsTrigger>
                <TabsTrigger value="characters">
                  <Users className="w-4 h-4 mr-2" />
                  Residents ({planetCharacters.length})
                </TabsTrigger>
              </TabsList>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="space-y-6">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="planet-display-name">Display Name</Label>
                  <Input
                    id="planet-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={planet.name}
                  />
                  <p className="text-xs text-muted-foreground">
                    Original name: {planet.name}
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="planet-description">Planet Lore</Label>
                  <Textarea
                    id="planet-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this planet's history, culture, environment, or notable features..."
                    rows={4}
                  />
                </div>

                {/* Planet Color */}
                <div className="space-y-3">
                  <Label>Planet Color</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {PLANET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={`h-10 rounded-lg transition-all ${
                          color === c.value
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Planet Physics Section */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <Label className="text-base font-semibold">Planet Physics</Label>
                    </div>
                    <Switch checked={customizePhysics} onCheckedChange={setCustomizePhysics} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Define physical properties that affect orbital position and character stats
                  </p>
                  
                  {customizePhysics && (
                    <div className="space-y-4 pt-2">
                      {/* Preset selector */}
                      <div className="space-y-2">
                        <Label>Quick Preset</Label>
                        <Select onValueChange={applyPreset}>
                          <SelectTrigger>
                            <SelectValue placeholder="Apply a preset..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(PLANET_PRESETS).map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Gravity */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Weight className="w-3 h-3" />
                            Surface Gravity
                          </Label>
                          <span 
                            className="text-sm font-medium px-2 py-0.5 rounded"
                            style={{ backgroundColor: gravityClass.color + '30', color: gravityClass.color }}
                          >
                            {gravity.toFixed(2)}g — {gravityClass.name}
                          </span>
                        </div>
                        <Slider
                          value={[gravity]}
                          onValueChange={(v) => setGravity(v[0])}
                          min={0.05}
                          max={4}
                          step={0.05}
                        />
                        <p className="text-xs text-muted-foreground">{gravityClass.description}</p>
                        
                        {/* Stat modifiers preview */}
                        <div className="mt-2 p-2 rounded bg-background/50 text-xs">
                          <p className="font-medium text-foreground/80 mb-1">Character Stat Modifiers:</p>
                          <p className="text-muted-foreground">{statModifiers.description}</p>
                        </div>
                      </div>

                      {/* Radius */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Ruler className="w-3 h-3" />
                            Planet Radius
                          </Label>
                          <span className="text-sm font-medium">
                            {radius.toFixed(2)}× Earth
                          </span>
                        </div>
                        <Slider
                          value={[radius]}
                          onValueChange={(v) => setRadius(v[0])}
                          min={0.1}
                          max={5}
                          step={0.1}
                        />
                        <p className="text-xs text-muted-foreground">
                          Affects visual size. Earth = 6,371 km radius
                        </p>
                      </div>

                      {/* Orbital Distance */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Orbit className="w-3 h-3" />
                            Orbital Distance
                          </Label>
                          <span className="text-sm font-medium">
                            {orbitalDistance.toFixed(2)} AU
                          </span>
                        </div>
                        <Slider
                          value={[orbitalDistance]}
                          onValueChange={(v) => setOrbitalDistance(v[0])}
                          min={0.2}
                          max={10}
                          step={0.1}
                        />
                        <p className="text-xs text-muted-foreground">
                          Distance from sun in Astronomical Units. Earth = 1 AU. Affects climate zone.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rings Toggle */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Customize Rings</Label>
                      <p className="text-xs text-muted-foreground">Override default ring appearance</p>
                    </div>
                    <Switch checked={customizeRings} onCheckedChange={setCustomizeRings} />
                  </div>
                  {customizeRings && (
                    <div className="flex items-center justify-between pt-2">
                      <Label>Has Planetary Rings</Label>
                      <Switch checked={hasRings} onCheckedChange={setHasRings} />
                    </div>
                  )}
                </div>

                <Button onClick={handleSave} className="w-full" disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Customization
                </Button>
              </TabsContent>

              {/* Moons Tab */}
              <TabsContent value="moons" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Manage moons orbiting {planet.name}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddMoon(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Moon
                  </Button>
                </div>

                {/* Add Moon Form */}
                {showAddMoon && (
                  <Card className="p-4 space-y-4 border-primary/30">
                    <div className="space-y-2">
                      <Label>Moon Name</Label>
                      <Input
                        value={newMoonName}
                        onChange={(e) => setNewMoonName(e.target.value)}
                        placeholder="Enter moon name..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Moon Color</Label>
                      <div className="grid grid-cols-8 gap-2">
                        {MOON_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setNewMoonColor(c.value)}
                            className={`h-8 rounded transition-all ${
                              newMoonColor === c.value
                                ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110'
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddMoon} disabled={!newMoonName.trim() || savingMoon} className="flex-1">
                        {savingMoon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Moon'}
                      </Button>
                      <Button variant="ghost" onClick={() => setShowAddMoon(false)}>Cancel</Button>
                    </div>
                  </Card>
                )}

                {/* Moons List */}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {moons.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Moon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No moons yet</p>
                        <p className="text-xs">Add moons to give characters places to live</p>
                      </div>
                    ) : (
                      moons.map((moon) => {
                        const moonResidents = characters.filter(c => c.home_moon === moon.moon_name && c.home_planet === planet.name);
                        
                        if (editingMoon?.moon_name === moon.moon_name) {
                          return (
                            <Card key={moon.moon_name} className="p-4 space-y-3 border-primary/50">
                              <div className="space-y-2">
                                <Label>Display Name</Label>
                                <Input
                                  value={editingMoon.display_name || ''}
                                  onChange={(e) => setEditingMoon({ ...editingMoon, display_name: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="grid grid-cols-8 gap-2">
                                  {MOON_COLORS.map((c) => (
                                    <button
                                      key={c.value}
                                      type="button"
                                      onClick={() => setEditingMoon({ ...editingMoon, color: c.value })}
                                      className={`h-8 rounded transition-all ${
                                        editingMoon.color === c.value
                                          ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110'
                                          : 'hover:scale-105'
                                      }`}
                                      style={{ backgroundColor: c.value }}
                                      title={c.name}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                  value={editingMoon.description || ''}
                                  onChange={(e) => setEditingMoon({ ...editingMoon, description: e.target.value })}
                                  placeholder="Describe this moon..."
                                  rows={2}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleSaveMoon} disabled={savingMoon} className="flex-1">
                                  {savingMoon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                </Button>
                                <Button variant="ghost" onClick={() => setEditingMoon(null)}>Cancel</Button>
                              </div>
                            </Card>
                          );
                        }

                        return (
                          <Card key={moon.moon_name} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full"
                                style={{ backgroundColor: moon.color || '#9CA3AF' }}
                              />
                              <div>
                                <p className="font-medium">{moon.display_name || moon.moon_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {moonResidents.length} resident{moonResidents.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingMoon(moon)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteMoon(moon.moon_name)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Characters Tab */}
              <TabsContent value="characters" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Characters living on {planet.name}
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/create-character">
                      <UserPlus className="w-4 h-4 mr-1" />
                      Create Character
                    </Link>
                  </Button>
                </div>

                {/* Transfer Character Modal */}
                {transferringCharacter && (
                  <Card className="p-4 space-y-4 border-primary/30 bg-card">
                    <p className="font-medium">Move {transferringCharacter.name} to:</p>
                    <div className="space-y-2">
                      <Label>Target Planet</Label>
                      <Select value={targetPlanet} onValueChange={(v) => { setTargetPlanet(v); setTargetMoon(''); }}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select planet..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {allPlanets.filter(p => p !== planet.name).map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Visual Moon Picker */}
                    {targetPlanet && (
                      <div className="space-y-3">
                        <Label>Location on {targetPlanet}</Label>
                        
                        {/* Planet Surface Option */}
                        <button
                          type="button"
                          onClick={() => setTargetMoon('')}
                          className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                            targetMoon === ''
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50 bg-background'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">Planet Surface</p>
                            <p className="text-xs text-muted-foreground">Live directly on {targetPlanet}</p>
                          </div>
                          {targetMoon === '' && (
                            <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                        
                        {/* Available Moons */}
                        {(() => {
                          const targetPlanetMoons = allMoons.filter(m => m.planet_name === targetPlanet);
                          if (targetPlanetMoons.length === 0) return null;
                          
                          return (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">Or choose a moon:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {targetPlanetMoons.map((moon) => (
                                  <button
                                    key={moon.moon_name}
                                    type="button"
                                    onClick={() => setTargetMoon(moon.moon_name)}
                                    className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                                      targetMoon === moon.moon_name
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50 bg-background'
                                    }`}
                                  >
                                    <div
                                      className="w-8 h-8 rounded-full shrink-0"
                                      style={{ backgroundColor: moon.color || '#9CA3AF' }}
                                    />
                                    <div className="text-left min-w-0">
                                      <p className="font-medium text-sm truncate">{moon.display_name || moon.moon_name}</p>
                                      <p className="text-xs text-muted-foreground">Moon</p>
                                    </div>
                                    {targetMoon === moon.moon_name && (
                                      <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button onClick={handleTransferCharacter} disabled={!targetPlanet} className="flex-1">
                        Move Character
                      </Button>
                      <Button variant="ghost" onClick={() => setTransferringCharacter(null)}>Cancel</Button>
                    </div>
                  </Card>
                )}

                {/* Characters List */}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {planetCharacters.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No characters on this planet</p>
                        <p className="text-xs">Create a character with this as their home planet</p>
                      </div>
                    ) : (
                      planetCharacters.map((char) => (
                        <Card key={char.id} className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">
                                {char.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <Link 
                                to={`/characters/${char.id}`}
                                className="font-medium hover:text-primary transition-colors"
                              >
                                {char.name}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                Lv. {char.level} {char.race || 'Unknown Race'}
                                {char.home_moon && ` • ${char.home_moon}`}
                              </p>
                            </div>
                          </div>
                          {char.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTransferringCharacter(char)}
                            >
                              <Orbit className="w-4 h-4 mr-1" />
                              Move
                            </Button>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
