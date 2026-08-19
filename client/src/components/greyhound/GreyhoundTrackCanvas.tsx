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
  isDust?: boolean;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
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

// 6 Photorealistic Greyhound Coat Profiles with Anatomy Markings
const REALISTIC_HOUND_PROFILES = [
  {
    // Trap 1: Red Brindle with dark tiger-stripe streaks & black muzzle
    primary: '#a14210',
    secondary: '#5a2205',
    highlight: '#d97706',
    belly: '#7c2d12',
    muzzle: '#1c1917',
    eyeColor: '#78350f',
    isBrindle: true,
    stripeColor: 'rgba(28, 25, 23, 0.45)',
  },
  {
    // Trap 2: Blue / Slate Charcoal with silvery metallic sheen
    primary: '#475569',
    secondary: '#1e293b',
    highlight: '#94a3b8',
    belly: '#334155',
    muzzle: '#0f172a',
    eyeColor: '#451a03',
    isBrindle: false,
  },
  {
    // Trap 3: Porcelain White & Light Fawn Patches
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    highlight: '#ffffff',
    belly: '#e2e8f0',
    muzzle: '#475569',
    eyeColor: '#b45309',
    isBrindle: false,
    hasPatches: true,
  },
  {
    // Trap 4: Glossy Jet Black with obsidian specular sheen
    primary: '#18181b',
    secondary: '#09090b',
    highlight: '#3f3f46',
    belly: '#18181b',
    muzzle: '#000000',
    eyeColor: '#451a03',
    isBrindle: false,
  },
  {
    // Trap 5: Golden Fawn with warm honey loin & white brisket star
    primary: '#d97706',
    secondary: '#92400e',
    highlight: '#fbbf24',
    belly: '#b45309',
    muzzle: '#291202',
    eyeColor: '#78350f',
    isBrindle: false,
    hasWhiteChest: true,
  },
  {
    // Trap 6: Dun / Mahogany Red with dark dorsal stripe & white socks
    primary: '#7c2d12',
    secondary: '#451a03',
    highlight: '#b45309',
    belly: '#5a2205',
    muzzle: '#18181b',
    eyeColor: '#92400e',
    isBrindle: true,
    stripeColor: 'rgba(15, 23, 42, 0.4)',
    hasWhiteSocks: true,
  },
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
  const sandParticles = useRef<SandParticle[]>([]);
  const sparkParticles = useRef<SparkParticle[]>([]);
  const flashes = useRef<CameraFlash[]>([]);
  const confettiList = useRef<Confetti[]>([]);
  const gallopPhase = useRef<number>(0);
  const trackScroll = useRef<number>(0);

  useEffect(() => {
    if (raceStatus === 'FINISHED' && winner) {
      const colors = ['#ef4444', '#3b82f6', '#f8fafc', '#f97316', '#10b981', '#fbbf24', '#a855f7', '#38bdf8'];
      confettiList.current = Array.from({ length: 180 }, () => ({
        x: Math.random() * 950 + 25,
        y: Math.random() * 140 + 20,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 9 - 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.3,
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
      const dt = Math.min(0.08, (time - lastTime) / 1000);
      lastTime = time;

      const width = canvas.width;
      const height = canvas.height;

      // Gallop cycle progression (ultra high-frequency double suspension)
      if (raceStatus === 'RACING') {
        gallopPhase.current += dt * 21; // 3.3 strides per second (realistic 45mph rotary gallop)
        trackScroll.current = (trackScroll.current + dt * 680) % 80;
      } else {
        gallopPhase.current += dt * 2.2; // Panting / tense pre-race shifting
      }

      // Smooth interpolation for dog positions
      roster.forEach((d) => {
        const target = positions[d.trapNumber] || 0;
        const curr = smoothedPositions.current[d.trapNumber] || 0;
        smoothedPositions.current[d.trapNumber] += (target - curr) * Math.min(1, dt * 14);
      });

      const targetHare = harePosition || 0;
      smoothedHare.current += (targetHare - smoothedHare.current) * Math.min(1, dt * 16);

      // -----------------------------------------------------------------------
      // 1. TWILIGHT STADIUM SKY, FLOODLIGHT TOWERS & CHEERING SPECTATORS
      // -----------------------------------------------------------------------
      ctx.clearRect(0, 0, width, height);

      // Twilight Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.32);
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.5, '#0b1329');
      skyGrad.addColorStop(0.85, '#1e1b4b');
      skyGrad.addColorStop(1, '#311042');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.3);

      // Distant City Skyline Silhouettes
      ctx.fillStyle = '#060d1f';
      for (let bx = 0; bx < width; bx += 32) {
        const bH = 18 + Math.sin(bx * 9.3) * 12;
        ctx.fillRect(bx, height * 0.19 - bH, 28, bH + 20);
      }

      // Grandstand Upper Tier Structure & VIP Boxes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, height * 0.17, width, height * 0.11);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, height * 0.17, width, height * 0.11);

      // VIP Box Windows with Warm Ambient Light
      for (let vx = 20; vx < width - 20; vx += 55) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
        ctx.fillRect(vx, height * 0.18, 38, 12);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.strokeRect(vx, height * 0.18, 38, 12);
      }

      // Animated Cheering Crowd
      ctx.fillStyle = '#1e293b';
      for (let x = 6; x < width; x += 6.5) {
        const cheerOffset = Math.sin(time * 0.012 + x * 0.4) * (raceStatus === 'RACING' ? 5 : 1);
        const torsoH = 7 + Math.sin(x * 123) * 2.5;

        // Head
        ctx.fillStyle = (x % 3 === 0) ? '#334155' : (x % 3 === 1) ? '#475569' : '#1e293b';
        ctx.beginPath();
        ctx.arc(x, height * 0.23 + cheerOffset, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Torso & Raised Arms
        ctx.fillRect(x - 2, height * 0.23 + cheerOffset + 2, 4, torsoH);
        if (raceStatus === 'RACING' && x % 4 === 0) {
          ctx.fillRect(x - 4, height * 0.23 + cheerOffset - 1, 2, 5);
          ctx.fillRect(x + 2, height * 0.23 + cheerOffset - 1, 2, 5);
        }
      }

      // Volumetric Floodlight Beams
      const floodlights = [width * 0.12, width * 0.38, width * 0.65, width * 0.88];
      floodlights.forEach((fx) => {
        const beamGrad = ctx.createRadialGradient(fx, 2, 10, fx, height * 0.7, 340);
        beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
        beamGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.14)');
        beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(fx, 0);
        ctx.lineTo(fx - 190, height);
        ctx.lineTo(fx + 190, height);
        ctx.closePath();
        ctx.fill();

        // Floodlight Pylon Mast & Halogen Bulbs
        ctx.fillStyle = '#475569';
        ctx.fillRect(fx - 2, 0, 4, 18);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(fx, 6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Paparazzi Camera Flashes
      if (raceStatus === 'RACING' && Math.random() < 0.28) {
        flashes.current.push({
          x: Math.random() * width,
          y: height * 0.2 + Math.random() * 18,
          alpha: 1.0,
          radius: Math.random() * 18 + 8,
        });
      }

      flashes.current.forEach((flash) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash.alpha})`;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
        ctx.fill();
        flash.alpha -= dt * 5.0;
      });
      flashes.current = flashes.current.filter((f) => f.alpha > 0);

      // -----------------------------------------------------------------------
      // 2. PHOTOREALISTIC SAND DIRT SURFACE & RUNNING RAILS
      // -----------------------------------------------------------------------
      const trackTop = height * 0.28;
      const trackBottom = height - 12;
      const trackHeight = trackBottom - trackTop;
      const laneHeight = trackHeight / 6;

      // Base Sand Loam Layer
      const sandGrad = ctx.createLinearGradient(0, trackTop, 0, trackBottom);
      sandGrad.addColorStop(0, '#5f2b06'); // Compacted inside rail sand (moist loam)
      sandGrad.addColorStop(0.18, '#853b0a');
      sandGrad.addColorStop(0.5, '#a1480f'); // Golden loose surface sand
      sandGrad.addColorStop(0.82, '#b85412');
      sandGrad.addColorStop(1, '#693007');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, trackTop, width, trackHeight);

      // Raked Sand Ridges / Tractor Grooming Texture
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.09)';
      ctx.lineWidth = 2.5;
      for (let x = -trackScroll.current; x < width + 50; x += 38) {
        ctx.beginPath();
        ctx.moveTo(x, trackTop);
        ctx.lineTo(x - 20, trackBottom);
        ctx.stroke();
      }

      // Inside Compacted Rail Rut
      const insideRut = ctx.createLinearGradient(0, trackTop, 0, trackTop + laneHeight * 1.5);
      insideRut.addColorStop(0, 'rgba(30, 10, 2, 0.4)');
      insideRut.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = insideRut;
      ctx.fillRect(0, trackTop, width, laneHeight * 1.5);

      // Top Heavy Steel Monorail for Mechanical Hare
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, trackTop - 7, width, 7);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, trackTop - 5, width, 2.5); // Steel rail head
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, trackTop - 4, width, 1); // Specular rail gleam

      // Bottom White Aluminum Safety Barrier
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, trackBottom - 3, width, 6);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, trackBottom + 1, width, 2);
      for (let x = 0; x < width; x += 36) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x, trackBottom - 5, 4, 12);
      }

      // Distance Signage & Timing Markers
      const markers = [
        { label: 'TRAPS 1-6', x: 80, color: '#f59e0b' },
        { label: '150m SPLIT', x: width * 0.32, color: '#38bdf8' },
        { label: '300m BEND', x: width * 0.54, color: '#fbbf24' },
        { label: '450m STRETCH', x: width * 0.74, color: '#f97316' },
        { label: 'FINISH 🏁', x: width - 90, color: '#10b981' },
      ];

      markers.forEach((m) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(m.x, trackTop);
        ctx.lineTo(m.x, trackBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Marker Tag
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(m.x - 28, trackTop + 3, 56, 16, 4);
        ctx.fill();
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(m.label, m.x, trackTop + 14);
      });

      // Photorealistic Checkered Finish Line Banner with Laser Line
      const finishX = width - 90;
      const checkW = 6;
      for (let y = trackTop; y < trackBottom; y += checkW * 2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(finishX, y, checkW, checkW);
        ctx.fillRect(finishX + checkW, y + checkW, checkW, checkW);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(finishX + checkW, y, checkW, checkW);
        ctx.fillRect(finishX, y + checkW, checkW, checkW);
      }

      // Finish Photo-Scan Laser Beam
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(finishX + checkW * 2, trackTop);
      ctx.lineTo(finishX + checkW * 2, trackBottom);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // -----------------------------------------------------------------------
      // 3. MECHANICAL HARE CHARIOT (LURE) SPEEDING AHEAD ON MONORAIL
      // -----------------------------------------------------------------------
      const startX = 80;
      const raceTrackWidth = width - 180;
      const hareX = startX + (smoothedHare.current / 100) * raceTrackWidth + 28;

      if (raceStatus === 'RACING') {
        // Monorail Contact Carriage
        ctx.fillStyle = '#334155';
        ctx.fillRect(hareX - 10, trackTop - 15, 20, 12);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hareX - 10, trackTop - 15, 20, 12);

        // Spinning Pulley Wheel
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(hareX, trackTop - 9, 4, 0, Math.PI * 2);
        ctx.fill();

        // Strobe Warning Light
        const strobe = Math.sin(time * 0.03) > 0;
        ctx.fillStyle = strobe ? '#fbbf24' : '#ef4444';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(hareX - 6, trackTop - 12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Electric Blue Sparks Emitter from Rail Contact
        if (Math.random() < 0.6) {
          sparkParticles.current.push({
            x: hareX - 8,
            y: trackTop - 5,
            vx: -Math.random() * 5 - 2,
            vy: (Math.random() - 0.5) * 3,
            color: Math.random() > 0.3 ? '#38bdf8' : '#ffffff',
            alpha: 1.0,
            size: Math.random() * 2.5 + 1,
          });
        }

        // Mechanical Hare Dummy (Realistic Fluffy White Rabbit with Extended Wind Ribbon Tails)
        ctx.save();
        ctx.translate(hareX + 8, trackTop + 4);

        // Dummy Fur Body
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 5.5, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Dummy Ears (streaming back)
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.ellipse(-6, -4, 7, 2, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // Pink Eye Dummy
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(6, -1.5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // High-Visibility Fluorescent Orange & Yellow Ribbon Tails
        const wind1 = Math.sin(time * 0.04) * 4;
        const wind2 = Math.cos(time * 0.04) * 5;
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(-22, wind1, -34, wind1 * 1.4);
        ctx.stroke();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 2);
        ctx.quadraticCurveTo(-20, wind2, -30, wind2 * 1.3);
        ctx.stroke();

        ctx.restore();
      }

      // Render & Update Spark Particles
      sparkParticles.current.forEach((sp) => {
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sp.alpha;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha -= dt * 4.5;
      });
      sparkParticles.current = sparkParticles.current.filter((sp) => sp.alpha > 0);

      // -----------------------------------------------------------------------
      // 4. DRAW 6 RACING TRAP LANES, TRAP BOXES & GREYHOUNDS
      // -----------------------------------------------------------------------
      roster.forEach((dog, idx) => {
        const laneY = trackTop + idx * laneHeight;
        const dogCenterY = laneY + laneHeight * 0.58;
        const profile = REALISTIC_HOUND_PROFILES[(dog.trapNumber - 1) % REALISTIC_HOUND_PROFILES.length];
        const isSelected = selectedTrap === dog.trapNumber;
        const isWinner = winner === dog.trapNumber;
        const posPercent = smoothedPositions.current[dog.trapNumber] || 0;
        const dogX = startX + (posPercent / 100) * raceTrackWidth;

        // Lane Separator Lines
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, laneY);
          ctx.lineTo(width, laneY);
          ctx.stroke();
        }

        // Selected Lane Glowing Aura
        if (isSelected) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
          ctx.fillRect(0, laneY, width, laneHeight);
        }

        // -------------------------------------------------------------------
        // A) HEAVY STEEL TRAP BOX (Starting Gate 1-6)
        // -------------------------------------------------------------------
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(startX - 54, laneY + 2, 42, laneHeight - 4);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(startX - 54, laneY + 2, 42, laneHeight - 4);

        // Metallic Plate Rivets
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(startX - 52, laneY + 4, 2, 2);
        ctx.fillRect(startX - 52, laneY + laneHeight - 6, 2, 2);

        // Official Trap Vest Number Plate
        ctx.fillStyle = dog.vestColor;
        ctx.beginPath();
        ctx.roundRect(startX - 48, laneY + 5, 30, laneHeight - 10, 4);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = dog.vestTextColor;
        ctx.font = '900 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${dog.trapNumber}`, startX - 33, laneY + laneHeight * 0.58);

        // Pneumatic Gate Arm (Swing-up on race start)
        if (raceStatus === 'RACING') {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(startX - 12, laneY + 2);
          ctx.lineTo(startX - 2, laneY - 6);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(startX - 12, laneY + 2);
          ctx.lineTo(startX - 12, laneY + laneHeight - 2);
          ctx.stroke();
        }

        // -------------------------------------------------------------------
        // B) HIGH-VELOCITY SAND ROOSTERTAIL PARTICLES (DUST & CLUMPS)
        // -------------------------------------------------------------------
        if (raceStatus === 'RACING' && Math.random() < 0.65) {
          // Fine Sand Dust Cloud
          sandParticles.current.push({
            x: dogX - 22,
            y: dogCenterY + 12 + (Math.random() - 0.5) * 6,
            vx: -Math.random() * 5 - 3,
            vy: (Math.random() - 0.5) * 3 - 0.8,
            size: Math.random() * 5 + 3,
            color: '#b45309',
            alpha: 0.55,
            decay: 0.035,
            isDust: true,
          });

          // Heavy Sand Clump Projectiles
          sandParticles.current.push({
            x: dogX - 16,
            y: dogCenterY + 14 + (Math.random() - 0.5) * 4,
            vx: -Math.random() * 8 - 4,
            vy: -Math.random() * 5 - 1,
            size: Math.random() * 2.8 + 1,
            color: Math.random() > 0.5 ? '#78350f' : '#92400e',
            alpha: 0.9,
            decay: 0.045,
            isDust: false,
          });
        }

        // -------------------------------------------------------------------
        // C) PHOTOREALISTIC DOUBLE-SUSPENSION GREYHOUND SPRINTING SPRITE
        // -------------------------------------------------------------------
        ctx.save();
        ctx.translate(dogX, dogCenterY);

        // Precise Rotary Gallop Mathematical Kinematics
        const phase = gallopPhase.current + idx * 0.68;
        const isSuspendedAirborne = Math.cos(phase) > 0.6 || Math.cos(phase) < -0.7;
        const airborneElevation = isSuspendedAirborne && raceStatus === 'RACING' ? -4 : 0;
        const bobY = Math.sin(phase) * (raceStatus === 'RACING' ? 4.5 : 1) + airborneElevation;
        const flexSpineAngle = Math.cos(phase) * (raceStatus === 'RACING' ? 0.16 : 0.02);

        // Photorealistic Dynamic Ground Drop Shadow
        const shadowScale = 1 + Math.sin(phase) * 0.35;
        const shadowAlpha = isSuspendedAirborne ? 0.28 : 0.55;
        ctx.fillStyle = `rgba(15, 10, 5, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(-1, 16 - airborneElevation, 26 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, bobY);
        ctx.rotate(flexSpineAngle);

        // 1) LONG WHIP-LIKE AERODYNAMIC TAIL
        ctx.strokeStyle = profile.secondary;
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-25, -2);
        const tailOsc1 = Math.sin(phase * 1.4) * 8 - 5;
        const tailOsc2 = Math.cos(phase * 1.4) * 10 - 10;
        ctx.bezierCurveTo(-34, tailOsc1, -44, tailOsc2, -50, tailOsc2 + 3);
        ctx.stroke();

        // 2) SKELETAL & MUSCULAR HIND LEGS (Dual Joint Extension & Thrust)
        const hindPhaseFar = phase + Math.PI + 0.4;
        const hindPhaseNear = phase + Math.PI;

        // Far Hind Leg (Deep Stifle & High Hock)
        const farStifleX = -14 + Math.sin(hindPhaseFar) * 16;
        const farStifleY = 4 + Math.cos(hindPhaseFar) * 6;
        const farHockX = farStifleX - 6 + Math.sin(hindPhaseFar) * 12;
        const farHockY = farStifleY + 7 + Math.max(0, Math.cos(hindPhaseFar)) * 6;
        const farPawX = farHockX + Math.sin(hindPhaseFar) * 11;
        const farPawY = farHockY + 9 + Math.max(0, Math.sin(hindPhaseFar)) * 5;

        ctx.strokeStyle = profile.secondary;
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(-18, -2);
        ctx.lineTo(farStifleX, farStifleY);
        ctx.lineTo(farHockX, farHockY);
        ctx.lineTo(farPawX, farPawY);
        ctx.stroke();

        // Near Hind Leg (Full Gluteus & Quadriceps)
        const nearStifleX = -12 + Math.sin(hindPhaseNear) * 18;
        const nearStifleY = 4 + Math.cos(hindPhaseNear) * 7;
        const nearHockX = nearStifleX - 6 + Math.sin(hindPhaseNear) * 14;
        const nearHockY = nearStifleY + 7 + Math.max(0, Math.cos(hindPhaseNear)) * 7;
        const nearPawX = nearHockX + Math.sin(hindPhaseNear) * 12;
        const nearPawY = nearHockY + 10 + Math.max(0, Math.sin(hindPhaseNear)) * 6;

        ctx.strokeStyle = profile.primary;
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(-15, -2);
        ctx.lineTo(nearStifleX, nearStifleY);
        ctx.lineTo(nearHockX, nearHockY);
        ctx.lineTo(nearPawX, nearPawY);
        ctx.stroke();

        // Dark Paws & Claws
        ctx.fillStyle = profile.muzzle;
        ctx.fillRect(nearPawX - 2, nearPawY, 4, 2.5);

        // 3) ANATOMICALLY PRECISE GREYHOUND TORSO, TUCK-UP & BRISKET
        ctx.fillStyle = profile.primary;
        ctx.beginPath();
        ctx.moveTo(-25, -3);
        ctx.bezierCurveTo(-20, -12, -4, -13, 8, -10); // Arching Lumbar & Withers
        ctx.bezierCurveTo(18, -8, 22, 0, 22, 6); // Protruding Deep Brisket / Sternum
        ctx.bezierCurveTo(14, 10, 4, 8, -4, 4); // Deep Chest Tapering to Extreme Tuck-up
        ctx.bezierCurveTo(-14, 3, -25, 4, -25, -3); // Muscular Croup & Flank
        ctx.closePath();
        ctx.fill();

        // Brindle Striping Texture Overlay
        if (profile.isBrindle && profile.stripeColor) {
          ctx.strokeStyle = profile.stripeColor;
          ctx.lineWidth = 1.5;
          for (let sx = -18; sx < 14; sx += 4.5) {
            ctx.beginPath();
            ctx.moveTo(sx, -9);
            ctx.lineTo(sx - 3, 2);
            ctx.stroke();
          }
        }

        // White Chest Star Patch (if applicable)
        if (profile.hasWhiteChest) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(14, 2, 4, 2.5, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Specular Muscle Volume Radial Shading (Chest & Hip Definition)
        const muscleShine = ctx.createRadialGradient(4, -4, 2, 2, 0, 22);
        muscleShine.addColorStop(0, profile.highlight);
        muscleShine.addColorStop(0.5, profile.primary);
        muscleShine.addColorStop(1, profile.secondary);
        ctx.fillStyle = muscleShine;
        ctx.beginPath();
        ctx.ellipse(2, -1, 20, 7.5, -0.04, 0, Math.PI * 2);
        ctx.fill();

        // 4) FORM-FITTING RACING SILK JACKET / BLANKET
        ctx.fillStyle = dog.vestColor;
        ctx.beginPath();
        ctx.roundRect(-9, -10, 18, 12, 3);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Satin Specular Sheen on Jacket
        const jacketShine = ctx.createLinearGradient(-9, -10, 9, 2);
        jacketShine.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        jacketShine.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        jacketShine.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        ctx.fillStyle = jacketShine;
        ctx.fillRect(-9, -10, 18, 12);

        // Bold Trap Numeral
        ctx.fillStyle = dog.vestTextColor;
        ctx.font = '900 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${dog.trapNumber}`, 0, -1);

        // 5) SIGHTHOUND NECK, TAPERED SNOUT & ROSE EARS
        ctx.fillStyle = profile.primary;
        ctx.beginPath();
        ctx.moveTo(14, -5);
        ctx.lineTo(26, -14); // Long Slender Crest
        ctx.lineTo(40, -9); // Pointed Muzzle Tip
        ctx.lineTo(38, -5); // Underjaw
        ctx.lineTo(18, 5); // Clean Throat
        ctx.closePath();
        ctx.fill();

        // Leather Nose & Nostril
        ctx.fillStyle = profile.muzzle;
        ctx.beginPath();
        ctx.arc(39, -8.5, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Amber Eye with Specular Catchlight
        ctx.fillStyle = profile.eyeColor;
        ctx.beginPath();
        ctx.ellipse(30, -10, 2.2, 1.4, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(30.6, -10.4, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Folded Rose Ears Flattened Against Wind
        ctx.fillStyle = profile.secondary;
        ctx.beginPath();
        ctx.moveTo(25, -14);
        ctx.lineTo(29, -18);
        ctx.lineTo(30, -13);
        ctx.closePath();
        ctx.fill();

        // Wire Muzzle Basket with Padded Bridge
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
        ctx.lineWidth = 0.9;
        ctx.strokeRect(31, -11, 10, 5.5);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(29, -11, 2, 5.5); // Leather Strap

        // 6) EXTENDED REACHING FORELEGS (Scapula, Knee & Pasterns)
        const forePhaseFar = phase + 0.38;
        const forePhaseNear = phase + Math.PI + 0.1;

        // Far Foreleg
        const farShoulderX = 18 + Math.cos(forePhaseFar) * 9;
        const farShoulderY = 5 + Math.sin(forePhaseFar) * 6;
        const farForePawX = farShoulderX + Math.cos(forePhaseFar) * 13;
        const farForePawY = farShoulderY + 9 + Math.max(0, Math.cos(forePhaseFar)) * 7;

        ctx.strokeStyle = profile.secondary;
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(14, 1);
        ctx.lineTo(16, 5);
        ctx.lineTo(farShoulderX, farShoulderY);
        ctx.lineTo(farForePawX, farForePawY);
        ctx.stroke();

        // Near Foreleg
        const nearShoulderX = 20 + Math.cos(forePhaseNear) * 11;
        const nearShoulderY = 5 + Math.sin(forePhaseNear) * 6;
        const nearForePawX = nearShoulderX + Math.cos(forePhaseNear) * 14;
        const nearForePawY = nearShoulderY + 10 + Math.max(0, Math.cos(forePhaseNear)) * 7;

        ctx.strokeStyle = profile.primary;
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(16, 1);
        ctx.lineTo(18, 5);
        ctx.lineTo(nearShoulderX, nearShoulderY);
        ctx.lineTo(nearForePawX, nearForePawY);
        ctx.stroke();

        ctx.fillStyle = profile.muzzle;
        ctx.fillRect(nearForePawX - 1.5, nearForePawY, 3.5, 2.5);

        // 7) 1ST PLACE GOLDEN WINNER CORONET
        if (isWinner) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👑', 0, -28);

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('1ST', 0, -40);
        }

        ctx.restore();
      });

      // -----------------------------------------------------------------------
      // 5. UPDATE & RENDER SAND PARTICLES & DUST PUFFS
      // -----------------------------------------------------------------------
      sandParticles.current.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.isDust) {
          p.size += 0.15; // Expanding dust cloud
        }
      });
      sandParticles.current = sandParticles.current.filter((p) => p.alpha > 0);

      // -----------------------------------------------------------------------
      // 6. WINNER 180-PIECE CONFETTI CANNON CELEBRATION
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
        c.vy += 0.14;
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
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-600/70 bg-slate-950">
      <canvas
        ref={canvasRef}
        width={1000}
        height={480}
        className="w-full h-auto block select-none"
      />
    </div>
  );
};
