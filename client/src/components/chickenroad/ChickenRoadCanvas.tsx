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
  type?: 'feather' | 'smoke' | 'spark' | 'coin' | 'big-coin' | 'confetti';
  text?: string;
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
  alpha: number;
}

interface SkidMark {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
}

interface CrashAnimationState {
  active: boolean;
  delay?: number;
  hasCollided: boolean;
  carX: number;
  carY: number;
  carSpeed: number;
  carColor: string;
  carWidth: number;
  carHeight: number;
  chickenX: number;
  chickenY: number;
  chickenVx: number;
  chickenVy: number;
  chickenRot: number;
  shake: number;
  shockwaveRadius: number;
  shockwaveAlpha: number;
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
  const cameraY = useRef(0);
  const targetCameraY = useRef(0);
  const hoverTile = useRef<{ row: number; col: number } | null>(null);

  // Dedicated Car Crash Animation State
  const crashAnim = useRef<CrashAnimationState>({
    active: false,
    hasCollided: false,
    carX: -200,
    carY: 0,
    carSpeed: 34,
    carColor: '#ef4444',
    carWidth: 100,
    carHeight: 40,
    chickenX: 0,
    chickenY: 0,
    chickenVx: 0,
    chickenVy: 0,
    chickenRot: 0,
    shake: 0,
    shockwaveRadius: 0,
    shockwaveAlpha: 0,
  });

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
          alpha: 1,
        });
      }
    }
    cars.current = newCars;
  }, []);

  // Spawn Feathers / Particles
  const spawnFeathers = (x: number, y: number) => {
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        color: i % 4 === 0 ? '#f59e0b' : i % 3 === 0 ? '#ef4444' : '#ffffff',
        size: 5 + Math.random() * 8,
        alpha: 1,
        decay: 0.01 + Math.random() * 0.012,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        type: 'feather',
      });
    }

    // Tire Smoke & Spark Puffs
    for (let i = 0; i < 25; i++) {
      particles.current.push({
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 25,
        vx: (Math.random() - 0.5) * 3,
        vy: -1.5 - Math.random() * 2.5,
        color: i % 2 === 0 ? '#94a3b8' : '#cbd5e1',
        size: 18 + Math.random() * 25,
        alpha: 0.85,
        decay: 0.018,
        rotation: Math.random() * Math.PI,
        vRot: 0.05,
        type: 'smoke',
      });
    }
  };

  // Spawn One Big Glowing Golden Coin on Successful Jump
  const spawnBigCoinReward = (x: number, y: number, multText?: string) => {
    // 1. One Big Golden Master Coin popping up
    particles.current.push({
      x,
      y: y - 20,
      vx: 0,
      vy: -3.8, // Floats upward
      color: '#fbbf24',
      size: 32, // Large prominent coin
      alpha: 1,
      decay: 0.011, // Stays visible during jump celebration
      rotation: 0,
      vRot: 0.14, // Smooth 3D spin
      type: 'big-coin',
      text: multText,
    });

    // 2. Sparkling Gold Star Sparks around the Big Coin
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 2.5 + Math.random() * 3.5;
      particles.current.push({
        x,
        y: y - 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: i % 2 === 0 ? '#fef08a' : '#fbbf24',
        size: 4 + Math.random() * 4,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.015,
        rotation: 0,
        vRot: 0,
        type: 'spark',
      });
    }
  };

  // Spawn Golden Coins Dropped on Jump
  const spawnJumpCoins = (x: number, y: number) => {
    // Golden Coins
    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const speed = 2.5 + Math.random() * 3.5;
      particles.current.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: '#fbbf24',
        size: 7 + Math.random() * 3,
        alpha: 1,
        decay: 0.012 + Math.random() * 0.008,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.35,
        type: 'coin',
      });
    }
    // Sparkling Golden Spark Particles
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      particles.current.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        color: '#fef08a',
        size: 3 + Math.random() * 3,
        alpha: 1,
        decay: 0.025 + Math.random() * 0.02,
        rotation: 0,
        vRot: 0,
        type: 'spark',
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
    const isCrushed = game?.status === 'CRUSHED';
    const isWon = game?.status === 'CASHED_OUT';
    const isCompletedAllLanes = isWon && currentRow === 10;

    const laneWidth = width * 0.85;
    const startX = (width - laneWidth) / 2;
    const colWidth = laneWidth / tilesPerRow;

    // Chicken is always centered in the middle of the road
    const targetX = width / 2;
    let targetY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT / 2;

    if (isCrushed) {
      // The chicken moves forward only 1 step into the next lane where the crash occurs!
      const crashLaneIndex = currentRow; // 0 to 9
      targetY = TOTAL_WORLD_HEIGHT - (SIDEWALK_HEIGHT + (crashLaneIndex + 0.5) * LANE_HEIGHT);
    } else if (isCompletedAllLanes) {
      // Completed all 10 lanes -> reached the top finishing line
      targetY = FINISH_HEIGHT / 2;
    } else if (currentRow > 0 && currentRow <= TOTAL_LANES) {
      // On an active safe lane
      const activeLane = currentRow - 1;
      targetY = TOTAL_WORLD_HEIGHT - (SIDEWALK_HEIGHT + (activeLane + 0.5) * LANE_HEIGHT);
    } else {
      // At starting bottom sidewalk
      targetY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT / 2;
    }

    if (chickenPos.current.x === 0 && chickenPos.current.y === 0) {
      chickenPos.current.x = targetX;
      chickenPos.current.y = targetY;
      chickenPos.current.targetX = targetX;
      chickenPos.current.targetY = targetY;
    } else {
      const isNewJump = chickenPos.current.targetY !== targetY;
      chickenPos.current.targetX = targetX;
      chickenPos.current.targetY = targetY;
      chickenPos.current.hopProgress = 0; // Trigger hop animation forward 1 step!

      if (isNewJump) {
        if (!isCrushed && currentRow > 0) {
          const mult = multipliers[currentRow - 1] || (1 + (currentRow - 1) * 0.5);
          spawnBigCoinReward(targetX, targetY, `+${mult.toFixed(2)}×`);
        } else {
          spawnJumpCoins(chickenPos.current.x, chickenPos.current.y);
        }
      }
    }

    if (currentRow === 0 && !isCrushed) {
      cars.current.forEach((car) => {
        car.alpha = 1;
      });
    }

    if (isCrushed) {
      chickenState.current = 'crushed';
      // Trigger dramatic car crush animation with a hop delay so chicken lands on next line first!
      crashAnim.current = {
        active: true,
        delay: 0.16, // Hop forward 1 step into the next lane first
        hasCollided: false,
        carX: -160, // Car zooms from the left
        carY: targetY,
        carSpeed: 34, // High speed
        carColor: '#ef4444', // Fiery Red Muscle Car
        carWidth: 100,
        carHeight: 40,
        chickenX: targetX,
        chickenY: targetY,
        chickenVx: 0,
        chickenVy: 0,
        chickenRot: 0,
        shake: 0,
        shockwaveRadius: 0,
        shockwaveAlpha: 0,
      };
    } else if (isWon) {
      chickenState.current = 'winner';
      crashAnim.current.active = false;
      spawnCelebration(targetX, targetY);
    } else {
      chickenState.current = 'idle';
      crashAnim.current.active = false;
    }

    // Set camera target centered on chicken's actual lane
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

      // -------------------------------------------------------------
      // UPDATE CAR CRUSH ANIMATION & CAMERA SHAKE
      // -------------------------------------------------------------
      const ca = crashAnim.current;
      if (ca.active) {
        if (ca.delay !== undefined && ca.delay > 0) {
          ca.delay -= dt;
        } else if (!ca.hasCollided) {
          ca.carX += ca.carSpeed;
          // Impact collision point!
          if (ca.carX >= ca.chickenX - 25) {
            ca.hasCollided = true;
            ca.shake = 16; // Strong Camera Shake
            ca.shockwaveAlpha = 1;
            ca.shockwaveRadius = 15;
            ca.chickenVx = 6;
            ca.chickenVy = -16; // Propel chicken upwards
            spawnFeathers(ca.chickenX, ca.chickenY);

            // Burn skid marks onto asphalt
            skidMarks.current.push({
              x: ca.carX - 80,
              y: ca.carY,
              width: 110,
              height: 14,
              alpha: 0.95,
            });
          }
        } else {
          // Car brakes to a halt
          ca.carSpeed = Math.max(0, ca.carSpeed - dt * 50);
          ca.carX += ca.carSpeed;

          // Chicken airborne tumbling physics
          ca.chickenX += ca.chickenVx;
          ca.chickenY += ca.chickenVy;
          ca.chickenVy += 0.75; // Gravity
          ca.chickenRot += 0.22; // Spinning in air

          // Chicken lands and squashes on road
          const groundY = chickenPos.current.targetY;
          if (ca.chickenY >= groundY) {
            ca.chickenY = groundY;
            ca.chickenVx = 0;
            ca.chickenVy = 0;
          }

          // Camera shake decay
          if (ca.shake > 0) {
            ca.shake = Math.max(0, ca.shake - dt * 25);
          }

          // Shockwave ring expansion
          if (ca.shockwaveAlpha > 0) {
            ca.shockwaveRadius += dt * 180;
            ca.shockwaveAlpha = Math.max(0, ca.shockwaveAlpha - dt * 2.2);
          }
        }
      }

      let shakeX = 0;
      let shakeY = 0;
      if (ca.active && ca.shake > 0) {
        shakeX = (Math.random() - 0.5) * ca.shake;
        shakeY = (Math.random() - 0.5) * ca.shake;
      }

      ctx.translate(shakeX, -cameraY.current + shakeY);

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
      // 2. DRAW LANES, MARKINGS & ONE VERTICAL ROAD BLOCKER AT LEFT MIDDLE
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
        // ONE VERTICAL ROAD BLOCKER AT LEFT-MIDDLE (Safely crossed lane)
        // ---------------------------------------------------------
        if (isPassedLane && rowState) {
          const barrierH = LANE_HEIGHT - 16;
          const barrierY = laneY + 8;
          const barrierW = 24; // Prominent heavy-duty pillar
          const blockerX = roadX + roadWidth * 0.18; // Exactly at the left-middle position!

          ctx.save();

          // Blocker Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(blockerX + 5, barrierY + 5, barrierW, barrierH);

          // Outer Heavy Steel Frame & Hydraulic Strut Mounts
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(blockerX - 4, barrierY - 4, barrierW + 8, barrierH + 8);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.strokeRect(blockerX - 4, barrierY - 4, barrierW + 8, barrierH + 8);

          // Caution Yellow Pillar Body
          ctx.fillStyle = '#eab308';
          ctx.fillRect(blockerX, barrierY, barrierW, barrierH);

          // Diagonal Black Hazard Stripes (Clipped inside vertical pillar)
          ctx.save();
          ctx.beginPath();
          ctx.rect(blockerX, barrierY, barrierW, barrierH);
          ctx.clip();
          ctx.fillStyle = '#000000';
          const stripeH = 16;
          for (let sy = barrierY - barrierW; sy < barrierY + barrierH + barrierW; sy += stripeH * 1.6) {
            ctx.beginPath();
            ctx.moveTo(blockerX, sy);
            ctx.lineTo(blockerX + barrierW, sy + barrierW);
            ctx.lineTo(blockerX + barrierW, sy + barrierW + stripeH);
            ctx.lineTo(blockerX, sy + stripeH);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();

          // Vertical Steel Edge Highlights
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(blockerX + 2, barrierY);
          ctx.lineTo(blockerX + 2, barrierY + barrierH);
          ctx.stroke();

          // Top & Bottom Flashing Amber Warning Strobe LEDs
          const blink = Math.sin(time * 0.01 + blockerX) > 0;
          ctx.fillStyle = blink ? '#fbbf24' : '#78350f';
          ctx.beginPath();
          ctx.arc(blockerX + barrierW / 2, barrierY + 8, 5, 0, Math.PI * 2);
          ctx.arc(blockerX + barrierW / 2, barrierY + barrierH - 8, 5, 0, Math.PI * 2);
          ctx.fill();

          if (blink) {
            ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
            ctx.beginPath();
            ctx.arc(blockerX + barrierW / 2, barrierY + 8, 12, 0, Math.PI * 2);
            ctx.arc(blockerX + barrierW / 2, barrierY + barrierH - 8, 12, 0, Math.PI * 2);
            ctx.fill();
          }

          // Hydraulic Piston Cylinders on sides
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(blockerX - 6, barrierY + barrierH * 0.25, 4, 16);
          ctx.fillRect(blockerX - 6, barrierY + barrierH * 0.65, 4, 16);
          ctx.fillRect(blockerX + barrierW + 2, barrierY + barrierH * 0.25, 4, 16);
          ctx.fillRect(blockerX + barrierW + 2, barrierY + barrierH * 0.65, 4, 16);

          // Subtle green safety clearance tint for the passed lane
          ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
          ctx.fillRect(roadX + 15, laneY, roadWidth - 30, LANE_HEIGHT);

          ctx.restore();
        }

        // Active Lane Target Indicator (Centered in the middle of the road)
        if (isCurrentLane && !isStepping) {
          const tileW = Math.min(260, roadWidth * 0.55);
          const tileX = (viewWidth - tileW) / 2;
          const tileY = laneY + 14;
          const tileH = LANE_HEIGHT - 28;
          const isHovered = hoverTile.current?.row === lane;

          ctx.save();
          ctx.fillStyle = isHovered ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.18)';
          ctx.strokeStyle = isHovered ? '#818cf8' : 'rgba(129, 140, 248, 0.5)';
          ctx.lineWidth = isHovered ? 3 : 2;
          ctx.beginPath();
          ctx.roundRect(tileX, tileY, tileW, tileH, 16);
          ctx.fill();
          ctx.stroke();

          // Pulsing target arrow & cross text
          const bounce = Math.sin(time * 0.008) * 4;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`⬆️ CROSS TO ${multVal.toFixed(2)}×`, viewWidth / 2, tileY + tileH / 2 + bounce);
          ctx.restore();
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
      const isCrushed = game?.status === 'CRUSHED';
      const crashLane = isCrushed ? currentRow : -1;

      for (const car of cars.current) {
        const laneY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT - (car.lane + 1) * LANE_HEIGHT + (LANE_HEIGHT - car.height) / 2;
        const isPassedLane = car.lane < currentRow;

        // Disappear / Fade out cars on passed lanes if not crushed
        if (isPassedLane && car.lane !== crashLane) {
          car.alpha = Math.max(0, car.alpha - dt * 3.5);
          if (car.alpha <= 0) continue; // Completely disappeared from this lane!
        } else {
          // Normal traffic on uncrossed lanes
          car.alpha = Math.min(1, car.alpha + dt * 2);
        }

        // Move active cars (unless in crash state on collision lane)
        if (!isPassedLane && (!isCrushed || car.lane !== crashLane)) {
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
        ctx.globalAlpha = car.alpha;
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
      // DRAW SPEEDING CRASHING CAR (If Crash Active)
      // -------------------------------------------------------------
      if (ca.active) {
        ctx.save();
        ctx.translate(ca.carX, ca.carY);

        // Car Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, ca.carHeight / 2 + 4, ca.carWidth / 2 + 8, ca.carHeight / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fiery Red Muscle Car Chassis
        ctx.fillStyle = ca.carColor;
        ctx.beginPath();
        ctx.roundRect(-ca.carWidth / 2, -ca.carHeight / 2, ca.carWidth, ca.carHeight, 8);
        ctx.fill();

        // Windshield
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-ca.carWidth / 4, -ca.carHeight / 2 + 4, ca.carWidth / 2.2, ca.carHeight - 8);

        // Bright Headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(ca.carWidth / 2 - 2, -ca.carHeight / 2 + 4, 5, 8);
        ctx.fillRect(ca.carWidth / 2 - 2, ca.carHeight / 2 - 12, 5, 8);

        // Headlight Beam
        ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
        ctx.beginPath();
        ctx.moveTo(ca.carWidth / 2, -ca.carHeight / 4);
        ctx.lineTo(ca.carWidth / 2 + 130, -ca.carHeight * 1.2);
        ctx.lineTo(ca.carWidth / 2 + 130, ca.carHeight * 1.2);
        ctx.lineTo(ca.carWidth / 2, ca.carHeight / 4);
        ctx.fill();

        // Red Tail lights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-ca.carWidth / 2 - 2, -ca.carHeight / 2 + 4, 4, 8);
        ctx.fillRect(-ca.carWidth / 2 - 2, ca.carHeight / 2 - 12, 4, 8);

        // Wheels with Tread
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-ca.carWidth / 2.8, -ca.carHeight / 2 - 4, 16, 7);
        ctx.fillRect(ca.carWidth / 4, -ca.carHeight / 2 - 4, 16, 7);
        ctx.fillRect(-ca.carWidth / 2.8, ca.carHeight / 2 - 3, 16, 7);
        ctx.fillRect(ca.carWidth / 4, ca.carHeight / 2 - 3, 16, 7);

        ctx.restore();

        // Impact Shockwave Ring & "💥 CRASH!" comic burst
        if (ca.shockwaveAlpha > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(239, 68, 68, ${ca.shockwaveAlpha})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(ca.chickenX, ca.chickenY, ca.shockwaveRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(251, 191, 36, ${ca.shockwaveAlpha * 0.8})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(ca.chickenX, ca.chickenY, ca.shockwaveRadius * 0.7, 0, Math.PI * 2);
          ctx.stroke();

          // Comic "💥 CRASH!" badge pop
          if (ca.shockwaveRadius < 85) {
            ctx.fillStyle = `rgba(239, 68, 68, ${ca.shockwaveAlpha})`;
            ctx.font = 'black 30px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('💥 CRASH!', ca.chickenX, ca.chickenY - 45);
          }
          ctx.restore();
        }
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

      if (chickenState.current === 'crushed') {
        const cx = ca.active ? ca.chickenX : c.x;
        const cy = ca.active ? ca.chickenY : drawY;
        const crot = ca.active ? ca.chickenRot : 0;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(crot);

        if (ca.active && ca.hasCollided && ca.chickenY < chickenPos.current.targetY) {
          // Mid-air tumbling chicken in flight
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 19, 0, 0, Math.PI * 2);
          ctx.fill();

          // Flapping disoriented wings
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.ellipse(-14, 0, 8, 14, 0.5, 0, Math.PI * 2);
          ctx.ellipse(14, 0, 8, 14, -0.5, 0, Math.PI * 2);
          ctx.fill();

          // Head with X eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, -16, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('❌', 0, -12);
        } else {
          // Flattened Chicken Splat on Road
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.ellipse(0, 5, 28, 13, 0, 0, Math.PI * 2);
          ctx.fill();

          // Dizzy Rotating Stars 💫
          const starAngle = time * 0.005;
          ctx.fillStyle = '#fbbf24';
          ctx.font = '22px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('💫', Math.cos(starAngle) * 16, -18 + Math.sin(starAngle) * 4);
          ctx.fillText('⭐', Math.cos(starAngle + Math.PI) * 16, -18 + Math.sin(starAngle + Math.PI) * 4);
        }
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(c.x, drawY);

        // Shadow below chicken (scales with jump height)
        const shadowScale = Math.max(0.4, 1 - c.hopHeight / 50);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, c.hopHeight + 12, 18 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

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

        ctx.restore();
      }

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
        } else if (p.type === 'big-coin') {
          // 3D Spinning Master Golden Coin
          const spinScale = Math.cos(p.rotation);
          ctx.scale(Math.max(0.18, Math.abs(spinScale)), 1);

          // Radial Golden Aura / Glow
          const aura = ctx.createRadialGradient(0, 0, p.size * 0.3, 0, 0, p.size * 1.6);
          aura.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
          aura.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 1.6, 0, Math.PI * 2);
          ctx.fill();

          // Coin Drop Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.arc(3, 4, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Outer Gold Rim with Gradient
          const outerGrad = ctx.createLinearGradient(-p.size, -p.size, p.size, p.size);
          outerGrad.addColorStop(0, '#f59e0b');
          outerGrad.addColorStop(0.5, '#fef08a');
          outerGrad.addColorStop(1, '#b45309');
          ctx.fillStyle = outerGrad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Inner Beveled Golden Face
          const innerGrad = ctx.createRadialGradient(0, -p.size * 0.3, 2, 0, 0, p.size * 0.85);
          innerGrad.addColorStop(0, '#fef08a');
          innerGrad.addColorStop(0.5, '#fbbf24');
          innerGrad.addColorStop(1, '#d97706');
          ctx.fillStyle = innerGrad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.82, 0, Math.PI * 2);
          ctx.fill();

          // Inner Bezel Ring
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.68, 0, Math.PI * 2);
          ctx.stroke();

          // Embossed Golden Dollar / Star Symbol
          ctx.fillStyle = '#78350f';
          ctx.font = `900 ${Math.round(p.size * 0.95)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', 0, 1);

          // Specular Glint Reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(-p.size * 0.35, -p.size * 0.35, p.size * 0.25, 0, Math.PI * 2);
          ctx.fill();

          // Multiplier / Reward Badge above the Coin
          if (p.text) {
            ctx.restore(); // Restore scale for sharp text
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalAlpha = p.alpha;

            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.roundRect(-36, -p.size - 22, 72, 22, 6);
            ctx.fill();
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.text, 0, -p.size - 11);
          }
        } else if (p.type === 'coin') {
          // 3D Spinning Golden Coin
          const spinScale = Math.cos(p.rotation);
          ctx.scale(spinScale, 1);

          // Coin outer rim & glow
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Golden face
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.82, 0, Math.PI * 2);
          ctx.fill();

          // Specular Glint
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.beginPath();
          ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.28, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'spark') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
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
      onStep(0);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || game?.status !== 'IN_PROGRESS') {
      hoverTile.current = null;
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseY = e.clientY - rect.top + cameraY.current;

    const currentRow = game.currentRow;
    const laneY = TOTAL_WORLD_HEIGHT - SIDEWALK_HEIGHT - (currentRow + 1) * LANE_HEIGHT;

    if (mouseY >= laneY && mouseY <= laneY + LANE_HEIGHT) {
      hoverTile.current = { row: currentRow, col: 0 };
    } else {
      hoverTile.current = null;
    }
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
