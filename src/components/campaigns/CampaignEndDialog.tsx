import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Flag, Archive, RotateCcw } from 'lucide-react';
import type { Campaign, CampaignParticipant } from '@/lib/campaign-types';

interface Props {
  campaign: Campaign;
  participant: CampaignParticipant;
  onComplete: () => void;
}

export default function CampaignEndDialog({ campaign, participant, onComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  const handleEnd = async () => {
    setEnding(true);
    try {
      // 1. Save campaign log summary
      await supabase.from('campaign_logs').insert({
        campaign_id: campaign.id,
        event_type: 'campaign_completed',
        event_data: {
          completed_at: new Date().toISOString(),
          final_day: campaign.day_count,
          final_zone: campaign.current_zone,
          final_time: campaign.time_of_day,
          participant_summary: {
            character_name: participant.character?.name,
            final_level: participant.campaign_level,
            total_xp: participant.campaign_xp,
            final_hp: participant.campaign_hp,
            final_hp_max: participant.campaign_hp_max,
          },
        },
      });

      // 2. Mark campaign as completed
      await supabase.from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaign.id);

      // 3. Deactivate participant (restore to non-campaign state)
      await supabase.from('campaign_participants')
        .update({ is_active: false })
        .eq('id', participant.id);

      // 4. Post system message
      await supabase.from('campaign_messages').insert({
        campaign_id: campaign.id,
        sender_type: 'system',
        content: `📜 **Campaign "${campaign.name}" has concluded.** Day ${campaign.day_count}, ${campaign.current_zone}. ${participant.character?.name} reached Campaign Level ${participant.campaign_level}. The adventure is archived and can be revisited anytime.`,
        channel: 'in_universe',
      });

      toast.success('Campaign completed! Your character has been restored to their original state.');
      setOpen(false);
      onComplete();
    } catch (err) {
      console.error('Failed to end campaign:', err);
      toast.error('Failed to end campaign');
    } finally {
      setEnding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground gap-1">
          <Flag className="w-3 h-3" /> End Campaign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary" />
            End Campaign
          </DialogTitle>
          <DialogDescription>
            Conclude this adventure and archive the campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
            <p className="font-medium">What happens when you end:</p>
            <div className="flex items-start gap-2">
              <Archive className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <span>Full campaign log is saved as a replayable archive</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">XP</Badge>
              <span>Character progression (Level {participant.campaign_level}, {participant.campaign_xp} XP) is preserved</span>
            </div>
            <div className="flex items-start gap-2">
              <RotateCcw className="w-4 h-4 mt-0.5 text-accent shrink-0" />
              <span>Character is restored to their original non-campaign state</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Day {campaign.day_count} · {campaign.current_zone} · {campaign.time_of_day}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleEnd} disabled={ending} className="gap-1">
            <Flag className="w-4 h-4" />
            {ending ? 'Archiving...' : 'End & Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
