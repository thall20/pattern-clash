import { useState } from "react";
import type { ColorConfig, TapFlash } from "../engine/types";

interface ColorGridProps {
  colors: ColorConfig[];
  cols: 2 | 3;
  onTap: (index: number) => void;
  tapFlash?: TapFlash | null;
  /** Index being highlighted during computer/game playback */
  playbackIndex?: number | null;
  disabled: boolean;
  shaking?: boolean;
}

export function ColorGrid({
  colors, cols, onTap, tapFlash, playbackIndex, disabled, shaking,
}: ColorGridProps) {
  const [rippleKeys, setRippleKeys] = useState<number[]>(() => colors.map(() => 0));

  const handleTap = (index: number) => {
    if (disabled) return;
    setRippleKeys((prev) => prev.map((k, i) => (i === index ? k + 1 : k)));
    onTap(index);
  };

  const buttonSize = cols === 3 ? "h-20" : "h-24";

  return (
    <div
      className={`grid gap-3 w-full ${shaking ? "animate-shake" : ""}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {colors.map((c, i) => {
        const isFlashing = tapFlash?.index === i;
        const isPlayback = playbackIndex === i;
        const flashType = isFlashing ? tapFlash!.type : null;
        const lit = isFlashing || isPlayback;

        return (
          <button
            key={i}
            data-testid={`button-color-${i}`}
            onClick={() => handleTap(i)}
            aria-label={c.label}
            disabled={disabled}
            className={`${buttonSize} rounded-3xl transition-all duration-100 disabled:cursor-not-allowed relative overflow-hidden`}
            style={{
              background:
                flashType === "wrong"   ? "#ff0000" :
                flashType === "correct" ? "#00ff99" :
                isPlayback              ? "#ffffff"  :
                c.bg,
              boxShadow:
                flashType === "correct"
                  ? "0 0 40px rgba(0,255,153,0.95), 0 6px 0 #007040"
                  : flashType === "wrong"
                  ? "0 0 40px rgba(255,0,0,0.95), 0 6px 0 #7a0000"
                  : isPlayback
                  ? `0 0 52px rgba(255,255,255,0.9), 0 6px 0 #888`
                  : `0 0 20px ${c.glow}, 0 6px 0 ${c.shadow}`,
              transform: lit ? "scale(0.90) translateY(5px)" : "scale(1) translateY(0)",
              opacity: isPlayback ? 1 : undefined,
            }}
          >
            {rippleKeys[i] > 0 && (
              <span
                key={rippleKeys[i]}
                className="absolute pointer-events-none rounded-full"
                style={{
                  top: "50%", left: "50%",
                  width: "12px", height: "12px",
                  marginTop: "-6px", marginLeft: "-6px",
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
