import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PlanetData {
  name: string;
  description: string;
  color: string;
}

interface PlanetEditorProps {
  planet: PlanetData;
  onSave: (data: PlanetData) => void;
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
];

export default function PlanetEditor({ planet, onSave, onBack }: PlanetEditorProps) {
  const [name, setName] = useState(planet.name);
  const [description, setDescription] = useState(planet.description);
  const [color, setColor] = useState(planet.color);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Planet name is required');
      return;
    }
    onSave({ name: name.trim(), description, color });
    toast.success('Planet updated!');
    onBack();
  };

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-md overflow-auto animate-fade-in">
      <div className="container mx-auto py-6 px-4 max-w-2xl">
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
            <CardTitle className="text-2xl">Edit Planet</CardTitle>
            <CardDescription>
              Customize this planet's appearance and information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="planet-name">Planet Name</Label>
              <Input
                id="planet-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter planet name..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planet-description">Description</Label>
              <Textarea
                id="planet-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this planet's history, culture, or notable features..."
                rows={4}
              />
            </div>

            <div className="space-y-3">
              <Label>Planet Color</Label>
              <div className="grid grid-cols-4 gap-3">
                {PLANET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`h-12 rounded-lg transition-all ${
                      color === c.value
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
