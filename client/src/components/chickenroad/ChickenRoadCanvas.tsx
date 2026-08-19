import React, { useRef, useEffect } from 'react';
import { IChickenRoadGameDTO, ChickenRoadDifficulty } from '../../shared';

interface Vehicle {
  laneIndex: number;
  x: number;
  speed: number;
  width: number;
  height: number;
  color: string;
  type: 'SPORTS' | 'TAXI' | 'TRUCK' | 'POLICE';
  direction: 1 | -1; // 1 = right, -1 = left
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  isFeather?: boolean;
}

interface ChickenRoadCanvasProps {
  game: IChickenRoadGameDTO | null;
  difficulty: ChickenRoadDifficulty;
  isStepping: boolean;
  onStepRequest?: () => void;
}

export const ChickenRoadCanvas: React.FC<ChickenRoadCanvasProps> = ({
  game,
  difficulty,
  isStepping,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Simulation State
  const simState = useRef({
    currentLane: 0,
    targetLane: 0,
    chickenX: 0,
    chickenY: 0,
    hopProgress: 1.0, // 0 to 1 during jump
    hopHeight: 0,
    isCrashed: false,
    isCashedOut: false,
    vehicles: [] as Vehicle[],
    particles: [] as Particle[],
    lastTime: performance.now(),
    roadScrollOffset: 0,
  });

  useEffect(() => {
    if (game) {
      simState.current.currentLane = game.currentLane;
      simState.current.targetLane = game.currentLane;
      simState.current.isCrashed = game.status === 'CRASHED';
      simState.current.isCashedOut = game.status === 'CASHED_OUT';

      if (game.status === 'CRASHED') {
        spawnCrashFeathers();
      } else if (game.status === 'CASHED_OUT') {
        spawnCashoutCoins();
      }
    } else {
      simState.current.currentLane = 0;
      simState.current.targetLane = 0;
      simState.current.isCrashed = false;
      simState.current.isCashedOut = false;
    }
  }, [game?.status, game?.currentLane]);

  // Trigger hop animation on step
  useEffect(() => {
    if (isStepping) {
      simState.current.hopProgress = 0;
    }
  }, [isStepping]);

  const spawnCrashFeathers = () => {
    const s = simState.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      s.particles.push({
        x: s.chickenX,
        y: s.chickenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 12 + 6,
        color: ['#ffffff', '#fef08a', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)],
        alpha: 1.0,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife: 60 + Math.random() * 30,
        isFeather: true,
      });
    }
  };

  const spawnCashoutCoins = () => {
    const s = simState.current;
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 7 + 4;
      s.particles.push({
        x: s.chickenX,
        y: s.chickenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: Math.random() * 8 + 4,
        color: ['#fbbf24', '#34d399', '#fef08a', '#60a5fa'][Math.floor(Math.random() * 4)],
        alpha: 1.0,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        life: 0,
        maxLife: 80,
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const totalLanes = difficulty === 'DAREDEVIL' ? 20 : 25;

    // Initialize Passing Vehicles across lanes
    const vehicleColors = {
      SPORTS: '#ef4444',
      TAXI: '#f59e0b',
      TRUCK: '#3b82f6',
      POLICE: '#10b981',
    };

    const types: ('SPORTS' | 'TAXI' | 'TRUCK' | 'POLICE')[] = ['SPORTS', 'TAXI', 'TRUCK', 'POLICE'];
    const vehicles: Vehicle[] = [];

    for (let l = 1; l < totalLanes; l++) {
      const dir: 1 | -1 = l % 2 === 0 ? 1 : -1;
      const type = types[l % types.length];
      const count = (l % 3) + 1;

      for (let c = 0; c < count; c++) {
        vehicles.push({
          laneIndex: l,
          x: Math.random() * 1200,
          speed: (Math.random() * 2.5 + 2.0) * (type === 'SPORTS' ? 1.6 : type === 'TRUCK' ? 0.9 : 1.2),
          width: type === 'TRUCK' ? 85 : type === 'SPORTS' ? 55 : 60,
          height: type === 'TRUCK' ? 34 : 26,
          color: vehicleColors[type],
          type,
          direction: dir,
        });
      }
    }
    simState.current.vehicles = vehicles;

    // Animation Loop
    const render = (time: number) => {
      const dt = (time - simState.current.lastTime) / 1000;
      simState.current.lastTime = time;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Camera Y Follows Chicken position
      const laneHeight = 68;
      const startY = height - 90;
      const targetChickenY = startY - simState.current.currentLane * laneHeight;

      // Smooth camera scroll
      simState.current.chickenX = width / 2;
      simState.current.chickenY += (targetChickenY - simState.current.chickenY) * 0.12;

      // Hop arc physics
      if (simState.current.hopProgress < 1.0) {
        simState.current.hopProgress = Math.min(1.0, simState.current.hopProgress + 0.08);
        simState.current.hopHeight = Math.sin(simState.current.hopProgress * Math.PI) * 28;
      } else {
        simState.current.hopHeight = 0;
      }

      const cameraOffsetY = height / 2 - simState.current.chickenY;

      ctx.save();
      ctx.translate(0, cameraOffsetY);

      /* ---------------------------------------------------------------------- */
      /* 1. DRAW HIGHWAY ROADS & LANES                                           */
      /* ---------------------------------------------------------------------- */
      for (let l = 0; l <= totalLanes; l++) {
        const laneY = startY - l * laneHeight;

        if (l === 0) {
          // Starting Green Turf Safe Zone
          const grad = ctx.createLinearGradient(0, laneY - 20, 0, laneY + 50);
          grad.addColorStop(0, '#064e3b');
          grad.addColorStop(1, '#022c22');
          ctx.fillStyle = grad;
          ctx.fillRect(0, laneY - 25, width, 80);

          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('STARTING ROADSIDE SAFETY ZONE', 24, laneY + 15);
        } else if (l === totalLanes) {
          // Finish Golden Glory Zone
          const grad = ctx.createLinearGradient(0, laneY - 30, 0, laneY + 40);
          grad.addColorStop(0, '#78350f');
          grad.addColorStop(1, '#451a03');
          ctx.fillStyle = grad;
          ctx.fillRect(0, laneY - 30, width, 80);

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('🏆 HIGHWAY FINISH LINE • GOLDEN BARN', 24, laneY + 10);
        } else {
          // Highway Asphalt Lane
          ctx.fillStyle = l % 2 === 0 ? '#1e293b' : '#0f172a';
          ctx.fillRect(0, laneY - 30, width, laneHeight);

          // Painted Road Dashes
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.setLineDash([20, 15]);
          ctx.beginPath();
          ctx.moveTo(0, laneY + 34);
          ctx.lineTo(width, laneY + 34);
          ctx.stroke();
          ctx.setLineDash([]);

          // Lane Multiplier Pill on Left
          const isPassed = (game?.currentLane || 0) > l;
          const isCurrent = (game?.currentLane || 0) === l;

          ctx.fillStyle = isCurrent ? '#f59e0b' : isPassed ? '#10b981' : '#475569';
          ctx.fillRect(16, laneY - 14, 52, 22);

          ctx.fillStyle = isCurrent ? '#000000' : '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`LANE ${l}`, 22, laneY + 1);
        }
      }

      /* ---------------------------------------------------------------------- */
      /* 2. UPDATE & DRAW MOVING VEHICLES                                       */
      /* ---------------------------------------------------------------------- */
      simState.current.vehicles.forEach((v) => {
        const vY = startY - v.laneIndex * laneHeight - v.height / 2 + 5;
        v.x += v.speed * v.direction;

        // Wrap around screen
        if (v.direction === 1 && v.x > width + 100) {
          v.x = -100;
        } else if (v.direction === -1 && v.x < -100) {
          v.x = width + 100;
        }

        // Vehicle Headlight Projection Glow
        ctx.save();
        const headX = v.direction === 1 ? v.x + v.width : v.x;
        const beamGrad = ctx.createRadialGradient(
          headX + v.direction * 30,
          vY + v.height / 2,
          5,
          headX + v.direction * 70,
          vY + v.height / 2,
          60
        );
        beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
        beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.arc(headX + v.direction * 30, vY + v.height / 2, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Vehicle Body (Rounded Box)
        ctx.fillStyle = v.color;
        ctx.shadowColor = v.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(v.x, vY, v.width, v.height, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Vehicle Windshield / Cab
        ctx.fillStyle = '#0f172a';
        if (v.direction === 1) {
          ctx.fillRect(v.x + v.width * 0.55, vY + 4, v.width * 0.3, v.height - 8);
        } else {
          ctx.fillRect(v.x + v.width * 0.15, vY + 4, v.width * 0.3, v.height - 8);
        }

        // Police Beacon Strobe
        if (v.type === 'POLICE') {
          const isRed = Math.floor(time / 120) % 2 === 0;
          ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(v.x + v.width / 2, vY + v.height / 2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Headlights / Tail Lights
        if (v.direction === 1) {
          // Front white lights
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(v.x + v.width - 3, vY + 3, 3, 5);
          ctx.fillRect(v.x + v.width - 3, vY + v.height - 8, 3, 5);
          // Rear red lights
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(v.x, vY + 3, 3, 5);
          ctx.fillRect(v.x, vY + v.height - 8, 3, 5);
        } else {
          // Front white lights
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(v.x, vY + 3, 3, 5);
          ctx.fillRect(v.x, vY + v.height - 8, 3, 5);
          // Rear red lights
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(v.x + v.width - 3, vY + 3, 3, 5);
          ctx.fillRect(v.x + v.width - 3, vY + v.height - 8, 3, 5);
        }
      });

      /* ---------------------------------------------------------------------- */
      /* 3. DRAW ANIMATED CHICKEN 🐔                                            */
      /* ---------------------------------------------------------------------- */
      if (!simState.current.isCrashed) {
        const cX = simState.current.chickenX;
        const cY = simState.current.chickenY - simState.current.hopHeight;

        // Ground Drop Shadow
        const shadowScale = Math.max(0.4, 1.0 - simState.current.hopHeight / 40);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(cX, simState.current.chickenY + 12, 14 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Plump White Feathery Body
        const bob = Math.sin(time * 0.01) * 2;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(cX, cY + bob, 16, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Wing Flaps
        const wingFlap = Math.sin(time * 0.02) * 4;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(cX - 14, cY + bob + wingFlap, 5, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cX + 14, cY + bob + wingFlap, 5, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Red Crown Comb
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cX - 4, cY - 14 + bob, 4, 0, Math.PI * 2);
        ctx.arc(cX, cY - 17 + bob, 5, 0, Math.PI * 2);
        ctx.arc(cX + 4, cY - 14 + bob, 4, 0, Math.PI * 2);
        ctx.fill();

        // Yellow Beak
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(cX - 3, cY - 8 + bob);
        ctx.lineTo(cX + 3, cY - 8 + bob);
        ctx.lineTo(cX, cY - 14 + bob);
        ctx.closePath();
        ctx.fill();

        // Cartoon Eyes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cX - 5, cY - 6 + bob, 2, 0, Math.PI * 2);
        ctx.arc(cX + 5, cY - 6 + bob, 2, 0, Math.PI * 2);
        ctx.fill();

        // Panic Sweat Drop if near passing car
        const nearCar = simState.current.vehicles.some(
          (v) => Math.abs(v.laneIndex - simState.current.currentLane) <= 1 && Math.abs(v.x - cX) < 120
        );

        if (nearCar) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(cX + 18, cY - 18, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Crash Splat Mark
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.ellipse(simState.current.chickenX, simState.current.chickenY, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      /* ---------------------------------------------------------------------- */
      /* 4. UPDATE & DRAW PARTICLES                                             */
      /* ---------------------------------------------------------------------- */
      simState.current.particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;
        p.life++;
        p.alpha = Math.max(0, 1.0 - p.life / p.maxLife);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.isFeather) {
          // Feather shape
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Coin / Sparkle
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        if (p.life >= p.maxLife) {
          simState.current.particles.splice(idx, 1);
        }
      });

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [difficulty]);

  return (
    <div className="w-full h-[520px] rounded-3xl overflow-hidden relative border border-arena-border shadow-2xl bg-slate-950">
      <canvas
        ref={canvasRef}
        width={900}
        height={520}
        className="w-full h-full block cursor-pointer"
      />
    </div>
  );
};
