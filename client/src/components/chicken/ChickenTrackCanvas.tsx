import React, { useEffect, useRef } from 'react';
import { IChickenGameDTO } from '../../shared';

interface ChickenTrackCanvasProps {
  game: IChickenGameDTO | null;
  totalLanes: number;
  multipliers: number[];
  isStepping: boolean;
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

export const ChickenTrackCanvas: React.FC<ChickenTrackCanvasProps> = ({
  game,
  totalLanes,
  multipliers,
  isStepping,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Chicken animation state
  const chickenPosRef = useRef<{
    currentStep: number;
    targetStep: number;
    visualStep: number;
    jumpHeight: number;
    wingAngle: number;
    combJiggle: number;
    isRoasted: boolean;
  }>({
    currentStep: 0,
    targetStep: 0,
    visualStep: 0,
    jumpHeight: 0,
    wingAngle: 0,
    combJiggle: 0,
    isRoasted: false,
  });

  const currentStep = game?.currentStep || 0;
  const isBusted = game?.status === 'BUSTED';
  const isWon = game?.status === 'CASHED_OUT';

  // Sync step target
  useEffect(() => {
    chickenPosRef.current.targetStep = currentStep;
    chickenPosRef.current.isRoasted = isBusted;

    if (isBusted) {
      // Spawn burst of feathers and smoke
      spawnBustParticles();
    } else if (isWon) {
      // Spawn golden victory confetti
      spawnVictoryConfetti();
    } else if (currentStep > 0) {
      // Spawn corn sparkles
      spawnCornSparkles();
    }
  }, [currentStep, isBusted, isWon]);

  const spawnCornSparkles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    for (let i = 0; i < 25; i++) {
      particlesRef.current.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 80,
        y: canvas.height * 0.65 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 6 - 2,
        size: Math.random() * 4 + 2,
        color: Math.random() > 0.5 ? '#fbbf24' : '#34d399',
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.02,
      });
    }
  };

  const spawnBustParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // White feathers, orange fire embers, and grey smoke
    for (let i = 0; i < 40; i++) {
      const isFeather = Math.random() > 0.4;
      particlesRef.current.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 40,
        y: canvas.height * 0.65 + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 8 - 3,
        size: isFeather ? Math.random() * 6 + 3 : Math.random() * 8 + 4,
        color: isFeather ? '#ffffff' : Math.random() > 0.5 ? '#f43f5e' : '#f97316',
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02,
      });
    }
  };

  const spawnVictoryConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#3b82f6'];
    for (let i = 0; i < 50; i++) {
      particlesRef.current.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 140,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 4,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.01 + Math.random() * 0.015,
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animTime = 0;

    const render = () => {
      animTime += 0.035;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Smoothly interpolate chicken position
      const state = chickenPosRef.current;
      const stepDiff = state.targetStep - state.visualStep;
      state.visualStep += stepDiff * 0.15;

      // Hop arc calculation during motion
      if (Math.abs(stepDiff) > 0.02) {
        state.jumpHeight = Math.sin(Math.PI * (1 - Math.abs(stepDiff))) * 35;
        state.wingAngle = Math.sin(animTime * 15) * 0.4;
      } else {
        state.jumpHeight = Math.sin(animTime * 4) * 3; // Idle bobbing
        state.wingAngle = Math.sin(animTime * 3) * 0.08;
      }
      state.combJiggle = Math.sin(animTime * 6) * 3;

      ctx.clearRect(0, 0, width, height);

      // 2. Draw Farmland & Country Highway Background
      drawSceneBackground(ctx, width, height, animTime, state.visualStep, totalLanes, multipliers);

      // 3. Draw Chicken Character
      drawAnimatedChicken(
        ctx,
        width / 2,
        height * 0.65 - state.jumpHeight,
        state.wingAngle,
        state.combJiggle,
        state.isRoasted,
        isWon,
        animTime
      );

      // 4. Update & Render Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [totalLanes, multipliers, game?.status]);

  /**
   * Draw Highway Lanes with Perspective & Dynamic Hazards
   */
  const drawSceneBackground = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    camStep: number,
    lanes: number,
    mults: number[]
  ) => {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.7, '#1e293b');
    skyGrad.addColorStop(1, '#064e3b'); // Farmland horizon
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.4);

    // Farmland grass field
    const grassGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
    grassGrad.addColorStop(0, '#065f46');
    grassGrad.addColorStop(1, '#022c22');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, h * 0.4, w, h * 0.6);

    // Golden Sunset Glow on Horizon
    const sunGlow = ctx.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.35, 200);
    sunGlow.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
    sunGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, w, h * 0.5);

    // Perspective Highway Road
    const roadTopY = h * 0.35;
    const roadBottomY = h + 40;
    const roadTopW = w * 0.4;
    const roadBottomW = w * 0.95;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo((w - roadTopW) / 2, roadTopY);
    ctx.lineTo((w + roadTopW) / 2, roadTopY);
    ctx.lineTo((w + roadBottomW) / 2, roadBottomY);
    ctx.lineTo((w - roadBottomW) / 2, roadBottomY);
    ctx.closePath();

    const roadGrad = ctx.createLinearGradient(0, roadTopY, 0, roadBottomY);
    roadGrad.addColorStop(0, '#1e293b');
    roadGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = roadGrad;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Draw Lane Strips scrolling with camera step
    const visibleLanes = 6;
    const laneHeight = (roadBottomY - roadTopY) / visibleLanes;

    for (let i = -1; i < visibleLanes + 2; i++) {
      const stepIdx = Math.floor(camStep) + i;
      const progressOffset = (camStep % 1);
      const laneY = roadBottomY - (i - progressOffset + 1) * laneHeight;

      if (laneY < roadTopY || laneY > roadBottomY) continue;

      const t = (laneY - roadTopY) / (roadBottomY - roadTopY);
      const curW = roadTopW + (roadBottomW - roadTopW) * t;
      const leftX = (w - curW) / 2;
      const rightX = (w + curW) / 2;

      // Lane divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2 * t;
      ctx.setLineDash([12 * t, 8 * t]);
      ctx.beginPath();
      ctx.moveTo(leftX + 20, laneY);
      ctx.lineTo(rightX - 20, laneY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Lane Info Badge on Road Shoulder
      if (stepIdx >= 0 && stepIdx < lanes) {
        const mult = mults[stepIdx] || 1.0;
        const isPassed = stepIdx < currentStep;
        const isCurrent = stepIdx === currentStep;

        ctx.font = `bold ${Math.max(10, Math.floor(14 * t))}px monospace`;
        ctx.fillStyle = isCurrent
          ? '#fbbf24'
          : isPassed
          ? '#34d399'
          : 'rgba(148, 163, 184, 0.6)';

        ctx.textAlign = 'right';
        ctx.fillText(`LANE ${stepIdx + 1}`, leftX - 10, laneY + 5 * t);
        ctx.textAlign = 'left';
        ctx.fillText(`${mult.toFixed(2)}×`, rightX + 10, laneY + 5 * t);

        // Draw Golden Egg Coop on Destination Lane
        if (stepIdx === lanes - 1) {
          ctx.save();
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🏆 🥚', w / 2, laneY - 10);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  };

  /**
   * Draw Photorealistic Animated Chicken
   */
  const drawAnimatedChicken = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    wingAngle: number,
    combJiggle: number,
    isRoasted: boolean,
    isWon: boolean,
    time: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Ground Shadow Projection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 28, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isRoasted) {
      // 🍗 DRAW ROASTED CHICKEN DRUMSTICK
      ctx.save();
      ctx.rotate(Math.PI / 8);

      // Bone
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(-22, -6, 16, 12, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-24, -3, 5, 0, Math.PI * 2);
      ctx.arc(-24, 3, 5, 0, Math.PI * 2);
      ctx.fill();

      // Crispy Meat Drumstick
      const roastGrad = ctx.createRadialGradient(2, 0, 4, 2, 0, 24);
      roastGrad.addColorStop(0, '#f97316');
      roastGrad.addColorStop(0.7, '#c2410c');
      roastGrad.addColorStop(1, '#7c2d12');
      ctx.fillStyle = roastGrad;
      ctx.beginPath();
      ctx.ellipse(4, 0, 22, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Smoke swirl above drumstick
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(8, -28, 0, -36);
      ctx.stroke();

      ctx.restore();
      ctx.restore();
      return;
    }

    // 🐔 DRAW LIVE CHICKEN
    // 1. Yellow Legs & Talons
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    const legOffset = Math.sin(time * 12) * 4;
    // Left leg
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(-7 + legOffset, 26);
    ctx.lineTo(-12 + legOffset, 27);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(6, 14);
    ctx.lineTo(7 - legOffset, 26);
    ctx.lineTo(12 - legOffset, 27);
    ctx.stroke();

    // 2. Feathered Body
    const bodyGrad = ctx.createRadialGradient(-2, 0, 6, 0, 0, 22);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.85, '#f1f5f9');
    bodyGrad.addColorStop(1, '#cbd5e1');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, 19, 16, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Tail Feathers (Bobbing)
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.quadraticCurveTo(-26, -6 + Math.sin(time * 6) * 3, -24, -14);
    ctx.quadraticCurveTo(-14, -10, -10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Flapping Wings
    ctx.save();
    ctx.translate(0, 2);
    ctx.rotate(wingAngle);
    const wingGrad = ctx.createLinearGradient(0, -6, 12, 10);
    wingGrad.addColorStop(0, '#f8fafc');
    wingGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.ellipse(4, 2, 12, 8, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 5. Head
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12, -10, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 6. Red Comb on top of Head
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(8, -20 + combJiggle * 0.3, 4.5, 0, Math.PI * 2);
    ctx.arc(13, -22 + combJiggle * 0.4, 5, 0, Math.PI * 2);
    ctx.arc(18, -19 + combJiggle * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();

    // 7. Red Wattle under Beak
    ctx.beginPath();
    ctx.ellipse(17, -2, 3.5, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 8. Orange Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(21, -12);
    ctx.lineTo(29, -8);
    ctx.lineTo(21, -5);
    ctx.closePath();
    ctx.fill();

    // 9. Eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(15, -12, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Catchlight in eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, -13, 1, 0, Math.PI * 2);
    ctx.fill();

    // 10. Golden Victory Crown if Won
    if (isWon) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(8, -24);
      ctx.lineTo(11, -30);
      ctx.lineTo(14, -25);
      ctx.lineTo(17, -30);
      ctx.lineTo(20, -24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  };

  return (
    <div className="relative w-full h-[320px] sm:h-[400px] rounded-3xl overflow-hidden glass-panel border border-arena-border shadow-2xl">
      <canvas
        ref={canvasRef}
        width={750}
        height={400}
        className="w-full h-full object-cover select-none"
      />
    </div>
  );
};
