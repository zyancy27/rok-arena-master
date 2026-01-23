import { useState } from 'react';
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
import { CHARACTER_STATS, DEFAULT_STATS, type CharacterStats } from '@/lib/character-stats';
import StatSlider from './StatSlider';
import OwnershipNotice from '@/components/legal/OwnershipNotice';
import { ArrowLeft, Save, Sparkles, Camera, Brain, Dumbbell, Flame, Zap, Shield, Heart, Target } from 'lucide-react';

const iconMap = {
  Brain: <Brain className="w-4 h-4" />,
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
  race: string;
  sub_race: string;
  age: string;
  image_url: string;
}

interface CharacterFormProps {
  initialData?: CharacterFormData & { id: string } & Partial<CharacterStats>;
  mode: 'create' | 'edit';
}

export default function CharacterForm({ initialData, mode }: CharacterFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<CharacterFormData>({
    name: initialData?.name || '',
    level: initialData?.level || 1,
    lore: initialData?.lore || '',
    powers: initialData?.powers || '',
    abilities: initialData?.abilities || '',
    home_planet: initialData?.home_planet || '',
    race: initialData?.race || '',
    sub_race: initialData?.sub_race || '',
    age: initialData?.age || '',
    image_url: initialData?.image_url || '',
  });

  const [stats, setStats] = useState<CharacterStats>({
    stat_intelligence: initialData?.stat_intelligence ?? DEFAULT_STATS.stat_intelligence,
    stat_strength: initialData?.stat_strength ?? DEFAULT_STATS.stat_strength,
    stat_power: initialData?.stat_power ?? DEFAULT_STATS.stat_power,
    stat_speed: initialData?.stat_speed ?? DEFAULT_STATS.stat_speed,
    stat_durability: initialData?.stat_durability ?? DEFAULT_STATS.stat_durability,
    stat_stamina: initialData?.stat_stamina ?? DEFAULT_STATS.stat_stamina,
    stat_skill: initialData?.stat_skill ?? DEFAULT_STATS.stat_skill,
    stat_luck: initialData?.stat_luck ?? DEFAULT_STATS.stat_luck,
  });

  const handleStatChange = (key: keyof CharacterStats, value: number) => {
    setStats(prev => ({ ...prev, [key]: value }));
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

      const characterData = {
        name: formData.name.trim(),
        level: formData.level,
        lore: formData.lore.trim() || null,
        powers: formData.powers.trim() || null,
        abilities: formData.abilities.trim() || null,
        home_planet: formData.home_planet.trim() || null,
        race: formData.race.trim() || null,
        sub_race: formData.sub_race.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        image_url: imageUrl || null,
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
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            {mode === 'create' ? 'Create New Character' : 'Edit Character'}
          </CardTitle>
          <CardDescription>
            Define your character's identity and powers according to R.O.K. rules.
            Remember: one base power only!
          </CardDescription>
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
                <Input
                  id="race"
                  placeholder="Celestial"
                  value={formData.race}
                  onChange={(e) => handleChange('race', e.target.value)}
                />
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

            <div className="space-y-2">
              <Label htmlFor="home_planet">Home Planet</Label>
              <Input
                id="home_planet"
                placeholder="Aethoria Prime"
                value={formData.home_planet}
                onChange={(e) => handleChange('home_planet', e.target.value)}
              />
            </div>

            {/* Long Text Fields */}
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
                  <p className="text-xs text-muted-foreground mb-4">
                    Set your character's attributes on a scale of 0 (none) to 100 (absolute mastery).
                  </p>
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
