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

// High-fidelity anatomically shaded Thoroughbred coat palettes
const THOROUGHBRED_COATS = [
  // 1. Thunder Bolt: Radiant Deep Mahogany Bay
  {
    primary: '#451a03',
    secondary: '#290f01',
    highlight: '#78350f',
    specular: '#b45309',
    mane: '#0a0502',
    hoof: '#1c1917',
    sock: true,
  },
  // 2. Solar Flare: Golden Copper Chestnut
  {
    primary: '#7c2d12',
    secondary: '#431407',
    highlight: '#c2410c',
    specular: '#ea580c',
    mane: '#1e0a03',
    hoof: '#292524',
    sock: false,
  },
  // 3. Royal Crown: Noble Dappled Palomino Gold
  {
    primary: '#854d0e',
    secondary: '#533005',
    highlight: '#ca8a04',
    specular: '#eab308',
    mane: '#422006',
    hoof: '#1f2937',
    sock: true,
  },
  // 4. Desert Storm: Powerful Dark Seal Brown Stallion
  {
    primary: '#262626',
    secondary: '#171717',
    highlight: '#404040',
    specular: '#525252',
    mane: '#0a0a0a',
    hoof: '#0f172a',
    sock: false,
  },
  // 5. Diamond Dash: Shimmering Blue-Roan / Dapple Gray
  {
    primary: '#475569',
    secondary: '#334155',
    highlight: '#64748b',
    specular: '#94a3b8',
    mane: '#1e293b',
    hoof: '#0f172a',
    sock: true,
  },
  // 6. Red Comet: Deep Midnight Black Stallion
  {
    primary: '#18181b',
    secondary: '#09090b',
    highlight: '#27272a',
    specular: '#3f3f46',
    mane: '#000000',
    hoof: '#020617',
    sock: false,
  },
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
      const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ffffff', '#eab308'];
      confettiList.current = Array.from({ length: 150 }, () => ({
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

      // Update stride phase
      if (raceStatus === 'RACING') {
        gallopPhase.current += dt * 15.5; // Natural 60fps gallop speed
        trackScroll.current = (trackScroll.current + dt * 500) % 80;
      } else {
        gallopPhase.current += dt * 2.5; // Idle breathing
      }

      // Smooth position interpolation
      roster.forEach((h) => {
        const target = positions[h.number] || 0;
        const curr = smoothedPositions.current[h.number] || 0;
        smoothedPositions.current[h.number] += (target - curr) * Math.min(1, dt * 12);
      });

      // -----------------------------------------------------------------------
      // 1. SKY, STADIUM GRANDSTAND & VOLUMETRIC LIGHTING
      // -----------------------------------------------------------------------
      ctx.clearRect(0, 0, width, height);

      // Sunset twilight stadium sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.3);
      skyGrad.addColorStop(0, '#090d16');
      skyGrad.addColorStop(0.5, '#1e1b4b');
      skyGrad.addColorStop(0.85, '#3b0764');
      skyGrad.addColorStop(1, '#581c87');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.28);

      // Stadium Grandstand Tier Structure
      ctx.fillStyle = '#181124';
      ctx.fillRect(0, height * 0.2, width, height * 0.08);

      // Animated Cheering Crowd
      ctx.fillStyle = '#2e1c47';
      for (let x = 8; x < width; x += 7) {
        const cheerOffset = Math.sin(time * 0.009 + x) * (raceStatus === 'RACING' ? 4 : 1);
        const torsoH = 6 + Math.sin(x * 99) * 2.5;
        ctx.beginPath();
        ctx.arc(x, height * 0.23 + cheerOffset, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 2, height * 0.23 + cheerOffset + 2, 4, torsoH);
      }

      // Stadium Floodlight Towers
      const floodlights = [width * 0.12, width * 0.5, width * 0.88];
      floodlights.forEach((fx) => {
        // Volumetric Light Cone
        const beamGrad = ctx.createRadialGradient(fx, 0, 8, fx, height * 0.7, 300);
        beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
        beamGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.1)');
        beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(fx, 0);
        ctx.lineTo(fx - 160, height);
        ctx.lineTo(fx + 160, height);
        ctx.closePath();
        ctx.fill();

        // Tower Lamp Bulb
        ctx.fillStyle = '#fffbeb';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(fx, 6, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Paparazzi Camera Flashes
      if (raceStatus === 'RACING' && Math.random() < 0.2) {
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
      // 2. 3D TURF RACE TRACK & WOODEN RAILS
      // -----------------------------------------------------------------------
      const trackTop = height * 0.28;
      const trackBottom = height - 12;
      const trackHeight = trackBottom - trackTop;
      const laneHeight = trackHeight / 6;

      // Realistic Turf Grass Gradient
      const turfGrad = ctx.createLinearGradient(0, trackTop, 0, trackBottom);
      turfGrad.addColorStop(0, '#064e3b');
      turfGrad.addColorStop(0.25, '#047857');
      turfGrad.addColorStop(0.65, '#059669');
      turfGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = turfGrad;
      ctx.fillRect(0, trackTop, width, trackHeight);

      // Moving grass texture lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 2.5;
      for (let x = -trackScroll.current; x < width; x += 55) {
        ctx.beginPath();
        ctx.moveTo(x, trackTop);
        ctx.lineTo(x, trackBottom);
        ctx.stroke();
      }

      // Wooden White Rail Fence
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, trackTop - 3, width, 4.5);
      ctx.fillRect(0, trackBottom - 1.5, width, 4.5);

      for (let x = 0; x < width; x += 38) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x, trackTop - 8, 3, 10);
        ctx.fillRect(x, trackBottom - 4, 3, 10);
      }

      // Distance Markers
      const markers = [
        { label: 'START', x: 75 },
        { label: '300m', x: width * 0.3 },
        { label: '600m', x: width * 0.52 },
        { label: '900m', x: width * 0.74 },
        { label: 'FINISH 🏁', x: width - 85 },
      ];

      markers.forEach((m) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
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
      // 3. DRAW 6 RACING LANES & THOROUGHBREDS
      // -----------------------------------------------------------------------
      const startX = 70;
      const raceTrackWidth = width - 165;

      roster.forEach((horse, idx) => {
        const laneY = trackTop + idx * laneHeight;
        const horseCenterY = laneY + laneHeight * 0.58;
        const coat = THOROUGHBRED_COATS[(horse.number - 1) % THOROUGHBRED_COATS.length];
        const isSelected = selectedHorse === horse.number;
        const isWinner = winner === horse.number;
        const posPercent = smoothedPositions.current[horse.number] || 0;
        const horseX = startX + (posPercent / 100) * raceTrackWidth;

        // Lane Separators
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, laneY);
          ctx.lineTo(width, laneY);
          ctx.stroke();
        }

        // Selection Highlight Aura
        if (isSelected) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
          ctx.fillRect(0, laneY, width, laneHeight);
        }

        // Starting Gate Box
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(startX - 50, laneY + 3, 38, laneHeight - 6);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(startX - 50, laneY + 3, 38, laneHeight - 6);

        ctx.fillStyle = horse.color;
        ctx.beginPath();
        ctx.roundRect(startX - 44, laneY + 6, 26, laneHeight - 12, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${horse.number}`, startX - 31, laneY + laneHeight * 0.56);

        // Gate Swing Door
        if (raceStatus === 'RACING') {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX - 12, laneY + 4);
          ctx.lineTo(startX - 4, laneY + laneHeight * 0.2);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX - 12, laneY + 4);
          ctx.lineTo(startX - 12, laneY + laneHeight - 4);
          ctx.stroke();
        }

        // Realistic Dirt & Turf Clumps Physics Emitter
        if (raceStatus === 'RACING' && Math.random() < 0.5) {
          particles.current.push({
            x: horseX - 28,
            y: horseCenterY + 12 + (Math.random() - 0.5) * 5,
            vx: -Math.random() * 5 - 3,
            vy: (Math.random() - 0.5) * 3 - 1.5,
            size: Math.random() * 3.5 + 1.5,
            color: Math.random() > 0.4 ? '#78350f' : '#92400e',
            alpha: 0.9,
            decay: 0.035,
          });
        }

        // Leader Aerodynamic Slipstream Glow
        if (posPercent > 12 && raceStatus === 'RACING') {
          const streamGrad = ctx.createLinearGradient(horseX - 60, horseCenterY, horseX, horseCenterY);
          streamGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
          streamGrad.addColorStop(1, `${horse.color}44`);
          ctx.fillStyle = streamGrad;
          ctx.fillRect(horseX - 60, horseCenterY - 16, 55, 32);
        }

        // -------------------------------------------------------------------
        // 4. ANATOMICALLY REALISTIC THOROUGHBRED & JOCKEY RENDERING
        // -------------------------------------------------------------------
        ctx.save();
        ctx.translate(horseX, horseCenterY);

        // Natural Gallop Cycle Math
        const phase = gallopPhase.current + idx * 0.75;
        const bobY = Math.sin(phase) * (raceStatus === 'RACING' ? 4 : 1.2);
        const pitchAngle = Math.cos(phase) * (raceStatus === 'RACING' ? 0.09 : 0.02);

        // Ground Drop Shadow (dynamically breathes with suspension)
        const shadowScale = 1 + Math.sin(phase) * 0.25;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.beginPath();
        ctx.ellipse(-6, 17, 30 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, bobY);
        ctx.rotate(pitchAngle);

        // 1) VOLUMETRIC MULTI-STRAND TAIL
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        const tailColors = [coat.mane, coat.secondary, coat.mane];
        tailColors.forEach((tc, tIdx) => {
          ctx.strokeStyle = tc;
          ctx.beginPath();
          ctx.moveTo(-28, -2 + tIdx);
          const tw1 = Math.sin(phase * 1.4 + tIdx * 0.4) * 8 - 10;
          const tw2 = Math.cos(phase * 1.4 + tIdx * 0.4) * 11 - 18;
          ctx.bezierCurveTo(-38, tw1, -48, tw2, -56, tw2 + 6);
          ctx.stroke();
        });

        // 2) DOUBLE-JOINTED HIND LEGS (Hip -> Stifle -> Hock -> Fetlock -> Hoof)
        const hindPhaseFar = phase + Math.PI + 0.4;
        const hindPhaseNear = phase + Math.PI;

        // Far Hind Leg
        const farStifleX = -20 + Math.sin(hindPhaseFar) * 6;
        const farHockX = -22 + Math.sin(hindPhaseFar) * 14;
        const farHockY = 10 + Math.max(0, Math.cos(hindPhaseFar)) * 10;
        const farHoofX = farHockX + Math.sin(hindPhaseFar) * 8;
        const farHoofY = farHockY + 12 + Math.max(0, Math.sin(hindPhaseFar)) * 6;

        ctx.strokeStyle = coat.secondary;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(farStifleX, 6);
        ctx.lineTo(farHockX, farHockY);
        ctx.lineTo(farHoofX, farHoofY);
        ctx.stroke();

        // Far Hoof
        ctx.fillStyle = coat.hoof;
        ctx.fillRect(farHoofX - 1.5, farHoofY - 1, 3.5, 2.5);

        // Near Hind Leg (Leading/Foreground)
        const nearStifleX = -15 + Math.sin(hindPhaseNear) * 7;
        const nearHockX = -16 + Math.sin(hindPhaseNear) * 16;
        const nearHockY = 10 + Math.max(0, Math.cos(hindPhaseNear)) * 10;
        const nearHoofX = nearHockX + Math.sin(hindPhaseNear) * 9;
        const nearHoofY = nearHockY + 12 + Math.max(0, Math.sin(hindPhaseNear)) * 7;

        ctx.strokeStyle = coat.primary;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(nearStifleX, 6);
        ctx.lineTo(nearHockX, nearHockY);
        ctx.lineTo(nearHoofX, nearHoofY);
        ctx.stroke();

        // White Pastern Sock
        if (coat.sock) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(nearHockX + (nearHoofX - nearHockX) * 0.7, nearHockY + (nearHoofY - nearHockY) * 0.7);
          ctx.lineTo(nearHoofX, nearHoofY);
          ctx.stroke();
        }

        // Near Hoof (Dark Keratin + Silver Shoe)
        ctx.fillStyle = coat.hoof;
        ctx.fillRect(nearHoofX - 1.5, nearHoofY - 1, 4, 3);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(nearHoofX - 1.5, nearHoofY + 1.5, 4, 1);

        // 3) THOROUGHBRED MUSCULAR TORSO & BARREL
        // Deep Chest & Withers
        ctx.fillStyle = coat.primary;
        ctx.beginPath();
        ctx.moveTo(-28, -2);
        ctx.bezierCurveTo(-26, -12, -8, -14, 6, -12); // Withers
        ctx.bezierCurveTo(16, -10, 22, -4, 24, 2); // Shoulder
        ctx.bezierCurveTo(20, 12, 6, 14, -8, 12); // Deep Barrel / Ribcage
        ctx.bezierCurveTo(-20, 10, -28, 6, -28, -2); // Flank & Croup
        ctx.closePath();
        ctx.fill();

        // Specular Muscle Highlights (Shoulder blade & Rump gluteals)
        const muscleShine = ctx.createRadialGradient(2, -4, 2, 0, 0, 22);
        muscleShine.addColorStop(0, coat.specular);
        muscleShine.addColorStop(0.4, coat.highlight);
        muscleShine.addColorStop(0.85, coat.primary);
        muscleShine.addColorStop(1, coat.secondary);
        ctx.fillStyle = muscleShine;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 9.5, -0.05, 0, Math.PI * 2);
        ctx.fill();

        // 4) NUMBERED SADDLE CLOTH WITH GOLD PIPING
        ctx.fillStyle = horse.color;
        ctx.beginPath();
        ctx.roundRect(-9, -11, 18, 14, 2.5);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${horse.number}`, 0, 0);

        // Girth Leather Strap
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-2, 3);
        ctx.lineTo(-2, 11);
        ctx.stroke();

        // 5) JOCKEY IN AERODYNAMIC CROUCH
        // Jockey Body & Silk
        ctx.fillStyle = horse.color;
        ctx.beginPath();
        ctx.moveTo(-4, -10);
        ctx.lineTo(8, -20);
        ctx.lineTo(14, -15);
        ctx.lineTo(4, -7);
        ctx.closePath();
        ctx.fill();

        // White Riding Breeches & Black Boot with Stirrup
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-4, -10);
        ctx.lineTo(2, -4);
        ctx.lineTo(-1, -1);
        ctx.lineTo(-6, -7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-1, -2, 4, 3.5);

        // Metal Stirrup Iron
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.strokeRect(-2, -3, 5, 5);

        // Jockey Helmet & Visor
        ctx.fillStyle = horse.color;
        ctx.beginPath();
        ctx.arc(10, -22, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(12, -23.5, 4.5, 2); // Visor

        // Goggles
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(8, -22.5, 5.5, 2.2);

        // Jockey Arm with Whip in Final Stretch
        ctx.strokeStyle = horse.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(9, -17);
        const whipAngle = raceStatus === 'RACING' && posPercent > 60 ? Math.sin(phase * 2) * 6 : 0;
        ctx.lineTo(16, -15 + whipAngle);
        ctx.stroke();

        // Whip
        if (raceStatus === 'RACING') {
          ctx.strokeStyle = '#18181b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(16, -15 + whipAngle);
          ctx.lineTo(24, -10 + whipAngle * 1.5);
          ctx.stroke();
        }

        // 6) ARMORED ARCHING NECK & NOBLE HEAD
        ctx.fillStyle = coat.primary;
        ctx.beginPath();
        ctx.moveTo(16, -6);
        ctx.bezierCurveTo(22, -18, 28, -20, 36, -16); // Crest & Poll
        ctx.lineTo(44, -11); // Muzzle
        ctx.lineTo(42, -5); // Chin
        ctx.bezierCurveTo(34, -2, 26, 4, 18, 5); // Throatlatch
        ctx.closePath();
        ctx.fill();

        // Neck Specular Shading
        const neckShine = ctx.createLinearGradient(18, -16, 32, -4);
        neckShine.addColorStop(0, coat.highlight);
        neckShine.addColorStop(1, coat.primary);
        ctx.fillStyle = neckShine;
        ctx.beginPath();
        ctx.moveTo(18, -8);
        ctx.lineTo(28, -17);
        ctx.lineTo(34, -13);
        ctx.lineTo(24, -1);
        ctx.closePath();
        ctx.fill();

        // Flowing Mane Tufts
        ctx.fillStyle = coat.mane;
        for (let m = 0; m < 4; m++) {
          ctx.beginPath();
          ctx.moveTo(18 + m * 3.5, -8 - m * 2.5);
          const mw = Math.sin(phase * 1.2 + m) * 3;
          ctx.lineTo(14 + m * 3.5 + mw, -15 - m * 2.5);
          ctx.lineTo(20 + m * 3.5, -12 - m * 2.5);
          ctx.closePath();
          ctx.fill();
        }

        // Expressive Pricked Ears
        ctx.fillStyle = coat.secondary;
        ctx.beginPath();
        ctx.moveTo(29, -20);
        ctx.lineTo(32, -26);
        ctx.lineTo(34, -19);
        ctx.closePath();
        ctx.fill();

        // Bridle, Bit & Reins connecting to Jockey Hands
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(41, -7); // Bit
        ctx.lineTo(34, -16); // Headstall
        ctx.moveTo(41, -7);
        ctx.lineTo(16, -15); // Reins to Jockey
        ctx.stroke();

        // 7) DOUBLE-JOINTED FORELEGS (Shoulder -> Elbow -> Knee -> Fetlock -> Hoof)
        const forePhaseFar = phase + 0.4;
        const forePhaseNear = phase + Math.PI;

        // Far Foreleg
        const farKneeX = 22 + Math.cos(forePhaseFar) * 8;
        const farKneeY = 8 + Math.max(0, Math.sin(forePhaseFar)) * 6;
        const farForeHoofX = farKneeX + Math.cos(forePhaseFar) * 12;
        const farForeHoofY = farKneeY + 12 + Math.max(0, Math.cos(forePhaseFar)) * 8;

        ctx.strokeStyle = coat.secondary;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(16, 2);
        ctx.lineTo(19, 7);
        ctx.lineTo(farKneeX, farKneeY);
        ctx.lineTo(farForeHoofX, farForeHoofY);
        ctx.stroke();

        // Far Forehoof
        ctx.fillStyle = coat.hoof;
        ctx.fillRect(farForeHoofX - 1.5, farForeHoofY - 1, 3.5, 2.5);

        // Near Foreleg (Leading/Foreground)
        const nearKneeX = 25 + Math.cos(forePhaseNear) * 9;
        const nearKneeY = 8 + Math.max(0, Math.sin(forePhaseNear)) * 6;
        const nearForeHoofX = nearKneeX + Math.cos(forePhaseNear) * 14;
        const nearForeHoofY = nearKneeY + 12 + Math.max(0, Math.cos(forePhaseNear)) * 8;

        ctx.strokeStyle = coat.primary;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(19, 2);
        ctx.lineTo(23, 7);
        ctx.lineTo(nearKneeX, nearKneeY);
        ctx.lineTo(nearForeHoofX, nearForeHoofY);
        ctx.stroke();

        // White Pastern Sock
        if (coat.sock) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(nearKneeX + (nearForeHoofX - nearKneeX) * 0.7, nearKneeY + (nearForeHoofY - nearKneeY) * 0.7);
          ctx.lineTo(nearForeHoofX, nearForeHoofY);
          ctx.stroke();
        }

        // Near Forehoof
        ctx.fillStyle = coat.hoof;
        ctx.fillRect(nearForeHoofX - 1.5, nearForeHoofY - 1, 4, 3);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(nearForeHoofX - 1.5, nearForeHoofY + 1.5, 4, 1);

        // 8) 1ST PLACE GOLDEN WINNER CROWN
        if (isWinner) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👑', 0, -32);

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('1ST PLACE', 0, -42);
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
        c.vy += 0.12;
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
