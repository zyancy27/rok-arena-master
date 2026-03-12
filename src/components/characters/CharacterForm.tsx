import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/use-subscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VoiceTextarea } from '@/components/ui/voice-textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { POWER_TIERS } from '@/lib/game-constants';
import { CHARACTER_STATS, DEFAULT_STATS, getTierBaseStats, type CharacterStats } from '@/lib/character-stats';
import { getGravityClass, calculateGravityStatModifiers } from '@/lib/planet-physics';
import { parseTerrainFromLore, generateTerrainVisuals, getTerrainSummary } from '@/lib/planet-terrain';
import StatSlider from './StatSlider';
import OwnershipNotice from '@/components/legal/OwnershipNotice';
import { useAutoSave } from '@/hooks/use-auto-save';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import {
  ArrowLeft, Save, Sparkles, Camera, Brain, Crosshair, Dumbbell, Flame, Zap, Shield, Heart, Target,
  Wand2, Smile, Lightbulb, Globe, Mountain, Thermometer, FileText, Loader2, ChevronDown, Check,
  Swords, User, BookOpen, Plus, Trash2, Clock, Eye,
} from 'lucide-react';
import CharacterTimeline, { saveTimelineEvents } from './CharacterTimeline';
import CharacterAppearance, { type AppearanceData, DEFAULT_APPEARANCE } from './CharacterAppearance';

// Helper to parse weapons_items (supports both JSON array and legacy plain text)
interface WeaponItem { name: string; description: string }

function parseWeaponItems(raw: string): WeaponItem[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Legacy: split by double-newline (paragraphs) first, then single newline/comma
  const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (blocks.length > 1) {
    // Multi-paragraph: each block is one item, split "Name: description"
    return blocks.map(block => {
      const colonIdx = block.indexOf(':');
      if (colonIdx > 0 && colonIdx < 40) {
        return { name: block.slice(0, colonIdx).trim(), description: block.slice(colonIdx + 1).trim() };
      }
      return { name: block.split('\n')[0].trim(), description: '' };
    });
  }
  // Single block: split by comma/semicolon/newline
  return raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).map(part => {
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0 && colonIdx < 40) {
      return { name: part.slice(0, colonIdx).trim(), description: part.slice(colonIdx + 1).trim() };
    }
    return { name: part, description: '' };
  });
}

function serializeWeaponItems(items: WeaponItem[]): string {
  const filtered = items.filter(i => i.name.trim());
  if (filtered.length === 0) return '';
  return JSON.stringify(filtered);
}

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
  weapons_items: string;
  home_planet: string;
  home_moon: string;
  race: string;
  sub_race: string;
  age: string;
  sex: string;
  image_url: string;
  personality: string;
  mentality: string;
}

interface CharacterFormProps {
  initialData?: CharacterFormData & { id: string } & Partial<CharacterStats>;
  mode: 'create' | 'edit';
}

/* ─── Section Header ─── */
function SectionHeader({
  icon,
  title,
  subtitle,
  badge,
  open,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

export default function CharacterForm({ initialData, mode }: CharacterFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canCreateCharacter, limits, storageTier, founderStatus } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingNotes, setIsParsingNotes] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [characterNotes, setCharacterNotes] = useState('');
  const [generateTheme, setGenerateTheme] = useState('');
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
  const [availableSubRaces, setAvailableSubRaces] = useState<{ id: string; name: string }[]>([]);
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [useCustomPlanet, setUseCustomPlanet] = useState(false);
  const [useCustomMoon, setUseCustomMoon] = useState(false);
  const [useCustomRace, setUseCustomRace] = useState(false);
  const [useCustomSubRace, setUseCustomSubRace] = useState(false);

  const [appearance, setAppearance] = useState<AppearanceData>(() => {
    if (initialData) {
      const d = initialData as any;
      return {
        appearance_height: d.appearance_height || '',
        appearance_build: d.appearance_build || '',
        appearance_hair: d.appearance_hair || '',
        appearance_eyes: d.appearance_eyes || '',
        appearance_distinct_features: d.appearance_distinct_features || '',
        appearance_clothing_style: d.appearance_clothing_style || '',
        appearance_aura: d.appearance_aura || '',
        appearance_description: d.appearance_description || '',
        appearance_posture: d.appearance_posture || '',
        appearance_voice: d.appearance_voice || '',
        appearance_movement_style: d.appearance_movement_style || '',
        appearance_typical_expression: d.appearance_typical_expression || '',
      };
    }
    return { ...DEFAULT_APPEARANCE };
  });

  const [timelineEventsLocal, setTimelineEventsLocal] = useState<any[]>([]);

  // Section open states — essentials always visible, rest collapsed on create
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    identity: mode === 'edit',
    lore: false,
    powers: mode === 'edit',
    personality: mode === 'edit',
    stats: false,
  });

  // Sub-sections inside Lore
  const [openLoreSubs, setOpenLoreSubs] = useState<Record<string, boolean>>({
    background: false,
    appearance: false,
    timeline: false,
  });
  const toggleLoreSub = (key: string) => setOpenLoreSubs(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const [formData, setFormData] = useState<CharacterFormData>({
    name: initialData?.name || '',
    level: initialData?.level || 1,
    lore: initialData?.lore || '',
    powers: initialData?.powers || '',
    abilities: initialData?.abilities || '',
    weapons_items: (initialData as any)?.weapons_items || '',
    home_planet: initialData?.home_planet || '',
    home_moon: (initialData as any)?.home_moon || '',
    race: initialData?.race || '',
    sub_race: initialData?.sub_race || '',
    age: initialData?.age || '',
    sex: (initialData as any)?.sex || '',
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
      const { data: planets } = await supabase.from('planet_customizations').select('planet_name, display_name, moon_count').eq('user_id', user.id).order('planet_name');
      if (planets) {
        setAvailablePlanets(planets.map(p => ({ name: p.planet_name, display_name: p.display_name, moon_count: p.moon_count })));
        if (initialData?.home_planet && !planets.some(p => p.planet_name === initialData.home_planet)) setUseCustomPlanet(true);
      }
      const { data: moons } = await supabase.from('moon_customizations').select('moon_name, display_name, planet_name').eq('user_id', user.id).order('moon_name');
      if (moons) {
        setAvailableMoons(moons.map(m => ({ name: m.moon_name, display_name: m.display_name, planet_name: m.planet_name })));
        if ((initialData as any)?.home_moon && !moons.some(m => m.moon_name === (initialData as any)?.home_moon)) setUseCustomMoon(true);
      }
      const { data: races } = await supabase.from('races').select('id, name, typical_physiology, typical_abilities').eq('user_id', user.id).order('name');
      if (races) {
        setAvailableRaces(races);
        if (initialData?.race && !races.some(r => r.name === initialData.race)) setUseCustomRace(true);
      }
      const { data: groups } = await supabase.from('character_groups').select('id, name, color').eq('user_id', user.id).order('name');
      if (groups) setAvailableGroups(groups);
    };
    fetchData();
  }, [user, initialData?.home_planet, initialData?.race]);

  // Fetch sub-races when race changes
  useEffect(() => {
    const fetchSubRaces = async () => {
      if (!user || !formData.race.trim()) { setAvailableSubRaces([]); return; }
      const selectedRace = availableRaces.find(r => r.name === formData.race);
      if (!selectedRace) { setAvailableSubRaces([]); return; }
      const { data } = await supabase.from('sub_races').select('id, name').eq('race_id', selectedRace.id).eq('user_id', user.id).order('name');
      if (data) {
        setAvailableSubRaces(data);
        if (formData.sub_race && !data.some(sr => sr.name.toLowerCase() === formData.sub_race.trim().toLowerCase())) setUseCustomSubRace(true);
        else {
          setUseCustomSubRace(false);
          // Auto-normalize casing to match the database record
          const match = data.find(sr => sr.name.toLowerCase() === formData.sub_race.trim().toLowerCase());
          if (match && match.name !== formData.sub_race) handleChange('sub_race', match.name);
        }
      }
    };
    fetchSubRaces();
  }, [user, formData.race, availableRaces]);

  // Fetch planet data when home_planet changes
  useEffect(() => {
    const fetchPlanetData = async () => {
      if (!formData.home_planet.trim() || !user) { setPlanetGravity(null); setPlanetData(null); return; }
      const { data } = await supabase.from('planet_customizations').select('gravity, description, orbital_distance').eq('planet_name', formData.home_planet.trim()).eq('user_id', user.id).maybeSingle();
      setPlanetGravity(data?.gravity ?? null);
      setPlanetData(data);
    };
    fetchPlanetData();
  }, [formData.home_planet, user]);

  const gravityClass = planetGravity ? getGravityClass(planetGravity) : null;
  const gravityModifiers = planetGravity ? calculateGravityStatModifiers(planetGravity) : null;
  const terrainFeatures = planetData?.description ? parseTerrainFromLore(planetData.description) : null;
  const terrainVisuals = terrainFeatures ? generateTerrainVisuals(terrainFeatures, '#3B82F6') : null;
  const terrainSummary = terrainFeatures ? getTerrainSummary(terrainFeatures) : null;

  const handleStatChange = (key: keyof CharacterStats, value: number) => setStats(prev => ({ ...prev, [key]: value }));

  const applyTierBaseStats = () => {
    const tierStats = getTierBaseStats(formData.level);
    setStats(tierStats);
    toast.success(`Applied Tier ${formData.level} base stats`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
      setImageFile(file);
    }
  };

  const handleChange = (field: keyof CharacterFormData, value: string | number) => setFormData(prev => ({ ...prev, [field]: value }));

  // AI Auto-fill from notes (supports multi-character extraction)
  const handleAutoFillFromNotes = async () => {
    if (!characterNotes.trim()) { toast.error('Please enter your character notes first'); return; }
    setIsParsingNotes(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      // Always use multi mode to detect all characters
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-character-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ notes: characterNotes, multi: true }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Failed to parse notes'); }
      const result = await response.json();
      if (result.success && result.characters && result.characters.length > 0) {
        const [first, ...extras] = result.characters;
        // Fill current form with the first character
        const applyCharacter = (parsed: any) => {
          setFormData(prev => ({
            ...prev,
            name: parsed.name || prev.name, race: parsed.race || prev.race, sub_race: parsed.sub_race || prev.sub_race,
            age: parsed.age?.toString() || prev.age, home_planet: parsed.home_planet || prev.home_planet,
            home_moon: parsed.home_moon || prev.home_moon,
            powers: parsed.powers || prev.powers, abilities: parsed.abilities || prev.abilities,
            weapons_items: parsed.weapons_items || prev.weapons_items,
            personality: parsed.personality || prev.personality, mentality: parsed.mentality || prev.mentality,
            lore: parsed.lore || prev.lore, level: parsed.level || prev.level,
          }));
          if (parsed.race && !availableRaces.find(r => r.name === parsed.race)) setUseCustomRace(true);
          if (parsed.home_planet && !availablePlanets.find(p => p.name === parsed.home_planet)) setUseCustomPlanet(true);
        };
        applyCharacter(first);
        setOpenSections({ identity: true, powers: true, personality: true, stats: false });

        // Batch-create additional characters in the background
        if (extras.length > 0 && user) {
          const createdNames: string[] = [];
          for (const ch of extras) {
            if (!ch.name?.trim()) continue;
            const { error } = await supabase.from('characters').insert({
              name: ch.name.trim(), level: ch.level || 1, user_id: user.id,
              race: ch.race || null, sub_race: ch.sub_race || null,
              age: ch.age ? parseInt(ch.age) : null,
              home_planet: ch.home_planet || null, home_moon: ch.home_moon || null,
              powers: ch.powers || null, abilities: ch.abilities || null,
              weapons_items: ch.weapons_items || null,
              personality: ch.personality || null, mentality: ch.mentality || null,
              lore: ch.lore || null,
            });
            if (!error) createdNames.push(ch.name.trim());
          }
          if (createdNames.length > 0) {
            toast.success(`Form filled with "${first.name}"`, {
              description: `Also created: ${createdNames.join(', ')}`,
              duration: 6000,
            });
          } else {
            toast.success('Character information extracted! Review and adjust as needed.');
          }
        } else {
          toast.success('Character information extracted! Review and adjust as needed.');
        }
      } else if (result.success && result.data) {
        // Fallback for single-mode response
        const parsed = result.data;
        setFormData(prev => ({
          ...prev,
          name: parsed.name || prev.name, race: parsed.race || prev.race, sub_race: parsed.sub_race || prev.sub_race,
          age: parsed.age?.toString() || prev.age, home_planet: parsed.home_planet || prev.home_planet,
          home_moon: parsed.home_moon || prev.home_moon,
          powers: parsed.powers || prev.powers, abilities: parsed.abilities || prev.abilities,
          weapons_items: parsed.weapons_items || prev.weapons_items,
          personality: parsed.personality || prev.personality, mentality: parsed.mentality || prev.mentality,
          lore: parsed.lore || prev.lore, level: parsed.level || prev.level,
        }));
        if (parsed.race && !availableRaces.find(r => r.name === parsed.race)) setUseCustomRace(true);
        if (parsed.home_planet && !availablePlanets.find(p => p.name === parsed.home_planet)) setUseCustomPlanet(true);
        setOpenSections({ identity: true, powers: true, personality: true, stats: false });
        toast.success('Character information extracted! Review and adjust as needed.');
      }
    } catch (error: any) {
      console.error('Auto-fill error:', error);
      toast.error(error.message || 'Failed to parse character notes');
    } finally {
      setIsParsingNotes(false);
    }
  };

  // AI Generate Background from scratch
  const handleGenerateBackground = async () => {
    setIsGeneratingBackground(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-character-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: formData.name.trim() || undefined,
          race: formData.race.trim() || undefined,
          theme: generateTheme.trim() || undefined,
          powerTier: formData.level || undefined,
        }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Failed to generate character'); }
      const result = await response.json();
      if (result.success && result.data) {
        const parsed = result.data;
        setFormData(prev => ({
          ...prev,
          name: parsed.name || prev.name, race: parsed.race || prev.race, sub_race: parsed.sub_race || prev.sub_race,
          age: parsed.age?.toString() || prev.age, home_planet: parsed.home_planet || prev.home_planet,
          home_moon: parsed.home_moon || prev.home_moon,
          powers: parsed.powers || prev.powers, abilities: parsed.abilities || prev.abilities,
          weapons_items: parsed.weapons_items || prev.weapons_items,
          personality: parsed.personality || prev.personality, mentality: parsed.mentality || prev.mentality,
          lore: parsed.lore || prev.lore, level: parsed.level || prev.level,
        }));
        if (parsed.race && !availableRaces.find(r => r.name === parsed.race)) setUseCustomRace(true);
        if (parsed.home_planet && !availablePlanets.find(p => p.name === parsed.home_planet)) setUseCustomPlanet(true);
        setOpenSections({ identity: true, powers: true, personality: true, stats: false });
        toast.success('Character generated! Review and adjust as needed.');
      }
    } catch (error: any) {
      console.error('Generate background error:', error);
      toast.error(error.message || 'Failed to generate character background');
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  // Auto-save for edit mode
  const autoSaveData = useMemo(() => ({ formData, stats, appearance }), [formData, stats, appearance]);
  const handleAutoSave = useCallback(async (data: { formData: CharacterFormData; stats: CharacterStats; appearance: AppearanceData }) => {
    if (!initialData?.id || !user || !data.formData.name.trim()) return;
    const characterData = {
      name: data.formData.name.trim(), level: data.formData.level,
      lore: data.formData.lore.trim() || null, powers: data.formData.powers.trim() || null,
      abilities: data.formData.abilities.trim() || null, home_planet: data.formData.home_planet.trim() || null,
      race: data.formData.race.trim() || null, sub_race: data.formData.sub_race.trim() || null,
      age: data.formData.age ? parseInt(data.formData.age) : null,
      personality: data.formData.personality.trim() || null, mentality: data.formData.mentality.trim() || null,
      ...data.stats,
      ...Object.fromEntries(Object.entries(data.appearance).map(([k, v]) => [k, (v as string).trim() || null])),
    };
    const { error } = await supabase.from('characters').update(characterData).eq('id', initialData.id);
    if (error) {
      if (error.code === '23505') {
        toast.error(`You already have a character named "${data.formData.name.trim()}". Please choose a different name.`);
        return;
      }
      throw error;
    }
  }, [initialData?.id, user]);

  const { isSaving: autoSaving, lastSaved, canUndo, undo } = useAutoSave({
    data: autoSaveData, onSave: handleAutoSave, debounceMs: 2000,
    enabled: mode === 'edit' && !!initialData?.id && !!formData.name.trim(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('You must be logged in'); return; }
    if (!formData.name.trim()) { toast.error('Character name is required'); return; }

    // Check character creation limit for new characters
    if (mode === 'create') {
      const allowed = await canCreateCharacter();
      if (!allowed) {
        toast.error(`You've reached your character limit (${limits.maxCharacters}). Upgrade your storage tier in Membership to create more.`);
        return;
      }
    }
    setIsLoading(true);
    try {
      let imageUrl = formData.image_url;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('character-images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('character-images').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      // Auto-create planet if needed
      const planetName = formData.home_planet.trim();
      if (planetName) {
        const existingPlanet = availablePlanets.find(p => p.name.toLowerCase() === planetName.toLowerCase());
        if (!existingPlanet) {
          let solarSystemId: string | null = null;
          const { data: existingSystems } = await supabase.from('solar_systems').select('id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1);
          if (existingSystems && existingSystems.length > 0) {
            solarSystemId = existingSystems[0].id;
          } else {
            const { data: newSystem, error: systemError } = await supabase.from('solar_systems').insert({ user_id: user.id, name: 'My Galaxy', description: 'Auto-created galaxy' }).select('id').single();
            if (!systemError) solarSystemId = newSystem.id;
          }
          if (solarSystemId) {
            const { error: planetError } = await supabase.from('planet_customizations').insert({ user_id: user.id, planet_name: planetName, display_name: planetName, solar_system_id: solarSystemId, gravity: 1.0, radius: 1.0, orbital_distance: 1.0 });
            if (!planetError) toast.info(`Planet "${planetName}" added to your Solar System Map!`);
          }
        }
      }

      // Auto-create moon if needed
      const moonName = formData.home_moon.trim();
      if (moonName && planetName) {
        const existingMoon = availableMoons.find(m => m.name.toLowerCase() === moonName.toLowerCase() && m.planet_name.toLowerCase() === planetName.toLowerCase());
        if (!existingMoon) {
          const { data: existingSystems } = await supabase.from('solar_systems').select('id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1);
          const solarSystemId = existingSystems?.[0]?.id;
          if (solarSystemId) {
            const { error: moonError } = await supabase.from('moon_customizations').insert({ user_id: user.id, planet_name: planetName, moon_name: moonName, display_name: moonName, solar_system_id: solarSystemId });
            if (!moonError) toast.info(`Moon "${moonName}" added to ${planetName}!`);
          }
        }
      }

      const characterData = {
        name: formData.name.trim(), level: formData.level,
        lore: formData.lore.trim() || null, powers: formData.powers.trim() || null,
        abilities: formData.abilities.trim() || null, weapons_items: formData.weapons_items.trim() || null,
        home_planet: planetName || null, home_moon: moonName || null,
        race: formData.race.trim() || null, sub_race: formData.sub_race.trim() || null,
        age: formData.age ? parseInt(formData.age) : null, image_url: imageUrl || null,
        personality: formData.personality.trim() || null, mentality: formData.mentality.trim() || null,
        user_id: user.id, ...stats,
        ...Object.fromEntries(Object.entries(appearance).map(([k, v]) => [k, (v as string).trim() || null])),
      };

      if (mode === 'create') {
        const { data: newChar, error } = await supabase.from('characters').insert(characterData).select('id').single();
        if (error) {
          if (error.code === '23505') {
            toast.error(`You already have a character named "${formData.name.trim()}". Please choose a different name.`);
            setIsLoading(false);
            return;
          }
          throw error;
        }
        // Assign to selected groups
        if (selectedGroupIds.length > 0 && newChar) {
          const memberships = selectedGroupIds.map(gid => ({ group_id: gid, character_id: newChar.id }));
          await supabase.from('character_group_members').insert(memberships);
        }
        toast.success('Character created successfully!');
      } else if (initialData?.id) {
        const { error } = await supabase.from('characters').update(characterData).eq('id', initialData.id);
        if (error) {
          if (error.code === '23505') {
            toast.error(`You already have a character named "${formData.name.trim()}". Please choose a different name.`);
            setIsLoading(false);
            return;
          }
          throw error;
        }
        toast.success('Character updated successfully!');
      }
      navigate('/hub');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save character');
    } finally {
      setIsLoading(false);
    }
  };

  // Section completion indicators
  const hasIdentity = !!(formData.race || formData.home_planet || formData.lore);
  const hasPowers = !!(formData.powers || formData.abilities || formData.weapons_items);
  const hasPersonality = !!(formData.personality || formData.mentality);
  const hasStats = Object.values(stats).some(v => v !== 50);

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ═══════════════════════════════════════════
            ESSENTIALS — Always visible
            ═══════════════════════════════════════════ */}
        <Card className="bg-card-gradient border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {mode === 'create' ? 'New Character' : 'Edit Character'}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Only a name and tier are required. Add more details anytime.
                </CardDescription>
              </div>
              {mode === 'edit' && (
                <AutoSaveIndicator isSaving={autoSaving} lastSaved={lastSaved} canUndo={canUndo} onUndo={undo} />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image + Name + Tier row */}
            <div className="flex gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-20 w-20 border-2 border-primary/30">
                  <AvatarImage src={imageFile ? URL.createObjectURL(imageFile) : (formData.image_url || undefined)} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {formData.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="image-upload"
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/80 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Character Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter name..."
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="level" className="text-xs">Power Tier *</Label>
                  <Select value={formData.level.toString()} onValueChange={(value) => handleChange('level', parseInt(value))}>
                    <SelectTrigger className="h-9">
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
            </div>

            {/* AI Quick Fill — create mode only */}
            {mode === 'create' && (
              <>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/5">
                    <FileText className="w-3.5 h-3.5" />
                    Quick Fill from Notes (AI)
                    <ChevronDown className="w-3 h-3 ml-auto" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-2">
                  <Textarea
                    placeholder="Paste your character notes, descriptions, or ideas here..."
                    value={characterNotes}
                    onChange={(e) => setCharacterNotes(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleAutoFillFromNotes} disabled={isParsingNotes || !characterNotes.trim()} className="w-full h-8 text-xs">
                    {isParsingNotes ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Extracting...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Auto-Fill</>}
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs gap-2 border-dashed border-accent/30 text-accent hover:bg-accent/5">
                    <Wand2 className="w-3.5 h-3.5" />
                    No Ideas? Generate a Character (AI)
                    <ChevronDown className="w-3 h-3 ml-auto" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    The AI will create an original character for you. Optionally describe a vibe or theme below, or leave it blank for a complete surprise.
                  </p>
                  <Input
                    placeholder="e.g. space pirate, ancient warrior, mysterious healer... (optional)"
                    value={generateTheme}
                    onChange={(e) => setGenerateTheme(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleGenerateBackground} disabled={isGeneratingBackground} className="w-full h-8 text-xs">
                    {isGeneratingBackground ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</> : <><Wand2 className="w-3.5 h-3.5 mr-1.5" /> Generate Character</>}
                  </Button>
                </CollapsibleContent>
              </Collapsible>
              </>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════
            SECTION 1 — Identity & Origin
            ═══════════════════════════════════════════ */}
        <div className="space-y-2">
          <SectionHeader
            icon={<User className="w-4 h-4" />}
            title="Identity & Origin"
            subtitle={hasIdentity ? [formData.race, formData.home_planet].filter(Boolean).join(' · ') || 'Details added' : 'Race, home planet, backstory'}
            badge={hasIdentity ? 'Added' : 'Optional'}
            open={openSections.identity}
            onToggle={() => toggleSection('identity')}
          />
          {openSections.identity && (
            <Card className="border-border bg-card/50">
              <CardContent className="pt-4 space-y-4">
                {/* Race & Age row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Race</Label>
                    {availableRaces.length > 0 && !useCustomRace ? (
                      <Select value={formData.race} onValueChange={(value) => {
                        if (value === '__custom__') { setUseCustomRace(true); handleChange('race', ''); }
                        else { handleChange('race', value); }
                      }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {availableRaces.map((race) => (<SelectItem key={race.id} value={race.name}>{race.name}</SelectItem>))}
                          <SelectItem value="__custom__" className="text-muted-foreground border-t mt-1 pt-2">+ Custom...</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <Input placeholder="Celestial" value={formData.race} onChange={(e) => handleChange('race', e.target.value)} className="h-9 flex-1" />
                          {availableRaces.length > 0 && (
                            <Button type="button" variant="outline" size="sm" className="h-9 px-2 text-xs" onClick={() => { setUseCustomRace(false); handleChange('race', ''); }}>List</Button>
                          )}
                        </div>
                        {formData.race.trim() && availableRaces.some(r => r.name.toLowerCase() === formData.race.trim().toLowerCase()) && (
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                            onClick={() => {
                              const match = availableRaces.find(r => r.name.toLowerCase() === formData.race.trim().toLowerCase());
                              if (match) { handleChange('race', match.name); setUseCustomRace(false); }
                            }}
                          >
                            <Check className="w-3 h-3" /> Link to existing "{availableRaces.find(r => r.name.toLowerCase() === formData.race.trim().toLowerCase())?.name}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sub-Race</Label>
                    {availableSubRaces.length > 0 && !useCustomSubRace ? (
                      <Select
                        value={formData.sub_race}
                        onValueChange={(value) => {
                          if (value === '__custom__') { setUseCustomSubRace(true); handleChange('sub_race', ''); }
                          else handleChange('sub_race', value);
                        }}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select sub-race..." /></SelectTrigger>
                        <SelectContent>
                          {availableSubRaces.map((sr) => (<SelectItem key={sr.id} value={sr.name}>{sr.name}</SelectItem>))}
                          <SelectItem value="__custom__" className="text-muted-foreground border-t mt-1 pt-2">+ Custom...</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <Input placeholder="Stormkin" value={formData.sub_race} onChange={(e) => handleChange('sub_race', e.target.value)} className="h-9 flex-1" />
                          {availableSubRaces.length > 0 && (
                            <Button type="button" variant="outline" size="sm" className="h-9 px-2 text-xs" onClick={() => { setUseCustomSubRace(false); handleChange('sub_race', ''); }}>List</Button>
                          )}
                        </div>
                        {formData.sub_race.trim() && availableSubRaces.some(sr => sr.name.toLowerCase() === formData.sub_race.trim().toLowerCase()) && (
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                            onClick={() => {
                              const match = availableSubRaces.find(sr => sr.name.toLowerCase() === formData.sub_race.trim().toLowerCase());
                              if (match) { handleChange('sub_race', match.name); setUseCustomSubRace(false); }
                            }}
                          >
                            <Check className="w-3 h-3" /> Link to existing "{availableSubRaces.find(sr => sr.name.toLowerCase() === formData.sub_race.trim().toLowerCase())?.name}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Age</Label>
                    <Input type="number" placeholder="500" value={formData.age} onChange={(e) => handleChange('age', e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sex</Label>
                    <Select value={formData.sex} onValueChange={(value) => handleChange('sex', value === '__none__' ? '' : value)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="none">No Sex</SelectItem>
                        <SelectItem value="__none__" className="text-muted-foreground border-t mt-1 pt-2">Clear</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Race Info Panel */}
                {formData.race && availableRaces.find(r => r.name === formData.race) && (() => {
                  const selectedRace = availableRaces.find(r => r.name === formData.race);
                  if (!selectedRace) return null;
                  return (
                    <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold"><Sparkles className="w-3.5 h-3.5 text-primary" /> {formData.race} Traits</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {selectedRace.typical_physiology && (<div className="p-2 rounded bg-background/50 border-l-2 border-accent"><span className="font-medium text-accent">Physiology</span><p className="text-muted-foreground mt-0.5">{selectedRace.typical_physiology}</p></div>)}
                        {selectedRace.typical_abilities && (<div className="p-2 rounded bg-background/50 border-l-2 border-primary"><span className="font-medium text-primary">Abilities</span><p className="text-muted-foreground mt-0.5">{selectedRace.typical_abilities}</p></div>)}
                      </div>
                    </div>
                  );
                })()}

                {/* Home Location */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Home Location</Label>
                  {(availablePlanets.length > 0 || availableMoons.length > 0) && !useCustomPlanet ? (
                    <div className="space-y-1.5">
                      <Select
                        value={formData.home_moon ? `moon:${formData.home_planet}:${formData.home_moon}` : formData.home_planet}
                        onValueChange={(value) => {
                          if (value === '__custom__') { setUseCustomPlanet(true); handleChange('home_planet', ''); handleChange('home_moon', ''); }
                          else if (value.startsWith('moon:')) { const parts = value.split(':'); handleChange('home_planet', parts[1]); handleChange('home_moon', parts[2]); }
                          else { handleChange('home_planet', value); handleChange('home_moon', ''); }
                        }}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select planet or moon..." /></SelectTrigger>
                        <SelectContent className="bg-popover z-50 max-h-[300px]">
                          {availablePlanets.map((planet) => {
                            const planetMoons = availableMoons.filter(m => m.planet_name.toLowerCase() === planet.name.toLowerCase());
                            return (
                              <div key={planet.name}>
                                <SelectItem value={planet.name} className="font-medium">🪐 {planet.display_name || planet.name}</SelectItem>
                                {planetMoons.map((moon) => (<SelectItem key={`${planet.name}-${moon.name}`} value={`moon:${planet.name}:${moon.name}`} className="pl-6 text-muted-foreground">↳ 🌙 {moon.display_name || moon.name}</SelectItem>))}
                              </div>
                            );
                          })}
                          <SelectItem value="__custom__" className="text-muted-foreground border-t mt-1 pt-2">+ Custom location...</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.home_planet && (
                        <p className="text-[11px] text-muted-foreground">{formData.home_moon ? `🌙 ${formData.home_moon} orbiting ${formData.home_planet}` : `🪐 ${formData.home_planet}`}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <Input placeholder="Enter planet name..." value={formData.home_planet} onChange={(e) => handleChange('home_planet', e.target.value)} className="h-9 flex-1" />
                        {(availablePlanets.length > 0 || availableMoons.length > 0) && (
                          <Button type="button" variant="outline" size="sm" className="h-9 px-2 text-xs" onClick={() => { setUseCustomPlanet(false); handleChange('home_planet', ''); handleChange('home_moon', ''); }}>List</Button>
                        )}
                      </div>
                      {formData.home_planet.trim() && (() => {
                        const homeLower = formData.home_planet.trim().toLowerCase();
                        const isShip = ['ship', 'vessel', 'cruiser', 'destroyer', 'carrier', 'frigate', 'corvette', 'battleship', 'dreadnought', 'starship', 'spacecraft', 'shuttle', 'station', 'ark', 'flagship', 'warship', 'gunship'].some(k => homeLower.includes(k));
                        const isFleet = ['fleet', 'armada', 'flotilla', 'squadron', 'navy', 'convoy', 'taskforce', 'task force', 'battle group', 'battlegroup'].some(k => homeLower.includes(k));
                        const isNewPlanet = !availablePlanets.some(p => p.name.toLowerCase() === homeLower);
                        if (isFleet) return <p className="text-[11px] text-cyan-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />Fleet appears in Solar System Map!</p>;
                        if (isShip) return <p className="text-[11px] text-cyan-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />Ship appears in Solar System Map!</p>;
                        if (isNewPlanet) return <p className="text-[11px] text-primary flex items-center gap-1"><Globe className="w-3 h-3" />New planet auto-added to Solar System!</p>;
                        return null;
                      })()}
                      {formData.home_planet.trim() && !['ship', 'vessel', 'cruiser', 'destroyer', 'carrier', 'frigate', 'corvette', 'battleship', 'dreadnought', 'starship', 'spacecraft', 'shuttle', 'station', 'ark', 'flagship', 'warship', 'gunship', 'fleet', 'armada', 'flotilla', 'squadron', 'navy', 'convoy', 'taskforce', 'task force', 'battle group', 'battlegroup'].some(k => formData.home_planet.trim().toLowerCase().includes(k)) && (
                        <div className="pt-1.5 border-t border-border/50">
                          <Label className="text-[11px] text-muted-foreground mb-1 block">Moon (optional)</Label>
                          <Input placeholder="Enter moon name..." value={formData.home_moon} onChange={(e) => handleChange('home_moon', e.target.value)} className="h-8 text-sm" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Planet Info Panel */}
                {(gravityClass || terrainFeatures) && (
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold"><Globe className="w-3.5 h-3.5 text-primary" /> Planet Environment</div>
                    {gravityClass && gravityModifiers && (
                      <div className="p-2 rounded border-l-2" style={{ backgroundColor: gravityClass.color + '10', borderColor: gravityClass.color }}>
                        <div className="flex items-center gap-2 text-xs font-medium" style={{ color: gravityClass.color }}>{gravityClass.name} ({planetGravity?.toFixed(2)}g)</div>
                        <p className="text-xs text-muted-foreground mt-0.5">{gravityModifiers.description}</p>
                      </div>
                    )}
                    {terrainSummary && (
                      <div className="p-2 rounded bg-background/50 border-l-2 border-accent">
                        <div className="flex items-center gap-2 text-xs font-medium text-accent"><Mountain className="w-3 h-3" /> Terrain</div>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{terrainSummary}</p>
                      </div>
                    )}
                    {terrainVisuals && terrainVisuals.physiologyHints.length > 0 && (
                      <div className="p-2 rounded bg-background/50 border-l-2 border-primary">
                        <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1"><Thermometer className="w-3 h-3" /> Physiology Hints</div>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {terrainVisuals.physiologyHints.map((hint, i) => (<li key={i} className="flex items-start gap-1"><span className="text-primary/50">•</span>{hint}</li>))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Groups */}
                {availableGroups.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">🏷️ Groups</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableGroups.map((g) => {
                        const selected = selectedGroupIds.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setSelectedGroupIds(prev => selected ? prev.filter(id => id !== g.id) : [...prev, g.id])}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${selected ? 'bg-primary/15 border-primary text-primary font-medium' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/40'}`}
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color || 'hsl(var(--primary))' }} />
                            {g.name}
                            {selected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Assign to existing groups. Manage groups on the character detail page.</p>
                  </div>
                )}

                {/* Lore field moved to Lore section */}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 2 — Powers & Equipment
            ═══════════════════════════════════════════ */}
        <div className="space-y-2">
          <SectionHeader
            icon={<Swords className="w-4 h-4" />}
            title="Powers & Equipment"
            subtitle={hasPowers ? [formData.powers?.split('\n')[0]?.slice(0, 40)].filter(Boolean).join('') || 'Details added' : 'Base power, abilities, weapons'}
            badge={hasPowers ? 'Added' : 'Optional'}
            open={openSections.powers}
            onToggle={() => toggleSection('powers')}
          />
          {openSections.powers && (
            <Card className="border-border bg-card/50">
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">
                    Base Power
                    <span className="text-muted-foreground ml-1.5">(one base power per R.O.K. rules)</span>
                  </Label>
                  <VoiceTextarea placeholder="Describe your character's single base power..." value={formData.powers} onValueChange={(v) => handleChange('powers', v)} rows={3} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Abilities & Techniques</Label>
                  <VoiceTextarea placeholder="Techniques derived from your base power..." value={formData.abilities} onValueChange={(v) => handleChange('abilities', v)} rows={3} className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">⚔️ Weapons & Items</Label>
                  <p className="text-[11px] text-muted-foreground">Item names appear in your inventory bag. Descriptions are kept for the narrator's memory.</p>
                  {(() => {
                    const items = parseWeaponItems(formData.weapons_items);
                    const updateItems = (newItems: WeaponItem[]) => handleChange('weapons_items', serializeWeaponItems(newItems));
                    const addItem = () => updateItems([...items, { name: '', description: '' }]);
                    const removeItem = (idx: number) => updateItems(items.filter((_, i) => i !== idx));
                    const updateItem = (idx: number, field: keyof WeaponItem, value: string) => {
                      const copy = [...items];
                      copy[idx] = { ...copy[idx], [field]: value };
                      updateItems(copy);
                    };
                    return (
                      <div className="space-y-3">
                        {items.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-border bg-background/50 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Item name (e.g. Flame Sword)"
                                value={item.name}
                                onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                className="h-8 text-sm flex-1"
                              />
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <VoiceTextarea
                              placeholder="Item description (powers, effects, history...)"
                              value={item.description}
                              onValueChange={(v) => updateItem(idx, 'description', v)}
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={addItem}>
                          <Plus className="w-3.5 h-3.5" /> Add Item
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 3 — Personality & Alignment
            ═══════════════════════════════════════════ */}
        <div className="space-y-2">
          <SectionHeader
            icon={<Smile className="w-4 h-4" />}
            title="Personality & Alignment"
            subtitle={hasPersonality ? 'Details added' : 'Alignment, archetype, mentality'}
            badge={hasPersonality ? 'Added' : 'Optional'}
            open={openSections.personality}
            onToggle={() => toggleSection('personality')}
          />
          {openSections.personality && (
            <Card className="border-border bg-card/50">
              <CardContent className="pt-4 space-y-4">
                {/* Alignment Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Moral Alignment</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'good', label: 'Good', emoji: '😇', desc: 'Protects the innocent' },
                      { value: 'neutral', label: 'Neutral', emoji: '😐', desc: 'Situational morality' },
                      { value: 'evil', label: 'Evil', emoji: '😈', desc: 'Pursues dark goals' },
                    ].map((alignment) => (
                      <button key={alignment.value} type="button"
                        onClick={() => {
                          const current = formData.mentality || '';
                          const alignmentRegex = /\[ALIGNMENT:(good|neutral|evil)\]/i;
                          const newMentality = alignmentRegex.test(current) ? current.replace(alignmentRegex, `[ALIGNMENT:${alignment.value}]`) : `[ALIGNMENT:${alignment.value}] ${current}`.trim();
                          handleChange('mentality', newMentality);
                        }}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          formData.mentality?.toLowerCase().includes(`[alignment:${alignment.value}]`)
                            ? alignment.value === 'good' ? 'border-green-500 bg-green-500/20 ring-2 ring-green-500/50'
                              : alignment.value === 'evil' ? 'border-red-500 bg-red-500/20 ring-2 ring-red-500/50'
                              : 'border-yellow-500 bg-yellow-500/20 ring-2 ring-yellow-500/50'
                            : 'border-border hover:border-primary/50 bg-background/50'
                        }`}
                      >
                        <div className="text-xl mb-0.5">{alignment.emoji}</div>
                        <div className="text-xs font-medium">{alignment.label}</div>
                        <div className="text-[10px] text-muted-foreground">{alignment.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Approach */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Combat & Moral Approach</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'traditional', label: 'Traditional', emoji: '⚔️', desc: 'Fights with honor' },
                      { value: 'unconventional', label: 'Unconventional', emoji: '🎭', desc: 'Any means necessary' },
                    ].map((approach) => (
                      <button key={approach.value} type="button"
                        onClick={() => {
                          const current = formData.mentality || '';
                          const approachRegex = /\[APPROACH:(traditional|unconventional)\]/i;
                          const newMentality = approachRegex.test(current) ? current.replace(approachRegex, `[APPROACH:${approach.value}]`) : `${current} [APPROACH:${approach.value}]`.trim();
                          handleChange('mentality', newMentality);
                        }}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          formData.mentality?.toLowerCase().includes(`[approach:${approach.value}]`)
                            ? 'border-primary bg-primary/20 ring-2 ring-primary/50'
                            : 'border-border hover:border-primary/50 bg-background/50'
                        }`}
                      >
                        <div className="text-lg mb-0.5">{approach.emoji}</div>
                        <div className="text-xs font-medium">{approach.label}</div>
                        <div className="text-[10px] text-muted-foreground">{approach.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Archetypes */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Personality Archetype</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'boy_scout', label: 'Boy Scout', emoji: '🦸', desc: 'Textbook hero' },
                      { value: 'anti_hero', label: 'Anti-Hero', emoji: '🖤', desc: 'Good, questionable means' },
                      { value: 'noble_villain', label: 'Noble Villain', emoji: '👑', desc: 'Evil with honor' },
                      { value: 'extreme_villain', label: 'Extreme Villain', emoji: '💀', desc: 'Chaos incarnate' },
                    ].map((archetype) => (
                      <button key={archetype.value} type="button"
                        onClick={() => {
                          const current = formData.personality || '';
                          const archetypeRegex = /\[ARCHETYPE:[^\]]+\]/i;
                          const hasArchetype = archetypeRegex.test(current);
                          const currentArchetype = current.match(archetypeRegex)?.[0];
                          const isSame = currentArchetype === `[ARCHETYPE:${archetype.value}]`;
                          let newPersonality: string;
                          if (isSame) newPersonality = current.replace(archetypeRegex, '').trim();
                          else if (hasArchetype) newPersonality = current.replace(archetypeRegex, `[ARCHETYPE:${archetype.value}]`);
                          else newPersonality = `[ARCHETYPE:${archetype.value}] ${current}`.trim();
                          handleChange('personality', newPersonality);
                        }}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          formData.personality?.toLowerCase().includes(`[archetype:${archetype.value}]`)
                            ? archetype.value === 'boy_scout' ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                              : archetype.value === 'anti_hero' ? 'border-purple-500 bg-purple-500/20 ring-2 ring-purple-500/50'
                              : archetype.value === 'noble_villain' ? 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-500/50'
                              : 'border-red-600 bg-red-600/20 ring-2 ring-red-600/50'
                            : 'border-border hover:border-primary/50 bg-background/50'
                        }`}
                      >
                        <div className="text-lg">{archetype.emoji}</div>
                        <div className="text-[11px] font-medium">{archetype.label}</div>
                        <div className="text-[9px] text-muted-foreground leading-tight">{archetype.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1.5"><Smile className="w-3.5 h-3.5 text-accent" /> Personality</Label>
                    <VoiceTextarea
                      placeholder="Personality traits, demeanor..."
                      value={formData.personality?.replace(/\[ARCHETYPE:[^\]]+\]\s*/gi, '') || ''}
                      onValueChange={(v) => {
                        const archetypeMatch = formData.personality?.match(/\[ARCHETYPE:[^\]]+\]/i);
                        const archetype = archetypeMatch ? archetypeMatch[0] + ' ' : '';
                        handleChange('personality', archetype + v);
                      }}
                      rows={3} className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-cosmic-gold" /> Mentality</Label>
                    <VoiceTextarea
                      placeholder="Mindset, beliefs, motivations..."
                      value={formData.mentality?.replace(/\[(ALIGNMENT|APPROACH):[^\]]+\]\s*/gi, '') || ''}
                      onValueChange={(v) => {
                        const alignmentMatch = formData.mentality?.match(/\[ALIGNMENT:[^\]]+\]/i);
                        const approachMatch = formData.mentality?.match(/\[APPROACH:[^\]]+\]/i);
                        const prefix = [alignmentMatch?.[0], approachMatch?.[0]].filter(Boolean).join(' ');
                        handleChange('mentality', prefix ? prefix + ' ' + v : v);
                      }}
                      rows={3} className="text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 4 — Character Stats
            ═══════════════════════════════════════════ */}
        <div className="space-y-2">
          <SectionHeader
            icon={<Target className="w-4 h-4" />}
            title="Character Stats"
            subtitle={hasStats ? 'Customized' : 'Defaults applied — customize anytime'}
            badge={hasStats ? 'Customized' : 'Optional'}
            open={openSections.stats}
            onToggle={() => toggleSection('stats')}
          />
          {openSections.stats && (
            <Card className="border-border bg-card/50">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Scale of 0 (none) to 100 (absolute mastery)</p>
                  <Button type="button" variant="outline" size="sm" onClick={applyTierBaseStats} className="h-7 text-xs gap-1.5">
                    <Wand2 className="w-3 h-3" /> Tier {formData.level} Defaults
                  </Button>
                </div>

                {/* Philosophy note — compact */}
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-primary">Create with Heart, Not Strategy</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Set stats to match how you truly see your character. Authenticity creates the best stories.</p>
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 5 — Lore (Appearance, Timeline, Background)
            ═══════════════════════════════════════════ */}
        <div className="space-y-2">
          <SectionHeader
            icon={<BookOpen className="w-4 h-4" />}
            title="Lore"
            subtitle={formData.lore || Object.values(appearance).some(v => v.trim()) ? 'Details added' : 'Background, appearance, timeline'}
            badge={formData.lore || Object.values(appearance).some(v => v.trim()) ? 'Added' : 'Optional'}
            open={openSections.lore}
            onToggle={() => toggleSection('lore')}
          />
          {openSections.lore && (
            <Card className="border-border bg-card/50">
              <CardContent className="pt-4 space-y-3">
                {/* Background sub-section */}
                <Collapsible open={openLoreSubs.background} onOpenChange={() => toggleLoreSub('background')}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 p-2.5 rounded-md border border-border bg-background/50 hover:bg-muted/50 transition-colors text-left">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-medium flex-1">Background & Backstory</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${openLoreSubs.background ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-3 space-y-1">
                      <VoiceTextarea placeholder="Origins, motivations, journey..." value={formData.lore} onValueChange={(v) => handleChange('lore', v)} rows={4} className="text-sm" />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Appearance sub-section */}
                <Collapsible open={openLoreSubs.appearance} onOpenChange={() => toggleLoreSub('appearance')}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 p-2.5 rounded-md border border-border bg-background/50 hover:bg-muted/50 transition-colors text-left">
                    <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-medium flex-1">Appearance</span>
                    {Object.values(appearance).some(v => v.trim()) && <Badge variant="outline" className="text-[9px] h-4 border-primary/30 text-primary">Added</Badge>}
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${openLoreSubs.appearance ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-3">
                      <CharacterAppearance data={appearance} onChange={(field, value) => setAppearance(prev => ({ ...prev, [field]: value }))} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Timeline sub-section */}
                <Collapsible open={openLoreSubs.timeline} onOpenChange={() => toggleLoreSub('timeline')}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 p-2.5 rounded-md border border-border bg-background/50 hover:bg-muted/50 transition-colors text-left">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-medium flex-1">Timeline</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${openLoreSubs.timeline ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-3">
                      <CharacterTimeline characterId={initialData?.id || ''} mode={mode} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Ownership Notice */}
        <OwnershipNotice variant="card" />

        {/* Submit */}
        <Button type="submit" className="w-full glow-primary h-11" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Character' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}
