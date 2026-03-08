import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Swords, Sparkles } from 'lucide-react';

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-nebula-gradient bg-stars flex items-center justify-center">
        <div className="animate-pulse-glow">
          <Swords className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/hub" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // If "Remember Me" is unchecked, switch to sessionStorage so session expires on tab close
    if (!rememberMe) {
      // Temporarily reconfigure supabase auth to use sessionStorage
      // The session will not persist across browser restarts
      sessionStorage.setItem('rok-session-only', 'true');
    } else {
      sessionStorage.removeItem('rok-session-only');
    }
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back, warrior!');
      navigate('/hub');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
      toast.success('Password reset link sent! Check your email.');
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (signupUsername.length < 3) {
      toast.error('Username must be at least 3 characters');
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(signupEmail, signupPassword, signupUsername);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Welcome to the arena.');
      navigate('/hub');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-nebula-gradient bg-stars flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Swords className="w-12 h-12 text-primary animate-pulse-glow" />
            <Sparkles className="w-8 h-8 text-cosmic-gold" />
          </div>
          <h1 className="text-4xl font-bold text-glow bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent">
            Realm of Kings
          </h1>
          <p className="text-muted-foreground mt-2">PVP Arena</p>
        </div>

        <Card className="bg-card-gradient border-border glow-primary">
          <CardHeader className="text-center">
            <CardTitle>{forgotMode ? 'Reset Password' : 'Enter the Arena'}</CardTitle>
            <CardDescription>
              {forgotMode
                ? 'Enter your email and we\'ll send you a reset link'
                : 'Sign in to your account or create a new one to begin your journey'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forgotMode ? (
              resetSent ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Check your email for a password reset link. It may take a minute to arrive.
                  </p>
                  <Button variant="outline" onClick={() => { setForgotMode(false); setResetSent(false); }}>
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="warrior@realm.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full glow-primary" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Back to Sign In
                  </button>
                </form>
              )
            ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="warrior@realm.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                   <div className="flex items-center space-x-2">
                     <Checkbox
                       id="remember-me"
                       checked={rememberMe}
                       onCheckedChange={(checked) => setRememberMe(checked === true)}
                     />
                     <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                       Remember Me
                     </Label>
                   </div>
                   <Button type="submit" className="w-full glow-primary" disabled={isLoading}>
                     {isLoading ? 'Entering...' : 'Enter Arena'}
                   </Button>

                   <div className="relative my-3">
                     <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                     <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                   </div>

                   <Button
                     type="button"
                     variant="outline"
                     className="w-full"
                     disabled={isGoogleLoading}
                     onClick={async () => {
                       setIsGoogleLoading(true);
                       const { error } = await lovable.auth.signInWithOAuth('google', {
                         redirect_uri: window.location.origin,
                       });
                       if (error) {
                         toast.error(error instanceof Error ? error.message : 'Google sign-in failed');
                         setIsGoogleLoading(false);
                       }
                     }}
                   >
                     <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                     {isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}
                   </Button>

                   <button
                     type="button"
                     onClick={() => { setForgotMode(true); setResetEmail(loginEmail); }}
                     className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                   >
                     Forgot your password?
                   </button>
                 </form>
               </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="WarriorKing"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                      minLength={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="warrior@realm.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full glow-primary" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Join the Realm'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
