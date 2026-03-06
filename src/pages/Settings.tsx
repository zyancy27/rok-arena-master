import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/hooks/use-user-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AudioTab } from '@/components/settings/AudioTab';
import { VisualTab } from '@/components/settings/VisualTab';
import { PerformanceTab } from '@/components/settings/PerformanceTab';
import { BattleTab } from '@/components/settings/BattleTab';
import { ImmersionTab } from '@/components/settings/ImmersionTab';
import { AITab } from '@/components/settings/AITab';
import { SocialTab } from '@/components/settings/SocialTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { DataAccountTab } from '@/components/settings/DataAccountTab';
import { AccessibilityTab } from '@/components/settings/AccessibilityTab';
import { DeveloperTab } from '@/components/settings/DeveloperTab';
import { Settings as SettingsIcon, Volume2, Eye, Zap, Swords, Theater, Bot, Users, Bell, Database, Accessibility, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TABS = [
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'visual', label: 'Visual', icon: Eye },
  { id: 'performance', label: 'Performance', icon: Zap },
  { id: 'battle', label: 'Battle', icon: Swords },
  { id: 'immersion', label: 'RP & Immersion', icon: Theater },
  { id: 'ai', label: 'Opponents (PvE)', icon: Bot },
  { id: 'social', label: 'Social & Privacy', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data & Account', icon: Database },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
];

export default function Settings() {
  const { isAdmin } = useAuth();
  const { settings, loading, saving, updateSettings, resetCategory, resetAll } = useUserSettings();

  const allTabs = isAdmin ? [...TABS, { id: 'developer', label: 'Developer', icon: Wrench }] : TABS;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        {saving && <Badge variant="secondary" className="animate-pulse text-xs">Saving...</Badge>}
      </div>

      <Tabs defaultValue="audio" className="w-full">
        <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
          <TabsList className="flex w-max gap-1 bg-muted/50 p-1 mb-4">
            {allTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs whitespace-nowrap px-3 py-1.5">
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="audio">
          <AudioTab settings={settings.audio} onChange={u => updateSettings('audio', u)} onReset={() => resetCategory('audio')} />
        </TabsContent>
        <TabsContent value="visual">
          <VisualTab settings={settings.visual} onChange={u => updateSettings('visual', u)} onReset={() => resetCategory('visual')} />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceTab settings={settings.performance} onChange={u => updateSettings('performance', u)} onReset={() => resetCategory('performance')} />
        </TabsContent>
        <TabsContent value="battle">
          <BattleTab settings={settings.battle} onChange={u => updateSettings('battle', u)} onReset={() => resetCategory('battle')} />
        </TabsContent>
        <TabsContent value="immersion">
          <ImmersionTab settings={settings.immersion} onChange={u => updateSettings('immersion', u)} onReset={() => resetCategory('immersion')} />
        </TabsContent>
        <TabsContent value="ai">
          <AITab settings={settings.ai} onChange={u => updateSettings('ai', u)} onReset={() => resetCategory('ai')} />
        </TabsContent>
        <TabsContent value="social">
          <SocialTab settings={settings.social} onChange={u => updateSettings('social', u)} onReset={() => resetCategory('social')} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab settings={settings.notifications} onChange={u => updateSettings('notifications', u)} onReset={() => resetCategory('notifications')} />
        </TabsContent>
        <TabsContent value="data">
          <DataAccountTab onResetAll={resetAll} />
        </TabsContent>
        <TabsContent value="accessibility">
          <AccessibilityTab settings={settings.accessibility} onChange={u => updateSettings('accessibility', u)} onReset={() => resetCategory('accessibility')} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="developer">
            <DeveloperTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
