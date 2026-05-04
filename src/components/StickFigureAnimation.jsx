import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

// Built-in stick-figure fallback frames
const ANIMATION_FRAMES = {
  plank: [
    { head: [30, 35], body: [[35, 38], [75, 38]], lArm: [25, 55], rArm: [25, 55], lLeg: [90, 55], rLeg: [90, 55] },
    { head: [30, 33], body: [[35, 36], [75, 38]], lArm: [25, 53], rArm: [25, 53], lLeg: [90, 55], rLeg: [90, 55] },
  ],
  pushup: [
    { head: [25, 30], body: [[30, 33], [70, 35]], lArm: [20, 55], rArm: [20, 55], lLeg: [85, 55], rLeg: [85, 55] },
    { head: [25, 42], body: [[30, 45], [70, 42]], lArm: [20, 55], rArm: [20, 55], lLeg: [85, 55], rLeg: [85, 55] },
  ],
  squat: [
    { head: [50, 15], body: [[50, 20], [50, 45]], lArm: [35, 35], rArm: [65, 35], lLeg: [40, 70], rLeg: [60, 70] },
    { head: [50, 25], body: [[50, 30], [50, 50]], lArm: [35, 40], rArm: [65, 40], lLeg: [35, 72], rLeg: [65, 72] },
  ],
  jumping_jack: [
    { head: [50, 15], body: [[50, 20], [50, 45]], lArm: [40, 35], rArm: [60, 35], lLeg: [45, 70], rLeg: [55, 70] },
    { head: [50, 12], body: [[50, 17], [50, 42]], lArm: [30, 10], rArm: [70, 10], lLeg: [30, 70], rLeg: [70, 70] },
  ],
  high_knees: [
    { head: [50, 15], body: [[50, 20], [50, 45]], lArm: [40, 30], rArm: [60, 38], lLeg: [45, 70], rLeg: [55, 70] },
    { head: [50, 13], body: [[50, 18], [50, 43]], lArm: [60, 38], rArm: [40, 30], lLeg: [45, 30], rLeg: [55, 70] },
  ],
  burpee: [
    { head: [50, 15], body: [[50, 20], [50, 45]], lArm: [35, 10], rArm: [65, 10], lLeg: [40, 70], rLeg: [60, 70] },
    { head: [25, 42], body: [[30, 45], [70, 42]], lArm: [20, 55], rArm: [20, 55], lLeg: [85, 55], rLeg: [85, 55] },
  ],
  mountain_climber: [
    { head: [25, 28], body: [[30, 32], [65, 35]], lArm: [20, 52], rArm: [20, 52], lLeg: [45, 48], rLeg: [80, 55] },
    { head: [25, 28], body: [[30, 32], [65, 35]], lArm: [20, 52], rArm: [20, 52], lLeg: [80, 55], rLeg: [45, 48] },
  ],
  lunge: [
    { head: [50, 15], body: [[50, 20], [50, 45]], lArm: [40, 35], rArm: [60, 35], lLeg: [35, 70], rLeg: [65, 70] },
    { head: [45, 20], body: [[45, 25], [45, 48]], lArm: [35, 38], rArm: [55, 38], lLeg: [25, 72], rLeg: [65, 72] },
  ],
};

const DEFAULT_FRAMES = [
  { head: [50, 15], body: [[50, 20], [50, 45]], lArm: [35, 35], rArm: [65, 35], lLeg: [42, 70], rLeg: [58, 70] },
  { head: [50, 13], body: [[50, 18], [50, 43]], lArm: [30, 30], rArm: [70, 30], lLeg: [40, 68], rLeg: [60, 68] },
];

function drawStickFigure(ctx, frame, color, w, h) {
  const s = (x, dim) => (x / 100) * dim;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(s(frame.head[0], w), s(frame.head[1], h), Math.min(w, h) * 0.06, 0, Math.PI * 2);
  ctx.fill();
  const line = (x1, y1, x2, y2) => {
    ctx.beginPath(); ctx.moveTo(s(x1, w), s(y1, h)); ctx.lineTo(s(x2, w), s(y2, h)); ctx.stroke();
  };
  line(frame.body[0][0], frame.body[0][1], frame.body[1][0], frame.body[1][1]);
  line(frame.body[0][0], frame.body[0][1], frame.lArm[0], frame.lArm[1]);
  line(frame.body[0][0], frame.body[0][1], frame.rArm[0], frame.rArm[1]);
  line(frame.body[1][0], frame.body[1][1], frame.lLeg[0], frame.lLeg[1]);
  line(frame.body[1][0], frame.body[1][1], frame.rLeg[0], frame.rLeg[1]);
}

function interpolateFrame(f1, f2, t) {
  const lerp = (a, b) => a + (b - a) * t;
  return {
    head: [lerp(f1.head[0], f2.head[0]), lerp(f1.head[1], f2.head[1])],
    body: [
      [lerp(f1.body[0][0], f2.body[0][0]), lerp(f1.body[0][1], f2.body[0][1])],
      [lerp(f1.body[1][0], f2.body[1][0]), lerp(f1.body[1][1], f2.body[1][1])],
    ],
    lArm: [lerp(f1.lArm[0], f2.lArm[0]), lerp(f1.lArm[1], f2.lArm[1])],
    rArm: [lerp(f1.rArm[0], f2.rArm[0]), lerp(f1.rArm[1], f2.rArm[1])],
    lLeg: [lerp(f1.lLeg[0], f2.lLeg[0]), lerp(f1.lLeg[1], f2.lLeg[1])],
    rLeg: [lerp(f1.rLeg[0], f2.rLeg[0]), lerp(f1.rLeg[1], f2.rLeg[1])],
  };
}

/**
 * StickFigureAnimation
 * 1. If exerciseIndex provided → try to load /assets/animations/{index}.json as Lottie
 * 2. If Lottie load fails or no index → fall back to built-in canvas stick figure
 */
export default function StickFigureAnimation({ animationType, exerciseIndex, size = 200, color = "hsl(230, 70%, 50%)" }) {
  const lottieRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [useLottie, setUseLottie] = useState(false);
  const [lottieReady, setLottieReady] = useState(false);

  // Try Lottie first if we have an index
  useEffect(() => {
    if (!exerciseIndex) { setUseLottie(false); return; }

    let destroyed = false;
    let anim = null;

    const url = `/assets/animations/${exerciseIndex}.json`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(data => {
        if (destroyed) return;
        // Must look like a Lottie file (has "v" version field)
        if (!data || !data.v) throw new Error('not lottie');
        setUseLottie(true);
        setLottieReady(true);
        // lottie mount happens in next effect
      })
      .catch(() => {
        if (!destroyed) { setUseLottie(false); setLottieReady(false); }
      });

    return () => { destroyed = true; };
  }, [exerciseIndex]);

  // Mount Lottie animation
  useEffect(() => {
    if (!useLottie || !lottieReady || !lottieRef.current) return;
    const url = `/assets/animations/${exerciseIndex}.json`;
    const anim = lottie.loadAnimation({
      container: lottieRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: url,
    });
    return () => anim.destroy();
  }, [useLottie, lottieReady, exerciseIndex]);

  // Canvas stick figure fallback
  useEffect(() => {
    if (useLottie) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const frames = ANIMATION_FRAMES[animationType] || DEFAULT_FRAMES;
    let cancelled = false;

    if (frames.length === 1) {
      drawStickFigure(ctx, frames[0], color, size, size);
      return;
    }

    let frameIndex = 0;
    let progress = 0;
    const animate = () => {
      if (cancelled) return;
      const nextIndex = (frameIndex + 1) % frames.length;
      drawStickFigure(ctx, interpolateFrame(frames[frameIndex], frames[nextIndex], progress), color, size, size);
      progress += 0.02;
      if (progress >= 1) { progress = 0; frameIndex = nextIndex; }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [useLottie, animationType, size, color]);

  if (useLottie && lottieReady) {
    return (
      <div
        ref={lottieRef}
        style={{ width: size, height: size }}
        className="mx-auto"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="mx-auto"
    />
  );
}