import { useState, useCallback, useRef, useEffect } from "react";
import type { GameSettings, TapFlash } from "../engine/types";
import { getColors } from "../engine/difficultyConfig";
import { generateComputerPattern } from "../engine/computerAI";
import { ColorGrid } from "../components/ColorGrid";
import { Confetti } from "../components/Confetti";
import { playNote, playSuccess, playFail, playLevelUp } from "../sounds/soundEngine";

type Phase = "thinking" | "watching" | "replaying" | "result" | "game-over";

interface Props {
  settings: GameSettings;
  onExit: () => void;
}

function usePatternPlayback(
  pattern: number[],
  litMs: number,
  stepMs: number,
  onFinish: () => void,
) {
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback(() => {
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];
    let offset = 0;
    pattern.forEach((idx, i) => {
      const onId = setTimeout(() => {
        setPlaybackIndex(idx);
        playNote(idx);
      }, offset);
      const offId = setTimeout(() => {
        setPlaybackIndex(null);
      }, offset + litMs);
      timerIds.current.push(onId, offId);
      offset += stepMs;
    });
    const doneId = setTimeout(() => {
      setPlaybackIndex(null);
      onFinish();
    }, offset + 200);
    timerIds.current.push(doneId);
  }, [pattern, litMs, stepMs, onFinish]);

  useEffect(() => () => { timerIds.current.forEach(clearTimeout); }, []);

  return { playbackIndex, play };
}

export function VsComputer({ settings, onExit }: Props) {
  const { difficulty, player1Name } = settings;
  const colors = getColors(difficulty);

  const [phase, setPhase] = useState<Phase>("thinking");
  const [level, setLevel] = useState(1);
  const [scores, setScores] = useState({ player: 0, cpu: 0 });
  const [pattern, setPattern] = useState<number[]>([]);
  const [replayProgress, setReplayProgress] = useState<number[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [tapFlash, setTapFlash] = useState<TapFlash | null>(null);
  const [shaking, setShaking] = useState(false);
  const [lastScorer, setLastScorer] = useState<"player" | "cpu" | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const locked = useRef(false);
  const thinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { playbackIndex, play: playPattern } = usePatternPlayback(
    pattern,
    difficulty.litMs,
    difficulty.stepMs,
    () => { locked.current = false; setAnimKey((k) => k + 1); setPhase("replaying"); },
  );

  const generateAndThink = useCallback((currentLevel: number) => {
    locked.current = true;
    setPhase("thinking");
    setReplayProgress([]);
    setTapFlash(null);
    const { pattern: p, thinkMs } = generateComputerPattern({
      buttonCount: difficulty.buttonCount,
      level: currentLevel,
      startingLength: difficulty.startingPatternLength,
    });
    setPattern(p);
    thinkTimer.current = setTimeout(() => {
      setAnimKey((k) => k + 1);
      setPhase("watching");
    }, thinkMs);
  }, [difficulty]);

  useEffect(() => {
    generateAndThink(1);
    return () => { if (thinkTimer.current) clearTimeout(thinkTimer.current); };
  }, [generateAndThink]);

  useEffect(() => {
    if (phase === "watching" && pattern.length > 0) {
      playPattern();
    }
  }, [phase, pattern, playPattern]);

  const handleReplayTap = useCallback((index: number) => {
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
        setScores((s) => ({ ...s, cpu: s.cpu + 1 }));
        setLastScorer("cpu");
        setTimeout(() => setLastScorer(null), 750);
        setAnimKey((k) => k + 1);
        setPhase("result");
      }, 450);
    } else if (next.length === pattern.length) {
      locked.current = true;
      playSuccess();
      setTapFlash({ index, type: "correct" });
      setTimeout(() => {
        setTapFlash(null);
        setResult("correct");
        setScores((s) => ({ ...s, player: s.player + 1 }));
        setLastScorer("player");
        setTimeout(() => setLastScorer(null), 750);
        setAnimKey((k) => k + 1);
        setPhase("result");
      }, 450);
    } else {
      playNote(index);
      setTapFlash({ index, type: "correct" });
      setTimeout(() => setTapFlash(null), 175);
    }
  }, [replayProgress, pattern]);

  const handleNextRound = () => {
    if (result === "correct") {
      playLevelUp();
      const next = level + 1;
      setLevel(next);
      setResult(null);
      generateAndThink(next);
    } else {
      setResult(null);
      generateAndThink(level);
    }
  };

  const handleRewatch = () => {
    locked.current = true;
    setReplayProgress([]);
    setAnimKey((k) => k + 1);
    setPhase("watching");
  };

  const patternLength = difficulty.startingPatternLength + level - 1;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background text-foreground relative overflow-hidden font-sans">
      <Confetti active={phase === "result" && result === "correct"} />

      {/* Top bar */}
      <div className="w-full max-w-sm mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl border-2 transition-all duration-200 ${phase === "replaying" ? "border-[#FF3366] bg-[#FF3366]/10 scale-105" : "border-white/10 bg-white/5"}`}>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[64px]">{player1Name}</span>
            <span className={`text-xl font-extrabold text-white leading-tight inline-block ${lastScorer === "player" ? "score-bump" : ""}`}>{scores.player}</span>
          </div>
          <span className="text-muted-foreground font-bold text-xs flex-shrink-0">vs</span>
          <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl border-2 transition-all duration-200 ${phase === "watching" ? "border-[#2979FF] bg-[#2979FF]/10 scale-105" : "border-white/10 bg-white/5"}`}>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">CPU</span>
            <span className={`text-xl font-extrabold text-white leading-tight inline-block ${lastScorer === "cpu" ? "score-bump" : ""}`}>{scores.cpu}</span>
          </div>
          <div className="flex flex-col items-center px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 ml-auto flex-shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lvl</span>
            <span className="text-xl font-extrabold text-white leading-tight">{level}</span>
          </div>
        </div>
        <button onClick={onExit} className="text-xs px-3 py-2 bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white rounded-xl font-bold uppercase tracking-wider transition-all border border-white/10 active:scale-95 flex-shrink-0">Exit</button>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center px-4 py-4 flex-1 gap-5">

        {/* THINKING */}
        {phase === "thinking" && (
          <div key={`think-${animKey}`} className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500 pt-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2979FF, #D500F9)", boxShadow: "0 0 48px rgba(41,121,255,0.55)", animation: "orb-pulse 1.2s ease-in-out infinite" }}>
                <span className="text-4xl">🤖</span>
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent" style={{ borderTopColor: "#2979FF", borderRightColor: "#D500F9", animation: "spin 1.2s linear infinite" }} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold text-white">CPU is thinking…</h2>
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">
                Preparing {difficulty.emoji} Level {level} pattern ({patternLength} steps)
              </p>
            </div>
            <ColorGrid colors={colors} cols={difficulty.gridCols} onTap={() => {}} disabled={true} />
          </div>
        )}

        {/* WATCHING */}
        {phase === "watching" && (
          <div key={`watch-${animKey}`} className="w-full flex flex-col items-center gap-5 animate-in zoom-in-95 fade-in duration-300">
            <div className="text-center space-y-2 w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Watch the Pattern</p>
              <h2 className="text-2xl font-extrabold text-white">
                <span style={{ color: "#2979FF", textShadow: "0 0 14px rgba(41,121,255,0.8)" }}>CPU</span> is showing you…
              </h2>
              <p className="text-sm text-muted-foreground">{patternLength} buttons · memorise them!</p>
            </div>
            <ColorGrid colors={colors} cols={difficulty.gridCols} onTap={() => {}} playbackIndex={playbackIndex} disabled={true} />
          </div>
        )}

        {/* REPLAYING */}
        {phase === "replaying" && (
          <div key={`rep-${animKey}`} className="w-full flex flex-col items-center gap-5 animate-in zoom-in-95 fade-in duration-300">
            <div className="text-center space-y-2 w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Repeat the Pattern</p>
              <h2 className="text-2xl font-extrabold text-white">
                <span style={{ color: "#FF3366", textShadow: "0 0 14px rgba(255,51,102,0.8)" }}>{player1Name}</span>, repeat it!
              </h2>
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tapped:</span>
                <span className="text-xl font-extrabold text-white inline-block counter-bump" key={replayProgress.length}>{replayProgress.length}</span>
                <span className="text-muted-foreground font-bold">/ {pattern.length}</span>
              </div>
            </div>
            <ColorGrid colors={colors} cols={difficulty.gridCols} onTap={handleReplayTap} tapFlash={tapFlash} disabled={locked.current} shaking={shaking} />
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full rounded-full transition-all duration-200" style={{ width: `${(replayProgress.length / pattern.length) * 100}%`, background: "linear-gradient(90deg, #FF3366, #D500F9)", boxShadow: "0 0 10px rgba(213,0,249,0.7)" }} />
            </div>
            <button onClick={handleRewatch} className="text-xs px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-all border border-white/10 active:scale-95">
              👁 Watch Again
            </button>
          </div>
        )}

        {/* RESULT */}
        {phase === "result" && (
          <div key={`res-${animKey}`} className="w-full flex flex-col items-center gap-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <h2 className="text-6xl font-extrabold uppercase tracking-tight result-pop"
                style={result === "correct" ? { color: "#00E676", textShadow: "0 0 30px rgba(0,230,118,0.9)" } : { color: "#FF3366", textShadow: "0 0 30px rgba(255,51,102,0.9)" }}>
                {result === "correct" ? "Correct!" : "Wrong!"}
              </h2>
              <p className="text-lg font-bold text-white">
                {result === "correct" ? `+1 for ${player1Name}!` : "+1 for CPU!"}
              </p>
              {result === "correct" && (
                <p className="text-sm text-muted-foreground animate-in fade-in duration-500 delay-200">
                  Level {level + 1} coming up — {patternLength + 1} steps!
                </p>
              )}
            </div>
            <div className="w-full bg-card p-5 rounded-3xl border border-white/10 shadow-2xl space-y-4">
              <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">Scoreboard</p>
              <div className="flex justify-around items-center">
                <div className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-2 transition-all duration-300 ${result === "correct" ? "border-[#FF3366] bg-[#FF3366]/15 scale-105" : "border-white/10"}`}>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{player1Name}</span>
                  <span className={`text-4xl font-extrabold text-white inline-block ${lastScorer === "player" ? "score-bump" : ""}`}>{scores.player}</span>
                </div>
                <span className="text-2xl font-extrabold text-muted-foreground">:</span>
                <div className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-2 transition-all duration-300 ${result === "wrong" ? "border-[#2979FF] bg-[#2979FF]/15 scale-105" : "border-white/10"}`}>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">🤖 CPU</span>
                  <span className={`text-4xl font-extrabold text-white inline-block ${lastScorer === "cpu" ? "score-bump" : ""}`}>{scores.cpu}</span>
                </div>
              </div>
            </div>
            <button onClick={handleNextRound}
              className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all active:scale-95"
              style={{ background: result === "correct" ? "linear-gradient(135deg, #00E676 0%, #2979FF 100%)" : "linear-gradient(135deg, #FF3366 0%, #D500F9 100%)", boxShadow: "0 0 28px rgba(213,0,249,0.55), 0 6px 0 #7f0095", color: "#fff" }}>
              {result === "correct" ? `Level ${level + 1} →` : "Try Again →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
