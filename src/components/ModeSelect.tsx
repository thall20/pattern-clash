import { useState } from "react";
import type { GameMode, GameSettings } from "../engine/types";
import { DIFFICULTY_CONFIGS, getColors } from "../engine/difficultyConfig";
import { StarField } from "./StarField";

interface ModeCardProps {
  mode: GameMode;
  selected: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

function ModeCard({ mode: _mode, selected, icon, title, description, onClick }: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all duration-200 text-left active:scale-95"
      style={{
        borderColor: selected ? "#D500F9" : "rgba(255,255,255,0.10)",
        background: selected ? "rgba(213,0,249,0.12)" : "rgba(255,255,255,0.04)",
        boxShadow: selected ? "0 0 20px rgba(213,0,249,0.3)" : "none",
      }}
    >
      <span className="text-3xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-white text-base leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
      <div
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          borderColor: selected ? "#D500F9" : "rgba(255,255,255,0.2)",
          background: selected ? "#D500F9" : "transparent",
        }}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

interface Props {
  onStart: (settings: GameSettings) => void;
}

export function ModeSelect({ onStart }: Props) {
  const [mode, setMode] = useState<GameMode>("local");
  const [difficulty, setDifficulty] = useState("medium");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const cfg = DIFFICULTY_CONFIGS[difficulty];
  const previewColors = getColors(cfg).slice(0, cfg.buttonCount);

  const canStart =
    p1.trim() &&
    (mode === "local" ? p2.trim() : true);

  function handleStart() {
    if (!canStart) return;
    onStart({
      mode,
      difficulty: cfg,
      player1Name: p1.trim(),
      player2Name: mode === "local" ? p2.trim() : undefined,
    });
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background text-foreground relative overflow-hidden font-sans">
      <div className="w-full max-w-sm flex flex-col px-4 py-6 gap-5 flex-1 relative">
        <StarField />

        {/* Title */}
        <div className="text-center pt-4 relative z-10">
          <h1
            className="text-5xl font-extrabold tracking-tight leading-none title-glow"
            style={{
              background: "linear-gradient(135deg, #FF3366 0%, #D500F9 50%, #2979FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Pattern<br />Clash
          </h1>
          <p className="mt-2 text-muted-foreground font-bold uppercase tracking-[0.2em] text-xs">
            Remember · Repeat · Win
          </p>

          {/* Colour dot preview — updates with difficulty */}
          <div className="flex justify-center gap-2 mt-3">
            {previewColors.map((c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full"
                style={{
                  background: c.bg,
                  boxShadow: `0 0 8px ${c.glow}`,
                  animation: `dot-pop 0.4s ${i * 0.05}s cubic-bezier(0.34,1.56,0.64,1) both`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Mode selection */}
        <div className="space-y-2 relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Game Mode</p>
          <ModeCard
            mode="local"
            selected={mode === "local"}
            icon="🤝"
            title="Pass & Play"
            description="Two players, one device. Create patterns for each other."
            onClick={() => setMode("local")}
          />
          <ModeCard
            mode="vs-computer"
            selected={mode === "vs-computer"}
            icon="🤖"
            title="vs Computer"
            description="The AI creates patterns. Beat it through the levels."
            onClick={() => setMode("vs-computer")}
          />
          <ModeCard
            mode="solo"
            selected={mode === "solo"}
            icon="🧠"
            title="Solo Challenge"
            description="Pure memory test. Watch the pattern, then repeat it."
            onClick={() => setMode("solo")}
          />
        </div>

        {/* Difficulty */}
        <div className="space-y-2 relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Difficulty</p>
          <div className="flex gap-2">
            {Object.values(DIFFICULTY_CONFIGS).map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className="flex-1 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all duration-150 active:scale-95"
                style={{
                  borderColor: difficulty === d.id ? "#FFD700" : "rgba(255,255,255,0.10)",
                  background: difficulty === d.id ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)",
                  color: difficulty === d.id ? "#FFD700" : "#888",
                  boxShadow: difficulty === d.id ? "0 0 14px rgba(255,215,0,0.3)" : "none",
                }}
              >
                <span className="block text-lg leading-none">{d.emoji}</span>
                <span className="block text-xs mt-0.5">{d.label}</span>
                <span className="block text-[10px] text-muted-foreground leading-tight mt-0.5">{d.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Name inputs */}
        <div className="space-y-3 relative z-10 bg-card p-4 rounded-3xl border border-white/10">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
              {mode === "local" ? "Player 1 Name" : "Your Name"}
            </label>
            <input
              type="text"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="Enter name"
              data-testid="input-player1-name"
              className="w-full px-4 py-3 bg-white/5 rounded-2xl border-2 border-white/10 focus:border-[#FF3366] outline-none transition-colors font-bold text-base text-white placeholder:text-muted-foreground"
            />
          </div>
          {mode === "local" && (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Player 2 Name
              </label>
              <input
                type="text"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="Enter name"
                data-testid="input-player2-name"
                className="w-full px-4 py-3 bg-white/5 rounded-2xl border-2 border-white/10 focus:border-[#2979FF] outline-none transition-colors font-bold text-base text-white placeholder:text-muted-foreground"
              />
            </div>
          )}
        </div>

        {/* Start */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          data-testid="button-start-game"
          className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 relative z-10"
          style={{
            background: "linear-gradient(135deg, #FF3366 0%, #D500F9 100%)",
            boxShadow: canStart ? "0 0 28px rgba(213,0,249,0.55), 0 6px 0 #7f0095" : "none",
            color: "#fff",
          }}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
