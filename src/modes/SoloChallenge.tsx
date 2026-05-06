import { useState, useCallback, useRef, useEffect } from "react";
import type { GameSettings, TapFlash } from "../engine/types";
import { getColors } from "../engine/difficultyConfig";
import { generateComputerPattern } from "../engine/computerAI";
import { ColorGrid } from "../components/ColorGrid";
import { Confetti } from "../components/Confetti";
import { playNote, playSuccess, playFail, playLevelUp } from "../sounds/soundEngine";

type Phase = "get-ready" | "watching" | "replaying" | "result" | "game-over";

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
    pattern.forEach((idx) => {
      const onId = setTimeout(() => { setPlaybackIndex(idx); playNote(idx); }, offset);
      const offId = setTimeout(() => setPlaybackIndex(null), offset + litMs);
      timerIds.current.push(onId, offId);
      offset += stepMs;
    });
    const doneId = setTimeout(() => { setPlaybackIndex(null); onFinish(); }, offset + 200);
    timerIds.current.push(doneId);
  }, [pattern, litMs, stepMs, onFinish]);

  useEffect(() => () => { timerIds.current.forEach(clearTimeout); }, []);

  return { playbackIndex, play };
}

export function SoloChallenge({ settings, onExit }: Props) {
  const { difficulty, player1Name } = settings;
  const colors = getColors(difficulty);

  const [phase, setPhase] = useState<Phase>("get-ready");
  const [level, setLevel] = useState(1);
  const [bestLevel, setBestLevel] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [replayProgress, setReplayProgress] = useState<number[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [tapFlash, setTapFlash] = useState<TapFlash | null>(null);
  const [shaking, setShaking] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [watchCount, setWatchCount] = useState(0);
  const locked = useRef(false);

  const { playbackIndex, play: playPattern } = usePatternPlayback(
    pattern,
    difficulty.litMs,
    difficulty.stepMs,
    () => { locked.current = false; setAnimKey((k) => k + 1); setPhase("replaying"); },
  );

  const generateForLevel = useCallback((lv: number) => {
    const { pattern: p } = generateComputerPattern({
      buttonCount: difficulty.buttonCount,
      level: lv,
      startingLength: difficulty.startingPatternLength,
    });
    setPattern(p);
    setReplayProgress([]);
    setTapFlash(null);
    locked.current = true;
    setWatchCount(0);
    setAnimKey((k) => k + 1);
    setPhase("get-ready");
  }, [difficulty]);

  useEffect(() => { generateForLevel(1); }, [generateForLevel]);

  useEffect(() => {
    if (phase === "watching" && pattern.length > 0) {
      playPattern();
    }
  }, [phase, pattern, playPattern]);

  const handleStartWatch = () => {
    setWatchCount((c) => c + 1);
    locked.current = true;
    setReplayProgress([]);
    setAnimKey((k) => k + 1);
    setPhase("watching");
  };

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
        setAnimKey((k) => k + 1);
        setPhase("game-over");
      }, 450);
    } else if (next.length === pattern.length) {
      locked.current = true;
      playSuccess();
      setTapFlash({ index, type: "correct" });
      setTimeout(() => {
        setTapFlash(null);
        setResult("correct");
        setAnimKey((k) => k + 1);
        setPhase("result");
      }, 450);
    } else {
      playNote(index);
      setTapFlash({ index, type: "correct" });
      setTimeout(() => setTapFlash(null), 175);
    }
  }, [replayProgress, pattern]);

  const handleNextLevel = () => {
    playLevelUp();
    const next = level + 1;
    setBestLevel((b) => Math.max(b, next));
    setLevel(next);
    setResult(null);
    generateForLevel(next);
  };

  const handleRetry = () => {
    setResult(null);
    generateForLevel(level);
  };

  const handleRestart = () => {
    setLevel(1);
    setResult(null);
    generateForLevel(1);
  };

  const patternLength = difficulty.startingPatternLength + level - 1;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background text-foreground relative overflow-hidden font-sans">
      <Confetti active={phase === "result" && result === "correct"} />

      {/* Top bar */}
      <div className="w-full max-w-sm mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center px-3 py-1.5 rounded-xl border-2 border-[#FFD700]/60 bg-[#FFD700]/10">
            <span className="text-[10px] font-bold text-[#FFD700] uppercase tracking-wider">Level</span>
            <span className="text-xl font-extrabold text-white leading-tight">{level}</span>
          </div>
          <div className="flex flex-col items-center px-3 py-1.5 rounded-xl border-2 border-white/10 bg-white/5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Best</span>
            <span className="text-xl font-extrabold text-white leading-tight">{bestLevel}</span>
          </div>
          <div className="flex flex-col items-center px-3 py-1.5 rounded-xl border-2 border-white/10 bg-white/5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Steps</span>
            <span className="text-xl font-extrabold text-white leading-tight">{patternLength}</span>
          </div>
        </div>
        <button onClick={onExit} className="text-xs px-3 py-2 bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white rounded-xl font-bold uppercase tracking-wider transition-all border border-white/10 active:scale-95">Exit</button>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center px-4 py-4 flex-1 gap-5">

        {/* GET READY */}
        {phase === "get-ready" && (
          <div key={`gr-${animKey}`} className="w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-400 pt-4">
            <div className="text-center space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Solo Challenge</p>
              <h2 className="text-2xl font-extrabold text-white">
                Level <span style={{ color: "#FFD700", textShadow: "0 0 14px rgba(255,215,0,0.8)" }}>{level}</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {difficulty.emoji} {difficulty.label} · {patternLength}-step pattern
              </p>
              <p className="text-sm font-bold text-white mt-1">
                Watch the pattern, then repeat it from memory.
              </p>
            </div>
            <ColorGrid colors={colors} cols={difficulty.gridCols} onTap={() => {}} disabled={true} />
            <button onClick={handleStartWatch}
              className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)", boxShadow: "0 0 22px rgba(255,215,0,0.55), 0 6px 0 #7a5900", color: "#1a1a1a" }}>
              👁 Watch Pattern
            </button>
          </div>
        )}

        {/* WATCHING */}
        {phase === "watching" && (
          <div key={`wa-${animKey}`} className="w-full flex flex-col items-center gap-5 animate-in zoom-in-95 fade-in duration-300">
            <div className="text-center space-y-2 w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memorise the Pattern</p>
              <h2 className="text-2xl font-extrabold text-white">
                Watch carefully, <span style={{ color: "#FFD700", textShadow: "0 0 14px rgba(255,215,0,0.8)" }}>{player1Name}</span>!
              </h2>
              <p className="text-sm text-muted-foreground">{patternLength} buttons</p>
            </div>
            <ColorGrid colors={colors} cols={difficulty.gridCols} onTap={() => {}} playbackIndex={playbackIndex} disabled={true} />
          </div>
        )}

        {/* REPLAYING */}
        {phase === "replaying" && (
          <div key={`rep-${animKey}`} className="w-full flex flex-col items-center gap-5 animate-in zoom-in-95 fade-in duration-300">
            <div className="text-center space-y-2 w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Repeat from Memory</p>
              <h2 className="text-2xl font-extrabold text-white">
                Go, <span style={{ color: "#FFD700", textShadow: "0 0 14px rgba(255,215,0,0.8)" }}>{player1Name}</span>!
              </h2>
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tapped:</span>
                <span className="text-xl font-extrabold text-white inline-block counter-bump" key={replayProgress.length}>{replayProgress.length}</span>
                <span className="text-muted-foreground font-bold">/ {pattern.length}</span>
              </div>
            </div>
            <ColorGrid colors={colors} cols={difficulty.gridCols} onTap={handleReplayTap} tapFlash={tapFlash} disabled={locked.current} shaking={shaking} />
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full rounded-full transition-all duration-200" style={{ width: `${(replayProgress.length / pattern.length) * 100}%`, background: "linear-gradient(90deg, #FFD700, #FF8C00)", boxShadow: "0 0 10px rgba(255,215,0,0.7)" }} />
            </div>
          </div>
        )}

        {/* RESULT — level cleared */}
        {phase === "result" && (
          <div key={`res-${animKey}`} className="w-full flex flex-col items-center gap-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <h2 className="text-6xl font-extrabold uppercase tracking-tight result-pop" style={{ color: "#00E676", textShadow: "0 0 30px rgba(0,230,118,0.9)" }}>
                Cleared!
              </h2>
              <p className="text-xl font-bold text-white">Level {level} complete!</p>
              <p className="text-sm text-muted-foreground">Next: {patternLength + 1}-step pattern</p>
              {watchCount > 1 && (
                <p className="text-xs text-muted-foreground">Watched {watchCount}× — try to beat it in 1!</p>
              )}
            </div>
            <div className="flex gap-3 w-full">
              <div className="flex-1 bg-card p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Level</p>
                <p className="text-3xl font-extrabold text-[#FFD700]">{level}</p>
              </div>
              <div className="flex-1 bg-card p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Best</p>
                <p className="text-3xl font-extrabold text-white">{Math.max(bestLevel, level + 1)}</p>
              </div>
              <div className="flex-1 bg-card p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Watches</p>
                <p className="text-3xl font-extrabold text-white">{watchCount}</p>
              </div>
            </div>
            <button onClick={handleNextLevel}
              className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #00E676 0%, #2979FF 100%)", boxShadow: "0 0 28px rgba(0,230,118,0.55), 0 6px 0 #006640", color: "#fff" }}>
              Level {level + 1} →
            </button>
          </div>
        )}

        {/* GAME OVER */}
        {phase === "game-over" && (
          <div key={`go-${animKey}`} className="w-full flex flex-col items-center gap-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <h2 className="text-6xl font-extrabold uppercase tracking-tight result-pop" style={{ color: "#FF3366", textShadow: "0 0 30px rgba(255,51,102,0.9)" }}>
                Game Over
              </h2>
              <p className="text-xl font-bold text-white">{player1Name} reached Level {level}</p>
              <p className="text-sm text-muted-foreground">Pattern was {patternLength} steps</p>
            </div>
            <div className="flex gap-3 w-full">
              <div className="flex-1 bg-card p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Level Reached</p>
                <p className="text-3xl font-extrabold text-[#FF3366]">{level}</p>
              </div>
              <div className="flex-1 bg-card p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">All-Time Best</p>
                <p className="text-3xl font-extrabold text-[#FFD700]">{bestLevel}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button onClick={handleRetry}
                className="w-full py-4 rounded-full font-extrabold text-xl uppercase tracking-wider transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #FF3366 0%, #D500F9 100%)", boxShadow: "0 0 28px rgba(213,0,249,0.55), 0 6px 0 #7f0095", color: "#fff" }}>
                Retry Level {level}
              </button>
              <button onClick={handleRestart}
                className="w-full py-3 rounded-full font-bold text-base uppercase tracking-wider transition-all active:scale-95 bg-white/10 hover:bg-white/15 text-muted-foreground hover:text-white border border-white/10">
                Start from Level 1
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
