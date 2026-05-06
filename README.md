# Pattern Clash

  A mobile-first pass-and-play memory pattern game with three modes.

  ## Game Modes

  | Mode | Description |
  |------|-------------|
  | 🤝 Pass & Play | Two players, one device. One creates a pattern; the other repeats it. |
  | 🤖 vs Computer | The AI generates patterns that grow every level. Beat as many levels as you can. |
  | 🧠 Solo Challenge | Classic Simon-Says. Watch the flashing sequence, then repeat it from memory. |

  ## Difficulty

  | Level | Buttons | Grid | Playback Speed |
  |-------|---------|------|---------------|
  | Easy | 4 | 2×2 | Slow (750ms/step) |
  | Medium | 6 | 2×3 | Normal (520ms/step) |
  | Hard | 9 | 3×3 | Fast (340ms/step) |

  ## Architecture

  ```
  src/
    engine/
      types.ts               — shared types + multiplayer placeholder interfaces
      difficultyConfig.ts    — color palette, notes, difficulty constants
      computerAI.ts          — AI pattern generation (level-based)
    services/
      multiplayerService.ts  — typed stub for future online multiplayer
    sounds/soundEngine.ts    — Web Audio pentatonic sound effects
    components/
      ModeSelect.tsx         — home screen (mode + difficulty + names)
      ColorGrid.tsx          — dynamic 4/6/9-button grid
      StarField.tsx / Confetti.tsx
    modes/
      PassAndPlay.tsx        — local 2-player
      VsComputer.tsx         — player vs AI
      SoloChallenge.tsx      — solo memory game
  ```

  ## Tech Stack

  React 19 + Vite 7 · Tailwind CSS v4 · shadcn/ui · wouter · Web Audio API

  ## Development

  ```bash
  npm install
  npm run dev
  ```

  ## Deploy to Vercel

  - Framework: **Vite** · Build: `npm run build` · Output: `dist`
  - No environment variables needed
  