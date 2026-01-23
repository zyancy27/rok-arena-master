import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Users, Globe, Dna, Check, X } from 'lucide-react';

interface ExtractedCharacter {
  name: string;
  race?: string;
  subRace?: string;
  age?: number;
  homePlanet?: string;
  powers?: string;
  abilities?: string;
  personality?: string;
  mentality?: string;
  lore?: string;
  selected?: boolean;
}

interface ExtractedPlanet {
  name: string;
  description?: string;
  gravity?: number;
  features?: string;
  selected?: boolean;
}

interface ExtractedRace {
  name: string;
  description?: string;
  homePlanet?: string;
  typicalPhysiology?: string;
  typicalAbilities?: string;
  culturalTraits?: string;
  averageLifespan?: string;
  selected?: boolean;
}

interface ExtractedData {
  characters: ExtractedCharacter[];
  planets: ExtractedPlanet[];
  races: ExtractedRace[];
}

interface LoreDocumentUploadProps {
  onImportComplete?: () => void;
}

export function LoreDocumentUpload({ onImportComplete }: LoreDocumentUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
      'text/markdown', // .md
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.md')) {
      toast.error('Please upload a Word document (.docx, .doc), text file (.txt), or markdown file (.md)');
      return;
    }

    setFileName(file.name);
    setIsUploading(true);

    try {
      // Read file content
      let textContent = '';
      
      if (file.type === 'text/plain' || file.name.endsWith('.md')) {
        textContent = await file.text();
      } else {
        // For Word documents, we need to extract text
        // Upload to storage first, then use a parsing approach
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('lore-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // For Word docs, we'll read as array buffer and extract basic text
        // This is a simplified approach - for full Word parsing you'd need a library
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Try to extract readable text from the document
        // This is a basic approach - Word docs have XML structure
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = decoder.decode(bytes);
        
        // Extract text between XML tags for .docx files
        const textMatches = rawText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (textMatches) {
          textContent = textMatches
            .map(match => match.replace(/<[^>]+>/g, ''))
            .join(' ');
        } else {
          // Fallback: extract any readable ASCII text
          textContent = rawText.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }

      if (!textContent || textContent.length < 10) {
        toast.error('Could not extract text from the document. Try a .txt or .md file.');
        return;
      }

      setIsUploading(false);
      setIsParsing(true);

      // Send to AI for parsing
      const { data, error } = await supabase.functions.invoke('parse-lore-document', {
        body: { 
          documentContent: textContent.substring(0, 50000), // Limit content size
          extractType: 'all' 
        },
      });

      if (error) throw error;

      if (data.success && data.data) {
        // Add selected flag to all items
        const extracted: ExtractedData = {
          characters: (data.data.characters || []).map((c: ExtractedCharacter) => ({ ...c, selected: true })),
          planets: (data.data.planets || []).map((p: ExtractedPlanet) => ({ ...p, selected: true })),
          races: (data.data.races || []).map((r: ExtractedRace) => ({ ...r, selected: true })),
        };
        setExtractedData(extracted);
        
        const totalFound = extracted.characters.length + extracted.planets.length + extracted.races.length;
        if (totalFound > 0) {
          toast.success(`Found ${totalFound} items to import!`);
        } else {
          toast.info('No characters, planets, or races found in the document.');
        }
      }
    } catch (error) {
      console.error('Upload/parse error:', error);
      toast.error('Failed to process document');
    } finally {
      setIsUploading(false);
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleItem = (type: 'characters' | 'planets' | 'races', index: number) => {
    if (!extractedData) return;
    
    setExtractedData(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated[type] = [...prev[type]];
      updated[type][index] = { ...updated[type][index], selected: !updated[type][index].selected };
      return updated;
    });
  };

  const importSelected = async () => {
    if (!extractedData || !user) return;
    
    setIsImporting(true);
    let imported = { characters: 0, planets: 0, races: 0 };

    try {
      // Import races first (so characters can reference them)
      const selectedRaces = extractedData.races.filter(r => r.selected);
      for (const race of selectedRaces) {
        const { error } = await supabase.from('races').insert({
          user_id: user.id,
          name: race.name,
          description: race.description || null,
          home_planet: race.homePlanet || null,
          typical_physiology: race.typicalPhysiology || null,
          typical_abilities: race.typicalAbilities || null,
          cultural_traits: race.culturalTraits || null,
          average_lifespan: race.averageLifespan || null,
        });
        if (!error) imported.races++;
      }

      // Import planets
      const selectedPlanets = extractedData.planets.filter(p => p.selected);
      for (const planet of selectedPlanets) {
        const { error } = await supabase.from('planet_customizations').insert({
          user_id: user.id,
          planet_name: planet.name.toLowerCase().replace(/\s+/g, '-'),
          display_name: planet.name,
          description: planet.description || planet.features || null,
          gravity: planet.gravity || 1.0,
        });
        if (!error) imported.planets++;
      }

      // Import characters
      const selectedCharacters = extractedData.characters.filter(c => c.selected);
      for (const char of selectedCharacters) {
        const { error } = await supabase.from('characters').insert({
          user_id: user.id,
          name: char.name,
          level: 1, // Default level
          race: char.race || null,
          sub_race: char.subRace || null,
          age: char.age || null,
          home_planet: char.homePlanet || null,
          powers: char.powers || null,
          abilities: char.abilities || null,
          personality: char.personality || null,
          mentality: char.mentality || null,
          lore: char.lore || null,
        });
        if (!error) imported.characters++;
      }

      const total = imported.characters + imported.planets + imported.races;
      if (total > 0) {
        toast.success(`Imported ${imported.characters} characters, ${imported.planets} planets, ${imported.races} races!`);
        setExtractedData(null);
        setFileName('');
        onImportComplete?.();
      } else {
        toast.error('Failed to import items');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data');
    } finally {
      setIsImporting(false);
    }
  };

  const clearExtracted = () => {
    setExtractedData(null);
    setFileName('');
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import from Lore Document
        </CardTitle>
        <CardDescription>
          Upload a Word document, text file, or markdown file to auto-extract characters, planets, and races
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!extractedData ? (
          <div className="flex flex-col items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isParsing}
              className="w-full max-w-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Supports .docx, .doc, .txt, and .md files
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{fileName}</Badge>
              <Button variant="ghost" size="sm" onClick={clearExtracted}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Races Section */}
                {extractedData.races.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Dna className="h-4 w-4" />
                      Races ({extractedData.races.filter(r => r.selected).length}/{extractedData.races.length})
                    </h4>
                    <div className="space-y-2">
                      {extractedData.races.map((race, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            race.selected ? 'bg-accent/50 border-primary' : 'opacity-50'
                          }`}
                          onClick={() => toggleItem('races', idx)}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox checked={race.selected} className="mt-1" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{race.name}</p>
                              {race.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{race.description}</p>
                              )}
                              {race.homePlanet && (
                                <Badge variant="outline" className="mt-1 text-xs">Home: {race.homePlanet}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Planets Section */}
                {extractedData.planets.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4" />
                      Planets ({extractedData.planets.filter(p => p.selected).length}/{extractedData.planets.length})
                    </h4>
                    <div className="space-y-2">
                      {extractedData.planets.map((planet, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            planet.selected ? 'bg-accent/50 border-primary' : 'opacity-50'
                          }`}
                          onClick={() => toggleItem('planets', idx)}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox checked={planet.selected} className="mt-1" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{planet.name}</p>
                              {planet.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{planet.description}</p>
                              )}
                              {planet.gravity && (
                                <Badge variant="outline" className="mt-1 text-xs">{planet.gravity}g</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Characters Section */}
                {extractedData.characters.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" />
                      Characters ({extractedData.characters.filter(c => c.selected).length}/{extractedData.characters.length})
                    </h4>
                    <div className="space-y-2">
                      {extractedData.characters.map((char, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            char.selected ? 'bg-accent/50 border-primary' : 'opacity-50'
                          }`}
                          onClick={() => toggleItem('characters', idx)}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox checked={char.selected} className="mt-1" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{char.name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {char.race && <Badge variant="secondary" className="text-xs">{char.race}</Badge>}
                                {char.homePlanet && <Badge variant="outline" className="text-xs">{char.homePlanet}</Badge>}
                                {char.age && <Badge variant="outline" className="text-xs">{char.age} yrs</Badge>}
                              </div>
                              {char.powers && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">Powers: {char.powers}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={clearExtracted} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={importSelected} 
                disabled={isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Import Selected
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
