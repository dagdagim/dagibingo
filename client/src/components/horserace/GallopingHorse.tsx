import React from 'react';
import { motion } from 'framer-motion';

interface GallopingHorseProps {
  horseNumber: number;
  name: string;
  color: string;
  isRacing: boolean;
  isWinner: boolean;
  position: number; // 0 to 100 percentage
  speedMultiplier?: number;
}

export const GallopingHorse: React.FC<GallopingHorseProps> = ({
  horseNumber,
  color,
  isRacing,
  isWinner,
  position,
}) => {
  // Stride speed based on racing state
  const strideDuration = isRacing ? 0.38 : 0.8;

  return (
    <div
      className="absolute flex items-center -translate-y-1/2 top-1/2 z-20 transition-all duration-75 ease-out select-none pointer-events-none"
      style={{ left: `${Math.min(93, Math.max(0, position))}%` }}
    >
      {/* Dirt Plumes (kicked up during race) */}
      {isRacing && (
        <div className="absolute -left-6 bottom-1 flex gap-1 pointer-events-none">
          <motion.div
            animate={{
              x: [-2, -14, -22],
              y: [0, -4, -1],
              opacity: [0.9, 0.4, 0],
              scale: [0.6, 1.2, 0.3],
            }}
            transition={{ repeat: Infinity, duration: 0.25, ease: 'easeOut' }}
            className="w-2.5 h-2 rounded-full bg-amber-800/80 blur-[0.5px]"
          />
          <motion.div
            animate={{
              x: [-4, -18, -28],
              y: [1, -6, -2],
              opacity: [0.8, 0.3, 0],
              scale: [0.4, 1.4, 0.2],
            }}
            transition={{ repeat: Infinity, duration: 0.3, delay: 0.1, ease: 'easeOut' }}
            className="w-2 h-1.5 rounded-full bg-amber-700/80 blur-[0.5px]"
          />
        </div>
      )}

      {/* Dynamic Ground Shadow */}
      <motion.div
        animate={
          isRacing
            ? {
                scaleX: [1, 0.75, 1.1, 1],
                scaleY: [1, 0.8, 1.2, 1],
                opacity: [0.6, 0.3, 0.7, 0.6],
              }
            : {}
        }
        transition={{ repeat: Infinity, duration: strideDuration }}
        className="absolute -bottom-2 left-3 w-16 h-3 bg-black/40 rounded-full blur-[2px] pointer-events-none"
      />

      {/* Main Thoroughbred Horse + Jockey SVG Sprite */}
      <motion.div
        animate={
          isRacing
            ? {
                y: [0, -6, 2, 0],
                rotate: [0, -2, 3, 0],
              }
            : isWinner
            ? { scale: [1, 1.15, 1] }
            : {}
        }
        transition={{ repeat: Infinity, duration: strideDuration }}
        className="relative w-20 h-14 sm:w-24 sm:h-16 flex items-center justify-center filter drop-shadow-md"
      >
        <svg
          viewBox="0 0 120 80"
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Silk Gradient */}
            <linearGradient id={`silk-${horseNumber}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="horseBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3d2314" />
              <stop offset="50%" stopColor="#5c381e" />
              <stop offset="100%" stopColor="#29160a" />
            </linearGradient>
            <linearGradient id="horseMane" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a0d05" />
              <stop offset="100%" stopColor="#0d0602" />
            </linearGradient>
          </defs>

          {/* TAIL (Flowing with wind) */}
          <motion.path
            animate={
              isRacing
                ? {
                    d: [
                      'M 20 40 Q 5 32 0 45 Q 8 36 20 44 Z',
                      'M 20 40 Q 2 28 -5 38 Q 6 32 20 44 Z',
                      'M 20 40 Q 8 36 2 48 Q 10 38 20 44 Z',
                    ],
                  }
                : {}
            }
            transition={{ repeat: Infinity, duration: strideDuration }}
            d="M 20 40 Q 5 32 0 45 Q 8 36 20 44 Z"
            fill="url(#horseMane)"
          />

          {/* BACK LEGS (Quadruped stride mechanics) */}
          {/* Back Left Leg */}
          <motion.path
            animate={
              isRacing
                ? {
                    d: [
                      'M 28 44 L 20 62 L 14 74 L 18 75 L 24 64 L 33 46 Z',
                      'M 28 44 L 34 54 L 36 68 L 40 68 L 38 52 L 33 46 Z',
                      'M 28 44 L 16 56 L 8 68 L 12 70 L 20 58 L 33 46 Z',
                    ],
                  }
                : {}
            }
            transition={{ repeat: Infinity, duration: strideDuration }}
            d="M 28 44 L 20 62 L 14 74 L 18 75 L 24 64 L 33 46 Z"
            fill="#2c170b"
          />

          {/* Back Right Leg (Foremost) */}
          <motion.path
            animate={
              isRacing
                ? {
                    d: [
                      'M 33 44 L 40 56 L 42 70 L 46 70 L 44 54 L 38 44 Z',
                      'M 33 44 L 24 58 L 18 72 L 22 73 L 28 60 L 38 44 Z',
                      'M 33 44 L 36 52 L 32 64 L 36 65 L 40 50 L 38 44 Z',
                    ],
                  }
                : {}
            }
            transition={{ repeat: Infinity, duration: strideDuration }}
            d="M 33 44 L 24 58 L 18 72 L 22 73 L 28 60 L 38 44 Z"
            fill="url(#horseBody)"
          />

          {/* HORSE TORSO & FLANK */}
          <path
            d="M 25 38 C 22 30 35 24 52 26 C 68 28 78 30 84 38 C 78 50 64 54 48 52 C 34 50 25 46 25 38 Z"
            fill="url(#horseBody)"
          />

          {/* SADDLE CLOTH (Matching Jockey Silk Color) */}
          <path
            d="M 46 28 L 62 30 L 60 42 L 44 40 Z"
            fill={color}
            stroke="#ffffff"
            strokeWidth="1"
          />
          <text
            x="52"
            y="38"
            fontSize="8"
            fontWeight="900"
            fontFamily="monospace"
            fill="#ffffff"
            textAnchor="middle"
          >
            {horseNumber}
          </text>

          {/* JOCKEY (Sitting in forward crouch holding reins) */}
          <g transform="translate(48, 10)">
            {/* Jockey Body & Silk */}
            <motion.path
              animate={
                isRacing
                  ? {
                      d: [
                        'M 6 18 L 16 10 L 22 14 L 14 22 Z',
                        'M 6 18 L 17 8 L 23 12 L 14 22 Z',
                        'M 6 18 L 15 11 L 21 15 L 14 22 Z',
                      ],
                    }
                  : {}
              }
              transition={{ repeat: Infinity, duration: strideDuration }}
              d="M 6 18 L 16 10 L 22 14 L 14 22 Z"
              fill={`url(#silk-${horseNumber})`}
              stroke="#ffffff"
              strokeWidth="0.5"
            />
            {/* Jockey White Riding Pants & Boot */}
            <path d="M 6 18 L 12 24 L 8 26 L 4 20 Z" fill="#ffffff" />
            <path d="M 12 24 L 14 27 L 11 28 L 9 25 Z" fill="#1e293b" />
            {/* Jockey Helmet / Cap with Silk Color */}
            <circle cx="20" cy="7" r="4.5" fill={color} stroke="#ffffff" strokeWidth="0.5" />
            {/* Cap Visor */}
            <path d="M 22 6 L 27 7 L 23 9 Z" fill="#1e293b" />
            {/* Goggles Strap */}
            <rect x="17" y="6" width="6" height="1.8" rx="0.5" fill="#f8fafc" opacity="0.9" />
          </g>

          {/* HORSE NECK & HEAD */}
          <motion.path
            animate={
              isRacing
                ? {
                    d: [
                      'M 76 34 L 92 16 L 102 18 L 108 26 L 98 32 L 86 42 Z',
                      'M 76 34 L 94 14 L 104 16 L 110 24 L 100 30 L 86 42 Z',
                      'M 76 34 L 90 18 L 100 20 L 106 28 L 96 34 L 86 42 Z',
                    ],
                  }
                : {}
            }
            transition={{ repeat: Infinity, duration: strideDuration }}
            d="M 76 34 L 92 16 L 102 18 L 108 26 L 98 32 L 86 42 Z"
            fill="url(#horseBody)"
          />

          {/* HORSE MANE */}
          <path
            d="M 80 32 L 88 18 L 96 16 L 92 24 L 84 34 Z"
            fill="url(#horseMane)"
          />

          {/* HORSE EARS */}
          <polygon points="98,14 102,9 104,15" fill="#3d2314" />
          <polygon points="95,15 98,11 100,16" fill="#29160a" />

          {/* BRIDLE & REINS */}
          <path d="M 104 22 L 98 25 L 94 18" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
          {/* Reins connecting to jockey hands */}
          <path d="M 98 25 Q 82 24 66 22" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />

          {/* FRONT LEGS */}
          {/* Front Left Leg */}
          <motion.path
            animate={
              isRacing
                ? {
                    d: [
                      'M 80 40 L 92 54 L 102 64 L 98 65 L 86 52 L 76 42 Z',
                      'M 80 40 L 74 52 L 68 64 L 64 63 L 70 50 L 76 42 Z',
                      'M 80 40 L 88 48 L 94 62 L 90 63 L 82 48 L 76 42 Z',
                    ],
                  }
                : {}
            }
            transition={{ repeat: Infinity, duration: strideDuration }}
            d="M 80 40 L 74 52 L 68 64 L 64 63 L 70 50 L 76 42 Z"
            fill="#2c170b"
          />

          {/* Front Right Leg (Foremost) */}
          <motion.path
            animate={
              isRacing
                ? {
                    d: [
                      'M 84 40 L 76 52 L 70 66 L 66 65 L 72 50 L 80 42 Z',
                      'M 84 40 L 96 52 L 108 62 L 104 64 L 90 50 L 80 42 Z',
                      'M 84 40 L 82 50 L 80 62 L 76 62 L 78 48 L 80 42 Z',
                    ],
                  }
                : {}
            }
            transition={{ repeat: Infinity, duration: strideDuration }}
            d="M 84 40 L 96 52 L 108 62 L 104 64 L 90 50 L 80 42 Z"
            fill="url(#horseBody)"
          />
        </svg>

        {/* Winner Crown & Badge */}
        {isWinner && (
          <motion.div
            initial={{ scale: 0, y: -10 }}
            animate={{ scale: [1, 1.1, 1], y: [-14, -18, -14] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full font-mono shadow-xl border border-yellow-200"
          >
            <span>👑</span>
            <span>1st</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
