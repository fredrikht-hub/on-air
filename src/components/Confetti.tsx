import { useEffect, useState } from 'react';
import { onConfetti } from '../game/fx';

interface Piece { id: number; x: number; dx: number; color: string; delay: number; rot: number; size: number }
const COLORS = ['#ffd84d', '#5dff9b', '#ff5d73', '#5aa9ff', '#c77dff', '#ff8a3d'];
let pid = 0;

export function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  useEffect(
    () =>
      onConfetti((power) => {
        const n = Math.round(60 * power);
        const batch = Array.from({ length: n }, () => ({
          id: ++pid,
          x: 20 + Math.random() * 60,
          dx: (Math.random() - 0.5) * 60,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 250,
          rot: Math.random() * 720 - 360,
          size: 6 + Math.random() * 6,
        }));
        setPieces((p) => [...p, ...batch]);
        const ids = new Set(batch.map((b) => b.id));
        window.setTimeout(() => setPieces((p) => p.filter((q) => !ids.has(q.id))), 2600);
      }),
    [],
  );
  return (
    <div className="confetti">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.x}%`, background: p.color, width: p.size, height: p.size * 0.6, animationDelay: `${p.delay}ms`,
            ['--dx' as string]: `${p.dx}vw`, ['--rot' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
