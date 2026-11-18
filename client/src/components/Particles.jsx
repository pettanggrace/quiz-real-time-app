import { useEffect, useRef } from 'react';

// Réseau de points réactif à la souris + gerbes d'étincelles (événement fx:burst)
function Particles() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w;
    let h;
    let raf;
    const mouse = { x: -999, y: -999 };
    const sparks = [];
    let dots = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = reduce ? 0 : Math.min(70, Math.floor((w * h) / 22000));
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      }));
    };
    const move = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onBurst = (e) => {
      const { x, y, kind } = e.detail;
      const hues = kind === 'good' ? [150, 170, 45, 200] : [0, 15, 340];
      const count = kind === 'good' ? 34 : 18;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1.5 + Math.random() * 5;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 1,
          life: 1,
          hue: hues[i % hues.length],
          r: 1.5 + Math.random() * 2.5,
        });
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const light = document.documentElement.dataset.theme === 'light';
      const hue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--h')) || 255;

      for (const d of dots) {
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 140) {
          d.vx += (dx / dist) * 0.05;
          d.vy += (dy / dist) * 0.05;
        }
        d.vx *= 0.985;
        d.vy *= 0.985;
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
      }
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        ctx.fillStyle = `hsla(${hue}, 90%, ${light ? 45 : 75}%, 0.55)`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 1.6, 0, 6.283);
        ctx.fill();
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            ctx.strokeStyle = `hsla(${hue}, 90%, ${light ? 45 : 70}%, ${(light ? 0.2 : 0.14) * (1 - d / 120)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.12;
        s.vx *= 0.98;
        s.life -= 0.02;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `hsla(${s.hue}, 95%, 65%, ${s.life})`;
        ctx.shadowColor = `hsl(${s.hue}, 95%, 60%)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.life + 0.5, 0, 6.283);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', move);
    window.addEventListener('fx:burst', onBurst);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('fx:burst', onBurst);
    };
  }, []);

  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}

export default Particles;
