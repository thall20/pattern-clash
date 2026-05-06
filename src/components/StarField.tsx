const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${((i * 4.13 + 1.9) % 92) + 2}%`,
  top:  `${((i * 7.71 + 2.3) % 88) + 4}%`,
  size: `${1.5 + (i % 3)}px`,
  delay: `${(i * 0.38) % 2.8}s`,
  dur:   `${2.0 + (i % 3) * 0.55}s`,
}));

export function StarField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {STARS.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: s.left, top: s.top,
            width: s.size, height: s.size,
            animation: `star-twinkle ${s.dur} ${s.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
