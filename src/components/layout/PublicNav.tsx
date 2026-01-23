import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Swords, BookOpen, Home, LogIn, FileText, Crown } from 'lucide-react';

export default function PublicNav() {
  const { user } = useAuth();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Swords className="w-8 h-8 text-primary group-hover:animate-pulse-glow transition-all" />
          <span className="font-bold text-xl hidden sm:block text-glow">
            Realm of Kings
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant={isActive('/') ? 'secondary' : 'ghost'} 
            size="sm" 
            asChild
          >
            <Link to="/" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>
          <Button 
            variant={isActive('/throne-room') ? 'secondary' : 'ghost'} 
            size="sm" 
            asChild
          >
            <Link to="/throne-room" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Throne Room</span>
            </Link>
          </Button>
          <Button 
            variant={isActive('/rules') ? 'secondary' : 'ghost'} 
            size="sm" 
            asChild
          >
            <Link to="/rules" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Rules</span>
            </Link>
          </Button>
          <Button 
            variant={isActive('/terms') ? 'secondary' : 'ghost'} 
            size="sm" 
            asChild
          >
            <Link to="/terms" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Terms</span>
            </Link>
          </Button>
          
          {user ? (
            <Button size="sm" className="glow-primary ml-2" asChild>
              <Link to="/hub" className="flex items-center gap-2">
                <Swords className="w-4 h-4" />
                <span>Enter Arena</span>
              </Link>
            </Button>
          ) : (
            <Button size="sm" className="glow-primary ml-2" asChild>
              <Link to="/auth" className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
