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
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Clock, MapPin, Play, Plus, Shield, Users, Compass, Swords, User } from 'lucide-react';
import type { Campaign, CampaignParticipant, CampaignStatus } from '@/lib/campaign-types';
import { getTimeEmoji } from '@/lib/campaign-types';

interface CharacterOption {
  id: string;
  name: string;
  level: number;
  image_url: string | null;
}

export default function Campaigns() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchCharacters();
    }
  }, [user]);

  const fetchCharacters = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, level, image_url')
      .eq('user_id', user!.id)
      .order('name');
    if (data) setCharacters(data);
  };

  const fetchCampaigns = async () => {
    // Get campaigns user is part of
    const { data: myParticipations } = await supabase
      .from('campaign_participants')
      .select('campaign_id, id, campaign_hp, campaign_hp_max, campaign_level, campaign_xp, is_active')
      .eq('user_id', user!.id);

    const myCampaignIds = myParticipations?.map(p => p.campaign_id) || [];

    // Also get recruiting campaigns
    const { data: recruitingCampaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('status', 'recruiting');

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
      participant_count: countMap.get(c.id) || 0,
      my_participant: myParticipationMap.get(c.id) as CampaignParticipant | undefined,
    }));

    setCampaigns(enriched);
    setLoading(false);
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
        })
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

      // For solo campaigns, generate intro narration immediately
      if (isSolo) {
        const char = characters.find(c => c.id === selectedCharacter);
        try {
          const { data: narData } = await supabase.functions.invoke('battle-narrator', {
            body: {
              type: 'campaign_intro',
              campaignName: newName.trim(),
              campaignDescription: newDescription.trim() || null,
              location: startingLocation.trim(),
              timeOfDay: 'morning',
              partyMembers: `${char?.name || 'An adventurer'} (Campaign Lv.1, Original Tier ${char?.level || 1})`,
            },
          });
          if (narData?.narration) {
            await supabase.from('campaign_messages').insert({
              campaign_id: campaign.id,
              sender_type: 'narrator',
              content: narData.narration,
              channel: 'in_universe',
            });
          }
        } catch (e) {
          console.error('Solo intro generation failed:', e);
        }
      }

      toast.success('Campaign created!');
      setCreateOpen(false);
      navigate(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>Start a new persistent adventure for your party.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input placeholder="e.g., The Lost Citadel" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea placeholder="Brief campaign premise..." value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={3} />
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
                <Input placeholder="e.g., Abandoned Outpost, Misty Forest..." value={startingLocation} onChange={e => setStartingLocation(e.target.value)} />
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
              <div>
                <Label>Max Players: {newMaxPlayers}</Label>
                <Slider min={2} max={6} step={1} value={[newMaxPlayers]} onValueChange={([v]) => setNewMaxPlayers(v)} />
              </div>
              )}
            </div>
            <DialogFooter>
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
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {campaign.my_participant && (
                          <Badge variant="secondary" className="text-xs">
                            Lv.{(campaign.my_participant as any).campaign_level || 1}
                          </Badge>
                        )}
                        <Button variant="outline" size="sm" className="min-h-[44px]">
                          {campaign.status === 'recruiting' ? 'Setup' : 'Continue'}
                        </Button>
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
                      View & Join
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
