import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Clock, MapPin, Play, Plus, Shield, Users, Compass, Swords, User, Globe, Lock, UserCheck, Shuffle, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generateRandomLocation, generateRandomCampaignName } from '@/lib/random-location-generator';
import { analyzeLocation } from '@/lib/theme-engine';
import { Badge as ThemeBadge } from '@/components/ui/badge';
import type { Campaign, CampaignParticipant, CampaignStatus, CampaignVisibility } from '@/lib/campaign-types';
import { getTimeEmoji } from '@/lib/campaign-types';
import { getRecentConcepts, recordConcept } from '@/lib/campaign-concept-history';
import { useTesterMode } from '@/hooks/use-tester-mode';

interface CharacterOption {
  id: string;
  name: string;
  level: number;
  image_url: string | null;
  powers: string | null;
  personality: string | null;
}

export default function Campaigns() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isTester } = useTesterMode(user?.id);
  const [campaigns, setCampaigns] = useState<(Campaign & { participant_count: number; my_participant?: CampaignParticipant })[]>([]);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMaxPlayers, setNewMaxPlayers] = useState(4);
  const [isSolo, setIsSolo] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [startingLocation, setStartingLocation] = useState('');
  const [visibility, setVisibility] = useState<CampaignVisibility>('public');
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [campaignLength, setCampaignLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [campaignGenre, setCampaignGenre] = useState('');
  const [campaignTone, setCampaignTone] = useState('');

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchCharacters();
    }
  }, [user]);

  const fetchCharacters = async () => {
    const { data } = await supabase
      .from('characters_decrypted')
      .select('id, name, level, image_url, powers, personality')
      .eq('user_id', user!.id)
      .order('name');
    if (data) setCharacters(data);
  };

  const fetchCampaigns = async () => {
    // Get campaigns user is part of
    const { data: myParticipations } = await supabase
      .from('campaign_participants')
      .select('campaign_id, id, campaign_hp, campaign_hp_max, campaign_level, campaign_xp, is_active')
      .eq('user_id', user!.id)
      .eq('is_active', true);

    const myCampaignIds = myParticipations?.map(p => p.campaign_id) || [];

    // Get recruiting campaigns that are public or friends-only
    const { data: recruitingCampaigns } = await (supabase
      .from('campaigns')
      .select('id')
      .eq('status', 'recruiting') as any)
      .in('visibility', ['public', 'friends']);

    const recruitingIds = recruitingCampaigns?.map(c => c.id) || [];
    const allIds = [...new Set([...myCampaignIds, ...recruitingIds])];

    if (allIds.length === 0) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .in('id', allIds)
      .neq('status', 'abandoned')
      .order('updated_at', { ascending: false });

    // Get participant counts
    const { data: allParticipants } = await supabase
      .from('campaign_participants')
      .select('campaign_id, id')
      .in('campaign_id', allIds)
      .eq('is_active', true);

    const countMap = new Map<string, number>();
    allParticipants?.forEach(p => {
      countMap.set(p.campaign_id, (countMap.get(p.campaign_id) || 0) + 1);
    });

    const myParticipationMap = new Map(myParticipations?.map(p => [p.campaign_id, p]) || []);

    const enriched = (campaignsData || []).map(c => ({
      ...c,
      environment_tags: Array.isArray(c.environment_tags) ? c.environment_tags as string[] : [],
      story_context: (c.story_context || {}) as Record<string, unknown>,
      world_state: (c.world_state || {}) as Record<string, unknown>,
      visibility: ((c as any).visibility || 'public') as Campaign['visibility'],
      participant_count: countMap.get(c.id) || 0,
      my_participant: myParticipationMap.get(c.id) as CampaignParticipant | undefined,
    }));

    setCampaigns(enriched);
    setLoading(false);
  };

  const handleGenerateConcept = async () => {
    setGenerating(true);
    try {
      const char = characters.find(c => c.id === selectedCharacter);
      const recent = getRecentConcepts();
      const { data, error } = await supabase.functions.invoke('battle-narrator', {
        body: {
          type: 'generate_campaign_concept',
          characterName: char?.name,
          characterLevel: char?.level,
          characterPowers: char?.powers || undefined,
          recent,
          testerMode: isTester,
        },
      });
      if (error) throw error;
      if (data?.name) setNewName(data.name);
      if (data?.description) setNewDescription(data.description);
      if (data?.location) setStartingLocation(data.location);
      // Persist for anti-repetition on future generations
      if (data?.name) {
        recordConcept({
          title: data.name,
          skeleton: data?.seed?.skeleton_family,
          conflict: data?.seed?.conflict_type,
          setting: data?.seed?.setting_type,
        });
      }
      if (data?.guardrail_warning) {
        console.warn('[campaign-concept] guardrail warning:', data.guardrail_warning);
      }
      toast.success('Campaign concept generated!');
    } catch (err: any) {
      console.error('Concept generation failed:', err);
      toast.error('Failed to generate concept — try again');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Campaign name required'); return; }
    if (!selectedCharacter) { toast.error('Select a character'); return; }
    if (!startingLocation.trim()) { toast.error('Starting location required'); return; }

    setCreating(true);
    try {
      const { data: campaign, error: campError } = await supabase
        .from('campaigns')
        .insert({
          creator_id: user!.id,
          name: newName.trim(),
          description: newDescription.trim() || null,
          max_players: isSolo ? 1 : newMaxPlayers,
          current_zone: startingLocation.trim(),
          chosen_location: startingLocation.trim(),
          status: isSolo ? 'active' : 'recruiting',
          visibility: isSolo ? 'private' : visibility,
          campaign_length: campaignLength,
          genre: campaignGenre.trim() || null,
          tone: campaignTone.trim() || null,
        } as any)
        .select('id')
        .single();

      if (campError || !campaign) throw campError ?? new Error('Failed to create');

      // Join with selected character
      const { error: joinError } = await supabase
        .from('campaign_participants')
        .insert({
          campaign_id: campaign.id,
          character_id: selectedCharacter,
          user_id: user!.id,
          power_reset_applied: true,
        });

      if (joinError) throw joinError;

      // Log creation
      await supabase.from('campaign_logs').insert({
        campaign_id: campaign.id,
        event_type: 'campaign_created',
        event_data: { creator: user!.id, name: newName.trim(), solo: isSolo },
      });

      // Invoke narrator-owned campaign creation (generates brain + 100 NPCs + opening narration)
      const char = characters.find(c => c.id === selectedCharacter);
      toast.info('Narrator is building your world...', { duration: 30000, id: 'campaign-build' });

      try {
        const { data: createData, error: createError } = await supabase.functions.invoke('campaign-create', {
          body: {
            campaignId: campaign.id,
            description: newDescription.trim() || '',
            name: newName.trim(),
            location: startingLocation.trim(),
            campaignLength,
            genre: campaignGenre.trim() || undefined,
            tone: campaignTone.trim() || undefined,
            characterName: char?.name || 'Unknown',
            characterLevel: char?.level || 1,
            characterPowers: char?.powers || undefined,
            characterPersonality: char?.personality || undefined,
          },
        });

        if (createError) {
          console.error('Campaign brain generation failed:', createError);
        } else {
          console.log(`Campaign brain created: ${createData?.npcCount || 0} NPCs generated`);
        }
      } catch (e) {
        console.error('Campaign creation pipeline error:', e);
      }

      toast.dismiss('campaign-build');
      toast.success('Campaign created!');
      setCreateOpen(false);
      navigate(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      toast.dismiss('campaign-build');
      toast.error(err.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCampaign = async (e: React.MouseEvent, campaignId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await supabase.from('campaign_messages').delete().eq('campaign_id', campaignId);
      await supabase.from('campaign_inventory').delete().eq('campaign_id', campaignId);
      await supabase.from('npc_relationships').delete().eq('campaign_id', campaignId);
      await supabase.from('campaign_npcs').delete().eq('campaign_id', campaignId);
      await supabase.from('campaign_logs').delete().eq('campaign_id', campaignId);
      await supabase.from('campaign_join_requests').delete().eq('campaign_id', campaignId);
      await supabase.from('world_events').delete().eq('campaign_id', campaignId);
      await supabase.from('world_state').delete().eq('campaign_id', campaignId);
      await supabase.from('campaign_brain').delete().eq('campaign_id', campaignId);
      await supabase.from('campaign_participants').delete().eq('campaign_id', campaignId);
      await supabase.from('campaigns').delete().eq('id', campaignId);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      toast.success('Campaign deleted');
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const styles: Record<CampaignStatus, string> = {
      recruiting: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      active: 'bg-green-500/20 text-green-400 border-green-500/50',
      paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      completed: 'bg-muted text-muted-foreground border-muted',
      abandoned: 'bg-red-500/20 text-red-400 border-red-500/50',
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  const myCampaigns = campaigns.filter(c => c.my_participant);
  const openCampaigns = campaigns.filter(c => c.status === 'recruiting' && !c.my_participant);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/battles')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Arena
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Compass className="w-8 h-8 text-primary" />
              Campaign Adventures
            </h1>
            <p className="text-muted-foreground mt-1">Persistent narrative adventures — solo or multiplayer</p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
          </DialogTrigger>
           <DialogContent className="sm:max-w-md max-h-[90vh] h-[90vh] sm:h-auto flex flex-col overflow-hidden p-4 sm:p-6">
              <DialogHeader className="shrink-0">
                <DialogTitle>Create Campaign</DialogTitle>
                <DialogDescription>Start a new persistent adventure for your party.</DialogDescription>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateConcept}
                  disabled={generating}
                  className="w-full gap-2 mt-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? 'Generating...' : 'Generate with Narrator AI'}
                </Button>
              </DialogHeader>
             <div className="flex-1 min-h-0 overflow-y-auto -mx-4 px-4 sm:-mx-6 sm:px-6">
             <div className="space-y-4 pb-4">
              <div>
                <Label>Campaign Name</Label>
                <div className="flex gap-2">
                  <Input placeholder="e.g., The Lost Citadel" value={newName} onChange={e => setNewName(e.target.value)} />
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => setNewName(generateRandomCampaignName())}
                    title="Generate random name"
                    className="shrink-0"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
               <div>
                <Label>Description (optional)</Label>
                <Textarea placeholder="Describe your campaign premise — the Narrator will fill in the rest..." value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={3} />
              </div>
              <div>
                <Label>Campaign Length</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {([
                    { value: 'short' as const, icon: Clock, label: 'Short', desc: '2-10 in-world days' },
                    { value: 'medium' as const, icon: Compass, label: 'Medium', desc: 'Moderate arc' },
                    { value: 'long' as const, icon: Globe, label: 'Long', desc: 'Extended journey' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCampaignLength(opt.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all ${
                        campaignLength === opt.value
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/50'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Genre (optional)</Label>
                  <Input placeholder="e.g., noir, survival..." value={campaignGenre} onChange={e => setCampaignGenre(e.target.value)} />
                </div>
                <div>
                  <Label>Tone (optional)</Label>
                  <Input placeholder="e.g., gritty, hopeful..." value={campaignTone} onChange={e => setCampaignTone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Your Character</Label>
                <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                  <SelectTrigger><SelectValue placeholder="Choose your character..." /></SelectTrigger>
                  <SelectContent>
                    {characters.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} (Tier {c.level})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Starting Location</Label>
                <div className="flex gap-2">
                  <Input placeholder="e.g., Abandoned Outpost, Misty Forest..." value={startingLocation} onChange={e => setStartingLocation(e.target.value)} />
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => setStartingLocation(generateRandomLocation())}
                    title="Generate random location"
                    className="shrink-0"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>
                {/* Theme tag preview */}
                {startingLocation.trim() && (() => {
                  const tags = analyzeLocation(startingLocation);
                  if (tags.length === 0) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Theme:</span>
                      {tags.map(tag => (
                        <ThemeBadge key={tag} variant="outline" className="text-[10px] py-0 h-5">{tag}</ThemeBadge>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setIsSolo(false); setNewMaxPlayers(4); }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${!isSolo ? 'border-primary bg-primary/10 ring-2 ring-primary/50' : 'border-border hover:border-primary/50'}`}
                >
                  <Users className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Multiplayer</div>
                    <div className="text-xs text-muted-foreground">2-6 players</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSolo(true); setNewMaxPlayers(1); }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${isSolo ? 'border-primary bg-primary/10 ring-2 ring-primary/50' : 'border-border hover:border-primary/50'}`}
                >
                  <User className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Solo</div>
                    <div className="text-xs text-muted-foreground">Just you + narrator</div>
                  </div>
                </button>
              </div>
              {!isSolo && (
              <>
              <div>
                <Label>Visibility</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {([
                    { value: 'public' as const, icon: Globe, label: 'Public', desc: 'Anyone can request' },
                    { value: 'friends' as const, icon: UserCheck, label: 'Friends', desc: 'Friends only' },
                    { value: 'private' as const, icon: Lock, label: 'Private', desc: 'Invite only' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVisibility(opt.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all ${
                        visibility === opt.value
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/50'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Max Players: {newMaxPlayers}</Label>
                <Slider min={2} max={6} step={1} value={[newMaxPlayers]} onValueChange={([v]) => setNewMaxPlayers(v)} />
              </div>
              </>
              )}
            </div>
            </div>
            <DialogFooter className="shrink-0">
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Campaigns */}
      {myCampaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            My Campaigns ({myCampaigns.length})
          </h2>
          <div className="grid gap-3">
            {myCampaigns.map(campaign => (
              <Link key={campaign.id} to={`/campaigns/${campaign.id}`}>
                <Card className="bg-card-gradient border-border hover:glow-accent transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {getStatusBadge(campaign.status)}
                        <span className="font-semibold">{campaign.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {getTimeEmoji(campaign.time_of_day)} Day {campaign.day_count}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {campaign.participant_count}/{campaign.max_players}
                        </Badge>
                        {campaign.visibility !== 'public' && (
                          <Badge variant="outline" className="text-xs">
                            {campaign.visibility === 'private' ? <Lock className="w-3 h-3 mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                            {campaign.visibility === 'private' ? 'Private' : 'Friends'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {campaign.my_participant && (
                          <Badge variant="secondary" className="text-xs">
                            Lv.{(campaign.my_participant as any).campaign_level || 1}
                          </Badge>
                        )}
                        <Button variant="outline" size="sm" className="min-h-[44px]">
                          {campaign.status === 'recruiting' ? 'Setup' : 'Continue'}
                        </Button>
                        {['completed', 'abandoned'].includes(campaign.status) && campaign.creator_id === user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                onClick={(e) => e.preventDefault()}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this campaign, all messages, inventory, and logs. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={(e) => handleDeleteCampaign(e, campaign.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{campaign.description}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Open Campaigns */}
      {openCampaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            Open Campaigns
          </h2>
          <div className="grid gap-3">
            {openCampaigns.map(campaign => (
              <Card key={campaign.id} className="bg-card-gradient border-border">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold">{campaign.name}</span>
                      <p className="text-sm text-muted-foreground">{campaign.description || 'No description'}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        <Users className="w-3 h-3 mr-1" />
                        {campaign.participant_count}/{campaign.max_players}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)} className="min-h-[44px]">
                      {campaign.visibility === 'public' ? 'View & Request' : 'View & Request'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && campaigns.length === 0 && (
        <Card className="bg-card-gradient border-border">
          <CardContent className="py-12 text-center">
            <Compass className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Campaigns Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first campaign adventure or wait for others to recruit.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
