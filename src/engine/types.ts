export type GameMode = "local" | "vs-computer" | "solo";
export type Difficulty = "easy" | "medium" | "hard";

export interface ColorConfig {
  bg: string;
  glow: string;
  shadow: string;
  label: string;
}

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  description: string;
  buttonCount: 4 | 6 | 9;
  gridCols: 2 | 3;
  /** Total ms per button step during playback (highlight + gap combined) */
  stepMs: number;
  /** ms the button stays lit during playback */
  litMs: number;
  startingPatternLength: number;
  emoji: string;
}

export interface TapFlash {
  index: number;
  type: "correct" | "wrong";
}

export interface PlayerScore {
  name: string;
  score: number;
}

export interface GameSettings {
  mode: GameMode;
  difficulty: DifficultyConfig;
  player1Name: string;
  player2Name?: string;
}

// ── Placeholder interfaces for future online multiplayer ──────────────────────

export interface MultiplayerRoom {
  id: string;
  hostId: string;
  guestId: string | null;
  status: "waiting" | "in-progress" | "finished";
  settings: Pick<GameSettings, "difficulty">;
  pattern: number[];
  turn: "host" | "guest";
  scores: { host: number; guest: number };
  level: number;
}

export interface MultiplayerEvent {
  type:
    | "room-created"
    | "player-joined"
    | "pattern-locked"
    | "tap"
    | "round-result"
    | "game-over";
  payload: unknown;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
