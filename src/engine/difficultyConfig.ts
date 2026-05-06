import type { ColorConfig, DifficultyConfig } from "./types";

export const ALL_COLORS: ColorConfig[] = [
  { bg: "#FF3366", glow: "rgba(255,51,102,0.75)",  shadow: "#8c1a33", label: "Pink"   },
  { bg: "#FF8C00", glow: "rgba(255,140,0,0.75)",   shadow: "#8c4d00", label: "Orange" },
  { bg: "#FFD700", glow: "rgba(255,215,0,0.75)",   shadow: "#8c7700", label: "Yellow" },
  { bg: "#00E676", glow: "rgba(0,230,118,0.75)",   shadow: "#007a40", label: "Green"  },
  { bg: "#2979FF", glow: "rgba(41,121,255,0.75)",  shadow: "#1340a8", label: "Blue"   },
  { bg: "#D500F9", glow: "rgba(213,0,249,0.75)",   shadow: "#7200a8", label: "Purple" },
  { bg: "#00BCD4", glow: "rgba(0,188,212,0.75)",   shadow: "#006978", label: "Cyan"   },
  { bg: "#FF6B6B", glow: "rgba(255,107,107,0.75)", shadow: "#8c3535", label: "Coral"  },
  { bg: "#69F0AE", glow: "rgba(105,240,174,0.75)", shadow: "#2e7d52", label: "Mint"   },
];

/** Pentatonic notes — every combination sounds musical, extended to 9 buttons */
export const BUTTON_NOTES = [523.25, 659.25, 783.99, 880.0, 1046.5, 1318.5, 1568.0, 1760.0, 2093.0];

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    description: "4 buttons · Slow",
    buttonCount: 4,
    gridCols: 2,
    stepMs: 750,
    litMs: 520,
    startingPatternLength: 2,
    emoji: "🟢",
  },
  medium: {
    id: "medium",
    label: "Medium",
    description: "6 buttons · Normal",
    buttonCount: 6,
    gridCols: 2,
    stepMs: 520,
    litMs: 350,
    startingPatternLength: 3,
    emoji: "🟡",
  },
  hard: {
    id: "hard",
    label: "Hard",
    description: "9 buttons · Fast",
    buttonCount: 9,
    gridCols: 3,
    stepMs: 340,
    litMs: 220,
    startingPatternLength: 4,
    emoji: "🔴",
  },
};

export function getColors(cfg: DifficultyConfig): ColorConfig[] {
  return ALL_COLORS.slice(0, cfg.buttonCount);
}
