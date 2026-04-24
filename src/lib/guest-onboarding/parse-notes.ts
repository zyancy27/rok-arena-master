import { supabase } from '@/integrations/supabase/client';
import type { ParsedCharacterDraft } from './draft-store';

/**
 * Calls the parse-character-notes edge function. Works for both guests
 * (no auth) and authenticated users (passes Bearer token if present).
 *
 * Returns the first parsed character + any text the parser couldn't bucket
 * placed into `unsorted_notes` so the user can review it manually.
 */
export async function parseGuestNotes(
  notes: string,
): Promise<ParsedCharacterDraft> {
  const trimmed = notes.trim();
  if (!trimmed) {
    throw new Error('Please paste some character notes first.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-character-notes`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ notes: trimmed, multi: true }),
    },
  );

  if (!response.ok) {
    let message = 'Failed to parse character notes.';
    try {
      const err = await response.json();
      if (err?.error) message = err.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const result = await response.json();
  // Edge function returns either { characters: [...] } (multi) or { data: {...} } (single)
  const first =
    (result?.characters && result.characters[0]) || result?.data || null;

  if (!first) {
    throw new Error("We couldn't recognize a character in those notes. Try adding a name or more detail.");
  }

  // Heuristic "unsorted notes" bucket: lines from the input that don't appear
  // verbatim in any parsed field. Conservative — only flags clearly orphaned text.
  const parsedBlob = [
    first.name, first.race, first.sub_race, first.age, first.home_planet,
    first.home_moon, first.powers, first.abilities, first.weapons_items,
    first.personality, first.mentality, first.lore,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const orphanLines: string[] = [];
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length < 12) continue; // skip headers / single words
    const tokens = line
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 4);
    if (tokens.length === 0) continue;
    const matched = tokens.filter((t) => parsedBlob.includes(t)).length;
    // Less than 25% of meaningful words appear anywhere in parsed output → orphan
    if (matched / tokens.length < 0.25) {
      orphanLines.push(line);
    }
  }

  return {
    name: first.name ?? undefined,
    race: first.race ?? undefined,
    sub_race: first.sub_race ?? undefined,
    age: first.age ? String(first.age) : undefined,
    home_planet: first.home_planet ?? undefined,
    home_moon: first.home_moon ?? undefined,
    powers: first.powers ?? undefined,
    abilities: first.abilities ?? undefined,
    weapons_items: first.weapons_items ?? undefined,
    personality: first.personality ?? undefined,
    mentality: first.mentality ?? undefined,
    lore: first.lore ?? undefined,
    level: typeof first.level === 'number' ? first.level : undefined,
    unsorted_notes: orphanLines.length ? orphanLines.join('\n') : undefined,
  };
}
