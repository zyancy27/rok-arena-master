import { useState, useEffect } from 'react';
import { Backpack } from 'lucide-react';

interface BagItem {
  name: string;
  type: string;
  rarity: string;
  equipped: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'text-muted-foreground',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
  personal: 'text-foreground',
};

interface Props {
  bagItems: BagItem[];
  isClosed: boolean;
}

export default function BagBubble({ bagItems, isClosed }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait a frame so the DOM is fully painted before triggering the open animation
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Before ready and not closed, render invisible to avoid a flash
  const shouldAnimate = ready || isClosed;

  return (
    <div className="flex justify-center py-3" style={{ perspective: '600px' }}>
      <div
        className="relative max-w-xs w-full"
        style={{
          transformStyle: 'preserve-3d',
          opacity: shouldAnimate ? undefined : 0,
          animation: !shouldAnimate
            ? 'none'
            : isClosed
              ? 'bag-close 0.6s ease-in forwards'
              : 'bag-open 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        {/* Backpack body — 3D tilt */}
        <div
          className="relative overflow-hidden rounded-b-[2rem] rounded-t-2xl"
          style={{
            transform: 'rotateX(6deg)',
            transformStyle: 'preserve-3d',
            boxShadow: '0 18px 40px -10px rgba(120,53,15,0.45), inset 0 -8px 20px -6px rgba(0,0,0,0.35), inset 0 2px 6px 0 rgba(255,200,100,0.12)',
            background: 'linear-gradient(175deg, #6b3a1f 0%, #4a2510 45%, #3b1c0c 100%)',
          }}
        >
          {/* Leather texture overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)' }}
          />

          {/* Flap */}
          <div className="relative mx-auto"
            style={{
              width: '85%',
              height: '28px',
              background: 'linear-gradient(180deg, #7a4220 0%, #5a3015 100%)',
              borderRadius: '14px 14px 0 0',
              transformOrigin: 'bottom center',
              animation: !shouldAnimate
                ? 'none'
                : isClosed
                  ? 'flap-close 0.5s ease-in forwards'
                  : 'flap-open 0.5s ease-out 0.2s both',
              boxShadow: '0 4px 12px -2px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,200,100,0.15)',
            }}
          >
            {/* Buckle */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-3 rounded-sm border border-yellow-600/70"
              style={{ background: 'linear-gradient(180deg, #c9962e, #a07020)' }}
            />
          </div>

          {/* Handle / straps at top */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-5 rounded-t-full border-2 border-amber-800/70 bg-amber-900/50"
            style={{ boxShadow: '0 -2px 6px rgba(0,0,0,0.3)' }}
          />

          {/* Inner dark opening — contents animate in */}
          <div className="mx-3 mt-1 mb-1 rounded-xl p-3 pt-4 relative overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse at 50% 20%, #2a1508 0%, #1a0d04 50%, #0f0802 100%)',
              boxShadow: 'inset 0 6px 18px rgba(0,0,0,0.7), inset 0 -2px 8px rgba(0,0,0,0.3)',
              animation: !shouldAnimate
                ? 'none'
                : isClosed
                  ? 'bag-contents-close 0.4s ease-in forwards'
                  : 'bag-contents-open 0.5s ease-out 0.35s both',
            }}
          >
            {/* Peering-in vignette */}
            <div className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ boxShadow: 'inset 0 0 30px 10px rgba(0,0,0,0.6)' }}
            />

            <div className="relative z-10">
              <div className="text-center mb-2 flex items-center justify-center gap-1.5">
                <Backpack className="w-3.5 h-3.5 text-amber-500/80" />
                <span className="text-[10px] font-bold text-amber-400/90 uppercase tracking-[0.2em]">Your Bag</span>
              </div>

              {bagItems.length === 0 ? (
                <p className="text-xs text-amber-200/30 italic text-center py-2">Empty — nothing in here.</p>
              ) : (
                <div className="space-y-1">
                  {bagItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-xs"
                      style={{
                        animation: !shouldAnimate || isClosed ? 'none' : `bag-item-appear 0.3s ease-out ${0.5 + idx * 0.08}s both`,
                      }}
                    >
                      <span className="text-amber-600/50 text-[8px]">◆</span>
                      <span className={`font-medium ${RARITY_COLORS[item.rarity] || 'text-amber-100/80'}`}>
                        {item.name}
                      </span>
                      {item.equipped && item.rarity !== 'personal' && (
                        <span className="text-[9px] text-amber-500/50">(equipped)</span>
                      )}
                      {item.rarity === 'personal' && (
                        <span className="text-[9px] text-amber-200/30">(personal)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 border-t border-amber-800/20 pt-1">
                <p className="text-[9px] text-amber-300/30 text-center">{bagItems.length} item{bagItems.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Bottom stitching line */}
          <div className="mx-6 mb-3 mt-1 border-t border-dashed border-amber-900/40" />

          {/* Side straps */}
          <div className="absolute top-8 left-0 w-2.5 h-16 rounded-r-sm"
            style={{ background: 'linear-gradient(90deg, #3b1c0c, #5a3015)', boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }}
          />
          <div className="absolute top-8 right-0 w-2.5 h-16 rounded-l-sm"
            style={{ background: 'linear-gradient(-90deg, #3b1c0c, #5a3015)', boxShadow: '-2px 0 4px rgba(0,0,0,0.3)' }}
          />
        </div>
      </div>
    </div>
  );
}
