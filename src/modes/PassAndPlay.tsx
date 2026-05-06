import { useState, useCallback, useRef } from "react";
import type { GameSettings, TapFlash } from "../engine/types";
import { getColors } from "../engine/difficultyConfig";
import { ColorGrid } from "../components/ColorGrid";
import { Confetti } from "../components/Confetti";
import { playNote, playLock, playSuccess, playFail } from "../sounds/soundEngine";

type Phase = "creating" | "handoff" | "replaying" | "result";
type Result = "correct" | "wrong" | null;

interface Props {
  settings: GameSettings;
  onExit: () => void;
}

function TopBar({
  p1, p2, s1, s2,
  activeP1, activeP2,
  lastScorer,
  level,
  onExit,
}: {
  p1: string; p2: string; s1: number; s2: number;
  activeP1: boolean; activeP2: boolean;
  lastScorer: "p1" | "p2" | null;
  level: number;
  onExit: () => void;
}) {
  return (
    <div className="w-full max-w-sm mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl border-2 transition-all duration-200 ${activeP1 ? "border-[#FF3366] bg-[#FF3366]/10 scale-105" : "border-white/10 bg-white/5"}`}>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[64px]">{p1}</span>
          <span data-testid="text-score-player1" className={`text-xl font-extrabold text-white leading-tight inline-block ${lastScorer === "p1" ? "score-bump" : ""}`}>{s1}</span>
        </div>
        <span className="text-muted-foreground font-bold text-xs flex-shrink-0">vs</span>
        <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl border-2 transition-all duration-200 ${activeP2 ? "border-[#2979FF] bg-[#2979FF]/10 scale-105" : "border-white/10 bg-white/5"}`}>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[64px]">{p2}</span>
          <span data-testid="text-score-player2" className={`text-xl font-extrabold text-white leading-tight inline-block ${lastScorer === "p2" ? "score-bump" : ""}`}>{s2}</span>
        </div>
        <div className="flex flex-col items-center px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 ml-auto flex-shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lvl</span>
          <span className="text-xl font-extrabold text-white leading-tight">{level}</span>
        </div>
      </div>
      <button onClick={onExit} data-testid="button-reset-game" className="text-xs px-3 py-2 bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white rounded-xl font-bold uppercase tracking-wider transition-all border border-white/10 active:scale-95 flex-shrink-0">
        Exit
      </button>
    </div>
  );
}

export function PassAndPlay({ settings, onExit }: Props) {
  const { difficulty, player1Name, player2Name = "Player 2" } = settings;
  const colors = getColors(difficulty);

  const [phase, setPhase] = useState<Phase>("creating");
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [pattern, setPattern] = useState<number[]>([]);
  const [replayProgress, setReplayProgress] = useState<number[]>([]);
  const [creator, setCreator] = useState<1 | 2>(1);
  const [result, setResult] = useState<Result>(null);
  const [tapFlash, setTapFlash] = useState<TapFlash | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [lastScorer, setLastScorer] = useState<"p1" | "p2" | null>(null);
  const [level, setLevel] = useState(1);
  const locked = useRef(false);

  const creatorName = creator === 1 ? player1Name : player2Name;
  const replayerName = creator === 1 ? player2Name : player1Name;

  const bump = () => setAnimKey((k) => k + 1);

  const flash = (idx: number, type: "correct" | "wrong", ms = 175) => {
    setTapFlash({ index: idx, type });
    setTimeout(() => setTapFlash(null), ms);
  };

  const handleCreateTap = (index: number) => {
    playNote(index);
    flash(index, "correct");
    setPattern((prev) => [...prev, index]);
  };

  const handleLock = () => {
    if (pattern.length === 0) return;
    playLock();
    bump();
    setPhase("handoff");
  };

  const handleReady = () => {
    locked.current = false;
    setReplayProgress([]);
    bump();
    setPhase("replaying");
  };

  const handleReplayTap = useCallback(
    (index: number) => {
      if (locked.current) return;
      const next = [...replayProgress, index];
      setReplayProgress(next);

      const ok = next.every((v, i) => v === pattern[i]);
      if (!ok) {
        locked.current = true;
        playFail();
        setShaking(true);
        setTapFlash({ index, type: "wrong" });
        setTimeout(() => setShaking(false), 420);
        setTimeout(() => {
          setTapFlash(null);
          setResult("wrong");
          const winner: "p1" | "p2" = creator === 1 ? "p1" : "p2";
          setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
          setLastScorer(winner);
          setTimeout(() => setLastScorer(null), 750);
          bump();
          setPhase("result");
        }, 450);
      } else if (next.length === pattern.length) {
        locked.current = true;
        playSuccess();
        flash(index, "correct");
        setTimeout(() => {
          setTapFlash(null);
          setResult("correct");
          const winner: "p1" | "p2" = creator === 1 ? "p2" : "p1";
          setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
          setLastScorer(winner);
          setTimeout(() => setLastScorer(null), 750);
          bump();
          setPhase("result");
        }, 450);
      } else {
        playNote(index);
        flash(index, "correct");
      }
    },
    [replayProgress, pattern, creator]
  );

  const handleNextRound = () => {
    if (result === "correct") setLevel((l) => l + 1);
    setCreator((c) => (c === 1 ? 2 : 1));
    setPattern([]);
    setReplayProgress([]);
    setResult(null);
    setTapFlash(null);
    locked.current = false;
    bump();
    setPhase("creating");
  };

  const isCreating = phase === "creating";
  const isReplaying = phase === "replaying";

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background text-foreground relative overflow-hidden font-sans">
      <Confetti active={phase === "result" && result === "correct"} />

      <TopBar
        p1={player1Name} p2={player2Name}
        s1={scores.p1} s2={scores.p2}
        activeP1={(isCreating && creator === 1) || (isReplaying && creator === 2)}
        activeP2={(isCreating && creator === 2) || (isReplaying && creator === 1)}
        lastScorer={lastScorer}
        level={level}
        onExit={onExit}
      />

      <div className="w-full max-w-sm flex flex-col items-center px-4 py-4 flex-1 gap-6">

        {/* ── CREATING ── */}
        {phase === "creating" && (
          <div key={`c-${animKey}`} className="w-full flex flex-col items-center gap-5 animate-in zoom-in-95 fade-in duration-300">
            <div className="text-center space-y-2 w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Create the Pattern</p>
              <h2 className="text-2xl font-extrabold text-white">
                <span style={{ color: "#FF3366", textShadow: "0 0 14px rgba(255,51,102,0.8)" }}>{creatorName}</span>, tap your sequence!
              </h2>
              <div data-testid="text-pattern-length" className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pattern:</span>
                <span className={`text-xl font-extrabold text-white inline-block ${pattern.length > 0 ? "counter-bump" : ""}`} key={pattern.length}>{pattern.length}</span>
                <span className="text-muted-foreground text-sm">/ min {difficulty.startingPatternLength + level - 1}</span>
              </div>
            </div>
            <ColorGrid colors={colors} cols={difficulty.gridCols} onTap={handleCreateTap} tapFlash={tapFlash} disabled={false} />
            <button
              onClick={handleLock}
              disabled={pattern.length < difficulty.startingPatternLength + level - 1}
              data-testid="button-lock-pattern"
              className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={{
                background: pattern.length >= difficulty.startingPatternLength + level - 1 ? "linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)" : "rgba(255,255,255,0.08)",
                boxShadow: pattern.length >= difficulty.startingPatternLength + level - 1 ? "0 0 22px rgba(255,215,0,0.55), 0 6px 0 #7a5900" : "none",
                color: pattern.length >= difficulty.startingPatternLength + level - 1 ? "#1a1a1a" : "#555",
              }}
            >
              Lock Pattern
            </button>
          </div>
        )}

        {/* ── HANDOFF ── */}
        {phase === "handoff" && (
          <div key={`h-${animKey}`} className="w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #D500F9, #2979FF)", boxShadow: "0 0 48px rgba(213,0,249,0.55)", animation: "orb-pulse 2s ease-in-out infinite" }}>
                <div className="w-14 h-14 bg-white/20 rounded-full" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent" style={{ borderTopColor: "#FF3366", borderRightColor: "#D500F9", animation: "spin 1.8s linear infinite" }} />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold text-white">
                Pass to{" "}
                <span style={{ color: "#2979FF", textShadow: "0 0 14px rgba(41,121,255,0.8)" }}>{replayerName}</span>!
              </h2>
              <p data-testid="text-handoff-message" className="text-sm font-bold text-muted-foreground uppercase tracking-widest">The pattern is locked & secret.</p>
              <div className="flex justify-center gap-2 pt-1 flex-wrap">
                {Array.from({ length: Math.min(pattern.length, 12) }).map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/30" />
                ))}
                {pattern.length > 12 && <span className="text-xs text-muted-foreground font-bold">+{pattern.length - 12}</span>}
              </div>
            </div>
            <button onClick={handleReady} data-testid="button-ready" className="w-full py-5 rounded-full font-extrabold text-2xl uppercase tracking-wider transition-all active:scale-95" style={{ background: "linear-gradient(135deg, #2979FF 0%, #D500F9 100%)", boxShadow: "0 0 28px rgba(41,121,255,0.55), 0 6px 0 #1a4a99", color: "#fff" }}>
              I'm Ready!
            </button>
          </div>
        )}

        {/* ── REPLAYING ── */}
        {phase === "replaying" && (
          <div key={`r-${animKey}`} className="w-full flex flex-col items-center gap-5 animate-in zoom-in-95 fade-in duration-300">
            <div className="text-center space-y-2 w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Repeat the Pattern</p>
              <h2 className="text-2xl font-extrabold text-white">
                <span style={{ color: "#2979FF", textShadow: "0 0 14px rgba(41,121,255,0.8)" }}>{replayerName}</span>, repeat it!
              </h2>
              <div data-testid="text-replay-progress" className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tapped:</span>
                <span className="text-xl font-extrabold text-white inline-block counter-bump" key={replayProgress.length}>{replayProgress.length}</span>
                <span className="text-muted-foreground font-bold">/ {pattern.length}</span>
              </div>
            </div>
            <ColorGrid colors={colors} cols={difficulty.gridCols} onTap={handleReplayTap} tapFlash={tapFlash} disabled={locked.current} shaking={shaking} />
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full rounded-full transition-all duration-200" style={{ width: `${(replayProgress.length / pattern.length) * 100}%`, background: "linear-gradient(90deg, #2979FF, #D500F9)", boxShadow: "0 0 10px rgba(213,0,249,0.7)" }} />
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {phase === "result" && (
          <div key={`res-${animKey}`} className="w-full flex flex-col items-center gap-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <h2 data-testid="text-result" className="text-6xl font-extrabold uppercase tracking-tight result-pop"
                style={result === "correct" ? { color: "#00E676", textShadow: "0 0 30px rgba(0,230,118,0.9), 0 0 70px rgba(0,230,118,0.4)" } : { color: "#FF3366", textShadow: "0 0 30px rgba(255,51,102,0.9), 0 0 70px rgba(255,51,102,0.4)" }}>
                {result === "correct" ? "Correct!" : "Wrong!"}
              </h2>
              <p className="text-lg font-bold text-white animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                {result === "correct" ? `${replayerName} scores!` : `${creatorName} scores!`}
              </p>
            </div>
            <div className="w-full bg-card p-5 rounded-3xl border border-white/10 shadow-2xl space-y-4">
              <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">Scoreboard</p>
              <div className="flex justify-around items-center">
                {[
                  { name: player1Name, score: scores.p1, key: "p1" as const, color: "#FF3366" },
                  { name: player2Name, score: scores.p2, key: "p2" as const, color: "#2979FF" },
                ].map((p) => {
                  const isWinner =
                    (result === "wrong" && (p.key === "p1" ? creator === 1 : creator === 2)) ||
                    (result === "correct" && (p.key === "p1" ? creator === 2 : creator === 1));
                  return (
                    <div key={p.key} className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-2 transition-all duration-300 ${isWinner ? "scale-105" : "border-white/10"}`}
                      style={{ borderColor: isWinner ? p.color : undefined, background: isWinner ? `${p.color}22` : undefined }}>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{p.name}</span>
                      <span data-testid={`text-score-${p.key}`} className={`text-4xl font-extrabold text-white inline-block ${lastScorer === p.key ? "score-bump" : ""}`}>{p.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={handleNextRound} data-testid="button-next-round"
              className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300"
              style={{ background: "linear-gradient(135deg, #FF3366 0%, #D500F9 50%, #2979FF 100%)", boxShadow: "0 0 28px rgba(213,0,249,0.55), 0 6px 0 #7f0095", color: "#fff" }}>
              Next Round →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
