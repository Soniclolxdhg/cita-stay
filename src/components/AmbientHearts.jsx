import React, { useMemo } from 'react';

const ICONS = ['💕', '🌸', '✨', '💖', '🕊️', '🌿'];

export default function AmbientHearts() {
  const hearts = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      icon: ICONS[i % ICONS.length],
      left: `${(i * 7.5 + Math.random() * 5) % 96}%`,
      delay: `${(i * 1.6).toFixed(1)}s`,
      duration: `${14 + (i % 5) * 2}s`,
      size: `${0.9 + (i % 4) * 0.3}rem`,
    }));
  }, []);

  return (
    <div className="ambient-hearts" aria-hidden="true">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="ambient-heart"
          style={{
            left: h.left,
            animationDelay: h.delay,
            animationDuration: h.duration,
            fontSize: h.size,
          }}
        >
          {h.icon}
        </div>
      ))}
    </div>
  );
}
