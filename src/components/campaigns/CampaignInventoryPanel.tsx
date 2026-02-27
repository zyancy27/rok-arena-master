import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Backpack, Shield, Sword, Sparkles, FlaskConical, Gem, Package,
  ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';

export interface InventoryItem {
  id: string;
  campaign_id: string;
  participant_id: string;
  user_id: string;
  item_name: string;
  item_type: string;
  item_rarity: string;
  description: string | null;
  is_equipped: boolean;
  stat_bonus: Record<string, number>;
  found_at_zone: string | null;
  found_at_day: number | null;
  created_at: string;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-muted text-muted-foreground',
  uncommon: 'bg-green-500/20 text-green-400',
  rare: 'bg-blue-500/20 text-blue-400',
  epic: 'bg-purple-500/20 text-purple-400',
  legendary: 'bg-yellow-500/20 text-yellow-400',
};

const TYPE_ICONS: Record<string, typeof Sword> = {
  weapon: Sword,
  armor: Shield,
  potion: FlaskConical,
  artifact: Sparkles,
  gem: Gem,
  misc: Package,
};

interface Props {
  items: InventoryItem[];
  onUpdate: () => void;
  isActive: boolean;
}

export default function CampaignInventoryPanel({ items, onUpdate, isActive }: Props) {
  const [expanded, setExpanded] = useState(true);

  const equipped = items.filter(i => i.is_equipped);
  const unequipped = items.filter(i => !i.is_equipped);

  const toggleEquip = async (item: InventoryItem) => {
    const { error } = await supabase
      .from('campaign_inventory')
      .update({ is_equipped: !item.is_equipped })
      .eq('id', item.id);
    if (error) { toast.error('Failed to update item'); return; }
    toast.success(item.is_equipped ? `Unequipped ${item.item_name}` : `Equipped ${item.item_name}`);
    onUpdate();
  };

  const dropItem = async (item: InventoryItem) => {
    const { error } = await supabase
      .from('campaign_inventory')
      .delete()
      .eq('id', item.id);
    if (error) { toast.error('Failed to drop item'); return; }
    toast.success(`Dropped ${item.item_name}`);
    onUpdate();
  };

  const renderItem = (item: InventoryItem) => {
    const Icon = TYPE_ICONS[item.item_type] || Package;
    return (
      <div key={item.id} className="flex items-start gap-2 p-2 rounded-md bg-background/50 group">
        <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium truncate">{item.item_name}</span>
            <Badge className={`text-[9px] px-1 py-0 ${RARITY_COLORS[item.item_rarity] || RARITY_COLORS.common}`}>
              {item.item_rarity}
            </Badge>
            {item.is_equipped && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/50 text-primary">
                Equipped
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          )}
          {Object.keys(item.stat_bonus || {}).length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {Object.entries(item.stat_bonus).map(([stat, val]) => (
                <span key={stat} className="text-[9px] text-primary">
                  {val > 0 ? '+' : ''}{val} {stat}
                </span>
              ))}
            </div>
          )}
        </div>
        {isActive && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleEquip(item)}
              title={item.is_equipped ? 'Unequip' : 'Equip'}>
              <Shield className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => dropItem(item)}
              title="Drop">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left text-sm font-semibold py-1"
      >
        <Backpack className="w-4 h-4" />
        Inventory ({items.length})
        {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {expanded && (
        <ScrollArea className="max-h-[200px]">
          {items.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic py-2">No items yet. Explore to find loot!</p>
          ) : (
            <div className="space-y-1">
              {equipped.length > 0 && (
                <>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Equipped</p>
                  {equipped.map(renderItem)}
                </>
              )}
              {unequipped.length > 0 && (
                <>
                  {equipped.length > 0 && <Separator className="my-1" />}
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Backpack</p>
                  {unequipped.map(renderItem)}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
