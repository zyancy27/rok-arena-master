/**
 * Trade panel for campaign multiplayer — shows incoming/outgoing trade offers.
 * Also provides a dialog to initiate a trade by selecting an item + recipient.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowRightLeft, Check, X, Package, Send, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { CampaignTrade } from '@/hooks/use-campaign-trades';
import type { InventoryItem } from './CampaignInventoryPanel';
import type { CampaignParticipant } from '@/lib/campaign-types';

interface Props {
  incomingTrades: CampaignTrade[];
  outgoingTrades: CampaignTrade[];
  inventory: InventoryItem[];
  participants: CampaignParticipant[];
  myParticipantId: string;
  currentZone: string;
  onSendOffer: (itemId: string, receiverParticipantId: string, message?: string) => Promise<boolean>;
  onAccept: (tradeId: string) => void;
  onDecline: (tradeId: string) => void;
  onCancel: (tradeId: string) => void;
}

export default function CampaignTradePanel({
  incomingTrades, outgoingTrades,
  inventory, participants, myParticipantId, currentZone,
  onSendOffer, onAccept, onDecline, onCancel,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Only show other active participants (same zone check not enforced in UI strictly — server could add later)
  const otherParticipants = participants.filter(p => p.id !== myParticipantId && p.is_active);

  const handleSend = async () => {
    if (!selectedItem || !selectedRecipient) return;
    setSending(true);
    const success = await onSendOffer(selectedItem, selectedRecipient);
    setSending(false);
    if (success) {
      setSelectedItem('');
      setSelectedRecipient('');
      setDialogOpen(false);
    }
  };

  const totalPending = incomingTrades.length + outgoingTrades.length;

  if (otherParticipants.length === 0 && totalPending === 0) return null;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left text-sm font-semibold py-1"
      >
        <ArrowRightLeft className="w-4 h-4" />
        Trades
        {totalPending > 0 && (
          <Badge variant="destructive" className="text-[9px] px-1 py-0 ml-1">{totalPending}</Badge>
        )}
        {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {/* Incoming trades */}
          {incomingTrades.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Incoming Offers</p>
              {incomingTrades.map(trade => (
                <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                  <Avatar className="w-5 h-5 shrink-0">
                    <AvatarImage src={trade.sender?.character?.image_url || undefined} />
                    <AvatarFallback className="text-[8px]">{trade.sender?.character?.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground">{trade.sender?.character?.name}</span> offers
                    </p>
                    <p className="text-xs font-medium truncate">{trade.item?.item_name || 'Unknown item'}</p>
                    {trade.message && <p className="text-[9px] text-muted-foreground italic truncate">{trade.message}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={() => onAccept(trade.id)}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDecline(trade.id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Outgoing trades */}
          {outgoingTrades.length > 0 && (
            <div className="space-y-1">
              {incomingTrades.length > 0 && <Separator className="my-1" />}
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sent Offers</p>
              {outgoingTrades.map(trade => (
                <div key={trade.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{trade.item?.item_name}</p>
                    <p className="text-[9px] text-muted-foreground">
                      → {trade.receiver?.character?.name || 'Unknown'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive shrink-0" onClick={() => onCancel(trade.id)} title="Cancel">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* New trade button */}
          {otherParticipants.length > 0 && inventory.length > 0 && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full h-7 text-[11px] gap-1.5 border-primary/30 text-primary/80">
                  <Send className="w-3 h-3" /> Offer an Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[340px]">
                <DialogHeader>
                  <DialogTitle className="text-sm flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" /> Trade Item
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Select Item</label>
                    <Select value={selectedItem} onValueChange={setSelectedItem}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Choose an item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.map(item => (
                          <SelectItem key={item.id} value={item.id} className="text-xs">
                            {item.item_name} ({item.item_rarity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Send to</label>
                    <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Choose a party member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {otherParticipants.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.character?.name || 'Unknown'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full h-8 text-xs gap-1.5"
                    disabled={!selectedItem || !selectedRecipient || sending}
                    onClick={handleSend}
                  >
                    <Send className="w-3 h-3" />
                    {sending ? 'Sending...' : 'Send Trade Offer'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {totalPending === 0 && otherParticipants.length > 0 && inventory.length > 0 && (
            <p className="text-[9px] text-muted-foreground italic">No pending trades.</p>
          )}
        </div>
      )}
    </div>
  );
}
