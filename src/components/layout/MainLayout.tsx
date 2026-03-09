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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import OwnershipNotice from '@/components/legal/OwnershipNotice';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import PageTransition from '@/components/layout/PageTransition';
import { Swords, Users, Shield, LogOut, User, Home, Dna, Heart, ChevronDown, FileText, Plus, Globe, FolderOpen, Settings, Crown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface UserCharacter {
  id: string;
  name: string;
  level: number;
}

export default function MainLayout() {
  // Enable real-time battle challenge notifications
  useBattleNotifications();
  const { user, profile, signOut, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);

  useEffect(() => {
    if (user) {
      const fetchUserCharacters = async () => {
        const { data } = await supabase
          .from('characters')
          .select('id, name, level')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(10);
        
        if (data) setUserCharacters(data);
      };
      fetchUserCharacters();
    }
  }, [user]);

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
            
            {/* Characters Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Characters</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-popover z-50">
                <DropdownMenuItem asChild>
                  <Link to="/characters/list" className="flex items-center cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    My Characters
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/characters" className="flex items-center cursor-pointer">
                    <Globe className="mr-2 h-4 w-4" />
                    Solar System Map
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/characters/new" className="flex items-center cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Character
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/races" className="flex items-center cursor-pointer">
                    <Dna className="mr-2 h-4 w-4" />
                    Races
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/teams" className="flex items-center cursor-pointer">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Teams
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/stories" className="flex items-center cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    Stories
                  </Link>
                </DropdownMenuItem>
                {userCharacters.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Your Characters</DropdownMenuLabel>
                    <ScrollArea className="max-h-48">
                      {userCharacters.map((char) => (
                        <DropdownMenuItem key={char.id} asChild>
                          <Link to={`/characters/${char.id}`} className="flex items-center justify-between cursor-pointer">
                            <span className="truncate">{char.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">Lv.{char.level}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
            <Button
              variant="outline"
              size="sm"
              className="text-primary border-primary/50 hover:bg-primary/10"
              asChild
            >
              <a
                href="https://ko-fi.com/YOUR_USERNAME"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Heart className="w-4 h-4 fill-primary" />
                <span>Donate</span>
              </a>
            </Button>
            <div className="text-xs text-muted-foreground">
              © 2026 Realm of Kings. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
