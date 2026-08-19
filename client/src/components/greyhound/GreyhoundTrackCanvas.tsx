import React, { useEffect, useRef } from 'react';
import { IGreyhound, GreyhoundRaceStatus } from '../../shared';

interface GreyhoundTrackCanvasProps {
  roster: IGreyhound[];
  positions: Record<number, number>;
  harePosition: number;
  raceStatus: GreyhoundRaceStatus;
  winner: number | null;
  podium: number[];
  selectedTrap: number;
}

interface SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface CameraFlash {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  angle: number;
  vAngle: number;
}

// 6 Sleek Greyhound Coat Palettes
const HOUND_COATS = [
  { primary: '#1e293b', secondary: '#0f172a', highlight: '#334155', muzzle: '#020617' }, // Dark Slate / Blue Brindle
  { primary: '#d97706', secondary: '#92400e', highlight: '#f59e0b', muzzle: '#451a03' }, // Fawn / Red Brindle
  { primary: '#94a3b8', secondary: '#64748b', highlight: '#cbd5e1', muzzle: '#334155' }, // Silver / White Gray
  { primary: '#18181b', secondary: '#09090b', highlight: '#27272a', muzzle: '#000000' }, // Solid Black
  { primary: '#78350f', secondary: '#451a03', highlight: '#9a3412', muzzle: '#290f01' }, // Dun / Mahogany
  { primary: '#475569', secondary: '#1e293b', highlight: '#64748b', muzzle: '#0f172a' }, // Blue Fawn
];

export const GreyhoundTrackCanvas: React.FC<GreyhoundTrackCanvasProps> = ({
  roster,
  positions,
  harePosition,
  raceStatus,
  winner,
  selectedTrap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const smoothedPositions = useRef<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
  const smoothedHare = useRef<number>(0);
  const particles = useRef<SandParticle[]>([]);
  const flashes = useRef<CameraFlash[]>([]);
  const confettiList = useRef<Confetti[]>([]);
  const gallopPhase = useRef<number>(0);
  const trackScroll = useRef<number>(0);

  useEffect(() => {
    if (raceStatus === 'FINISHED' && winner) {
      const colors = ['#ef4444', '#3b82f6', '#f8fafc', '#f97316', '#10b981', '#fbbf24', '#a855f7'];
      confettiList.current = Array.from({ length: 140 }, () => ({
        x: Math.random() * 950 + 25,
        y: Math.random() * 120 + 30,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 8 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 7 + 4,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.25,
      }));
    } else {
      confettiList.current = [];
    }
  }, [raceStatus, winner]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const width = canvas.width;
      const height = canvas.height;

      // Update rapid gallop stride cycle
      if (raceStatus === 'RACING') {
        gallopPhase.current += dt * 19; // Ultra-fast greyhound rotary gallop
        trackScroll.current = (trackScroll.current + dt * 600) % 70;
      } else {
        gallopPhase.current += dt * 2.5; // Idle breathing
      }

      // Smooth interpolation
      roster.forEach((d) => {
        const target = positions[d.trapNumber] || 0;
        const curr = smoothedPositions.current[d.trapNumber] || 0;
        smoothedPositions.current[d.trapNumber] += (target - curr) * Math.min(1, dt * 14);
      });

      const targetHare = harePosition || 0;
      smoothedHare.current += (targetHare - smoothedHare.current) * Math.min(1, dt * 16);

      // -----------------------------------------------------------------------
      // 1. STADIUM BACKGROUND, FLOODLIGHTS & CAMERA FLASHES
      // -----------------------------------------------------------------------
      ctx.clearRect(0, 0, width, height);

      // Night sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.3);
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.28);

      // Grandstand Tier
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, height * 0.2, width, height * 0.08);

      // Cheering Spectators
      ctx.fillStyle = '#1f2937';
      for (let x = 8; x < width; x += 7) {
        const cheerOffset = Math.sin(time * 0.01 + x) * (raceStatus === 'RACING' ? 4 : 1);
        const torsoH = 6 + Math.sin(x * 77) * 2;
        ctx.beginPath();
        ctx.arc(x, height * 0.23 + cheerOffset, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 2, height * 0.23 + cheerOffset + 2, 4, torsoH);
      }

      // Floodlights
      const floodlights = [width * 0.15, width * 0.5, width * 0.85];
      floodlights.forEach((fx) => {
        const beamGrad = ctx.createRadialGradient(fx, 0, 8, fx, height * 0.7, 300);
        beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
        beamGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.12)');
        beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(fx, 0);
        ctx.lineTo(fx - 170, height);
        ctx.lineTo(fx + 170, height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fffbeb';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(fx, 6, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Camera Flashes
      if (raceStatus === 'RACING' && Math.random() < 0.22) {
        flashes.current.push({
          x: Math.random() * width,
          y: height * 0.21 + Math.random() * 16,
          alpha: 1.0,
          radius: Math.random() * 14 + 6,
        });
      }

      flashes.current.forEach((flash) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash.alpha})`;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
        ctx.fill();
        flash.alpha -= dt * 4.5;
      });
      flashes.current = flashes.current.filter((f) => f.alpha > 0);

      // -----------------------------------------------------------------------
      // 2. SAND / DIRT RACE TRACK & MECHANICAL HARE RAIL
      // -----------------------------------------------------------------------
      const trackTop = height * 0.28;
      const trackBottom = height - 12;
      const trackHeight = trackBottom - trackTop;
      const laneHeight = trackHeight / 6;

      // Sand track surface gradient
      const sandGrad = ctx.createLinearGradient(0, trackTop, 0, trackBottom);
      sandGrad.addColorStop(0, '#78350f');
      sandGrad.addColorStop(0.25, '#92400e');
      sandGrad.addColorStop(0.65, '#b45309');
      sandGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, trackTop, width, trackHeight);

      // Moving sand furrow texture lines
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.08)';
      ctx.lineWidth = 2;
      for (let x = -trackScroll.current; x < width; x += 45) {
        ctx.beginPath();
        ctx.moveTo(x, trackTop);
        ctx.lineTo(x, trackBottom);
        ctx.stroke();
      }

      // Top Steel Rail for Mechanical Hare
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, trackTop - 5, width, 5);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, trackTop - 3, width, 1.5); // Rail highlight

      // Bottom Rail Fence
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, trackBottom - 2, width, 4.5);
      for (let x = 0; x < width; x += 40) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x, trackBottom - 4, 3, 10);
      }

      // Distance Markers
      const markers = [
        { label: 'TRAPS', x: 75 },
        { label: '200m', x: width * 0.32 },
        { label: '400m', x: width * 0.54 },
        { label: '600m', x: width * 0.76 },
        { label: 'FINISH 🏁', x: width - 85 },
      ];

      markers.forEach((m) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(m.x, trackTop);
        ctx.lineTo(m.x, trackBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(m.x - 24, trackTop + 3, 48, 15);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(m.x - 24, trackTop + 3, 48, 15);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(m.label, m.x, trackTop + 14);
      });

      // Finish Line Checkered Banner
      const finishX = width - 85;
      const checkW = 6;
      for (let y = trackTop; y < trackBottom; y += checkW * 2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(finishX, y, checkW, checkW);
        ctx.fillRect(finishX + checkW, y + checkW, checkW, checkW);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(finishX + checkW, y, checkW, checkW);
        ctx.fillRect(finishX, y + checkW, checkW, checkW);
      }

      // -----------------------------------------------------------------------
      // 3. MECHANICAL HARE (LURE) SPEEDING ALONG TOP INSIDE RAIL
      // -----------------------------------------------------------------------
      const startX = 75;
      const raceTrackWidth = width - 170;
      const hareX = startX + (smoothedHare.current / 100) * raceTrackWidth + 25;

      if (raceStatus === 'RACING') {
        // Hare Motor Arm
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(hareX - 6, trackTop - 12, 12, 10);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hareX - 6, trackTop - 12, 12, 10);

        // Electric Spark / Light
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(hareX, trackTop - 7, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Mechanical Hare Dummy (White Fur Rabbit Dummy with Orange Flag)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(hareX + 6, trackTop + 4, 10, 4.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Hare Ears
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(hareX + 12, trackTop + 1, 6, 2);
        // Orange Lure Ribbon
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hareX - 4, trackTop + 4);
        ctx.lineTo(hareX - 16, trackTop + 5 + Math.sin(time * 0.05) * 3);
        ctx.stroke();
      }

      // -----------------------------------------------------------------------
      // 4. DRAW 6 RACING TRAP LANES & GREYHOUNDS
      // -----------------------------------------------------------------------
      roster.forEach((dog, idx) => {
        const laneY = trackTop + idx * laneHeight;
        const dogCenterY = laneY + laneHeight * 0.58;
        const coat = HOUND_COATS[(dog.trapNumber - 1) % HOUND_COATS.length];
        const isSelected = selectedTrap === dog.trapNumber;
        const isWinner = winner === dog.trapNumber;
        const posPercent = smoothedPositions.current[dog.trapNumber] || 0;
        const dogX = startX + (posPercent / 100) * raceTrackWidth;

        // Lane Separator Lines
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, laneY);
          ctx.lineTo(width, laneY);
          ctx.stroke();
        }

        // Selected Lane Aura
        if (isSelected) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
          ctx.fillRect(0, laneY, width, laneHeight);
        }

        // Starting Trap Box
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(startX - 52, laneY + 3, 40, laneHeight - 6);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(startX - 52, laneY + 3, 40, laneHeight - 6);

        // Trap Vest Number Badge
        ctx.fillStyle = dog.vestColor;
        ctx.beginPath();
        ctx.roundRect(startX - 46, laneY + 6, 28, laneHeight - 12, 4);
        ctx.fill();
        ctx.fillStyle = dog.vestTextColor;
        ctx.font = '900 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${dog.trapNumber}`, startX - 32, laneY + laneHeight * 0.56);

        // Trap Swing-up Gate
        if (raceStatus === 'RACING') {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX - 12, laneY + 3);
          ctx.lineTo(startX - 4, laneY - 4);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX - 12, laneY + 3);
          ctx.lineTo(startX - 12, laneY + laneHeight - 3);
          ctx.stroke();
        }

        // Sand Particles Emitter during race
        if (raceStatus === 'RACING' && Math.random() < 0.5) {
          particles.current.push({
            x: dogX - 24,
            y: dogCenterY + 10 + (Math.random() - 0.5) * 4,
            vx: -Math.random() * 6 - 3,
            vy: (Math.random() - 0.5) * 3 - 1,
            size: Math.random() * 3 + 1,
            color: Math.random() > 0.4 ? '#d97706' : '#b45309',
            alpha: 0.9,
            decay: 0.04,
          });
        }

        // -------------------------------------------------------------------
        // 5. DOUBLE-SUSPENSION GREYHOUND SPRINTING SPRITE
        // -------------------------------------------------------------------
        ctx.save();
        ctx.translate(dogX, dogCenterY);

        // Gallop cycle calculation
        const phase = gallopPhase.current + idx * 0.75;
        const bobY = Math.sin(phase) * (raceStatus === 'RACING' ? 3.5 : 1);
        const flexSpine = Math.cos(phase) * (raceStatus === 'RACING' ? 0.12 : 0.02);

        // Ground Drop Shadow
        const shadowScale = 1 + Math.sin(phase) * 0.28;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(-2, 14, 24 * shadowScale, 4.5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, bobY);
        ctx.rotate(flexSpine);

        // 1) LONG TAPERING TAIL
        ctx.strokeStyle = coat.secondary;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-22, -1);
        const tailW1 = Math.sin(phase * 1.5) * 6 - 4;
        const tailW2 = Math.cos(phase * 1.5) * 8 - 8;
        ctx.bezierCurveTo(-30, tailW1, -38, tailW2, -44, tailW2 + 2);
        ctx.stroke();

        // 2) SLENDER HIND LEGS (Double-Suspension Rotary Kinematics)
        const hindPhaseFar = phase + Math.PI + 0.35;
        const hindPhaseNear = phase + Math.PI;

        // Far Hind Leg
        const farHockX = -18 + Math.sin(hindPhaseFar) * 14;
        const farHockY = 6 + Math.max(0, Math.cos(hindPhaseFar)) * 8;
        const farPawX = farHockX + Math.sin(hindPhaseFar) * 8;
        const farPawY = farHockY + 9 + Math.max(0, Math.sin(hindPhaseFar)) * 5;

        ctx.strokeStyle = coat.secondary;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(-17, 5);
        ctx.lineTo(farHockX, farHockY);
        ctx.lineTo(farPawX, farPawY);
        ctx.stroke();

        // Near Hind Leg
        const nearHockX = -14 + Math.sin(hindPhaseNear) * 16;
        const nearHockY = 6 + Math.max(0, Math.cos(hindPhaseNear)) * 9;
        const nearPawX = nearHockX + Math.sin(hindPhaseNear) * 9;
        const nearPawY = nearHockY + 10 + Math.max(0, Math.sin(hindPhaseNear)) * 6;

        ctx.strokeStyle = coat.primary;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-14, 5);
        ctx.lineTo(nearHockX, nearHockY);
        ctx.lineTo(nearPawX, nearPawY);
        ctx.stroke();

        // Dark Paws
        ctx.fillStyle = coat.muzzle;
        ctx.fillRect(nearPawX - 1, nearPawY, 3, 2);

        // 3) AERODYNAMIC GREYHOUND TORSO & TUCKED FLANK
        ctx.fillStyle = coat.primary;
        ctx.beginPath();
        ctx.moveTo(-22, -2);
        ctx.bezierCurveTo(-18, -10, -4, -10, 6, -8); // Arching Spine / Withers
        ctx.bezierCurveTo(14, -6, 18, 0, 18, 5); // Deep Chest
        ctx.bezierCurveTo(12, 8, 2, 7, -6, 3); // Extremely Tucked Waist / Abdomen
        ctx.bezierCurveTo(-14, 2, -22, 4, -22, -2); // Flank & Croup
        ctx.closePath();
        ctx.fill();

        // Specular Muscle Highlight on deep chest and loin
        const houndShine = ctx.createRadialGradient(2, -3, 2, 0, 0, 18);
        houndShine.addColorStop(0, coat.highlight);
        houndShine.addColorStop(0.5, coat.primary);
        houndShine.addColorStop(1, coat.secondary);
        ctx.fillStyle = houndShine;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 6.5, -0.05, 0, Math.PI * 2);
        ctx.fill();

        // 4) OFFICIAL NUMBERED RACING VEST / BLANKET
        ctx.fillStyle = dog.vestColor;
        ctx.beginPath();
        ctx.roundRect(-8, -8, 16, 10, 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = dog.vestTextColor;
        ctx.font = '900 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${dog.trapNumber}`, 0, 0);

        // 5) SLEEK SLENDER NECK & POINTED MUZZLE
        ctx.fillStyle = coat.primary;
        ctx.beginPath();
        ctx.moveTo(12, -4);
        ctx.lineTo(22, -12); // Neck Poll
        ctx.lineTo(34, -8); // Long Pointed Muzzle
        ctx.lineTo(32, -4); // Lower Jaw
        ctx.lineTo(16, 4); // Throatlatch
        ctx.closePath();
        ctx.fill();

        // Black Muzzle & Nose Tip
        ctx.fillStyle = coat.muzzle;
        ctx.beginPath();
        ctx.arc(33, -7.5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Folded Rose Ears
        ctx.fillStyle = coat.secondary;
        ctx.beginPath();
        ctx.moveTo(22, -12);
        ctx.lineTo(25, -16);
        ctx.lineTo(26, -11);
        ctx.closePath();
        ctx.fill();

        // Racing Muzzle Basket (Light Wire Mesh)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(26, -9, 8, 4);

        // 6) FORELEGS (Extended Reaching Phase)
        const forePhaseFar = phase + 0.35;
        const forePhaseNear = phase + Math.PI;

        // Far Foreleg
        const farKneeX = 16 + Math.cos(forePhaseFar) * 8;
        const farKneeY = 6 + Math.max(0, Math.sin(forePhaseFar)) * 5;
        const farForePawX = farKneeX + Math.cos(forePhaseFar) * 11;
        const farForePawY = farKneeY + 9 + Math.max(0, Math.cos(forePhaseFar)) * 6;

        ctx.strokeStyle = coat.secondary;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(12, 1);
        ctx.lineTo(14, 5);
        ctx.lineTo(farKneeX, farKneeY);
        ctx.lineTo(farForePawX, farForePawY);
        ctx.stroke();

        // Near Foreleg
        const nearKneeX = 18 + Math.cos(forePhaseNear) * 9;
        const nearKneeY = 6 + Math.max(0, Math.sin(forePhaseNear)) * 5;
        const nearForePawX = nearKneeX + Math.cos(forePhaseNear) * 12;
        const nearForePawY = nearKneeY + 9 + Math.max(0, Math.cos(forePhaseNear)) * 6;

        ctx.strokeStyle = coat.primary;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(14, 1);
        ctx.lineTo(16, 5);
        ctx.lineTo(nearKneeX, nearKneeY);
        ctx.lineTo(nearForePawX, nearForePawY);
        ctx.stroke();

        ctx.fillStyle = coat.muzzle;
        ctx.fillRect(nearForePawX - 1, nearForePawY, 3, 2);

        // 7) 1ST PLACE WINNER TROPHY & CROWN
        if (isWinner) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👑', 0, -24);

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('1ST', 0, -34);
        }

        ctx.restore();
      });

      // -----------------------------------------------------------------------
      // 6. UPDATE & RENDER SAND PARTICLES
      // -----------------------------------------------------------------------
      particles.current.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      });
      particles.current = particles.current.filter((p) => p.alpha > 0);

      // -----------------------------------------------------------------------
      // 7. WINNER CONFETTI CELEBRATION
      // -----------------------------------------------------------------------
      confettiList.current.forEach((c) => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        ctx.restore();

        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.12;
        c.angle += c.vAngle;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [roster, positions, harePosition, raceStatus, winner, selectedTrap]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-600/60 bg-slate-950">
      <canvas
        ref={canvasRef}
        width={1000}
        height={480}
        className="w-full h-auto block select-none"
      />
    </div>
  );
};
