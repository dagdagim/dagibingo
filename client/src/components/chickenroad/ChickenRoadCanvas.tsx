import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChickenRoadDifficulty,
  IChickenRoadGameDTO,
  IChickenRoadRowState,
  ChickenRoadTileType,
} from '../../shared';

interface ChickenRoadCanvasProps {
  game: IChickenRoadGameDTO | null;
  difficulty: ChickenRoadDifficulty;
  tilesPerRow: number;
  multipliers: number[];
  isStepping: boolean;
  onStep: (tileIndex: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
  type?: 'feather' | 'smoke' | 'spark' | 'coin' | 'confetti';
}

interface CarEntity {
  lane: number;
  x: number;
  speed: number;
  direction: 1 | -1;
  color: string;
  type: 'sports' | 'sedan' | 'truck' | 'taxi' | 'suv';
  width: number;
  height: number;
  wheelRot: number;
  isBraking?: boolean;
}

interface SkidMark {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
}

const CAR_COLORS = [
  '#ef4444', // Red sports
  '#f59e0b', // Yellow taxi
  '#3b82f6', // Blue sedan
  '#10b981', // Emerald sports
  '#8b5cf6', // Purple SUV
  '#ec4899', // Pink roadster
  '#f97316', // Orange muscle
  '#64748b', // Slate truck
];

export const ChickenRoadCanvas: React.FC<ChickenRoadCanvasProps> = ({
  game,
  difficulty,
  tilesPerRow,
  multipliers,
  isStepping,
  onStep,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Animation & Physics State
  const animFrameId = useRef<number | null>(null);
  const particles = useRef<Particle[]>([]);
  const cars = useRef<CarEntity[]>([]);
  const skidMarks = useRef<SkidMark[]>([]);
  
  // Chicken Visual State
  const chickenPos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, hopHeight: 0, hopProgress: 1 });
  const chickenState = useRef<'idle' | 'hopping' | 'crushed' | 'winner'>('idle');
  const chickenFacing = useRef<1 | -1>(1);
  const cameraY = useRef(0);
  const targetCameraY = useRef(0);
  const hoverTile = useRef<{ row: number; col: number } | null>(null);

  // Lane configuration
  const TOTAL_LANES = 10;
  const LANE_HEIGHT = 110;
  const SIDEWALK_HEIGHT = 120;
  const FINISH_HEIGHT = 160;
  const TOTAL_WORLD_HEIGHT = SIDEWALK_HEIGHT + TOTAL_LANES * LANE_HEIGHT + FINISH_HEIGHT;

  // Initialize Traffic
  const initCars = useCallback((width: number) => {
    const newCars: CarEntity[] = [];
    for (let lane = 0; lane < TOTAL_LANES; lane++) {
      const numCarsInLane = Math.floor(Math.random() * 2) + 2;
      const direction: 1 | -1 = lane % 2 === 0 ? 1 : -1;
      const baseSpeed = (1.5 + Math.random() * 1.8 + (lane * 0.15)) * direction;

      for (let c = 0; c < numCarsInLane; c++) {
        const spacing = (width + 300) / numCarsInLane;
        const xPos = c * spacing + (Math.random() * 80);
        const carType: 'sports' | 'sedan' | 'truck' | 'taxi' | 'suv' =
          lane === 9 ? 'truck' : lane % 4 === 0 ? 'suv' : lane % 3 === 0 ? 'sports' : lane % 2 === 0 ? 'taxi' : 'sedan';

        newCars.push({
          lane,
          x: xPos,
          speed: baseSpeed,
          direction,
          color: CAR_COLORS[(lane * 2 + c) % CAR_COLORS.length],
          type: carType,
          width: carType === 'truck' ? 110 : carType === 'suv' ? 85 : 75,
          height: 38,
          wheelRot: 0,
        });
      }
    }
    cars.current = newCars;
  }, []);

  // Spawn Feathers / Particles
  const spawnFeathers = (x: number, y: number) => {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: i % 4 === 0 ? '#f59e0b' : i % 3 === 0 ? '#ef4444' : '#ffffff',
        size: 5 + Math.random() * 8,
        alpha: 1,
        decay: 0.012 + Math.random() * 0.015,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        type: 'feather',
      });
    }

    // Smoke
    for (let i = 0; i < 20; i++) {
      particles.current.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        color: '#94a3b8',
        size: 15 + Math.random() * 25,
        alpha: 0.8,
        decay: 0.02,
        rotation: Math.random() * Math.PI,
        vRot: 0.05,
        type: 'smoke',
      });
    }
  };

  // Spawn Victory Confetti & Coins
  const spawnCelebration = (x: number, y: number) => {
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        color: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#a855f7'][i % 6],
        size: 6 + Math.random() * 6,
        alpha: 1,
        decay: 0.008 + Math.random() * 0.01,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        type: i % 2 === 0 ? 'coin' : 'confetti',
      });
    }
  };

  // Synchronize Chicken Position with Game State
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width / (window.devicePixelRatio || 1);

    const currentRow = game ? game.currentRow : 0;
    const isFinished = game && game.status !== 'IN_PROGRESS';
    const isCrushed = game?.status === 'CRUSHED';
    const isWon = game?.status === 'CASHED_OUT';

    // Calculate Y world position
    let targetY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT / 2;
    if (currentRow > 0 && currentRow <= TOTAL_LANES) {
      targetY = TOTAL_WORLD_HEIGHT - (SIDEWALK_HEIGHT + (currentRow - 0.5) * LANE_HEIGHT);
    } else if (currentRow > TOTAL_LANES || isWon) {
      targetY = FINISH_HEIGHT / 2;
    }

    // Calculate X world position
    let targetX = width / 2;
    if (game && game.rows.length > 0 && currentRow > 0) {
      const lastRevealed = game.rows[game.rows.length - 1];
      if (lastRevealed && lastRevealed.selectedTileIndex !== undefined) {
        const laneWidth = width * 0.85;
        const startX = (width - laneWidth) / 2;
        const colWidth = laneWidth / tilesPerRow;
        targetX = startX + (lastRevealed.selectedTileIndex + 0.5) * colWidth;
      }
    }

    if (chickenPos.current.x === 0 && chickenPos.current.y === 0) {
      chickenPos.current.x = targetX;
      chickenPos.current.y = targetY;
      chickenPos.current.targetX = targetX;
      chickenPos.current.targetY = targetY;
    } else {
      chickenPos.current.targetX = targetX;
      chickenPos.current.targetY = targetY;
      chickenPos.current.hopProgress = 0; // Trigger hop animation
    }

    if (isCrushed) {
      chickenState.current = 'crushed';
      spawnFeathers(targetX, targetY);
      skidMarks.current.push({
        x: targetX - 50,
        y: targetY,
        width: 100,
        height: 12,
        alpha: 0.9,
      });
    } else if (isWon) {
      chickenState.current = 'winner';
      spawnCelebration(targetX, targetY);
    } else {
      chickenState.current = 'idle';
    }

    // Set camera target
    targetCameraY.current = Math.max(0, Math.min(TOTAL_WORLD_HEIGHT - 600, targetY - 350));
  }, [game, tilesPerRow, TOTAL_LANES, TOTAL_WORLD_HEIGHT]);

  // Main Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = 680 * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `680px`;
      initCars(rect.width);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const viewWidth = canvas.width / dpr;
      const viewHeight = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Smooth Camera Lerp
      cameraY.current += (targetCameraY.current - cameraY.current) * 0.08;

      ctx.translate(0, -cameraY.current);

      // -------------------------------------------------------------
      // 1. DRAW BACKGROUND & HIGHWAY
      // -------------------------------------------------------------
      
      // Grass edges
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, viewWidth, TOTAL_WORLD_HEIGHT);

      const roadWidth = viewWidth * 0.94;
      const roadX = (viewWidth - roadWidth) / 2;

      // Asphalt base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(roadX, FINISH_HEIGHT, roadWidth, TOTAL_LANES * LANE_HEIGHT);

      // Road shoulder lines (Solid White & Yellow)
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(roadX + 15, FINISH_HEIGHT);
      ctx.lineTo(roadX + 15, FINISH_HEIGHT + TOTAL_LANES * LANE_HEIGHT);
      ctx.moveTo(roadX + roadWidth - 15, FINISH_HEIGHT);
      ctx.lineTo(roadX + roadWidth - 15, FINISH_HEIGHT + TOTAL_LANES * LANE_HEIGHT);
      ctx.stroke();

      // Draw Guardrails
      ctx.fillStyle = '#475569';
      ctx.fillRect(roadX - 10, FINISH_HEIGHT, 10, TOTAL_LANES * LANE_HEIGHT);
      ctx.fillRect(roadX + roadWidth, FINISH_HEIGHT, 10, TOTAL_LANES * LANE_HEIGHT);

      // Draw Skid Marks
      for (const skid of skidMarks.current) {
        ctx.fillStyle = `rgba(15, 23, 42, ${skid.alpha})`;
        ctx.fillRect(skid.x, skid.y - 6, skid.width, skid.height);
      }

      // -------------------------------------------------------------
      // 2. DRAW LANES, MARKINGS & ROAD BLOCKERS
      // -------------------------------------------------------------
      const currentRow = game ? game.currentRow : 0;

      for (let lane = 0; lane < TOTAL_LANES; lane++) {
        const laneY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT - (lane + 1) * LANE_HEIGHT;
        const isCurrentLane = game?.status === 'IN_PROGRESS' && currentRow === lane;
        const isPassedLane = lane < currentRow;
        const rowState = game?.rows.find((r) => r.rowIndex === lane);

        // Lane divider dashed line
        if (lane > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 3;
          ctx.setLineDash([20, 20]);
          ctx.beginPath();
          ctx.moveTo(roadX + 30, laneY + LANE_HEIGHT);
          ctx.lineTo(roadX + roadWidth - 30, laneY + LANE_HEIGHT);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Multiplier Billboard Sign on Left Shoulder
        const multVal = multipliers[lane] || (1 + lane * 0.5);
        ctx.save();
        ctx.fillStyle = isPassedLane ? '#10b981' : isCurrentLane ? '#f59e0b' : '#334155';
        ctx.beginPath();
        ctx.roundRect(roadX + 25, laneY + 20, 70, 32, 8);
        ctx.fill();
        ctx.strokeStyle = isCurrentLane ? '#fbbf24' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${multVal.toFixed(2)}×`, roadX + 60, laneY + 36);
        ctx.restore();

        // ---------------------------------------------------------
        // ROAD BLOCKER / HYDRAULIC BARRIER (Safely crossed lane)
        // ---------------------------------------------------------
        if (isPassedLane && rowState) {
          // Draw heavy duty yellow/black diagonal striped barrier
          const barrierY = laneY + LANE_HEIGHT / 2 - 8;
          ctx.save();
          
          // Outer housing
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(roadX + 100, barrierY - 4, roadWidth - 200, 24);

          // Striped barrier bar
          ctx.fillStyle = '#eab308';
          ctx.fillRect(roadX + 105, barrierY, roadWidth - 210, 16);

          // Diagonal Hazard Stripes
          ctx.fillStyle = '#000000';
          for (let sx = roadX + 105; sx < roadX + roadWidth - 105; sx += 30) {
            ctx.beginPath();
            ctx.moveTo(sx, barrierY + 16);
            ctx.lineTo(sx + 15, barrierY);
            ctx.lineTo(sx + 25, barrierY);
            ctx.lineTo(sx + 10, barrierY + 16);
            ctx.fill();
          }

          // Blinking Amber Warning LEDs
          const blink = Math.sin(time * 0.008) > 0;
          ctx.fillStyle = blink ? '#fbbf24' : '#78350f';
          ctx.beginPath();
          ctx.arc(roadX + 120, barrierY + 8, 5, 0, Math.PI * 2);
          ctx.arc(roadX + roadWidth - 120, barrierY + 8, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // Active Lane Target Indicators (Interactive Tiles)
        const laneInnerWidth = roadWidth * 0.75;
        const laneStartX = roadX + (roadWidth - laneInnerWidth) / 2;
        const colWidth = laneInnerWidth / tilesPerRow;

        for (let col = 0; col < tilesPerRow; col++) {
          const tileX = laneStartX + col * colWidth;
          const tileY = laneY + 15;
          const tileW = colWidth - 12;
          const tileH = LANE_HEIGHT - 30;

          const isHovered = hoverTile.current?.row === lane && hoverTile.current?.col === col;

          if (isCurrentLane && !isStepping) {
            ctx.save();
            ctx.fillStyle = isHovered ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.15)';
            ctx.strokeStyle = isHovered ? '#818cf8' : 'rgba(129, 140, 248, 0.4)';
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.beginPath();
            ctx.roundRect(tileX + 6, tileY, tileW, tileH, 12);
            ctx.fill();
            ctx.stroke();

            // Pulsing target arrow
            const bounce = Math.sin(time * 0.008 + col) * 4;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('⬆️', tileX + 6 + tileW / 2, tileY + tileH / 2 + bounce);
            ctx.restore();
          }
        }
      }

      // -------------------------------------------------------------
      // 3. DRAW START SIDEWALK & FINISH LINE
      // -------------------------------------------------------------
      
      // Start Sidewalk (Bottom)
      const startY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT;
      ctx.fillStyle = '#334155';
      ctx.fillRect(roadX, startY, roadWidth, SIDEWALK_HEIGHT);
      
      // Sidewalk Curb Pavers
      ctx.fillStyle = '#475569';
      for (let cx = roadX; cx < roadX + roadWidth; cx += 40) {
        ctx.fillRect(cx, startY, 38, 14);
      }

      // Start Zone text banner
      ctx.fillStyle = '#10b981';
      ctx.font = 'black 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🏁 STARTING SAFE ZONE — HOP FORWARD TO CROSS', viewWidth / 2, startY + 60);

      // Finish Line (Top)
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(roadX, 0, roadWidth, FINISH_HEIGHT);

      // Checkered Finish Line
      const checkSize = 16;
      for (let cy = FINISH_HEIGHT - 32; cy < FINISH_HEIGHT; cy += checkSize) {
        for (let cx = roadX; cx < roadX + roadWidth; cx += checkSize) {
          const isBlack = (Math.floor(cx / checkSize) + Math.floor(cy / checkSize)) % 2 === 0;
          ctx.fillStyle = isBlack ? '#0f172a' : '#ffffff';
          ctx.fillRect(cx, cy, checkSize, checkSize);
        }
      }

      // Finish Trophy / Golden Egg
      ctx.save();
      ctx.font = '50px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🏆', viewWidth / 2 - 80, 80);
      ctx.fillText('🥚', viewWidth / 2, 75);
      ctx.fillText('🏆', viewWidth / 2 + 80, 80);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 20px system-ui';
      ctx.fillText('GOLDEN HIGHWAY EXIT', viewWidth / 2, 120);
      ctx.restore();

      // -------------------------------------------------------------
      // 4. UPDATE & DRAW DYNAMIC CARS
      // -------------------------------------------------------------
      for (const car of cars.current) {
        const laneY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT - (car.lane + 1) * LANE_HEIGHT + (LANE_HEIGHT - car.height) / 2;
        const isLaneBlocked = car.lane < currentRow;

        // Move car if not stopped by road blocker
        if (!isLaneBlocked) {
          car.x += car.speed;
          if (car.direction === 1 && car.x > viewWidth + 150) {
            car.x = -150;
          } else if (car.direction === -1 && car.x < -150) {
            car.x = viewWidth + 150;
          }
          car.wheelRot += car.speed * 0.1;
        }

        // Draw Car Body
        ctx.save();
        ctx.translate(car.x, laneY);

        if (car.direction === -1) {
          ctx.scale(-1, 1);
        }

        // Car Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, car.height / 2 + 4, car.width / 2 + 6, car.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car Chassis
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.roundRect(-car.width / 2, -car.height / 2, car.width, car.height, 8);
        ctx.fill();

        // Windshield & Windows
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-car.width / 4, -car.height / 2 + 4, car.width / 2.2, car.height - 8);

        // Headlight Cones
        ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
        ctx.beginPath();
        ctx.moveTo(car.width / 2, -car.height / 4);
        ctx.lineTo(car.width / 2 + 100, -car.height);
        ctx.lineTo(car.width / 2 + 100, car.height);
        ctx.lineTo(car.width / 2, car.height / 4);
        ctx.fill();

        // Glowing Headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(car.width / 2 - 2, -car.height / 2 + 4, 4, 8);
        ctx.fillRect(car.width / 2 - 2, car.height / 2 - 12, 4, 8);

        // Red Tail Lights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-car.width / 2 - 2, -car.height / 2 + 4, 4, 8);
        ctx.fillRect(-car.width / 2 - 2, car.height / 2 - 12, 4, 8);

        // Wheels
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-car.width / 2.8, -car.height / 2 - 3, 14, 6);
        ctx.fillRect(car.width / 4, -car.height / 2 - 3, 14, 6);
        ctx.fillRect(-car.width / 2.8, car.height / 2 - 3, 14, 6);
        ctx.fillRect(car.width / 4, car.height / 2 - 3, 14, 6);

        ctx.restore();
      }

      // -------------------------------------------------------------
      // 5. UPDATE & DRAW CHICKEN
      // -------------------------------------------------------------
      const c = chickenPos.current;

      // Smooth Position Interpolation
      c.x += (c.targetX - c.x) * 0.15;
      c.y += (c.targetY - c.y) * 0.15;

      // Hop Arc Physics
      if (c.hopProgress < 1) {
        c.hopProgress += dt * 4;
        c.hopHeight = Math.sin(c.hopProgress * Math.PI) * 35;
      } else {
        c.hopHeight = 0;
      }

      const drawY = c.y - c.hopHeight;

      ctx.save();
      ctx.translate(c.x, drawY);

      // Shadow below chicken (scales with jump height)
      const shadowScale = Math.max(0.4, 1 - c.hopHeight / 50);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, c.hopHeight + 12, 18 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      if (chickenState.current === 'crushed') {
        // Flattened Chicken Splat
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(0, 5, 26, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dizzy Stars / Eyes
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('💫', 0, -15);
      } else {
        // Realistic Animated 2.5D Chicken
        const breathe = Math.sin(time * 0.006) * 1.5;
        const wingFlap = c.hopHeight > 0 ? Math.sin(time * 0.04) * 8 : 0;

        // Plump Body
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(0, breathe, 16, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Golden Wing
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(-4, breathe - wingFlap, 11, 14, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(6, -14 + breathe, 10, 0, Math.PI * 2);
        ctx.fill();

        // Red Comb
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(6, -24 + breathe, 4, 0, Math.PI * 2);
        ctx.arc(10, -23 + breathe, 4, 0, Math.PI * 2);
        ctx.arc(2, -22 + breathe, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Red Wattle
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(14, -10 + breathe, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Golden Beak
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(14, -16 + breathe);
        ctx.lineTo(23, -13 + breathe);
        ctx.lineTo(14, -10 + breathe);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(10, -16 + breathe, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-5, 14);
        ctx.lineTo(-5, 22);
        ctx.lineTo(-1, 22);
        ctx.moveTo(5, 14);
        ctx.lineTo(5, 22);
        ctx.lineTo(9, 22);
        ctx.stroke();

        // Winner Shades 🕶️
        if (chickenState.current === 'winner') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(4, -18 + breathe, 12, 5);
        }
      }

      ctx.restore();

      // -------------------------------------------------------------
      // 6. UPDATE & DRAW PARTICLES (Feathers, Smoke, Confetti)
      // -------------------------------------------------------------
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // Gravity
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;

        if (p.type === 'feather') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'coin') {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d97706';
          ctx.stroke();
        } else if (p.type === 'smoke') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        }

        ctx.restore();
      }

      ctx.restore();

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [game, tilesPerRow, multipliers, isStepping, initCars, TOTAL_LANES, TOTAL_WORLD_HEIGHT]);

  // Click & Hover Handling
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isStepping || game?.status !== 'IN_PROGRESS') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top + cameraY.current;

    const currentRow = game.currentRow;
    const laneY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT - (currentRow + 1) * LANE_HEIGHT;

    // Check if clicked in current lane
    if (clickY >= laneY && clickY <= laneY + LANE_HEIGHT) {
      const roadWidth = rect.width * 0.94;
      const roadX = (rect.width - roadWidth) / 2;
      const laneInnerWidth = roadWidth * 0.75;
      const laneStartX = roadX + (roadWidth - laneInnerWidth) / 2;
      const colWidth = laneInnerWidth / tilesPerRow;

      const colIndex = Math.floor((clickX - laneStartX) / colWidth);
      if (colIndex >= 0 && colIndex < tilesPerRow) {
        onStep(colIndex);
      } else {
        onStep(0);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || game?.status !== 'IN_PROGRESS') {
      hoverTile.current = null;
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top + cameraY.current;

    const currentRow = game.currentRow;
    const laneY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT - (currentRow + 1) * LANE_HEIGHT;

    if (mouseY >= laneY && mouseY <= laneY + LANE_HEIGHT) {
      const roadWidth = rect.width * 0.94;
      const roadX = (rect.width - roadWidth) / 2;
      const laneInnerWidth = roadWidth * 0.75;
      const laneStartX = roadX + (roadWidth - laneInnerWidth) / 2;
      const colWidth = laneInnerWidth / tilesPerRow;

      const col = Math.floor((mouseX - laneStartX) / colWidth);
      if (col >= 0 && col < tilesPerRow) {
        hoverTile.current = { row: currentRow, col };
        return;
      }
    }
    hoverTile.current = null;
  };

  return (
    <div ref={containerRef} className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { hoverTile.current = null; }}
        className="w-full cursor-pointer block"
      />
    </div>
  );
};
