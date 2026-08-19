import React, { useEffect, useRef } from 'react';
import { IHorse, HorseRaceStatus } from '../../shared';

interface HorseRaceTrackCanvasProps {
  roster: IHorse[];
  positions: Record<number, number>;
  raceStatus: HorseRaceStatus;
  winner: number | null;
  podium: number[];
  selectedHorse: number;
}

interface Particle {
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

// 8-phase skeletal galloping thoroughbred model
const HORSE_COLORS = [
  { body: '#4a2810', dark: '#2b1406', highlight: '#7a421d', mane: '#1a0d05' }, // Chestnut / Bay
  { body: '#242424', dark: '#121212', highlight: '#404040', mane: '#050505' }, // Black Stallion
  { body: '#8c5828', dark: '#523012', highlight: '#b87537', mane: '#241407' }, // Sorrel / Amber
  { body: '#614126', dark: '#382312', highlight: '#8c5f38', mane: '#1f1308' }, // Dark Bay
  { body: '#96826c', dark: '#5e5041', highlight: '#c4b099', mane: '#3d3429' }, // Roan / Gray
  { body: '#542616', dark: '#33150b', highlight: '#873e24', mane: '#1c0a04' }, // Mahogany
];

export const HorseRaceTrackCanvas: React.FC<HorseRaceTrackCanvasProps> = ({
  roster,
  positions,
  raceStatus,
  winner,
  selectedHorse,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Smooth position interpolation targets
  const smoothedPositions = useRef<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
  const particles = useRef<Particle[]>([]);
  const flashes = useRef<CameraFlash[]>([]);
  const confettiList = useRef<Confetti[]>([]);
  const gallopPhase = useRef<number>(0);
  const trackScroll = useRef<number>(0);

  // Confetti trigger on finish
  useEffect(() => {
    if (raceStatus === 'FINISHED' && winner) {
      const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ffffff'];
      confettiList.current = Array.from({ length: 120 }, () => ({
        x: Math.random() * 900 + 50,
        y: Math.random() * 100 + 50,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.2,
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

      // Update gallop cycle
      if (raceStatus === 'RACING') {
        gallopPhase.current += dt * 14; // High-speed galloping strides
        trackScroll.current = (trackScroll.current + dt * 450) % 80;
      } else {
        gallopPhase.current += dt * 3; // Idle breathing
      }

      // Smooth interpolation for horse positions
      roster.forEach((h) => {
        const target = positions[h.number] || 0;
        const curr = smoothedPositions.current[h.number] || 0;
        smoothedPositions.current[h.number] += (target - curr) * Math.min(1, dt * 10);
      });

      // -----------------------------------------------------------------------
      // 1. STADIUM BACKGROUND & GRANDSTAND CROWD WITH GODRAYS & LIGHTS
      // -----------------------------------------------------------------------
      ctx.clearRect(0, 0, width, height);

      // Sky gradient (Sunset twilight gold & deep indigo)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.3);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.6, '#1e1b4b');
      skyGrad.addColorStop(1, '#31103f');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.28);

      // Distant Stadium Grandstand Structure
      ctx.fillStyle = '#1e162a';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.22);
      ctx.lineTo(width, height * 0.22);
      ctx.lineTo(width, height * 0.28);
      ctx.lineTo(0, height * 0.28);
      ctx.fill();

      // Cheering Crowd Silhouette in Grandstand
      ctx.fillStyle = '#2d1f3d';
      for (let x = 10; x < width; x += 8) {
        const cheerOffset = Math.sin(time * 0.008 + x) * (raceStatus === 'RACING' ? 3 : 1);
        const headH = 5 + Math.sin(x * 123) * 2;
        ctx.beginPath();
        ctx.arc(x, height * 0.24 + cheerOffset, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 2, height * 0.24 + cheerOffset + 2, 4, headH);
      }

      // Stadium Floodlight Towers & Cones
      const floodlights = [width * 0.15, width * 0.5, width * 0.85];
      floodlights.forEach((fx) => {
        // Light Beam Cone
        const beamGrad = ctx.createRadialGradient(fx, 0, 5, fx, height * 0.6, 260);
        beamGrad.addColorStop(0, 'rgba(253, 230, 138, 0.25)');
        beamGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
        beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(fx, 0);
        ctx.lineTo(fx - 140, height);
        ctx.lineTo(fx + 140, height);
        ctx.closePath();
        ctx.fill();

        // Tower Lamp
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(fx, 6, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Random Paparazzi Camera Flashes in Crowd
      if (raceStatus === 'RACING' && Math.random() < 0.15) {
        flashes.current.push({
          x: Math.random() * width,
          y: height * 0.21 + Math.random() * 15,
          alpha: 1.0,
          radius: Math.random() * 12 + 6,
        });
      }

      flashes.current.forEach((flash) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash.alpha})`;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
        ctx.fill();
        flash.alpha -= dt * 4;
      });
      flashes.current = flashes.current.filter((f) => f.alpha > 0);

      // -----------------------------------------------------------------------
      // 2. 3D TURF RACE TRACK & WOODEN RAILS
      // -----------------------------------------------------------------------
      const trackTop = height * 0.28;
      const trackBottom = height - 12;
      const trackHeight = trackBottom - trackTop;
      const laneHeight = trackHeight / 6;

      // Track grass lush gradient
      const turfGrad = ctx.createLinearGradient(0, trackTop, 0, trackBottom);
      turfGrad.addColorStop(0, '#064e3b');
      turfGrad.addColorStop(0.3, '#047857');
      turfGrad.addColorStop(0.7, '#059669');
      turfGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = turfGrad;
      ctx.fillRect(0, trackTop, width, trackHeight);

      // Moving grass texture lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 2;
      for (let x = -trackScroll.current; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, trackTop);
        ctx.lineTo(x, trackBottom);
        ctx.stroke();
      }

      // Wooden White Rail Fence (Top & Bottom)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, trackTop - 3, width, 4);
      ctx.fillRect(0, trackBottom - 1, width, 4);

      // Rail Posts
      for (let x = 0; x < width; x += 40) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x, trackTop - 8, 3, 10);
        ctx.fillRect(x, trackBottom - 4, 3, 10);
      }

      // Distance Marker Lines (START, 300m, 600m, 900m, FINISH)
      const markers = [
        { label: 'START', x: 70 },
        { label: '300m', x: width * 0.3 },
        { label: '600m', x: width * 0.52 },
        { label: '900m', x: width * 0.74 },
        { label: 'FINISH 🏁', x: width - 80 },
      ];

      markers.forEach((m) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(m.x, trackTop);
        ctx.lineTo(m.x, trackBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(m.x - 22, trackTop + 4, 44, 14);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(m.x - 22, trackTop + 4, 44, 14);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(m.label, m.x, trackTop + 14);
      });

      // Finish Line Checkered Banner
      const finishX = width - 80;
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
      // 3. DRAW 6 RACING LANES & THOROUGHBREDS
      // -----------------------------------------------------------------------
      const startX = 65;
      const raceTrackWidth = width - 150;

      roster.forEach((horse, idx) => {
        const laneY = trackTop + idx * laneHeight;
        const horseCenterY = laneY + laneHeight * 0.58;
        const horseColorTheme = HORSE_COLORS[(horse.number - 1) % HORSE_COLORS.length];
        const isSelected = selectedHorse === horse.number;
        const isWinner = winner === horse.number;
        const posPercent = smoothedPositions.current[horse.number] || 0;
        const horseX = startX + (posPercent / 100) * raceTrackWidth;

        // Lane Separator Lines
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, laneY);
          ctx.lineTo(width, laneY);
          ctx.stroke();
        }

        // Selection / Highlight lane aura
        if (isSelected) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
          ctx.fillRect(0, laneY, width, laneHeight);
        }

        // Starting Gate Box (at startX - 35)
        ctx.fillStyle = '#334155';
        ctx.fillRect(startX - 45, laneY + 4, 35, laneHeight - 8);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(startX - 45, laneY + 4, 35, laneHeight - 8);

        // Gate Number badge
        ctx.fillStyle = horse.color;
        ctx.beginPath();
        ctx.roundRect(startX - 40, laneY + 7, 24, laneHeight - 14, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${horse.number}`, startX - 28, laneY + laneHeight * 0.55);

        // Gate Swing Door
        if (raceStatus === 'RACING') {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX - 10, laneY + 4);
          ctx.lineTo(startX - 3, laneY + laneHeight * 0.2);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX - 10, laneY + 4);
          ctx.lineTo(startX - 10, laneY + laneHeight - 4);
          ctx.stroke();
        }

        // Spawn Dirt Particles during race
        if (raceStatus === 'RACING' && Math.random() < 0.45) {
          particles.current.push({
            x: horseX - 25,
            y: horseCenterY + 12 + (Math.random() - 0.5) * 4,
            vx: -Math.random() * 4 - 2,
            vy: (Math.random() - 0.5) * 2 - 1,
            size: Math.random() * 3.5 + 1.5,
            color: Math.random() > 0.5 ? '#78350f' : '#92400e',
            alpha: 0.8,
            decay: 0.04,
          });
        }

        // Leader Slipstream Glow
        if (posPercent > 10 && raceStatus === 'RACING') {
          const streamGrad = ctx.createLinearGradient(horseX - 50, horseCenterY, horseX, horseCenterY);
          streamGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
          streamGrad.addColorStop(1, `${horse.color}33`);
          ctx.fillStyle = streamGrad;
          ctx.fillRect(horseX - 50, horseCenterY - 14, 45, 28);
        }

        // -------------------------------------------------------------------
        // 4. PHOTOREALISTIC PROCEDURAL GALLOPING THOROUGHBRED & JOCKEY
        // -------------------------------------------------------------------
        ctx.save();
        ctx.translate(horseX, horseCenterY);

        // Horse Ground Drop Shadow
        const shadowScale = 1 + Math.sin(gallopPhase.current + idx) * 0.2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(-5, 16, 26 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Galloping body bob & inclination
        const phase = gallopPhase.current + idx * 0.8;
        const bobY = Math.sin(phase) * (raceStatus === 'RACING' ? 3.5 : 1);
        const pitchAngle = Math.cos(phase) * (raceStatus === 'RACING' ? 0.08 : 0.02);

        ctx.translate(0, bobY);
        ctx.rotate(pitchAngle);

        // 1) TAIL (Flowing strands)
        ctx.strokeStyle = horseColorTheme.mane;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-24, -2);
        const tailWave1 = Math.sin(phase * 1.5) * 6 - 8;
        const tailWave2 = Math.cos(phase * 1.5) * 8 - 14;
        ctx.quadraticCurveTo(-36, tailWave1, -46, tailWave2);
        ctx.stroke();

        // 2) HIND LEGS (Quadruped Kinematics)
        const hindPhase = phase + Math.PI;
        // Far Hind Leg
        const farHindX = -18 + Math.sin(hindPhase) * 12;
        const farHindY = 8 + Math.max(0, Math.cos(hindPhase)) * 14;
        ctx.strokeStyle = horseColorTheme.dark;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-16, 2);
        ctx.lineTo(-20, 10);
        ctx.lineTo(farHindX, farHindY);
        ctx.stroke();

        // Near Hind Leg
        const nearHindX = -14 + Math.sin(phase) * 14;
        const nearHindY = 8 + Math.max(0, Math.cos(phase)) * 14;
        ctx.strokeStyle = horseColorTheme.body;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-12, 2);
        ctx.lineTo(-14, 10);
        ctx.lineTo(nearHindX, nearHindY);
        ctx.stroke();
        // Hoof
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(nearHindX - 1, nearHindY, 3, 2);

        // 3) THOROUGHBRED TORSO / MUSCULAR FLANK
        ctx.fillStyle = horseColorTheme.body;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 10, -0.05, 0, Math.PI * 2);
        ctx.fill();

        // Muscle Shading / Highlight
        const muscleGrad = ctx.createLinearGradient(-10, -8, 10, 8);
        muscleGrad.addColorStop(0, horseColorTheme.highlight);
        muscleGrad.addColorStop(0.6, horseColorTheme.body);
        muscleGrad.addColorStop(1, horseColorTheme.dark);
        ctx.fillStyle = muscleGrad;
        ctx.beginPath();
        ctx.ellipse(-2, -1, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4) SADDLE CLOTH WITH JOCKEY SILK & NUMBER
        ctx.fillStyle = horse.color;
        ctx.beginPath();
        ctx.roundRect(-8, -9, 16, 12, 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${horse.number}`, 0, 0);

        // 5) JOCKEY IN CROUCH HOLDING REINS
        // Jockey Body & Silk
        ctx.fillStyle = horse.color;
        ctx.beginPath();
        ctx.moveTo(-2, -9);
        ctx.lineTo(8, -18);
        ctx.lineTo(13, -13);
        ctx.lineTo(4, -6);
        ctx.closePath();
        ctx.fill();

        // Jockey White Pants & Boot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-2, -9);
        ctx.lineTo(2, -4);
        ctx.lineTo(0, -2);
        ctx.lineTo(-4, -7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, -3, 3, 3);

        // Jockey Helmet & Goggles
        ctx.fillStyle = horse.color;
        ctx.beginPath();
        ctx.arc(10, -20, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // Helmet Visor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(12, -21, 4, 1.8);
        // Goggles
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(8, -20, 5, 2);

        // 6) HORSE NECK & NOBLE HEAD
        ctx.fillStyle = horseColorTheme.body;
        ctx.beginPath();
        ctx.moveTo(14, -4);
        ctx.lineTo(26, -18);
        ctx.lineTo(34, -15);
        ctx.lineTo(38, -11);
        ctx.lineTo(32, -4);
        ctx.lineTo(18, 4);
        ctx.closePath();
        ctx.fill();

        // Mane
        ctx.fillStyle = horseColorTheme.mane;
        ctx.beginPath();
        ctx.moveTo(15, -6);
        ctx.lineTo(24, -19);
        ctx.lineTo(20, -12);
        ctx.lineTo(16, -2);
        ctx.closePath();
        ctx.fill();

        // Ears
        ctx.fillStyle = horseColorTheme.dark;
        ctx.beginPath();
        ctx.moveTo(27, -19);
        ctx.lineTo(29, -24);
        ctx.lineTo(31, -18);
        ctx.closePath();
        ctx.fill();

        // Bridle & Reins connecting to Jockey
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(33, -11);
        ctx.lineTo(8, -12);
        ctx.stroke();

        // 7) FORELEGS (Quadruped Kinematics)
        const forePhase = phase;
        // Far Foreleg
        const farForeX = 16 + Math.cos(forePhase) * 14;
        const farForeY = 8 + Math.max(0, Math.sin(forePhase)) * 14;
        ctx.strokeStyle = horseColorTheme.dark;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(14, 2);
        ctx.lineTo(18, 8);
        ctx.lineTo(farForeX, farForeY);
        ctx.stroke();

        // Near Foreleg
        const nearForeX = 20 + Math.cos(forePhase + Math.PI) * 14;
        const nearForeY = 8 + Math.max(0, Math.sin(forePhase + Math.PI)) * 14;
        ctx.strokeStyle = horseColorTheme.body;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(18, 2);
        ctx.lineTo(22, 8);
        ctx.lineTo(nearForeX, nearForeY);
        ctx.stroke();
        // Hoof
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(nearForeX - 1, nearForeY, 3, 2);

        // 8) 1ST PLACE WINNER CROWN & GLOW AURA
        if (isWinner) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👑', 0, -28);

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('1ST', 0, -38);
        }

        ctx.restore();
      });

      // -----------------------------------------------------------------------
      // 5. UPDATE & RENDER DIRT PARTICLES
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
      // 6. WINNER CONFETTI CELEBRATION
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
        c.vy += 0.12; // Gravity
        c.angle += c.vAngle;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [roster, positions, raceStatus, winner, selectedHorse]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-600/60 bg-slate-950">
      <canvas
        ref={canvasRef}
        width={1000}
        height={480}
        className="w-full h-auto block select-none"
      />
    </div>
  );
};
