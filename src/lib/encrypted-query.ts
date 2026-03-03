import { supabase } from '@/integrations/supabase/client';

const DECRYPTED_TABLES: Record<string, string> = {
  characters: 'characters_decrypted',
  stories: 'stories_decrypted',
  story_chapters: 'story_chapters_decrypted',
  character_sections: 'character_sections_decrypted',
  character_ai_notes: 'character_ai_notes_decrypted',
  character_constructs: 'character_constructs_decrypted',
  races: 'races_decrypted',
  sub_races: 'sub_races_decrypted',
};

export type DecryptedTable = keyof typeof DECRYPTED_TABLES;

/**
 * Query from a decrypted view. Use for SELECT queries needing encrypted fields.
 * Writes (insert/update/delete) should still use supabase.from('tablename') directly.
 */
export function fromDecrypted(table: string): any {
  return supabase.from((DECRYPTED_TABLES[table] || table) as any);
}
