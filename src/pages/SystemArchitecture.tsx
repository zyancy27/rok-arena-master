import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Users,
  Swords,
  Map as MapIcon,
  MessageSquare,
  Database,
  Server,
  Shield,
  Sparkles,
  Cpu,
  Globe,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

/* ----------------------------- DATA MODEL ----------------------------- */

type Module = {
  id: string;
  label: string;
  icon: LucideIcon;
  group: 'frontend' | 'engine' | 'edge' | 'db' | 'auth' | 'external';
  description: string;
  files?: string[];
  tables?: string[];
};

const MODULES: Module[] = [
  // Frontend pages
  { id: 'landing', label: 'Landing / Onboarding', icon: Globe, group: 'frontend',
    description: 'Public landing page with the 5-step guest onboarding flow for logged-out visitors.',
    files: ['src/pages/Landing.tsx', 'src/components/onboarding/GuestOnboarding.tsx'] },
  { id: 'hub', label: 'Hub', icon: Sparkles, group: 'frontend',
    description: 'Authenticated home: navigation entry to characters, battles, campaigns, friends.',
    files: ['src/pages/Hub.tsx'] },
  { id: 'character-create', label: 'Character Creation (Guided)', icon: Users, group: 'frontend',
    description: '6-step guided wizard. Legacy form available via ?advanced=1.',
    files: ['src/pages/CreateCharacter.tsx', 'src/components/onboarding/GuidedCreateCharacter.tsx'] },
  { id: 'campaign-view', label: 'Campaign View', icon: MapIcon, group: 'frontend',
    description: 'Immersive campaign UI: chat, HUD, scene recap, tactical map, response suggestions.',
    files: ['src/pages/CampaignView.tsx'] },
  { id: 'battle-view', label: 'Battle View', icon: Swords, group: 'frontend',
    description: 'PvP / PvE / EvE / PvPvP battle interface with tactical map and turn HUD.',
    files: ['src/pages/BattleView.tsx'] },

  // Engine layer
  { id: 'battle-brain', label: 'Comprehensive Battle Brain', icon: Cpu, group: 'engine',
    description: 'Context-mode dispatcher (PvP/PvE/EvE/Campaign Exploration). Owns rules, momentum, psychology.',
    files: ['src/engine/battleBrain/'] },
  { id: 'intent-engine', label: 'Intent Engine', icon: Brain, group: 'engine',
    description: 'Pre-narrative interpreter that normalizes raw input into structured intents.',
    files: ['src/engine/intent/'] },
  { id: 'biome-composer', label: 'Biome / Urban Composer', icon: MapIcon, group: 'engine',
    description: 'Procedural arena generation, normalized 3-layer map, terrain mutation.',
    files: ['src/engine/biomeComposer/', 'src/engine/urbanComposer/', 'src/lib/map/'] },
  { id: 'scenario-brain', label: 'Scenario Brain', icon: Sparkles, group: 'engine',
    description: 'Blueprint selection, danger taxonomy, emergency scenario composition.',
    files: ['src/engine/scenarioBrain/'] },
  { id: 'narrator', label: 'Narrator / Story Orchestrator', icon: MessageSquare, group: 'engine',
    description: 'Single Narrator Intelligence — scene beats, hooks, pressure, lore consistency.',
    files: ['src/lib/story-orchestrator.ts', 'src/systems/'] },

  // Edge functions
  { id: 'fn-story', label: 'story-orchestrator', icon: Server, group: 'edge',
    description: 'AI Gateway entrypoint for campaign turns: intent → roll → narration.' },
  { id: 'fn-battle', label: 'battle-narrator', icon: Server, group: 'edge',
    description: 'Battle narration with item enforcement and outcome bands.' },
  { id: 'fn-parse-notes', label: 'parse-character-notes', icon: Server, group: 'edge',
    description: 'AI parsing of pasted character notes (auth optional for guest onboarding).' },
  { id: 'fn-tts', label: 'narrator-tts + ambient-sfx', icon: Server, group: 'edge',
    description: 'Voice synthesis and procedural ambient sound generation.' },
  { id: 'fn-stripe', label: 'create-checkout / donation / portal', icon: CreditCard, group: 'edge',
    description: 'Stripe subscription checkout, donations, and customer portal sessions.' },
  { id: 'fn-3d', label: 'trigger-3d-generation', icon: Cpu, group: 'edge',
    description: 'Asynchronous character 3D model generation pipeline.' },

  // Database clusters
  { id: 'db-characters', label: 'Characters Cluster', icon: Database, group: 'db',
    description: 'Character identity, sections, timeline, AI notes, constructs, 3D configs, images.',
    tables: ['characters', 'character_sections', 'character_timeline_events', 'character_ai_notes',
      'character_constructs', 'character_groups', 'character_3d_configs', 'character_images'] },
  { id: 'db-campaigns', label: 'Campaigns Cluster', icon: Database, group: 'db',
    description: 'Campaign brain, NPCs, participants, location state, messages, trades, turn logs.',
    tables: ['campaigns', 'campaign_brain', 'campaign_npcs', 'campaign_participants',
      'campaign_messages', 'campaign_inventory', 'campaign_trades', 'campaign_enemies',
      'campaign_location_state', 'campaign_logs', 'campaign_turn_logs', 'campaign_join_requests'] },
  { id: 'db-battles', label: 'Battles Cluster', icon: Database, group: 'db',
    description: 'Battles, participants, messages, invitations.',
    tables: ['battles', 'battle_participants', 'battle_messages', 'battle_invitations'] },
  { id: 'db-social', label: 'Social & Community', icon: Database, group: 'db',
    description: 'Profiles, friends, suggestions + upvotes.',
    tables: ['profiles', 'friends', 'suggestions', 'suggestion_votes'] },
  { id: 'db-auth', label: 'Auth & Roles', icon: Shield, group: 'auth',
    description: 'Supabase auth.users + public.user_roles (admin / moderator / user).',
    tables: ['auth.users', 'user_roles'] },

  // External
  { id: 'ext-ai', label: 'Lovable AI Gateway', icon: Brain, group: 'external',
    description: 'Multi-model gateway (Gemini, GPT-5 family) with fallback + cost optimization.' },
  { id: 'ext-stripe', label: 'Stripe', icon: CreditCard, group: 'external',
    description: 'Subscriptions, donations, and customer portal.' },
];

type Edge = { from: string; to: string; label?: string };

const EDGES: Edge[] = [
  // Onboarding flow
  { from: 'landing', to: 'fn-parse-notes', label: 'parse notes' },
  { from: 'landing', to: 'db-auth', label: 'sign up' },
  { from: 'landing', to: 'db-characters', label: 'save draft' },

  // Character creation
  { from: 'hub', to: 'character-create' },
  { from: 'character-create', to: 'fn-parse-notes' },
  { from: 'character-create', to: 'db-characters' },
  { from: 'character-create', to: 'fn-3d' },

  // Campaign flow
  { from: 'hub', to: 'campaign-view' },
  { from: 'campaign-view', to: 'intent-engine' },
  { from: 'intent-engine', to: 'narrator' },
  { from: 'narrator', to: 'fn-story' },
  { from: 'fn-story', to: 'ext-ai' },
  { from: 'fn-story', to: 'db-campaigns' },
  { from: 'campaign-view', to: 'biome-composer', label: '3D map' },
  { from: 'campaign-view', to: 'fn-tts' },

  // Battle flow
  { from: 'hub', to: 'battle-view' },
  { from: 'battle-view', to: 'battle-brain' },
  { from: 'battle-brain', to: 'scenario-brain' },
  { from: 'battle-brain', to: 'biome-composer' },
  { from: 'battle-view', to: 'fn-battle' },
  { from: 'fn-battle', to: 'ext-ai' },
  { from: 'fn-battle', to: 'db-battles' },

  // Auth gates everything
  { from: 'db-auth', to: 'hub' },

  // Monetization
  { from: 'hub', to: 'fn-stripe' },
  { from: 'fn-stripe', to: 'ext-stripe' },
];

/* ----------------------------- LAYOUT ----------------------------- */

// Hand-tuned column layout: frontend → engine → edge → db, plus auth & external.
const COLUMNS: Record<Module['group'], { x: number; title: string }> = {
  frontend: { x: 80, title: 'Frontend Pages' },
  engine: { x: 360, title: 'Engine Layer' },
  edge: { x: 660, title: 'Edge Functions' },
  db: { x: 960, title: 'Database' },
  auth: { x: 960, title: 'Auth' },
  external: { x: 1240, title: 'External' },
};

const NODE_W = 220;
const NODE_H = 64;
const ROW_H = 86;

function buildPositions() {
  const groups: Record<Module['group'], Module[]> = {
    frontend: [], engine: [], edge: [], db: [], auth: [], external: [],
  };
  MODULES.forEach((m) => groups[m.group].push(m));

  const positions: Record<string, { x: number; y: number }> = {};

  // Place db + auth in the same column, stacked
  const dbStack = [...groups.db, ...groups.auth];

  const place = (list: Module[], x: number, startY = 80) => {
    list.forEach((m, i) => {
      positions[m.id] = { x, y: startY + i * ROW_H };
    });
  };

  place(groups.frontend, COLUMNS.frontend.x);
  place(groups.engine, COLUMNS.engine.x);
  place(groups.edge, COLUMNS.edge.x);
  place(dbStack, COLUMNS.db.x);
  place(groups.external, COLUMNS.external.x);

  return positions;
}

const GROUP_STYLES: Record<Module['group'], { stroke: string; fill: string; text: string }> = {
  frontend: { stroke: 'hsl(var(--primary))', fill: 'hsl(var(--primary) / 0.12)', text: 'hsl(var(--primary))' },
  engine: { stroke: 'hsl(var(--accent))', fill: 'hsl(var(--accent) / 0.12)', text: 'hsl(var(--accent))' },
  edge: { stroke: 'hsl(var(--secondary-foreground))', fill: 'hsl(var(--secondary) / 0.6)', text: 'hsl(var(--secondary-foreground))' },
  db: { stroke: 'hsl(var(--chart-3, var(--primary)))', fill: 'hsl(var(--muted) / 0.6)', text: 'hsl(var(--foreground))' },
  auth: { stroke: 'hsl(var(--destructive))', fill: 'hsl(var(--destructive) / 0.12)', text: 'hsl(var(--destructive))' },
  external: { stroke: 'hsl(var(--muted-foreground))', fill: 'hsl(var(--muted) / 0.4)', text: 'hsl(var(--muted-foreground))' },
};

/* ----------------------------- DIAGRAM ----------------------------- */

function ArchitectureDiagram({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const positions = useMemo(buildPositions, []);
  const [hover, setHover] = useState<string | null>(null);

  const maxY = Math.max(...Object.values(positions).map((p) => p.y)) + NODE_H + 60;
  const width = 1500;
  const height = Math.max(maxY, 720);

  const isHighlighted = (edge: Edge) => {
    const focus = hover ?? selected;
    if (!focus) return false;
    return edge.from === focus || edge.to === focus;
  };

  const isDimmed = (id: string) => {
    const focus = hover ?? selected;
    if (!focus) return false;
    if (id === focus) return false;
    return !EDGES.some(
      (e) => (e.from === focus && e.to === id) || (e.to === focus && e.from === id),
    );
  };

  return (
    <ScrollArea className="w-full rounded-lg border border-border bg-card/40">
      <svg
        width={width}
        height={height}
        className="block"
        onClick={() => onSelect(null)}
      >
        {/* Column headers */}
        {(Object.entries(COLUMNS) as [Module['group'], { x: number; title: string }][])
          .filter(([g]) => g !== 'auth') // auth shares db column
          .map(([g, col]) => (
            <text
              key={g}
              x={col.x + NODE_W / 2}
              y={40}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}
            >
              {col.title}
            </text>
          ))}

        {/* Edges */}
        {EDGES.map((edge, i) => {
          const a = positions[edge.from];
          const b = positions[edge.to];
          if (!a || !b) return null;
          const x1 = a.x + NODE_W;
          const y1 = a.y + NODE_H / 2;
          const x2 = b.x;
          const y2 = b.y + NODE_H / 2;
          const mx = (x1 + x2) / 2;
          const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          const highlighted = isHighlighted(edge);
          const focus = hover ?? selected;
          const dim = focus && !highlighted;
          return (
            <g key={i} style={{ opacity: dim ? 0.12 : 1, transition: 'opacity 200ms' }}>
              <path
                d={path}
                fill="none"
                stroke={highlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                strokeWidth={highlighted ? 2 : 1.2}
              />
              {edge.label && highlighted && (
                <text
                  x={mx}
                  y={(y1 + y2) / 2 - 4}
                  textAnchor="middle"
                  className="fill-primary"
                  style={{ fontSize: 11 }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {MODULES.map((m) => {
          const pos = positions[m.id];
          if (!pos) return null;
          const style = GROUP_STYLES[m.group];
          const focus = hover ?? selected;
          const isFocus = focus === m.id;
          const dim = isDimmed(m.id);
          return (
            <g
              key={m.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{
                cursor: 'pointer',
                opacity: dim ? 0.25 : 1,
                transition: 'opacity 200ms',
              }}
              onMouseEnter={() => setHover(m.id)}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(m.id === selected ? null : m.id);
              }}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={isFocus ? 2.5 : 1.2}
              />
              <foreignObject x={12} y={10} width={NODE_W - 24} height={NODE_H - 20}>
                <div className="flex items-center gap-2 h-full">
                  <m.icon className="w-5 h-5 shrink-0" style={{ color: style.text }} />
                  <div
                    className="text-sm font-medium leading-tight"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {m.label}
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </ScrollArea>
  );
}

/* ----------------------------- USER FLOWS ----------------------------- */

const FLOWS: { title: string; steps: { label: string; nodes: string[] }[] }[] = [
  {
    title: 'Guest → First Character → Account',
    steps: [
      { label: 'Visitor lands on /', nodes: ['landing'] },
      { label: 'Pastes notes, AI parses', nodes: ['fn-parse-notes', 'ext-ai'] },
      { label: 'Reviews draft (sessionStorage)', nodes: ['landing'] },
      { label: 'Creates account', nodes: ['db-auth'] },
      { label: 'Draft saved as character', nodes: ['db-characters'] },
    ],
  },
  {
    title: 'Authenticated Campaign Turn',
    steps: [
      { label: 'Player types action', nodes: ['campaign-view'] },
      { label: 'Intent engine normalizes', nodes: ['intent-engine'] },
      { label: 'Story orchestrator runs roll + narration', nodes: ['narrator', 'fn-story', 'ext-ai'] },
      { label: 'Brain + NPCs persisted', nodes: ['db-campaigns'] },
      { label: 'Map mutates if needed', nodes: ['biome-composer'] },
    ],
  },
  {
    title: 'Battle Resolution',
    steps: [
      { label: 'Player submits move', nodes: ['battle-view'] },
      { label: 'Battle Brain resolves rules', nodes: ['battle-brain'] },
      { label: 'Scenario + map context', nodes: ['scenario-brain', 'biome-composer'] },
      { label: 'AI narrates outcome', nodes: ['fn-battle', 'ext-ai'] },
      { label: 'Messages + state stored', nodes: ['db-battles'] },
    ],
  },
  {
    title: 'Subscription / Donation',
    steps: [
      { label: 'User opens Membership', nodes: ['hub'] },
      { label: 'Edge function creates session', nodes: ['fn-stripe'] },
      { label: 'Stripe Checkout', nodes: ['ext-stripe'] },
      { label: 'Webhook updates roles/subscription', nodes: ['db-auth'] },
    ],
  },
];

/* ----------------------------- PAGE ----------------------------- */

export default function SystemArchitecture() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedModule = MODULES.find((m) => m.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-glow flex items-center gap-2">
            <Cpu className="w-7 h-7 text-primary" />
            System Architecture
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            A live map of every major module, edge function, and database cluster — and how they
            talk to each other. Click any node to inspect, or hover to highlight its connections.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['frontend', 'engine', 'edge', 'db', 'auth', 'external'] as const).map((g) => (
            <Badge
              key={g}
              variant="outline"
              className="capitalize"
              style={{
                borderColor: GROUP_STYLES[g].stroke,
                color: GROUP_STYLES[g].text,
                background: GROUP_STYLES[g].fill,
              }}
            >
              {g}
            </Badge>
          ))}
        </div>
      </div>

      <Tabs defaultValue="diagram" className="w-full">
        <TabsList>
          <TabsTrigger value="diagram">Diagram</TabsTrigger>
          <TabsTrigger value="flows">User Flows</TabsTrigger>
          <TabsTrigger value="tables">Database Tables</TabsTrigger>
        </TabsList>

        <TabsContent value="diagram" className="space-y-4">
          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <ArchitectureDiagram selected={selected} onSelect={setSelected} />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedModule ? selectedModule.label : 'Inspector'}
                </CardTitle>
                <CardDescription>
                  {selectedModule
                    ? `Group: ${selectedModule.group}`
                    : 'Click a node to inspect its files, tables, and role.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {selectedModule ? (
                  <>
                    <p className="text-muted-foreground">{selectedModule.description}</p>
                    {selectedModule.files && (
                      <div>
                        <div className="font-medium mb-1">Files</div>
                        <ul className="space-y-1">
                          {selectedModule.files.map((f) => (
                            <li key={f} className="font-mono text-xs text-muted-foreground break-all">
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedModule.tables && (
                      <div>
                        <div className="font-medium mb-1">Tables</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedModule.tables.map((t) => (
                            <Badge key={t} variant="secondary" className="font-mono text-xs">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Hover any node to see its connections light up. Click to pin details here.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {FLOWS.map((flow) => (
              <Card key={flow.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{flow.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {flow.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">{step.label}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {step.nodes.map((n) => {
                              const m = MODULES.find((x) => x.id === n);
                              if (!m) return null;
                              return (
                                <button
                                  key={n}
                                  onClick={() => setSelected(n)}
                                  className="text-xs px-2 py-0.5 rounded border hover:bg-accent transition-colors"
                                  style={{
                                    borderColor: GROUP_STYLES[m.group].stroke,
                                    color: GROUP_STYLES[m.group].text,
                                  }}
                                >
                                  {m.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.filter((m) => m.tables).map((m) => (
              <Card key={m.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <m.icon className="w-4 h-4" style={{ color: GROUP_STYLES[m.group].text }} />
                    {m.label}
                  </CardTitle>
                  <CardDescription className="text-xs">{m.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {m.tables!.map((t) => (
                      <Badge key={t} variant="secondary" className="font-mono text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
