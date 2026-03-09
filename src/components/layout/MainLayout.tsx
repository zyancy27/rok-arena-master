import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBattleNotifications } from '@/hooks/use-battle-notifications';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import OwnershipNotice from '@/components/legal/OwnershipNotice';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import PageTransition from '@/components/layout/PageTransition';
import { Swords, Users, Shield, LogOut, User, Home, Heart, Settings, Crown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function MainLayout() {
  // Enable real-time battle challenge notifications
  useBattleNotifications();
  const { user, profile, signOut, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-nebula-gradient bg-stars overflow-x-hidden max-w-[100vw]">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/hub" className="flex items-center gap-2 group">
            <Swords className="w-8 h-8 text-primary group-hover:animate-pulse-glow transition-all" />
            <span className="font-bold text-xl hidden sm:block text-glow">
              Realm of Kings
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto flex-shrink min-w-0">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/hub" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Hub</span>
              </Link>
            </Button>
            
            {/* Characters – opens the personal book */}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/characters/list" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Characters</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/battles" className="flex items-center gap-2">
                <Swords className="w-4 h-4" />
                <span className="hidden sm:inline">Battles</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/friends" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Friends</span>
              </Link>
            </Button>
            {isModerator && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
          </nav>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{profile?.display_name || profile?.username}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/membership" className="flex items-center cursor-pointer">
                  <Crown className="mr-2 h-4 w-4" />
                  Membership
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <PageBreadcrumb />
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <OwnershipNotice variant="footer" />
          <div className="flex items-center gap-4">
            <DonateButton />
            <div className="text-xs text-muted-foreground">
              © 2026 Realm of Kings. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DonateButton() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('5');
  const [loading, setLoading] = useState(false);

  const handleDonate = async () => {
    const num = parseFloat(amount);
    if (!num || num < 1) {
      toast.error('Minimum donation is $1.00');
      return;
    }
    if (num > 999.99) {
      toast.error('Maximum donation is $999.99');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-donation', {
        body: { amount: num },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        setOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start donation');
    } finally {
      setLoading(false);
    }
  };

  const presets = [3, 5, 10, 25];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-primary border-primary/50 hover:bg-primary/10 flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Heart className="w-4 h-4 fill-primary" />
        <span>Donate</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 fill-primary text-primary" />
              Support Realm of Kings
            </DialogTitle>
            <DialogDescription>
              Choose an amount or enter your own. Every bit helps us keep building!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              {presets.map((p) => (
                <Button
                  key={p}
                  variant={amount === String(p) ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAmount(String(p))}
                >
                  ${p}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                min="1"
                max="999.99"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Custom amount"
                className="flex-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleDonate} disabled={loading}>
              {loading ? 'Processing...' : `Donate $${parseFloat(amount || '0').toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
