import { getTierName } from './game-constants';
import { CHARACTER_STATS, type CharacterStats } from './character-stats';

interface CharacterData {
  name: string;
  level: number;
  race?: string | null;
  sub_race?: string | null;
  home_planet?: string | null;
  age?: number | null;
  lore?: string | null;
  powers?: string | null;
  abilities?: string | null;
  personality?: string | null;
  mentality?: string | null;
  stat_intelligence?: number | null;
  stat_strength?: number | null;
  stat_power?: number | null;
  stat_speed?: number | null;
  stat_durability?: number | null;
  stat_stamina?: number | null;
  stat_skill?: number | null;
  stat_luck?: number | null;
}

function generateStatBar(value: number): string {
  const filled = Math.round(value / 5);
  const empty = 20 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${value}/100`;
}

export function generateCharacterSheetText(character: CharacterData): string {
  const divider = '═'.repeat(50);
  const thinDivider = '─'.repeat(50);
  
  let sheet = `
╔${'═'.repeat(50)}╗
║${' '.repeat(Math.floor((50 - character.name.length) / 2))}${character.name}${' '.repeat(Math.ceil((50 - character.name.length) / 2))}║
║${' '.repeat(Math.floor((50 - getTierName(character.level).length) / 2))}${getTierName(character.level)}${' '.repeat(Math.ceil((50 - getTierName(character.level).length) / 2))}║
╚${divider}╝

══════════════════ BASIC INFO ══════════════════`;

  if (character.race) sheet += `\n  Race:        ${character.race}`;
  if (character.sub_race) sheet += `\n  Sub-Race:    ${character.sub_race}`;
  if (character.home_planet) sheet += `\n  Home Planet: ${character.home_planet}`;
  if (character.age) sheet += `\n  Age:         ${character.age}`;

  sheet += `\n\n${thinDivider}`;
  sheet += `\n\n══════════════════ POWER TIER ══════════════════`;
  sheet += `\n  Tier ${character.level}: ${getTierName(character.level)}`;

  if (character.powers) {
    sheet += `\n\n══════════════════ BASE POWER ══════════════════`;
    sheet += `\n${character.powers}`;
  }

  if (character.abilities) {
    sheet += `\n\n═══════════════ ABILITIES & TECHNIQUES ═══════════════`;
    sheet += `\n${character.abilities}`;
  }

  if (character.personality) {
    sheet += `\n\n══════════════════ PERSONALITY ══════════════════`;
    sheet += `\n${character.personality}`;
  }

  if (character.mentality) {
    sheet += `\n\n═══════════════════ MENTALITY ═══════════════════`;
    sheet += `\n${character.mentality}`;
  }

  if (character.lore) {
    sheet += `\n\n═════════════════ LORE & BACKSTORY ═════════════════`;
    sheet += `\n${character.lore}`;
  }

  sheet += `\n\n══════════════════ CHARACTER STATS ══════════════════\n`;
  
  const stats: CharacterStats = {
    stat_intelligence: character.stat_intelligence ?? 50,
    stat_battle_iq: (character as any).stat_battle_iq ?? 50,
    stat_strength: character.stat_strength ?? 50,
    stat_power: character.stat_power ?? 50,
    stat_speed: character.stat_speed ?? 50,
    stat_durability: character.stat_durability ?? 50,
    stat_stamina: character.stat_stamina ?? 50,
    stat_skill: character.stat_skill ?? 50,
    stat_luck: character.stat_luck ?? 50,
  };

  CHARACTER_STATS.forEach(stat => {
    const value = stats[stat.key as keyof CharacterStats];
    const paddedName = stat.name.padEnd(12);
    sheet += `\n  ${paddedName} ${generateStatBar(value)}`;
  });

  sheet += `\n\n${thinDivider}`;
  sheet += `\n           Generated from O.C.R.P.`;
  sheet += `\n               Character Sheet v1.0`;
  sheet += `\n${thinDivider}\n`;

  return sheet;
}

export function downloadCharacterSheet(character: CharacterData): void {
  const content = generateCharacterSheetText(character);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${character.name.replace(/[^a-z0-9]/gi, '_')}_character_sheet.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateCharacterSheetJSON(character: CharacterData): string {
  return JSON.stringify({
    name: character.name,
    tier: character.level,
    tierName: getTierName(character.level),
    basicInfo: {
      race: character.race || null,
      subRace: character.sub_race || null,
      homePlanet: character.home_planet || null,
      age: character.age || null,
    },
    basePower: character.powers || null,
    abilities: character.abilities || null,
    personality: character.personality || null,
    mentality: character.mentality || null,
    lore: character.lore || null,
    stats: {
      intelligence: character.stat_intelligence ?? 50,
      strength: character.stat_strength ?? 50,
      power: character.stat_power ?? 50,
      speed: character.stat_speed ?? 50,
      durability: character.stat_durability ?? 50,
      stamina: character.stat_stamina ?? 50,
      skill: character.stat_skill ?? 50,
      luck: character.stat_luck ?? 50,
    },
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }, null, 2);
}

export function downloadCharacterSheetJSON(character: CharacterData): void {
  const content = generateCharacterSheetJSON(character);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${character.name.replace(/[^a-z0-9]/gi, '_')}_character.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
