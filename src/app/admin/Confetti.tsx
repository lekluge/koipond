"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#c084fc", "#f472b6", "#a855f7", "#facc15", "#34d399", "#60a5fa"];
const PARTICLE_COUNT = 150;
const DURATION_MS = 3000;
const GRAVITY = 0.35;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  color: string;
};

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: width / 2 + (Math.random() - 0.5) * 240,
      y: height / 2 + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -14 - 4,
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx!.restore();
      }
      if (elapsed < DURATION_MS) {
        frame = requestAnimationFrame(tick);
      }
    }
    frame = requestAnimationFrame(tick);

    function handleResize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[60]" />;
}
