import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserSettings, DEFAULT_SETTINGS } from '@/lib/settings-defaults';
import { toast } from 'sonner';

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.settings) {
        setSettings(mergeWithDefaults(data.settings as Partial<UserSettings>));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const mergeWithDefaults = (partial: Partial<UserSettings>): UserSettings => {
    const merged = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof UserSettings)[]) {
      if (partial[key]) {
        (merged as any)[key] = { ...(DEFAULT_SETTINGS as any)[key], ...(partial as any)[key] };
      }
    }
    return merged;
  };

  const updateSettings = useCallback(async <K extends keyof UserSettings>(
    category: K,
    updates: Partial<UserSettings[K]>
  ) => {
    if (!user) return;

    const newSettings = {
      ...settings,
      [category]: { ...settings[category], ...updates },
    };
    setSettings(newSettings);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: newSettings as any,
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [user, settings]);

  const resetCategory = useCallback(async (category: keyof UserSettings) => {
    if (!user) return;
    const newSettings = {
      ...settings,
      [category]: DEFAULT_SETTINGS[category],
    };
    setSettings(newSettings);

    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: newSettings as any,
        }, { onConflict: 'user_id' });
      toast.success(`${category} settings reset to defaults`);
    } catch {
      toast.error('Failed to reset settings');
    }
  }, [user, settings]);

  const resetAll = useCallback(async () => {
    if (!user) return;
    setSettings(DEFAULT_SETTINGS);
    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: DEFAULT_SETTINGS as any,
        }, { onConflict: 'user_id' });
      toast.success('All settings reset to defaults');
    } catch {
      toast.error('Failed to reset settings');
    }
  }, [user]);

  return { settings, loading, saving, updateSettings, resetCategory, resetAll };
}
