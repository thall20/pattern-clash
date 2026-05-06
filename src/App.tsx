import { useState, useCallback, useRef } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

type Phase = "start" | "creating" | "handoff" | "replaying" | "result";
type Result = "correct" | "wrong" | null;

interface TapFlash {
  index: number;
  type: "correct" | "wrong";
}

const GAME_COLORS = [
  { bg: "#FF3366", glow: "rgba(255,51,102,0.75)",  shadow: "#8c1a33", label: "Pink"   },
  { bg: "#FF8C00", glow: "rgba(255,140,0,0.75)",   shadow: "#8c4d00", label: "Orange" },
  { bg: "#FFD700", glow: "rgba(255,215,0,0.75)",   shadow: "#8c7700", label: "Yellow" },
  { bg: "#00E676", glow: "rgba(0,230,118,0.75)",   shadow: "#007a40", label: "Green"  },
  { bg: "#2979FF", glow: "rgba(41,121,255,0.75)",  shadow: "#1340a8", label: "Blue"   },
  { bg: "#D500F9", glow: "rgba(213,0,249,0.75)",   shadow: "#7200a8", label: "Purple" },
];

// Pentatonic scale — every combination sounds musical
const BUTTON_NOTES = [523.25, 659.25, 783.99, 880.0, 1046.5, 1318.5];

// Fixed confetti data (no Math.random in render — deterministic pattern)
const CONFETTI_PIECES = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  left: `${((i * 3.31 + 1.7) % 88) + 4}%`,
  delay: `${(i * 0.046) % 0.52}s`,
  color: GAME_COLORS[i % 6].bg,
  size: `${8 + (i % 5) * 2}px`,
  duration: `${1.1 + (i % 4) * 0.17}s`,
}));

// Fixed star positions
const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${((i * 4.13 + 1.9) % 92) + 2}%`,
  top:  `${((i * 7.71 + 2.3) % 88) + 4}%`,
  size: `${1.5 + (i % 3)}px`,
  delay: `${(i * 0.38) % 2.8}s`,
  dur:   `${2.0 + (i % 3) * 0.55}s`,
}));

// ─── Sound engine ────────────────────────────────────────────────────────────

function playNote(index: number) {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    const freq = BUTTON_NOTES[index];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "triangle";
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t); osc.stop(t + 0.22);

    // Subtle octave below for warmth
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc2.frequency.value = freq / 2;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.08, t + 0.018);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc2.start(t); osc2.stop(t + 0.14);
  } catch { /* audio unavailable */ }
}

function playLock() {
  try {
    const ctx = new AudioContext();
    [392, 523, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
    });
  } catch { /* audio unavailable */ }
}

function playSuccess() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    // Rising arpeggio
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = t + i * 0.115;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.24, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.start(start); osc.stop(start + 0.22);
    });
    // Final chord
    [523, 659, 784].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = t + 0.5;
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
      osc.start(start); osc.stop(start + 0.6);
    });
  } catch { /* audio unavailable */ }
}

function playFail() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.42);
    osc.type = "sawtooth";
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.setValueAtTime(0.22, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.start(t); osc.stop(t + 0.42);
  } catch { /* audio unavailable */ }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {STARS.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animation: `star-twinkle ${s.dur} ${s.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {CONFETTI_PIECES.map((p) => (
        <div
          key={p.id}
          className="absolute confetti-piece"
          style={{
            left: p.left,
            top: "-14px",
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: "3px",
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

interface ColorGridProps {
  onTap: (index: number) => void;
  tapFlash: TapFlash | null;
  disabled: boolean;
  shaking?: boolean;
}

function ColorGrid({ onTap, tapFlash, disabled, shaking }: ColorGridProps) {
  const [rippleKeys, setRippleKeys] = useState([0, 0, 0, 0, 0, 0]);

  const handleTap = (index: number) => {
    if (disabled) return;
    setRippleKeys((prev) => prev.map((k, i) => (i === index ? k + 1 : k)));
    onTap(index);
  };

  return (
    <div className={`grid grid-cols-2 gap-4 w-full ${shaking ? "animate-shake" : ""}`}>
      {GAME_COLORS.map((c, i) => {
        const isFlashing = tapFlash?.index === i;
        const flashType = isFlashing ? tapFlash!.type : null;
        return (
          <button
            key={i}
            data-testid={`button-color-${i}`}
            onClick={() => handleTap(i)}
            aria-label={c.label}
            disabled={disabled}
            className="h-24 rounded-3xl transition-all duration-100 disabled:cursor-not-allowed relative overflow-hidden"
            style={{
              background: flashType === "wrong"
                ? "#ff0000"
                : flashType === "correct"
                ? "#00ff99"
                : c.bg,
              boxShadow: flashType
                ? flashType === "correct"
                  ? "0 0 40px rgba(0,255,153,0.95), 0 6px 0 #007040"
                  : "0 0 40px rgba(255,0,0,0.95), 0 6px 0 #7a0000"
                : `0 0 20px ${c.glow}, 0 6px 0 ${c.shadow}`,
              transform: isFlashing
                ? "scale(0.90) translateY(5px)"
                : "scale(1) translateY(0)",
            }}
          >
            {/* Ripple */}
            {rippleKeys[i] > 0 && (
              <span
                key={rippleKeys[i]}
                className="absolute pointer-events-none rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                  width: "12px",
                  height: "12px",
                  marginTop: "-6px",
                  marginLeft: "-6px",
                  background: "rgba(255,255,255,0.55)",
                  animation: "ripple-expand 0.42s ease-out forwards",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main game ───────────────────────────────────────────────────────────────

function GameBoard() {
  const [phase, setPhase] = useState<Phase>("start");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [currentPattern, setCurrentPattern] = useState<number[]>([]);
  const [replayProgress, setReplayProgress] = useState<number[]>([]);
  const [currentCreator, setCurrentCreator] = useState<1 | 2>(1);
  const [result, setResult] = useState<Result>(null);
  const [tapFlash, setTapFlash] = useState<TapFlash | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [lastScorer, setLastScorer] = useState<"p1" | "p2" | null>(null);
  const replayLocked = useRef(false);

  const creatorName = currentCreator === 1 ? player1Name : player2Name;
  const replayerName = currentCreator === 1 ? player2Name : player1Name;
  const isReplaying = phase === "replaying";
  const isCreating = phase === "creating";

  const resetGame = () => {
    setPhase("start");
    setPlayer1Name("");
    setPlayer2Name("");
    setScores({ p1: 0, p2: 0 });
    setCurrentPattern([]);
    setReplayProgress([]);
    setCurrentCreator(1);
    setResult(null);
    setTapFlash(null);
    setShaking(false);
    setLastScorer(null);
    replayLocked.current = false;
  };

  const handleStartGame = () => {
    if (player1Name.trim() && player2Name.trim()) {
      setAnimKey((k) => k + 1);
      setPhase("creating");
    }
  };

  const handleCreateTap = (index: number) => {
    playNote(index);
    setTapFlash({ index, type: "correct" });
    setTimeout(() => setTapFlash(null), 175);
    setCurrentPattern((prev) => [...prev, index]);
  };

  const handleLockPattern = () => {
    if (currentPattern.length > 0) {
      playLock();
      setAnimKey((k) => k + 1);
      setPhase("handoff");
    }
  };

  const handleReady = () => {
    replayLocked.current = false;
    setReplayProgress([]);
    setAnimKey((k) => k + 1);
    setPhase("replaying");
  };

  const handleReplayTap = useCallback(
    (index: number) => {
      if (replayLocked.current) return;

      const nextProgress = [...replayProgress, index];
      setReplayProgress(nextProgress);

      const isCorrectSoFar = nextProgress.every(
        (tappedIndex, i) => tappedIndex === currentPattern[i]
      );

      if (!isCorrectSoFar) {
        replayLocked.current = true;
        playFail();
        setShaking(true);
        setTapFlash({ index, type: "wrong" });
        setTimeout(() => setShaking(false), 420);
        setTimeout(() => {
          setTapFlash(null);
          setResult("wrong");
          const winner = currentCreator === 1 ? "p1" : "p2";
          setScores((s) =>
            winner === "p1" ? { ...s, p1: s.p1 + 1 } : { ...s, p2: s.p2 + 1 }
          );
          setLastScorer(winner);
          setTimeout(() => setLastScorer(null), 750);
          setAnimKey((k) => k + 1);
          setPhase("result");
        }, 450);
      } else if (nextProgress.length === currentPattern.length) {
        replayLocked.current = true;
        playSuccess();
        setTapFlash({ index, type: "correct" });
        setTimeout(() => {
          setTapFlash(null);
          setResult("correct");
          const winner = currentCreator === 1 ? "p2" : "p1";
          setScores((s) =>
            winner === "p1" ? { ...s, p1: s.p1 + 1 } : { ...s, p2: s.p2 + 1 }
          );
          setLastScorer(winner);
          setTimeout(() => setLastScorer(null), 750);
          setAnimKey((k) => k + 1);
          setPhase("result");
        }, 450);
      } else {
        playNote(index);
        setTapFlash({ index, type: "correct" });
        setTimeout(() => setTapFlash(null), 175);
      }
    },
    [replayProgress, currentPattern, currentCreator]
  );

  const handleNextRound = () => {
    setCurrentCreator((prev) => (prev === 1 ? 2 : 1));
    setCurrentPattern([]);
    setReplayProgress([]);
    setResult(null);
    setTapFlash(null);
    replayLocked.current = false;
    setAnimKey((k) => k + 1);
    setPhase("creating");
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background text-foreground relative overflow-hidden font-sans">
      <Confetti active={phase === "result" && result === "correct"} />

      {/* ── Top bar ─────────────────────────────────────── */}
      {phase !== "start" && (
        <div className="w-full max-w-sm mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1">
            {/* P1 */}
            <div
              className={`flex flex-col items-center px-3 py-1.5 rounded-xl border-2 transition-all duration-200 ${
                (isCreating && currentCreator === 1) ||
                (isReplaying && currentCreator === 2)
                  ? "border-[#FF3366] bg-[#FF3366]/10 scale-105"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[72px]">
                {player1Name}
              </span>
              <span
                data-testid="text-score-player1"
                className={`text-xl font-extrabold text-white leading-tight inline-block ${
                  lastScorer === "p1" ? "score-bump" : ""
                }`}
              >
                {scores.p1}
              </span>
            </div>
            <span className="text-muted-foreground font-bold text-sm">vs</span>
            {/* P2 */}
            <div
              className={`flex flex-col items-center px-3 py-1.5 rounded-xl border-2 transition-all duration-200 ${
                (isCreating && currentCreator === 2) ||
                (isReplaying && currentCreator === 1)
                  ? "border-[#2979FF] bg-[#2979FF]/10 scale-105"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[72px]">
                {player2Name}
              </span>
              <span
                data-testid="text-score-player2"
                className={`text-xl font-extrabold text-white leading-tight inline-block ${
                  lastScorer === "p2" ? "score-bump" : ""
                }`}
              >
                {scores.p2}
              </span>
            </div>
          </div>
          <button
            onClick={resetGame}
            data-testid="button-reset-game"
            className="text-xs px-3 py-2 bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white rounded-xl font-bold uppercase tracking-wider transition-all border border-white/10 active:scale-95"
          >
            Reset
          </button>
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col items-center px-4 py-6 flex-1">

        {/* ── START ───────────────────────────────────────── */}
        {phase === "start" && (
          <div
            key="start"
            className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500 relative"
          >
            <StarField />

            <div className="text-center pt-8 relative z-10">
              <h1
                className="text-6xl font-extrabold tracking-tight leading-none title-glow"
                style={{
                  background:
                    "linear-gradient(135deg, #FF3366 0%, #D500F9 50%, #2979FF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Pattern
                <br />
                Clash
              </h1>
              <p className="mt-3 text-muted-foreground font-bold uppercase tracking-[0.2em] text-sm">
                Remember. Repeat. Win.
              </p>
            </div>

            <div className="space-y-4 bg-card p-6 rounded-3xl border border-white/10 shadow-2xl relative z-10">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Player 1 Name
                </label>
                <input
                  type="text"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStartGame()}
                  placeholder="Enter name"
                  data-testid="input-player1-name"
                  className="w-full px-4 py-3 bg-white/5 rounded-2xl border-2 border-white/10 focus:border-[#FF3366] outline-none transition-colors font-bold text-lg text-white placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Player 2 Name
                </label>
                <input
                  type="text"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStartGame()}
                  placeholder="Enter name"
                  data-testid="input-player2-name"
                  className="w-full px-4 py-3 bg-white/5 rounded-2xl border-2 border-white/10 focus:border-[#2979FF] outline-none transition-colors font-bold text-lg text-white placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <button
              onClick={handleStartGame}
              disabled={!player1Name.trim() || !player2Name.trim()}
              data-testid="button-start-game"
              className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 relative z-10"
              style={{
                background: "linear-gradient(135deg, #FF3366 0%, #D500F9 100%)",
                boxShadow: "0 0 28px rgba(213,0,249,0.55), 0 6px 0 #7f0095",
                color: "#fff",
              }}
            >
              Start Game
            </button>

            {/* Color dot row — staggered entrance */}
            <div className="flex justify-center gap-4 relative z-10">
              {GAME_COLORS.map((c, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full"
                  style={{
                    background: c.bg,
                    boxShadow: `0 0 12px ${c.glow}`,
                    animation: `dot-pop 0.4s ${i * 0.06}s cubic-bezier(0.34,1.56,0.64,1) both`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── CREATING ────────────────────────────────────── */}
        {phase === "creating" && (
          <div
            key={`creating-${animKey}`}
            className="w-full flex flex-col items-center space-y-6 animate-in zoom-in-95 fade-in duration-300"
          >
            <div className="text-center space-y-2 w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Create the Pattern
              </p>
              <h2 className="text-3xl font-extrabold text-white">
                <span style={{ color: "#FF3366", textShadow: "0 0 14px rgba(255,51,102,0.8)" }}>
                  {creatorName}
                </span>
                , tap your sequence!
              </h2>
              <div
                data-testid="text-pattern-length"
                className="inline-flex items-center gap-2 bg-white/10 px-5 py-2 rounded-full border border-white/10"
              >
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Pattern Length:
                </span>
                <span
                  className={`text-2xl font-extrabold text-white inline-block ${
                    currentPattern.length > 0 ? "counter-bump" : ""
                  }`}
                  key={currentPattern.length}
                >
                  {currentPattern.length}
                </span>
              </div>
            </div>

            <ColorGrid onTap={handleCreateTap} tapFlash={tapFlash} disabled={false} />

            <button
              onClick={handleLockPattern}
              disabled={currentPattern.length === 0}
              data-testid="button-lock-pattern"
              className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={{
                background:
                  currentPattern.length === 0
                    ? "rgba(255,255,255,0.08)"
                    : "linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)",
                boxShadow:
                  currentPattern.length > 0
                    ? "0 0 22px rgba(255,215,0,0.55), 0 6px 0 #7a5900"
                    : "none",
                color: currentPattern.length === 0 ? "#555" : "#1a1a1a",
              }}
            >
              Lock Pattern
            </button>
          </div>
        )}

        {/* ── HANDOFF ─────────────────────────────────────── */}
        {phase === "handoff" && (
          <div
            key={`handoff-${animKey}`}
            className="w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center"
          >
            {/* Animated orb */}
            <div className="relative">
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #D500F9, #2979FF)",
                  boxShadow: "0 0 48px rgba(213,0,249,0.55)",
                  animation: "orb-pulse 2s ease-in-out infinite",
                }}
              >
                <div className="w-14 h-14 bg-white/20 rounded-full" />
              </div>
              {/* Rotating ring */}
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent"
                style={{
                  borderTopColor: "#FF3366",
                  borderRightColor: "#D500F9",
                  animation: "spin 1.8s linear infinite",
                }}
              />
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold text-white">
                Pass the device to{" "}
                <span style={{ color: "#2979FF", textShadow: "0 0 14px rgba(41,121,255,0.8)" }}>
                  {replayerName}
                </span>!
              </h2>
              <p
                data-testid="text-handoff-message"
                className="text-sm font-bold text-muted-foreground uppercase tracking-widest"
              >
                The pattern is locked and secret.
              </p>
              {/* Secret dots */}
              <div className="flex justify-center gap-2 pt-1">
                {Array.from({ length: Math.min(currentPattern.length, 10) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-white/30"
                    style={{ animationDelay: `${i * 0.07}s` }}
                  />
                ))}
                {currentPattern.length > 10 && (
                  <span className="text-xs text-muted-foreground font-bold">+{currentPattern.length - 10}</span>
                )}
              </div>
            </div>

            <button
              onClick={handleReady}
              data-testid="button-ready"
              className="w-full py-5 rounded-full font-extrabold text-2xl uppercase tracking-wider transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #2979FF 0%, #D500F9 100%)",
                boxShadow: "0 0 28px rgba(41,121,255,0.55), 0 6px 0 #1a4a99",
                color: "#fff",
              }}
            >
              I'm Ready!
            </button>
          </div>
        )}

        {/* ── REPLAYING ───────────────────────────────────── */}
        {phase === "replaying" && (
          <div
            key={`replaying-${animKey}`}
            className="w-full flex flex-col items-center space-y-6 animate-in zoom-in-95 fade-in duration-300"
          >
            <div className="text-center space-y-2 w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Repeat the Pattern
              </p>
              <h2 className="text-3xl font-extrabold text-white">
                <span style={{ color: "#2979FF", textShadow: "0 0 14px rgba(41,121,255,0.8)" }}>
                  {replayerName}
                </span>
                , repeat it!
              </h2>
              <div
                data-testid="text-replay-progress"
                className="inline-flex items-center gap-2 bg-white/10 px-5 py-2 rounded-full border border-white/10"
              >
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Tapped:
                </span>
                <span
                  className="text-2xl font-extrabold text-white inline-block counter-bump"
                  key={replayProgress.length}
                >
                  {replayProgress.length}
                </span>
                <span className="text-muted-foreground font-bold">/ {currentPattern.length}</span>
              </div>
            </div>

            <ColorGrid
              onTap={handleReplayTap}
              tapFlash={tapFlash}
              disabled={replayLocked.current}
              shaking={shaking}
            />

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${(replayProgress.length / currentPattern.length) * 100}%`,
                  background: "linear-gradient(90deg, #2979FF, #D500F9)",
                  boxShadow: "0 0 10px rgba(213,0,249,0.7)",
                }}
              />
            </div>
          </div>
        )}

        {/* ── RESULT ──────────────────────────────────────── */}
        {phase === "result" && (
          <div
            key={`result-${animKey}`}
            className="w-full flex flex-col items-center space-y-8 animate-in fade-in duration-200"
          >
            <div className="text-center space-y-3">
              <h2
                data-testid="text-result"
                className="text-7xl font-extrabold uppercase tracking-tight result-pop"
                style={
                  result === "correct"
                    ? {
                        color: "#00E676",
                        textShadow:
                          "0 0 30px rgba(0,230,118,0.9), 0 0 70px rgba(0,230,118,0.4)",
                      }
                    : {
                        color: "#FF3366",
                        textShadow:
                          "0 0 30px rgba(255,51,102,0.9), 0 0 70px rgba(255,51,102,0.4)",
                      }
                }
              >
                {result === "correct" ? "Correct!" : "Wrong!"}
              </h2>
              <p className="text-xl font-bold text-white animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                {result === "correct"
                  ? `${replayerName} scores a point!`
                  : `${creatorName} scores a point!`}
              </p>
            </div>

            <div className="w-full bg-card p-5 rounded-3xl border border-white/10 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
              <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Scoreboard
              </p>
              <div className="flex justify-around items-center">
                <div
                  className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-2 transition-all duration-300 ${
                    (result === "wrong" && currentCreator === 1) ||
                    (result === "correct" && currentCreator === 2)
                      ? "border-[#FF3366] bg-[#FF3366]/15 scale-105"
                      : "border-white/10"
                  }`}
                >
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {player1Name}
                  </span>
                  <span
                    data-testid="text-score-player1"
                    className={`text-4xl font-extrabold text-white inline-block ${
                      lastScorer === "p1" ? "score-bump" : ""
                    }`}
                  >
                    {scores.p1}
                  </span>
                </div>
                <span className="text-2xl font-extrabold text-muted-foreground">:</span>
                <div
                  className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-2 transition-all duration-300 ${
                    (result === "wrong" && currentCreator === 2) ||
                    (result === "correct" && currentCreator === 1)
                      ? "border-[#2979FF] bg-[#2979FF]/15 scale-105"
                      : "border-white/10"
                  }`}
                >
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {player2Name}
                  </span>
                  <span
                    data-testid="text-score-player2"
                    className={`text-4xl font-extrabold text-white inline-block ${
                      lastScorer === "p2" ? "score-bump" : ""
                    }`}
                  >
                    {scores.p2}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleNextRound}
              data-testid="button-next-round"
              className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300"
              style={{
                background:
                  "linear-gradient(135deg, #FF3366 0%, #D500F9 50%, #2979FF 100%)",
                boxShadow: "0 0 28px rgba(213,0,249,0.55), 0 6px 0 #7f0095",
                color: "#fff",
              }}
            >
              Next Round
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={GameBoard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
