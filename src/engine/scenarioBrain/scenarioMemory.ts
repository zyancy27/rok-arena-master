/**
 * Scenario Memory
 *
 * Prevents repeated scenario generation within a battle session.
 * Uses Jaccard similarity on tokenized scenario fingerprints.
 * >60% similarity triggers a reroll.
 */

export interface ScenarioFingerprint {
  environment: string;
  situation: string;
  hazards: string[];
  urgency: string;
  timestamp: number;
}

const SIMILARITY_THRESHOLD = 0.6;
const MAX_MEMORY_SIZE = 50;

/**
 * Session-scoped scenario memory.
 * Create one per battle session to track generated scenarios.
 */
export class ScenarioMemory {
  private history: ScenarioFingerprint[] = [];

  /** Record a generated scenario */
  record(fingerprint: ScenarioFingerprint): void {
    this.history.push(fingerprint);
    // Trim oldest if exceeding max
    if (this.history.length > MAX_MEMORY_SIZE) {
      this.history = this.history.slice(-MAX_MEMORY_SIZE);
    }
  }

  /** Check if a candidate is too similar to any previously generated scenario */
  isTooSimilar(candidate: ScenarioFingerprint): boolean {
    return this.history.some(
      (prev) => this.similarity(prev, candidate) > SIMILARITY_THRESHOLD,
    );
  }

  /** Get all recorded fingerprints */
  getHistory(): readonly ScenarioFingerprint[] {
    return this.history;
  }

  /** Get previous location names for deduplication prompts */
  getPreviousNames(): string[] {
    return this.history.map(
      (f) => `${f.environment} (${f.situation}, ${f.hazards.join('/')})`,
    );
  }

  /** Clear memory */
  clear(): void {
    this.history = [];
  }

  // ── Similarity Calculation ──────────────────────────────────

  private similarity(a: ScenarioFingerprint, b: ScenarioFingerprint): number {
    const tokensA = this.tokenize(a);
    const tokensB = this.tokenize(b);
    return this.jaccardSimilarity(tokensA, tokensB);
  }

  private tokenize(fp: ScenarioFingerprint): Set<string> {
    const tokens = new Set<string>();
    // Split each field into normalized words
    for (const word of fp.environment.toLowerCase().split(/\s+/)) {
      if (word.length > 2) tokens.add(word);
    }
    for (const word of fp.situation.toLowerCase().split(/\s+/)) {
      if (word.length > 2) tokens.add(word);
    }
    for (const h of fp.hazards) {
      for (const word of h.toLowerCase().split(/\s+/)) {
        if (word.length > 2) tokens.add(word);
      }
    }
    tokens.add(fp.urgency);
    return tokens;
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    let intersection = 0;
    for (const token of a) {
      if (b.has(token)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }
}

/** Singleton factory — creates a fresh memory per session */
export function createScenarioMemory(): ScenarioMemory {
  return new ScenarioMemory();
}
