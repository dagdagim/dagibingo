import React, { useRef, useEffect } from 'react';
import { IChickenRoadGameDTO, ChickenSkinType, ChickenStageTheme } from '../../shared';

interface Vehicle {
  roadIndex: number;
  x: number;
  speed: number;
  width: number;
  height: number;
  color: string;
  type: 'SEDAN' | 'TAXI' | 'BUS' | 'TRUCK' | 'TRACTOR' | 'RACECAR';
  direction: 1 | -1;
  hasHeadlights: boolean;
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
  isCoin?: boolean;
}

interface ChickenRoadCanvasProps {
  game: IChickenRoadGameDTO | null;
  selectedSkin: ChickenSkinType;
  isStepping: boolean;
}

export const ChickenRoadCanvas: React.FC<ChickenRoadCanvasProps> = ({
  game,
  selectedSkin,
  isStepping,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const simState = useRef({
    currentRoad: 0,
    chickenX: 0,
    chickenY: 0,
    targetChickenY: 0,
    hopProgress: 1.0,
    hopHeight: 0,
    isCrashed: false,
    isCashedOut: false,
    vehicles: [] as Vehicle[],
    particles: [] as Particle[],
    lastTime: performance.now(),
  });

  useEffect(() => {
    if (game) {
      simState.current.currentRoad = game.currentRoad;
      simState.current.isCrashed = game.status === 'CRASHED';
      simState.current.isCashedOut = game.status === 'CASHED_OUT';

      if (game.status === 'CRASHED') {
        spawnCrashFeathers();
      } else if (game.status === 'CASHED_OUT') {
        spawnCashoutCelebration();
      }
    } else {
      simState.current.currentRoad = 0;
      simState.current.isCrashed = false;
      simState.current.isCashedOut = false;
    }
  }, [game?.status, game?.currentRoad]);

  // Trigger hop animation
  useEffect(() => {
    if (isStepping) {
      simState.current.hopProgress = 0;
    }
  }, [isStepping]);

  const spawnCrashFeathers = () => {
    const s = simState.current;
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      s.particles.push({
        x: s.chickenX,
        y: s.chickenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 12 + 6,
        color: ['#ffffff', '#fef08a', '#f59e0b', '#ef4444', '#cbd5e1'][Math.floor(Math.random() * 5)],
        alpha: 1.0,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife: 70 + Math.random() * 30,
        isFeather: true,
      });
    }
  };

  const spawnCashoutCelebration = () => {
    const s = simState.current;
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 8 + 4;
      s.particles.push({
        x: s.chickenX,
        y: s.chickenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: Math.random() * 8 + 5,
        color: ['#fbbf24', '#34d399', '#fef08a', '#60a5fa', '#f472b6'][Math.floor(Math.random() * 5)],
        alpha: 1.0,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        life: 0,
        maxLife: 90,
        isCoin: true,
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate Traffic across all 25 roads
    const vehicles: Vehicle[] = [];
    for (let r = 1; r <= 25; r++) {
      const dir: 1 | -1 = r % 2 === 0 ? 1 : -1;
      let type: Vehicle['type'] = 'SEDAN';
      let speed = 2.0;
      let width = 60;
      let height = 28;
      let color = '#3b82f6';

      if (r <= 4) {
        // Country stage
        type = r % 2 === 0 ? 'TRACTOR' : 'SEDAN';
        speed = 1.4 + Math.random() * 0.8;
        width = type === 'TRACTOR' ? 50 : 60;
        height = 30;
        color = type === 'TRACTOR' ? '#16a34a' : '#ea580c';
      } else if (r <= 8) {
        // Highway
        type = r % 3 === 0 ? 'TRUCK' : 'SEDAN';
        speed = 2.4 + Math.random() * 1.0;
        width = type === 'TRUCK' ? 85 : 62;
        height = type === 'TRUCK' ? 34 : 28;
        color = type === 'TRUCK' ? '#2563eb' : '#dc2626';
      } else if (r <= 13) {
        // City
        type = r % 2 === 0 ? 'TAXI' : 'BUS';
        speed = 2.2 + Math.random() * 0.9;
        width = type === 'BUS' ? 95 : 58;
        height = type === 'BUS' ? 35 : 28;
        color = type === 'TAXI' ? '#eab308' : '#0284c7';
      } else if (r <= 18) {
        // Wet Night
        type = 'SEDAN';
        speed = 2.6 + Math.random() * 1.2;
        width = 62;
        height = 28;
        color = ['#818cf8', '#f43f5e', '#38bdf8'][r % 3];
      } else {
        // Speedway
        type = 'RACECAR';
        speed = 4.0 + Math.random() * 1.5;
        width = 68;
        height = 26;
        color = ['#e11d48', '#f59e0b', '#8b5cf6'][r % 3];
      }

      const count = r <= 5 ? 1 : r <= 15 ? 2 : 3;
      for (let c = 0; c < count; c++) {
        vehicles.push({
          roadIndex: r,
          x: Math.random() * 1200,
          speed,
          width,
          height,
          color,
          type,
          direction: dir,
          hasHeadlights: r >= 14,
        });
      }
    }
    simState.current.vehicles = vehicles;

    // Render Animation Loop
    const render = (time: number) => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const roadSpacing = 72;
      const startY = height - 90;
      const targetY = startY - simState.current.currentRoad * roadSpacing;

      simState.current.chickenX = width / 2;
      simState.current.chickenY += (targetY - simState.current.chickenY) * 0.12;

      // Hop arc calculation
      if (simState.current.hopProgress < 1.0) {
        simState.current.hopProgress = Math.min(1.0, simState.current.hopProgress + 0.08);
        simState.current.hopHeight = Math.sin(simState.current.hopProgress * Math.PI) * 30;
      } else {
        simState.current.hopHeight = 0;
      }

      const cameraOffsetY = height / 2 - simState.current.chickenY;

      ctx.save();
      ctx.translate(0, cameraOffsetY);

      /* ---------------------------------------------------------------------- */
      /* 1. DRAW PROGRESSIVE ROADS & THEMES                                     */
      /* ---------------------------------------------------------------------- */
      for (let r = 0; r <= 25; r++) {
        const roadY = startY - r * roadSpacing;

        if (r === 0) {
          // Starting Country Meadow
          const grad = ctx.createLinearGradient(0, roadY - 30, 0, roadY + 50);
          grad.addColorStop(0, '#15803d');
          grad.addColorStop(1, '#166534');
          ctx.fillStyle = grad;
          ctx.fillRect(0, roadY - 35, width, 95);

          // Wildflowers
          for (let f = 0; f < 12; f++) {
            ctx.fillStyle = f % 2 === 0 ? '#fef08a' : '#f472b6';
            ctx.beginPath();
            ctx.arc(40 + f * 70, roadY + 15 + Math.sin(f) * 6, 3, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('🌾 STARTING MEADOW • SAFE ZONE', 24, roadY + 18);
        } else if (r === 25) {
          // Ultimate Finish Line
          const grad = ctx.createLinearGradient(0, roadY - 40, 0, roadY + 40);
          grad.addColorStop(0, '#b45309');
          grad.addColorStop(1, '#78350f');
          ctx.fillStyle = grad;
          ctx.fillRect(0, roadY - 40, width, 90);

          // Checkered line
          for (let ch = 0; ch < width; ch += 20) {
            ctx.fillStyle = (ch / 20) % 2 === 0 ? '#ffffff' : '#000000';
            ctx.fillRect(ch, roadY + 10, 20, 12);
          }

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('👑 ULTIMATE FINISH LINE • 12,500× GLORY', 24, roadY - 12);
        } else {
          // Determine stage environment theme
          const isCountry = r <= 4;
          const isHighway = r >= 5 && r <= 8;
          const isCity = r >= 9 && r <= 13;
          const isNight = r >= 14 && r <= 18;
          const isSpeedway = r >= 19;

          // Road Asphalt Background
          if (isNight) {
            ctx.fillStyle = '#090d16'; // Wet dark asphalt
          } else if (isSpeedway) {
            ctx.fillStyle = '#1c1917'; // Volcanic dark speedway
          } else {
            ctx.fillStyle = r % 2 === 0 ? '#1e293b' : '#334155'; // Classic clean asphalt
          }
          ctx.fillRect(0, roadY - 34, width, roadSpacing);

          // Road Painted Markings
          ctx.strokeStyle = isNight ? '#38bdf8' : isSpeedway ? '#f59e0b' : '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([20, 15]);
          ctx.beginPath();
          ctx.moveTo(0, roadY + 36);
          ctx.lineTo(width, roadY + 36);
          ctx.stroke();
          ctx.setLineDash([]);

          // Checkpoint Banners
          if (r === 5) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.fillRect(0, roadY - 34, width, roadSpacing);
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('🏁 CHECKPOINT 1 (Road 5 • 3.20×)', width - 240, roadY);
          } else if (r === 10) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
            ctx.fillRect(0, roadY - 34, width, roadSpacing);
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('🏆 GOLD CHECKPOINT (Road 10 • 25.0×)', width - 260, roadY);
          }

          // Left Road Badge
          const isPassed = (game?.currentRoad || 0) >= r;
          const isCurrent = (game?.currentRoad || 0) === r - 1;

          ctx.fillStyle = isCurrent ? '#f59e0b' : isPassed ? '#10b981' : '#475569';
          ctx.fillRect(16, roadY - 14, 60, 24);

          ctx.fillStyle = isCurrent ? '#000000' : '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`ROAD ${r}`, 22, roadY + 2);
        }
      }

      /* ---------------------------------------------------------------------- */
      /* 2. UPDATE & DRAW TRAFFIC VEHICLES                                      */
      /* ---------------------------------------------------------------------- */
      simState.current.vehicles.forEach((v) => {
        const vY = startY - v.roadIndex * roadSpacing - v.height / 2 + 5;
        v.x += v.speed * v.direction;

        if (v.direction === 1 && v.x > width + 120) v.x = -120;
        if (v.direction === -1 && v.x < -120) v.x = width + 120;

        // Vehicle Headlight Projection Glow
        if (v.hasHeadlights) {
          ctx.save();
          const headX = v.direction === 1 ? v.x + v.width : v.x;
          const beamGrad = ctx.createRadialGradient(
            headX + v.direction * 30,
            vY + v.height / 2,
            5,
            headX + v.direction * 70,
            vY + v.height / 2,
            65
          );
          beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
          beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.arc(headX + v.direction * 30, vY + v.height / 2, 65, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Vehicle Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(v.x, vY + v.height - 2, v.width, 6, 3);
        ctx.fill();

        // Vehicle Main Body
        ctx.fillStyle = v.color;
        ctx.shadowColor = v.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(v.x, vY, v.width, v.height, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Windshield Glass
        ctx.fillStyle = '#0f172a';
        if (v.direction === 1) {
          ctx.fillRect(v.x + v.width * 0.55, vY + 4, v.width * 0.3, v.height - 8);
        } else {
          ctx.fillRect(v.x + v.width * 0.15, vY + 4, v.width * 0.3, v.height - 8);
        }

        // Taxi Sign / Siren
        if (v.type === 'TAXI') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(v.x + v.width / 2 - 8, vY - 4, 16, 5);
        }

        // Racecar Wing
        if (v.type === 'RACECAR') {
          ctx.fillStyle = '#000000';
          const wingX = v.direction === 1 ? v.x - 4 : v.x + v.width - 4;
          ctx.fillRect(wingX, vY - 2, 8, v.height + 4);
        }

        // Front Headlights & Tail Lights
        if (v.direction === 1) {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(v.x + v.width - 2, vY + 3, 2, 5);
          ctx.fillRect(v.x + v.width - 2, vY + v.height - 8, 2, 5);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(v.x, vY + 3, 2, 5);
          ctx.fillRect(v.x, vY + v.height - 8, 2, 5);
        } else {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(v.x, vY + 3, 2, 5);
          ctx.fillRect(v.x, vY + v.height - 8, 2, 5);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(v.x + v.width - 2, vY + 3, 2, 5);
          ctx.fillRect(v.x + v.width - 2, vY + v.height - 8, 2, 5);
        }
      });

      /* ---------------------------------------------------------------------- */
      /* 3. DRAW EXPRESSIVE CHICKEN CHARACTER WITH SKINS 🐔                    */
      /* ---------------------------------------------------------------------- */
      if (!simState.current.isCrashed) {
        const cX = simState.current.chickenX;
        const cY = simState.current.chickenY - simState.current.hopHeight;

        // Ground Drop Shadow (Scales with jump)
        const shadowScale = Math.max(0.4, 1.0 - simState.current.hopHeight / 40);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(cX, simState.current.chickenY + 12, 14 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Idle breathing bob
        const bob = Math.sin(time * 0.008) * 2;
        const skin = selectedSkin || 'CLASSIC';

        // Plump Body
        ctx.fillStyle =
          skin === 'GOLDEN'
            ? '#fbbf24'
            : skin === 'NINJA'
            ? '#1e293b'
            : skin === 'BABY'
            ? '#fef08a'
            : skin === 'ROYAL'
            ? '#f8fafc'
            : '#ffffff';

        ctx.shadowColor = skin === 'GOLDEN' ? 'rgba(251, 191, 36, 0.8)' : 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = skin === 'GOLDEN' ? 15 : 6;
        ctx.beginPath();
        ctx.ellipse(cX, cY + bob, skin === 'BABY' ? 13 : 16, skin === 'BABY' ? 12 : 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Wing Flaps
        const wingFlap = Math.sin(time * 0.02) * 4;
        ctx.fillStyle = skin === 'NINJA' ? '#0f172a' : skin === 'GOLDEN' ? '#f59e0b' : '#fef08a';
        ctx.beginPath();
        ctx.ellipse(cX - 14, cY + bob + wingFlap, 5, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cX + 14, cY + bob + wingFlap, 5, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Red Crown Comb
        if (skin !== 'SPACE' && skin !== 'COWBOY' && skin !== 'ROYAL') {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(cX - 4, cY - 14 + bob, 4, 0, Math.PI * 2);
          ctx.arc(cX, cY - 17 + bob, 5, 0, Math.PI * 2);
          ctx.arc(cX + 4, cY - 14 + bob, 4, 0, Math.PI * 2);
          ctx.fill();
        }

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

        // SKIN ACCESSORIES
        if (skin === 'ROYAL') {
          // Golden Crown
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(cX - 8, cY - 14 + bob);
          ctx.lineTo(cX - 8, cY - 24 + bob);
          ctx.lineTo(cX - 4, cY - 18 + bob);
          ctx.lineTo(cX, cY - 25 + bob);
          ctx.lineTo(cX + 4, cY - 18 + bob);
          ctx.lineTo(cX + 8, cY - 24 + bob);
          ctx.lineTo(cX + 8, cY - 14 + bob);
          ctx.closePath();
          ctx.fill();

          // Purple Cape
          ctx.fillStyle = '#7e22ce';
          ctx.fillRect(cX - 12, cY + 4 + bob, 24, 10);
        } else if (skin === 'COWBOY') {
          // Brown Stetson Hat
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.ellipse(cX, cY - 16 + bob, 16, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(cX - 7, cY - 26 + bob, 14, 10);
          // Red Bandana
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(cX - 8, cY + 2 + bob, 16, 4);
        } else if (skin === 'NINJA') {
          // Red Headband
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(cX - 10, cY - 10 + bob, 20, 3);
          // Headband tail
          ctx.beginPath();
          ctx.moveTo(cX + 10, cY - 9 + bob);
          ctx.lineTo(cX + 20, cY - 4 + bob);
          ctx.stroke();
        } else if (skin === 'SPACE') {
          // Astronaut Helmet Bubble
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cX, cY - 8 + bob, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Nervous Sweat Drop if car is near
        const isNearCar = simState.current.vehicles.some(
          (v) => Math.abs(v.roadIndex - simState.current.currentRoad) <= 1 && Math.abs(v.x - cX) < 130
        );

        if (isNearCar) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(cX + 18, cY - 18, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Crash Mark
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.ellipse(simState.current.chickenX, simState.current.chickenY, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      /* ---------------------------------------------------------------------- */
      /* 4. DRAW PARTICLES (FEATHERS / COINS)                                   */
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
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
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
  }, [selectedSkin]);

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
