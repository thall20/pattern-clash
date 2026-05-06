/**
 * Computer AI for Pattern Clash
 *
 * Generates patterns with increasing difficulty. Designed to be
 * deterministic-ish — the AI can later be made server-authoritative
 * for online multiplayer without changing the interface.
 */

export interface AIConfig {
  buttonCount: number;
  level: number;
  startingLength: number;
}

export interface AIPattern {
  pattern: number[];
  /** Milliseconds the AI "thinks" before revealing the pattern */
  thinkMs: number;
}

/**
 * Generates a random pattern for the current level.
 * Length = startingLength + level - 1.
 */
export function generateComputerPattern(config: AIConfig): AIPattern {
  const length = config.startingLength + config.level - 1;
  const pattern: number[] = [];
  for (let i = 0; i < length; i++) {
    pattern.push(Math.floor(Math.random() * config.buttonCount));
  }
  // Think time scales with level (more dramatic at higher levels)
  const thinkMs = 800 + Math.min(config.level * 100, 1200);
  return { pattern, thinkMs };
}

/**
 * Evaluates how well the player performed — used for future adaptive difficulty.
 * Returns a 0–1 score where 1 = perfect.
 */
export function evaluatePerformance(
  pattern: number[],
  playerInput: number[],
): number {
  if (pattern.length === 0) return 0;
  let correct = 0;
  const len = Math.min(pattern.length, playerInput.length);
  for (let i = 0; i < len; i++) {
    if (pattern[i] === playerInput[i]) correct++;
  }
  return correct / pattern.length;
}
