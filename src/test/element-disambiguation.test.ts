import { describe, it, expect } from 'vitest';
import { disambiguateText } from '@/lib/element-disambiguation';
import { extractAbilityTypes, validateMove } from '@/lib/move-validation';

describe('element disambiguation', () => {
  it('should NOT flag "light noises" as light element', () => {
    const result = disambiguateText('makes light noises to distract the guard');
    expect(result).not.toMatch(/\blight\b/i);
  });

  it('should NOT flag "dark corner" as dark element', () => {
    const result = disambiguateText('hides in a dark corner');
    expect(result).not.toMatch(/\bdark\b/i);
  });

  it('should NOT flag "cold stare" as ice element', () => {
    const result = disambiguateText('gives a cold stare');
    expect(result).not.toMatch(/\bcold\b/i);
  });

  it('should NOT flag "stands their ground" as earth element', () => {
    const result = disambiguateText('stands their ground firmly');
    expect(result).not.toMatch(/\bground\b/i);
  });

  it('should NOT flag "fires back a retort" as fire element', () => {
    const result = disambiguateText('fires back a retort');
    expect(result).not.toMatch(/\bfire\b/i);
  });

  it('should NOT flag "storms off" as lightning element', () => {
    const result = disambiguateText('storms off angrily');
    expect(result).not.toMatch(/\bstorm\b/i);
  });

  it('should NOT flag "nervous energy" as energy element', () => {
    const result = disambiguateText('radiates nervous energy');
    expect(result).not.toMatch(/\benergy\b/i);
  });

  it('should NOT flag "in shock" as lightning element', () => {
    const result = disambiguateText('stands in shock');
    expect(result).not.toMatch(/\bshock\b/i);
  });

  it('should NOT flag "pulls back" as gravity element', () => {
    const result = disambiguateText('pulls back quickly');
    expect(result).not.toMatch(/\bpull\b/i);
  });

  it('should KEEP genuine fire power references', () => {
    const result = disambiguateText('unleashes a blast of fire at the enemy');
    expect(result).toMatch(/fire/i);
  });

  it('should KEEP genuine ice power references', () => {
    const result = disambiguateText('freezes the ground with ice');
    expect(result).toMatch(/ice|freeze/i);
  });

  it('should KEEP genuine shadow power references', () => {
    const result = disambiguateText('summons shadow tendrils from the void');
    expect(result).toMatch(/shadow/i);
  });

  it('should KEEP genuine lightning power references', () => {
    const result = disambiguateText('calls down a bolt of lightning');
    expect(result).toMatch(/lightning/i);
  });
});

describe('validateMove with disambiguation', () => {
  const iceCharacter = {
    name: 'Frost',
    powers: 'Ice manipulation, freeze ray',
    abilities: 'Cryogenic defense',
  };

  it('should NOT warn on "light noises" for an ice character', () => {
    const result = validateMove(
      'Frost makes light noises to lure the enemy closer',
      iceCharacter,
    );
    expect(result.isValid).toBe(true);
  });

  it('should NOT warn on "dark corridor" for an ice character', () => {
    const result = validateMove(
      'Frost sneaks through the dark corridor',
      iceCharacter,
    );
    expect(result.isValid).toBe(true);
  });

  it('should NOT warn on "burning with anger" for an ice character', () => {
    const result = validateMove(
      'Frost is burning with anger and charges forward',
      iceCharacter,
    );
    expect(result.isValid).toBe(true);
  });

  it('SHOULD warn if ice character uses actual fire blast', () => {
    const result = validateMove(
      'Frost unleashes a massive fire blast at the opponent',
      iceCharacter,
    );
    expect(result.isValid).toBe(false);
    expect(result.violationType).toBe('element_mismatch');
  });
});
