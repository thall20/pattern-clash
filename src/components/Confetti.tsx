import { ALL_COLORS } from "../engine/difficultyConfig";

const PIECES = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  left: `${((i * 3.31 + 1.7) % 88) + 4}%`,
  delay: `${(i * 0.046) % 0.52}s`,
  color: ALL_COLORS[i % ALL_COLORS.length].bg,
  size: `${8 + (i % 5) * 2}px`,
  duration: `${1.1 + (i % 4) * 0.17}s`,
}));

export function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {PIECES.map((p) => (
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
