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
import { toast } from 'sonner';
import { POWER_TIERS } from '@/lib/game-constants';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';

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
}

interface CharacterFormProps {
  initialData?: CharacterFormData & { id: string };
  mode: 'create' | 'edit';
}

export default function CharacterForm({ initialData, mode }: CharacterFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
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
  });

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
        user_id: user.id,
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
