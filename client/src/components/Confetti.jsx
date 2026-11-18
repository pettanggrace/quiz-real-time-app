import { useEffect, useRef } from 'react';

const COLORS = ['#6366f1', '#818cf8', '#f59e0b', '#34d399', '#f472b6', '#38bdf8', '#a78bfa'];

function Confetti({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();

    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * -window.innerHeight,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vy: 2 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 3,
      rotation: Math.random() * 360,
      rv: (Math.random() - 0.5) * 8,
      opacity: 1,
    }));

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      frame++;

      for (const p of pieces) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(frame * 0.02 + p.x) * 0.5;
        p.rotation += p.rv;
        if (frame > 120) p.opacity = Math.max(0, p.opacity - 0.008);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (pieces.every((p) => p.opacity <= 0)) return;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(animId);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}
    />
  );
}

export default Confetti;
