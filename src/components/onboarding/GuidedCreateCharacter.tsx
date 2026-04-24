/**
 * Guided Create-Character flow for logged-in users.
 *
 * Mirrors the friendly, step-by-step UX of the guest onboarding wizard:
 *  - 6 clear steps, one focus at a time
 *  - back/next navigation, draft persistence between steps
 *  - optional "paste existing notes" auto-parse import
 *  - review screen before final save
 *  - saves into the same `characters` table the rest of the app already uses
 *
 * The legacy advanced editor (`CharacterForm`) stays available via the
 * "Open advanced editor" link for power users.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ArrowRight, Sparkles, Loader2, CheckCircle2, AlertTriangle,
  User, Globe, Swords, Smile, BookOpen, Wand2, Save, Settings2,
} from 'lucide-react';
import {
  loadGuidedDraft, saveGuidedDraft, clearGuidedDraft,
  guidedDraftToCharacterInsert, EMPTY_GUIDED_DRAFT,
  type GuidedCharacterDraft,
} from '@/lib/guest-onboarding/guided-create-store';
import { parseGuestNotes } from '@/lib/guest-onboarding/parse-notes';

const STEPS = [
  { idx: 1, label: 'Basics', icon: <User className="w-4 h-4" /> },
  { idx: 2, label: 'Identity', icon: <Globe className="w-4 h-4" /> },
  { idx: 3, label: 'Personality', icon: <Smile className="w-4 h-4" /> },
  { idx: 4, label: 'Powers', icon: <Swords className="w-4 h-4" /> },
  { idx: 5, label: 'Backstory', icon: <BookOpen className="w-4 h-4" /> },
  { idx: 6, label: 'Review', icon: <CheckCircle2 className="w-4 h-4" /> },
] as const;

export default function GuidedCreateCharacter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<GuidedCharacterDraft>(() => loadGuidedDraft());
  const [isSaving, setIsSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => { saveGuidedDraft(draft); }, [draft]);

  const update = (patch: Partial<GuidedCharacterDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const goTo = (step: GuidedCharacterDraft['step']) => update({ step });
  const next = () => goTo(Math.min(6, draft.step + 1) as GuidedCharacterDraft['step']);
  const prev = () => goTo(Math.max(1, draft.step - 1) as GuidedCharacterDraft['step']);

  const completion = useMemo(() => {
    const filled = [
      draft.name, draft.race, draft.personality, draft.powers, draft.lore,
    ].filter((v) => v.trim().length > 0).length;
    return Math.round((filled / 5) * 100);
  }, [draft]);

  const handleParseImport = async () => {
    if (!draft.rawNotes.trim()) {
      toast.error('Paste some notes first.');
      return;
    }
    setIsParsing(true);
    try {
      const parsed = await parseGuestNotes(draft.rawNotes);
      update({
        name: parsed.name || draft.name,
        race: parsed.race || draft.race,
        sub_race: parsed.sub_race || draft.sub_race,
        age: parsed.age ? String(parsed.age) : draft.age,
        powers: parsed.powers || draft.powers,
        abilities: parsed.abilities || draft.abilities,
        weapons_items: parsed.weapons_items || draft.weapons_items,
        personality: parsed.personality || draft.personality,
        lore: parsed.lore || draft.lore,
        extra_notes: parsed.unsorted_notes
          ? (draft.extra_notes ? draft.extra_notes + '\n\n' : '') + parsed.unsorted_notes
          : draft.extra_notes,
        step: 6,
        rawNotes: '',
      });
      setShowImport(false);
      toast.success('Notes parsed — review and save.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse notes.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to save a character.');
      return;
    }
    if (!draft.name.trim()) {
      toast.error('Give your character a name before saving.');
      goTo(1);
      return;
    }
    setIsSaving(true);
    try {
      const insert = guidedDraftToCharacterInsert(draft, user.id);
      // Duplicate-name guard within this user's roster
      const { data: existing } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', insert.name as string)
        .maybeSingle();
      if (existing) {
        toast.error(`You already have a character named "${insert.name as string}".`);
        setIsSaving(false);
        return;
      }
      const { data, error } = await supabase
        .from('characters')
        .insert(insert as never)
        .select('id')
        .single();
      if (error) throw error;
      clearGuidedDraft();
      setDraft({ ...EMPTY_GUIDED_DRAFT });
      toast.success('Character created!');
      navigate(`/characters/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save character.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (confirm('Discard this draft? This cannot be undone.')) {
      clearGuidedDraft();
      setDraft({ ...EMPTY_GUIDED_DRAFT });
      navigate('/characters/list');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-cosmic-gold" />
          <h1 className="text-3xl md:text-4xl font-bold text-glow bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent">
            Create a Character
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Six quick steps. Skip anything you don't have yet — you can always come back.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between gap-1 mb-4 overflow-x-auto pb-1">
        {STEPS.map((s) => {
          const active = s.idx === draft.step;
          const done = s.idx < draft.step;
          return (
            <button
              key={s.idx}
              type="button"
              onClick={() => goTo(s.idx as GuidedCharacterDraft['step'])}
              className={`flex-1 min-w-[58px] flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                active
                  ? 'bg-primary/15 border-primary/40 text-primary glow-primary'
                  : done
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                active ? 'bg-primary text-primary-foreground'
                  : done ? 'bg-emerald-500/20'
                  : 'bg-muted'
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : s.idx}
              </div>
              <span className="text-[10px] uppercase tracking-wide">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-4">
        <span>Step {draft.step} of 6 · {completion}% essentials filled</span>
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="underline hover:text-primary"
        >
          {showImport ? 'Hide import' : 'Paste existing notes instead'}
        </button>
      </div>

      {/* Optional import block */}
      {showImport && (
        <Card className="bg-card-gradient border-border mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> Auto-parse character notes
            </CardTitle>
            <CardDescription className="text-xs">
              Paste anything you have. We'll fill the steps for you, then drop you on the review screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={6}
              value={draft.rawNotes}
              onChange={(e) => update({ rawNotes: e.target.value })}
              placeholder="Bios, ability lists, personality notes, scattered scraps. Messy is fine."
              className="font-mono text-xs"
              disabled={isParsing}
            />
            <Button
              onClick={handleParseImport}
              disabled={isParsing || !draft.rawNotes.trim()}
              className="w-full glow-primary"
            >
              {isParsing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parsing…</>
                : <><Wand2 className="w-4 h-4 mr-2" /> Auto-parse and review</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step content */}
      <Card className="bg-card-gradient border-border">
        <CardContent className="p-5 md:p-6">
          {draft.step === 1 && <StepBasics draft={draft} update={update} />}
          {draft.step === 2 && <StepIdentity draft={draft} update={update} />}
          {draft.step === 3 && <StepPersonality draft={draft} update={update} />}
          {draft.step === 4 && <StepPowers draft={draft} update={update} />}
          {draft.step === 5 && <StepLore draft={draft} update={update} />}
          {draft.step === 6 && <StepReview draft={draft} goTo={goTo} />}
        </CardContent>
      </Card>

      {/* Nav */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={prev} disabled={draft.step === 1}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDiscard} className="text-destructive">
            Discard
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success('Draft saved on this device.')}
          >
            <Save className="w-4 h-4 mr-1" /> Save draft
          </Button>
          {draft.step < 6 ? (
            <Button size="sm" onClick={next} className="glow-primary">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="glow-primary">
              {isSaving
                ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-4 h-4 mr-1" /> Finish & save</>}
            </Button>
          )}
        </div>
      </div>

      <div className="text-center mt-6 text-xs text-muted-foreground">
        Want every field at once?{' '}
        <button
          type="button"
          onClick={() => navigate('/characters/new?advanced=1')}
          className="underline hover:text-primary inline-flex items-center gap-1"
        >
          <Settings2 className="w-3 h-3" /> Open the advanced editor
        </button>
      </div>
    </div>
  );
}

/* ───────── Step components ───────── */

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function Field({
  label, hint, children, optional,
}: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide flex items-center gap-2">
        {label}
        {optional && <Badge variant="outline" className="text-[9px] py-0">optional</Badge>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StepBasics({
  draft, update,
}: { draft: GuidedCharacterDraft; update: (p: Partial<GuidedCharacterDraft>) => void }) {
  return (
    <FieldGroup>
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Character basics</h2>
        <p className="text-xs text-muted-foreground">Who is this character, in one breath?</p>
      </div>
      <Field label="Character name" hint="The name they're best known by.">
        <Input value={draft.name} onChange={(e) => update({ name: e.target.value })}
               placeholder="e.g. Kael, the Wandering Star" />
      </Field>
      <Field label="Nickname or title" optional>
        <Input value={draft.nickname} onChange={(e) => update({ nickname: e.target.value })}
               placeholder="The Ashbringer, Captain, Kid…" />
      </Field>
      <Field label="Universe / story / world" optional>
        <Input value={draft.universe} onChange={(e) => update({ universe: e.target.value })}
               placeholder="My original world, a fanfic, a campaign setting…" />
      </Field>
      <Field label="Short description" optional hint="One or two sentences.">
        <Textarea rows={3} value={draft.shortDescription}
                  onChange={(e) => update({ shortDescription: e.target.value })}
                  placeholder="A reckless ex-knight who drinks like he's running from something." />
      </Field>
    </FieldGroup>
  );
}

function StepIdentity({
  draft, update,
}: { draft: GuidedCharacterDraft; update: (p: Partial<GuidedCharacterDraft>) => void }) {
  return (
    <FieldGroup>
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Identity & appearance</h2>
        <p className="text-xs text-muted-foreground">What do people see when they meet them?</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Age" optional>
          <Input value={draft.age} onChange={(e) => update({ age: e.target.value })} placeholder="27" />
        </Field>
        <Field label="Sex / gender" optional>
          <Input value={draft.sex} onChange={(e) => update({ sex: e.target.value })} placeholder="Male, Female, Non-binary…" />
        </Field>
        <Field label="Species / race" optional>
          <Input value={draft.race} onChange={(e) => update({ race: e.target.value })} placeholder="Human, Dragonborn, Synthetic…" />
        </Field>
        <Field label="Sub-race / clan" optional>
          <Input value={draft.sub_race} onChange={(e) => update({ sub_race: e.target.value })} placeholder="High Elf, Lunar Wolf…" />
        </Field>
      </div>
      <Field label="Visual appearance" optional hint="Hair, eyes, build, distinct features.">
        <Textarea rows={4} value={draft.appearance_description}
                  onChange={(e) => update({ appearance_description: e.target.value })}
                  placeholder="Tall, sharp green eyes, jagged scar across the left cheek." />
      </Field>
      <Field label="Style / clothing" optional>
        <Textarea rows={2} value={draft.appearance_clothing_style}
                  onChange={(e) => update({ appearance_clothing_style: e.target.value })}
                  placeholder="Worn leather coat, scuffed boots, silver pendant they never take off." />
      </Field>
    </FieldGroup>
  );
}

function StepPersonality({
  draft, update,
}: { draft: GuidedCharacterDraft; update: (p: Partial<GuidedCharacterDraft>) => void }) {
  return (
    <FieldGroup>
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><Smile className="w-4 h-4 text-primary" /> Personality & role</h2>
        <p className="text-xs text-muted-foreground">What drives them — and what holds them back?</p>
      </div>
      <Field label="Personality" hint="Quirks, attitude, voice. A few sentences is great.">
        <Textarea rows={4} value={draft.personality}
                  onChange={(e) => update({ personality: e.target.value })}
                  placeholder="Sarcastic, slow to trust, fiercely loyal once they do." />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Goals & motives" optional>
          <Textarea rows={3} value={draft.goals} onChange={(e) => update({ goals: e.target.value })}
                    placeholder="Find their missing sister." />
        </Field>
        <Field label="Fears & flaws" optional>
          <Textarea rows={3} value={draft.fears} onChange={(e) => update({ fears: e.target.value })}
                    placeholder="Terrified of being alone. Drinks too much." />
        </Field>
      </div>
      <Field label="Role / archetype" optional hint="The hero, the cynic, the mentor, the wildcard…">
        <Input value={draft.archetype} onChange={(e) => update({ archetype: e.target.value })}
               placeholder="Reluctant protector" />
      </Field>
      <Field label="Relationships" optional hint="Family, rivals, allies, complicated exes.">
        <Textarea rows={3} value={draft.relationships}
                  onChange={(e) => update({ relationships: e.target.value })}
                  placeholder="Older brother to Mira. Sworn enemy of the Iron Hand." />
      </Field>
    </FieldGroup>
  );
}

function StepPowers({
  draft, update,
}: { draft: GuidedCharacterDraft; update: (p: Partial<GuidedCharacterDraft>) => void }) {
  return (
    <FieldGroup>
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /> Powers, skills & limits</h2>
        <p className="text-xs text-muted-foreground">What they can do — and what stops them.</p>
      </div>
      <Field label="Powers / abilities" optional>
        <Textarea rows={4} value={draft.powers}
                  onChange={(e) => update({ powers: e.target.value })}
                  placeholder="Pyrokinesis, can shape flame into solid blades for short bursts." />
      </Field>
      <Field label="Skills / talents" optional hint="Non-magical things they're good at.">
        <Textarea rows={3} value={draft.abilities}
                  onChange={(e) => update({ abilities: e.target.value })}
                  placeholder="Master swordsman, fluent in three languages, decent cook." />
      </Field>
      <Field label="Weapons / tools" optional>
        <Textarea rows={3} value={draft.weapons_items}
                  onChange={(e) => update({ weapons_items: e.target.value })}
                  placeholder="Twin curved daggers; an old service revolver; a coin from their mother." />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Weaknesses / limits" optional>
          <Textarea rows={3} value={draft.weaknesses}
                    onChange={(e) => update({ weaknesses: e.target.value })}
                    placeholder="Cold water snuffs their flame. Asthmatic." />
        </Field>
        <Field label="Battle style" optional>
          <Textarea rows={3} value={draft.battle_style}
                    onChange={(e) => update({ battle_style: e.target.value })}
                    placeholder="Aggressive, hit-and-run. Prefers to end fights fast." />
        </Field>
      </div>
    </FieldGroup>
  );
}

function StepLore({
  draft, update,
}: { draft: GuidedCharacterDraft; update: (p: Partial<GuidedCharacterDraft>) => void }) {
  return (
    <FieldGroup>
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Backstory & lore</h2>
        <p className="text-xs text-muted-foreground">Where they come from. As much or as little as you have.</p>
      </div>
      <Field label="Origin / backstory" optional>
        <Textarea rows={5} value={draft.lore} onChange={(e) => update({ lore: e.target.value })}
                  placeholder="Born in the river-city of Vael during the long winter…" />
      </Field>
      <Field label="Important events" optional>
        <Textarea rows={3} value={draft.important_events}
                  onChange={(e) => update({ important_events: e.target.value })}
                  placeholder="Survived the Ash Riots at 15. Lost their mentor at 22." />
      </Field>
      <Field label="Factions / groups" optional>
        <Textarea rows={2} value={draft.factions}
                  onChange={(e) => update({ factions: e.target.value })}
                  placeholder="Ex-member of the Nightwatch. Currently on bad terms with the Crimson Court." />
      </Field>
      <Field label="Worldbuilding notes" optional>
        <Textarea rows={3} value={draft.worldbuilding_notes}
                  onChange={(e) => update({ worldbuilding_notes: e.target.value })}
                  placeholder="Magic in this world is tied to lineage; about 1 in 50 people can use it." />
      </Field>
      <Field label="Extra notes" optional>
        <Textarea rows={3} value={draft.extra_notes}
                  onChange={(e) => update({ extra_notes: e.target.value })}
                  placeholder="Anything else worth saving for later." />
      </Field>
    </FieldGroup>
  );
}

function StepReview({
  draft, goTo,
}: { draft: GuidedCharacterDraft; goTo: (s: GuidedCharacterDraft['step']) => void }) {
  const sections: Array<{ step: GuidedCharacterDraft['step']; title: string; entries: Array<[string, string]> }> = [
    { step: 1, title: 'Basics', entries: [
      ['Name', draft.name],
      ['Nickname', draft.nickname],
      ['Universe', draft.universe],
      ['Description', draft.shortDescription],
    ]},
    { step: 2, title: 'Identity', entries: [
      ['Age', draft.age],
      ['Sex', draft.sex],
      ['Race', draft.race],
      ['Sub-race', draft.sub_race],
      ['Appearance', draft.appearance_description],
      ['Style', draft.appearance_clothing_style],
    ]},
    { step: 3, title: 'Personality', entries: [
      ['Personality', draft.personality],
      ['Goals', draft.goals],
      ['Fears', draft.fears],
      ['Archetype', draft.archetype],
      ['Relationships', draft.relationships],
    ]},
    { step: 4, title: 'Powers', entries: [
      ['Powers', draft.powers],
      ['Skills', draft.abilities],
      ['Weapons', draft.weapons_items],
      ['Weaknesses', draft.weaknesses],
      ['Battle style', draft.battle_style],
    ]},
    { step: 5, title: 'Backstory', entries: [
      ['Origin', draft.lore],
      ['Events', draft.important_events],
      ['Factions', draft.factions],
      ['Worldbuilding', draft.worldbuilding_notes],
      ['Extra', draft.extra_notes],
    ]},
  ];

  const hasName = draft.name.trim().length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Review your character</h2>
        <p className="text-xs text-muted-foreground">Looks good? Hit "Finish & save" below. Want to tweak something? Tap any section.</p>
      </div>

      {!hasName && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Your character needs a name.</p>
            <p className="text-xs text-muted-foreground">Jump back to step 1 to add one.</p>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {sections.map((sec) => {
          const filled = sec.entries.filter(([, v]) => v.trim());
          return (
            <button
              key={sec.step}
              type="button"
              onClick={() => goTo(sec.step)}
              className="w-full text-left rounded-lg border border-border bg-background/40 p-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs uppercase tracking-wide font-semibold text-primary">
                  Step {sec.step} · {sec.title}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {filled.length}/{sec.entries.length} filled
                </span>
              </div>
              {filled.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nothing here yet — tap to add.</p>
              ) : (
                <div className="space-y-1">
                  {filled.map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <span className="text-muted-foreground">{k}: </span>
                      <span className="text-foreground line-clamp-2">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
