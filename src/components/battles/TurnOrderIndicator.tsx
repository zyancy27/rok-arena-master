import { useState, useEffect } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Sword, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TurnOrderIndicatorProps {
  userCharacterName: string;
  opponentName: string;
  onOrderDetermined: (userGoesFirst: boolean) => void;
  disabled?: boolean;
}

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

export default function TurnOrderIndicator({ 
  userCharacterName, 
  opponentName, 
  onOrderDetermined,
  disabled = false,
}: TurnOrderIndicatorProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [userRoll, setUserRoll] = useState<number | null>(null);
  const [opponentRoll, setOpponentRoll] = useState<number | null>(null);
  const [rollPhase, setRollPhase] = useState<'idle' | 'rolling' | 'user-rolled' | 'opponent-rolled' | 'complete'>('idle');
  const [animatingDice, setAnimatingDice] = useState(0);
  
  const rollDice = async () => {
    setIsRolling(true);
    setRollPhase('rolling');
    setUserRoll(null);
    setOpponentRoll(null);
    
    // Animate dice rolling
    let rollCount = 0;
    const animationInterval = setInterval(() => {
      setAnimatingDice(Math.floor(Math.random() * 6));
      rollCount++;
      if (rollCount >= 15) {
        clearInterval(animationInterval);
      }
    }, 100);
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 1500));
    clearInterval(animationInterval);
    
    // Roll for user
    const uRoll = Math.floor(Math.random() * 6) + 1;
    setUserRoll(uRoll);
    setAnimatingDice(uRoll - 1);
    setRollPhase('user-rolled');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Roll for opponent
    let oRoll = Math.floor(Math.random() * 6) + 1;
    // If tie, re-roll until different
    while (oRoll === uRoll) {
      oRoll = Math.floor(Math.random() * 6) + 1;
    }
    setOpponentRoll(oRoll);
    setRollPhase('opponent-rolled');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setRollPhase('complete');
    setIsRolling(false);
    
    // Determine winner (higher roll goes first)
    onOrderDetermined(uRoll > oRoll);
  };
  
  const UserDiceIcon = userRoll ? DICE_ICONS[userRoll - 1] : DICE_ICONS[animatingDice];
  const OpponentDiceIcon = opponentRoll ? DICE_ICONS[opponentRoll - 1] : DICE_ICONS[animatingDice];
  
  const userWins = userRoll !== null && opponentRoll !== null && userRoll > opponentRoll;
  
  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 via-muted to-accent/10 border border-primary/30">
      <div className="text-center mb-4">
        <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
          <Dice6 className="w-5 h-5 text-primary" />
          Turn Order Roll
        </h3>
        <p className="text-xs text-muted-foreground">
          Roll to determine who strikes first!
        </p>
      </div>
      
      {rollPhase === 'idle' ? (
        <div className="text-center">
          <Button 
            onClick={rollDice} 
            disabled={disabled}
            className="glow-primary"
          >
            <Dice6 className="w-4 h-4 mr-2" />
            Roll for Initiative!
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* User Roll */}
          <div className={`text-center p-3 rounded-lg transition-all ${
            rollPhase === 'complete' && userWins 
              ? 'bg-green-500/20 border border-green-500/50' 
              : 'bg-muted/30'
          }`}>
            <p className="text-xs text-muted-foreground mb-2 truncate">{userCharacterName}</p>
            <div className={`flex justify-center ${isRolling && !userRoll ? 'animate-bounce' : ''}`}>
              <UserDiceIcon 
                className={`w-10 h-10 ${
                  rollPhase === 'complete' && userWins 
                    ? 'text-green-400' 
                    : rollPhase === 'complete' 
                    ? 'text-red-400' 
                    : 'text-primary'
                }`} 
              />
            </div>
            {userRoll !== null && (
              <Badge variant="outline" className="mt-2">
                {userRoll}
              </Badge>
            )}
            {rollPhase === 'complete' && userWins && (
              <div className="flex items-center justify-center gap-1 mt-2 text-green-400">
                <Sword className="w-3 h-3" />
                <span className="text-xs font-semibold">First Strike!</span>
              </div>
            )}
          </div>
          
          {/* VS */}
          <div className="text-center">
            <span className="text-2xl font-bold text-muted-foreground">VS</span>
            {rollPhase === 'rolling' && (
              <div className="mt-2 text-xs text-primary animate-pulse">Rolling...</div>
            )}
          </div>
          
          {/* Opponent Roll */}
          <div className={`text-center p-3 rounded-lg transition-all ${
            rollPhase === 'complete' && !userWins 
              ? 'bg-amber-500/20 border border-amber-500/50' 
              : 'bg-muted/30'
          }`}>
            <p className="text-xs text-muted-foreground mb-2 truncate">{opponentName}</p>
            <div className={`flex justify-center ${isRolling && userRoll && !opponentRoll ? 'animate-bounce' : ''}`}>
              <OpponentDiceIcon 
                className={`w-10 h-10 ${
                  rollPhase === 'complete' && !userWins 
                    ? 'text-amber-400' 
                    : rollPhase === 'complete' 
                    ? 'text-red-400' 
                    : 'text-accent'
                }`} 
              />
            </div>
            {opponentRoll !== null && (
              <Badge variant="outline" className="mt-2">
                {opponentRoll}
              </Badge>
            )}
            {rollPhase === 'complete' && !userWins && (
              <div className="flex items-center justify-center gap-1 mt-2 text-amber-400">
                <Sword className="w-3 h-3" />
                <span className="text-xs font-semibold">First Strike!</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {rollPhase === 'complete' && (
        <div className="mt-4 text-center">
          <p className="text-sm">
            {userWins ? (
              <span className="text-green-400 font-semibold">
                {userCharacterName} moves first!
              </span>
            ) : (
              <span className="text-amber-400 font-semibold">
                {opponentName} gets the opening move. Prepare to respond!
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
