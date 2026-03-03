import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CampaignTrade {
  id: string;
  campaign_id: string;
  sender_participant_id: string;
  receiver_participant_id: string;
  item_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message: string | null;
  created_at: string;
  updated_at: string;
  // joined data
  item?: { item_name: string; item_type: string; item_rarity: string };
  sender?: { character?: { name: string; image_url: string | null } };
  receiver?: { character?: { name: string; image_url: string | null } };
}

export function useCampaignTrades(campaignId: string | undefined, myParticipantId: string | undefined) {
  const [trades, setTrades] = useState<CampaignTrade[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrades = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    const { data } = await supabase
      .from('campaign_trades' as any)
      .select('*, item:campaign_inventory(item_name, item_type, item_rarity), sender:campaign_participants!campaign_trades_sender_participant_id_fkey(character:characters(name, image_url)), receiver:campaign_participants!campaign_trades_receiver_participant_id_fkey(character:characters(name, image_url))')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) {
      setTrades(data.map((t: any) => ({
        ...t,
        item: Array.isArray(t.item) ? t.item[0] : t.item,
        sender: Array.isArray(t.sender) ? t.sender[0] : t.sender,
        receiver: Array.isArray(t.receiver) ? t.receiver[0] : t.receiver,
      })) as CampaignTrade[]);
    }
    setLoading(false);
  }, [campaignId]);

  // Realtime subscription
  useEffect(() => {
    if (!campaignId) return;
    fetchTrades();

    const channel = supabase
      .channel(`campaign-trades-${campaignId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_trades',
        filter: `campaign_id=eq.${campaignId}`,
      }, () => fetchTrades())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaignId, fetchTrades]);

  const sendOffer = async (itemId: string, receiverParticipantId: string, message?: string, senderZone?: string, receiverZone?: string) => {
    if (!campaignId || !myParticipantId) return false;

    // Same-zone restriction
    if (senderZone && receiverZone && senderZone !== receiverZone) {
      toast.error('You must be in the same zone to trade with this player.');
      return false;
    }

    const { error } = await supabase.from('campaign_trades' as any).insert({
      campaign_id: campaignId,
      sender_participant_id: myParticipantId,
      receiver_participant_id: receiverParticipantId,
      item_id: itemId,
      message: message || null,
    });
    if (error) { toast.error('Failed to send trade offer'); return false; }
    toast.success('Trade offer sent!');
    return true;
  };

  const acceptTrade = async (tradeId: string) => {
    // Accept = update status + transfer item ownership
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    // 1. Update trade status
    const { error: updateErr } = await supabase
      .from('campaign_trades' as any)
      .update({ status: 'accepted' })
      .eq('id', tradeId);
    if (updateErr) { toast.error('Failed to accept trade'); return; }

    // 2. Transfer item: update participant_id and user_id on the item
    // Get receiver's user_id
    const { data: receiverData } = await supabase
      .from('campaign_participants')
      .select('user_id')
      .eq('id', trade.receiver_participant_id)
      .single();

    if (receiverData) {
      await supabase
        .from('campaign_inventory')
        .update({
          participant_id: trade.receiver_participant_id,
          user_id: receiverData.user_id,
        })
        .eq('id', trade.item_id);
    }

    toast.success(`Accepted trade — ${trade.item?.item_name || 'item'} received!`);
    fetchTrades();
  };

  const declineTrade = async (tradeId: string) => {
    const { error } = await supabase
      .from('campaign_trades' as any)
      .update({ status: 'declined' })
      .eq('id', tradeId);
    if (error) { toast.error('Failed to decline trade'); return; }
    toast.success('Trade declined');
    fetchTrades();
  };

  const cancelTrade = async (tradeId: string) => {
    const { error } = await supabase
      .from('campaign_trades' as any)
      .delete()
      .eq('id', tradeId);
    if (error) { toast.error('Failed to cancel trade'); return; }
    toast.success('Trade cancelled');
    fetchTrades();
  };

  // Trades that I need to respond to
  const incomingTrades = trades.filter(t => t.receiver_participant_id === myParticipantId && t.status === 'pending');
  // Trades I've sent that are still pending
  const outgoingTrades = trades.filter(t => t.sender_participant_id === myParticipantId && t.status === 'pending');

  return {
    trades, incomingTrades, outgoingTrades, loading,
    sendOffer, acceptTrade, declineTrade, cancelTrade,
    refetch: fetchTrades,
  };
}
