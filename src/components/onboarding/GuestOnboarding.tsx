import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Swords,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User,
  FileText,
  Wand2,
} from 'lucide-react';
import {
  loadDraft,
  saveDraft,
  clearDraft,
  hasMeaningfulDraft,
  mergeIntoCharacterInsert,
  EMPTY_DRAFT,
  type GuestDraftState,
  type CharacterCountBucket,
} from '@/lib/guest-onboarding/draft-store';
import { parseGuestNotes } from '@/lib/guest-onboarding/parse-notes';

const COUNT_OPTIONS: Array<{ value: CharacterCountBucket; label: string; helper: string }> = [
  { value: 'one', label: '1 character', helper: 'Just my main one' },
  { value: 'few', label: '2–5 characters', helper: 'A small cast' },
  { value: 'some', label: '6–10 characters', helper: 'A growing roster' },
  { value: 'many', label: '10+ characters', helper: 'A whole universe' },
  { value: 'unsure', label: "I'm not sure yet", helper: 'Just exploring' },
];

export default function GuestOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<GuestDraftState>(() => loadDraft());
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const draftHasContent = useMemo(() => hasMeaningfulDraft(draft), [draft]);

  const update = (patch: Partial<GuestDraftState>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const goTo = (step: GuestDraftState['step']) => update({ step });

  const handleParse = async () => {
    if (!draft.rawNotes.trim()) {
      toast.error('Paste some character notes first.');
      return;
    }
    setIsParsing(true);
    update({ parseError: null });
    try {
      const parsed = await parseGuestNotes(draft.rawNotes);
      const merged = {
        ...parsed,
        name: parsed.name || draft.basicInfo.name || undefined,
      };
      update({ parsed: merged, parseError: null, step: 4 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse notes.';
      update({ parseError: message });
      toast.error(message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveDraftToProfile = async (uid: string) => {
    if (draft.saved) return;
    if (!draft.parsed && !draft.basicInfo.name.trim()) return;
    setIsSaving(true);
    try {
      const insert = mergeIntoCharacterInsert(draft, uid);

      const { data: existing } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', uid)
        .eq('name', insert.name as string)
        .maybeSingle();

      let characterId = existing?.id;
      if (!characterId) {
        const { data, error } = await supabase
          .from('characters')
          .insert(insert)
          .select('id')
          .single();
        if (error) throw error;
        characterId = data.id;
      }

      update({ saved: true });
      clearDraft();
      toast.success('Character saved to your profile!');
      navigate(`/characters/${characterId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save character.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      toast.error('Username must be at least 3 characters.');
      return;
    }
    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { username: username.trim(), display_name: username.trim() },
        },
      });
      if (error) throw error;
      const newUid = data.user?.id;
      if (newUid && data.session) {
        await handleSaveDraftToProfile(newUid);
      } else {
        toast.success('Account created! Check your email to confirm, then log in.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      const uid = data.user?.id;
      if (uid && draftHasContent) {
        await handleSaveDraftToProfile(uid);
      } else if (uid) {
        navigate('/hub');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  if (user && draftHasContent && !draft.saved) {
    return (
      <div className="min-h-screen bg-nebula-gradient bg-stars flex items-center justify-center p-4">
        <Card className="bg-card-gradient border-border max-w-lg w-full glow-primary">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-cosmic-gold" /> Welcome back
            </CardTitle>
            <CardDescription>
              You started a character before logging in. Save it to your profile?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border bg-background/50 p-3 text-sm">
              <p className="font-semibold">{draft.parsed?.name || draft.basicInfo.name || 'Unnamed draft'}</p>
              {draft.parsed?.lore && (
                <p className="text-muted-foreground line-clamp-3 mt-1">{draft.parsed.lore}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 glow-primary"
                disabled={isSaving}
                onClick={() => handleSaveDraftToProfile(user.id)}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save to my profile
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  clearDraft();
                  setDraft({ ...EMPTY_DRAFT });
                  navigate('/hub');
                }}
              >
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nebula-gradient bg-stars">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Swords className="w-10 h-10 text-primary animate-pulse-glow" />
            <Sparkles className="w-7 h-7 text-cosmic-gold animate-float" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-glow bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent">
            Bring Your Characters In
          </h1>
          <p className="text-muted-foreground mt-3">
            Start with what you already have. We'll organize it.
          </p>
        </div>

        <StepIndicator step={draft.step} />

        <div className="mt-6">
          {draft.step === 1 && (
            <StepCount
              value={draft.characterCount}
              onPick={(value) => update({ characterCount: value, step: 2 })}
              onLogin={() => goTo(5)}
            />
          )}
          {draft.step === 2 && (
            <StepBasicInfo
              value={draft.basicInfo}
              onChange={(basicInfo) => update({ basicInfo })}
              onBack={() => goTo(1)}
              onNext={() => goTo(3)}
            />
          )}
          {draft.step === 3 && (
            <StepNotes
              notes={draft.rawNotes}
              error={draft.parseError}
              isParsing={isParsing}
              onChange={(rawNotes) => update({ rawNotes })}
              onBack={() => goTo(2)}
              onParse={handleParse}
            />
          )}
          {draft.step === 4 && draft.parsed && (
            <StepReview
              parsed={draft.parsed}
              onEdit={(parsed) => update({ parsed })}
              onBack={() => goTo(3)}
              onContinue={() => goTo(5)}
            />
          )}
          {draft.step === 5 && (
            <StepProfile
              authMode={authMode}
              setAuthMode={setAuthMode}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              username={username}
              setUsername={setUsername}
              busy={authBusy || isSaving}
              draftName={draft.parsed?.name || draft.basicInfo.name || 'Unnamed Character'}
              onSignup={handleSignup}
              onLogin={handleLogin}
              onBack={() => goTo(4)}
            />
          )}
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          Just looking around?{' '}
          <Link to="/rules" className="underline hover:text-primary">
            Read the rules
          </Link>
          {' · '}
          <Link to="/auth" className="underline hover:text-primary">
            Full sign-in page
          </Link>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  const labels = ['Count', 'Basics', 'Notes', 'Review', 'Profile'];
  return (
    <div className="flex items-center justify-between gap-2 max-w-xl mx-auto">
      {labels.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} className="flex-1 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary glow-primary'
                  : done
                    ? 'bg-primary/30 text-primary border-primary/50'
                    : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : idx}
            </div>
            <span className={`mt-1 text-[10px] uppercase tracking-wide ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StepCount({
  value,
  onPick,
  onLogin,
}: {
  value: CharacterCountBucket | null;
  onPick: (v: CharacterCountBucket) => void;
  onLogin: () => void;
}) {
  return (
    <Card className="bg-card-gradient border-border">
      <CardHeader>
        <CardTitle>How many characters do you have?</CardTitle>
        <CardDescription>
          Doesn't have to be exact — just helps us tune the experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          {COUNT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onPick(opt.value)}
              className={`text-left rounded-lg border p-4 transition-all hover:border-primary hover:bg-primary/5 ${
                value === opt.value ? 'border-primary bg-primary/10 glow-primary' : 'border-border'
              }`}
            >
              <div className="font-semibold">{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{opt.helper}</div>
            </button>
          ))}
        </div>
        <div className="pt-4 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-2">Already have a profile?</p>
          <Button variant="outline" onClick={onLogin}>
            Log in
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StepBasicInfo({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: { name: string; nickname: string; universe: string; shortDescription: string };
  onChange: (v: typeof value) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const set = (field: keyof typeof value, v: string) => onChange({ ...value, [field]: v });
  return (
    <Card className="bg-card-gradient border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Tell us about your character
        </CardTitle>
        <CardDescription>
          All optional. Skip anything you don't have yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="char-name">Character name</Label>
          <Input
            id="char-name"
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Kael, the Wandering Star"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="char-nick">Nickname or title</Label>
          <Input
            id="char-nick"
            value={value.nickname}
            onChange={(e) => set('nickname', e.target.value)}
            placeholder="The Ashbringer, Kid, Captain..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="char-universe">Universe / story / world</Label>
          <Input
            id="char-universe"
            value={value.universe}
            onChange={(e) => set('universe', e.target.value)}
            placeholder="My original world, a fanfic, a campaign setting..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="char-short">Short description</Label>
          <Textarea
            id="char-short"
            value={value.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
            placeholder="One or two sentences about who they are."
            rows={3}
          />
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button onClick={onNext} className="glow-primary">
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StepNotes({
  notes,
  error,
  isParsing,
  onChange,
  onBack,
  onParse,
}: {
  notes: string;
  error: string | null;
  isParsing: boolean;
  onChange: (v: string) => void;
  onBack: () => void;
  onParse: () => void;
}) {
  return (
    <Card className="bg-card-gradient border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Paste your character notes
        </CardTitle>
        <CardDescription>
          Copy and paste whatever notes you already have for this character.
          They do not need to be perfectly organized — we'll auto-parse them
          into the right sections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {['notebooks', 'phone notes', 'docs', 'character bios', 'lore', 'powers', 'personality', 'battle notes', 'random scattered notes'].map(
            (src) => (
              <Badge key={src} variant="outline" className="text-[10px]">
                {src}
              </Badge>
            ),
          )}
        </div>
        <Textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          placeholder="Paste anything — bios, ability lists, backstory fragments, scattered ideas. Messy is fine."
          className="font-mono text-sm"
          disabled={isParsing}
        />
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm flex gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">{error}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Your notes are still here. Tweak them and try again, or skip parsing and continue manually.
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={isParsing}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button onClick={onParse} disabled={isParsing || !notes.trim()} className="glow-primary">
            {isParsing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parsing…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" /> Auto-parse notes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StepReview({
  parsed,
  onEdit,
  onBack,
  onContinue,
}: {
  parsed: import('@/lib/guest-onboarding/draft-store').ParsedCharacterDraft;
  onEdit: (p: import('@/lib/guest-onboarding/draft-store').ParsedCharacterDraft) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const set = <K extends keyof typeof parsed>(k: K, v: (typeof parsed)[K]) =>
    onEdit({ ...parsed, [k]: v });

  const fields: Array<{ key: keyof typeof parsed; label: string; rows?: number }> = [
    { key: 'name', label: 'Name' },
    { key: 'race', label: 'Species / Race' },
    { key: 'age', label: 'Age' },
    { key: 'home_planet', label: 'Home / Universe' },
    { key: 'powers', label: 'Powers', rows: 3 },
    { key: 'abilities', label: 'Abilities', rows: 3 },
    { key: 'personality', label: 'Personality', rows: 3 },
    { key: 'mentality', label: 'Mentality', rows: 3 },
    { key: 'lore', label: 'Backstory / Lore', rows: 5 },
  ];

  return (
    <Card className="bg-card-gradient border-border">
      <CardHeader>
        <CardTitle>Review what we parsed</CardTitle>
        <CardDescription>
          Auto-parsing is a starting point, not perfect. Edit anything that looks off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`f-${f.key}`} className="text-xs uppercase tracking-wide text-muted-foreground">
              {f.label}
            </Label>
            {f.rows ? (
              <Textarea
                id={`f-${f.key}`}
                rows={f.rows}
                value={(parsed[f.key] as string) ?? ''}
                onChange={(e) => set(f.key, e.target.value as never)}
              />
            ) : (
              <Input
                id={`f-${f.key}`}
                value={(parsed[f.key] as string) ?? ''}
                onChange={(e) => set(f.key, e.target.value as never)}
              />
            )}
          </div>
        ))}

        <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
          <Label htmlFor="f-unsorted" className="text-xs uppercase tracking-wide text-amber-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Needs review (uncategorized)
          </Label>
          <p className="text-xs text-muted-foreground">
            Information we couldn't confidently place. Move it into the right field above, or leave it here — it'll be saved to your character's lore.
          </p>
          <Textarea
            id="f-unsorted"
            rows={4}
            value={parsed.unsorted_notes ?? ''}
            onChange={(e) => set('unsorted_notes', e.target.value as never)}
            placeholder="(empty — everything got categorized)"
          />
        </div>
      </CardContent>
      <div className="flex justify-between p-6 pt-0">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to notes
        </Button>
        <Button onClick={onContinue} className="glow-primary">
          Looks good <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}

function StepProfile({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  username,
  setUsername,
  busy,
  draftName,
  onSignup,
  onLogin,
  onBack,
}: {
  authMode: 'signup' | 'login';
  setAuthMode: (m: 'signup' | 'login') => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  busy: boolean;
  draftName: string;
  onSignup: (e: React.FormEvent) => void;
  onLogin: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <Card className="bg-card-gradient border-border glow-primary">
      <CardHeader>
        <CardTitle>Create a profile to save {draftName}</CardTitle>
        <CardDescription>
          Your character is ready. Sign up (or log in) and we'll save it to
          your profile automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'signup' | 'login')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="login">Log In</TabsTrigger>
          </TabsList>

          <TabsContent value="signup">
            <form onSubmit={onSignup} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="su-username">Username</Label>
                <Input id="su-username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-pw">Password</Label>
                <Input id="su-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full glow-primary" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Create profile & save character
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="login">
            <form onSubmit={onLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="li-email">Email</Label>
                <Input id="li-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-pw">Password</Label>
                <Input id="li-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full glow-primary" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Log in & save character
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <Button variant="ghost" onClick={onBack} className="mt-4 w-full" disabled={busy}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to review
        </Button>
      </CardContent>
    </Card>
  );
}
