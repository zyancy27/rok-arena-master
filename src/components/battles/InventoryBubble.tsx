/**
 * Inventory Bubble Display
 * 
 * Shows inventory contents in the chat with contextual animations:
 * - Default: bag opening animation
 * - Pocket dimension characters: portal opening animation
 * 
 * Also supports item personality reactions for sentient items.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Package, Sparkles } from 'lucide-react';
import {
  detectInventoryType,
  detectItemPersonality,
  type InventoryDisplayType,
  type ItemPersonality,
} from '@/lib/immersion-engine';

interface InventoryBubbleProps {
  items: string[];
  powers: string | null;
  abilities: string | null;
  weaponsItems: string | null;
  className?: string;
}

export default function InventoryBubble({
  items,
  powers,
  abilities,
  weaponsItems,
  className,
}: InventoryBubbleProps) {
  const displayType = useMemo(() => detectInventoryType(powers, abilities), [powers, abilities]);
  const itemPersonalities = useMemo(() => detectItemPersonality(weaponsItems), [weaponsItems]);

  return (
    <div className={cn(
      'relative rounded-lg border p-3 my-2 animate-scale-in',
      displayType === 'portal' ? 'inventory-portal' : 'inventory-bag',
      className,
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {displayType === 'portal' ? (
          <>
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">Dimensional Pocket</span>
          </>
        ) : (
          <>
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Inventory</span>
          </>
        )}
      </div>
      
      {/* Items list */}
      <div className="space-y-1">
        {items.map((item, i) => {
          const personality = itemPersonalities.find(ip => 
            item.toLowerCase().includes(ip.itemName.toLowerCase().slice(0, 10))
          );
          
          return (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-foreground/80">{item}</span>
              {personality && (
                <span className={cn('text-muted-foreground/60 italic ml-2', personality.cssClass)}>
                  {personality.reaction}
                </span>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground/50 italic">Empty</p>
        )}
      </div>
    </div>
  );
}
