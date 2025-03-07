"use client"

import { motion } from "framer-motion"

export function OrbitalBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 bg-gradient-to-br from-black via-forest/20 to-emerald-900/10"
        style={{
          animation: "gradientAnimation 15s ease infinite",
          backgroundSize: "400% 400%",
        }}
      />
      <svg className="absolute w-full h-full" viewBox="0 0 1000 1000">
        {/* Orbital Paths */}
        <motion.circle
          cx="500"
          cy="500"
          r="200"
          fill="none"
          stroke="rgba(47, 58, 47, 0.2)"
          strokeWidth="2"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.circle
          cx="500"
          cy="500"
          r="300"
          fill="none"
          stroke="rgba(47, 58, 47, 0.15)"
          strokeWidth="2"
          animate={{ rotate: -360 }}
          transition={{ duration: 40, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.circle
          cx="500"
          cy="500"
          r="400"
          fill="none"
          stroke="rgba(47, 58, 47, 0.1)"
          strokeWidth="2"
          animate={{ rotate: 360 }}
          transition={{ duration: 50, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        />

        {/* Floating Elements with Glows */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for color transitions */}
          <linearGradient id="dotGradient1" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)" />
            <stop offset="50%" stopColor="rgba(47, 58, 47, 0.3)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.3)" />
          </linearGradient>
        </defs>

        <motion.g filter="url(#glow)">
          {/* Inner Circle Dot */}
          <motion.circle
            cx="500"
            cy="300"
            r="4"
            fill="url(#dotGradient1)"
            animate={{
              cx: [700, 500, 300, 500, 700],
              cy: [500, 700, 500, 300, 500],
            }}
            transition={{
              duration: 30,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          {/* Middle Circle Dot */}
          <motion.circle
            cx="500"
            cy="200"
            r="4"
            fill="url(#dotGradient1)"
            animate={{
              cx: [800, 500, 200, 500, 800],
              cy: [500, 800, 500, 200, 500],
            }}
            transition={{
              duration: 40,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          {/* Outer Circle Dot */}
          <motion.circle
            cx="500"
            cy="100"
            r="4"
            fill="url(#dotGradient1)"
            animate={{
              cx: [900, 500, 100, 500, 900],
              cy: [500, 900, 500, 100, 500],
            }}
            transition={{
              duration: 50,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </motion.g>

        {/* Center Glow */}
        <motion.circle
          cx="500"
          cy="500"
          r="150"
          fill="url(#centerGlow)"
          filter="url(#glow)"
          animate={{
            r: [150, 170, 150],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />

        {/* Gradient Definitions */}
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.2)" />
            <stop offset="100%" stopColor="rgba(47, 58, 47, 0)" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

