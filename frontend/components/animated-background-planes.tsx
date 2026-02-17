"use client"

import { useEffect, useRef, useState } from "react"

interface Plane {
  id: number
  startX: number
  startY: number
  endX: number
  endY: number
  currentX: number
  currentY: number
  progress: number // 0 to 1
  speed: number // increment per frame
  color: string
  angle: number
  state: "flying" | "fading"
  opacity: number
}

const PASTEL_COLORS = [
  "#FFEBEE", // Very light pink
  "#FFF3E8", // Very light peach
  "#FFFCF5", // Very light cream
  "#F0FBF4", // Very light mint
  "#F0F8FF", // Very light sky
  "#F5F2FA", // Very light lavender
  "#FAF8F0", // Very light wheat
  "#FAF5FA", // Very light lilac
]

export function AnimatedBackgroundPlanes() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [planes, setPlanes] = useState<Plane[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>()
  const lastSpawnTime = useRef(0)
  
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    
    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  useEffect(() => {
    if (dimensions.width === 0) return

    const animate = (time: number) => {
      if (!lastSpawnTime.current) lastSpawnTime.current = time

      // Spawn new plane
      if (time - lastSpawnTime.current > 800 + Math.random() * 1500) { // Every 0.8-2.3 seconds
        spawnPlane()
        lastSpawnTime.current = time
      }

      setPlanes(prevPlanes => {
        return prevPlanes.map(plane => {
          if (plane.state === "flying") {
            const newProgress = plane.progress + plane.speed
            if (newProgress >= 1) {
              return { ...plane, progress: 1, state: "fading", currentX: plane.endX, currentY: plane.endY }
            }
            const newX = plane.startX + (plane.endX - plane.startX) * newProgress
            const newY = plane.startY + (plane.endY - plane.startY) * newProgress
            return { ...plane, progress: newProgress, currentX: newX, currentY: newY }
          } else {
            // Fading
            const newOpacity = plane.opacity - 0.005 // Fade out speed (slower)
            return { ...plane, opacity: newOpacity }
          }
        }).filter(plane => plane.opacity > 0)
      })

      requestRef.current = requestAnimationFrame(animate)
    }

    const spawnPlane = () => {
      const isHorizontal = Math.random() > 0.5
      let startX, startY, endX, endY

      // Spawn outside the viewport
      const offset = 50

      if (isHorizontal) {
        startX = Math.random() > 0.5 ? -offset : dimensions.width + offset
        endX = startX < 0 ? dimensions.width + offset : -offset
        startY = Math.random() * dimensions.height
        endY = Math.random() * dimensions.height
      } else {
        startY = Math.random() > 0.5 ? -offset : dimensions.height + offset
        endY = startY < 0 ? dimensions.height + offset : -offset
        startX = Math.random() * dimensions.width
        endX = Math.random() * dimensions.width
      }

      const dx = endX - startX
      const dy = endY - startY
      const distance = Math.sqrt(dx * dx + dy * dy)
      // Speed: pixels per frame. 
      // We want it to take maybe 5-10 seconds.
      // 60 fps * 5s = 300 frames.
      // speed (progress per frame) = 1 / 300 = 0.0033
      const durationFrames = 300 + Math.random() * 300 // 5-10 seconds
      const speed = 1 / durationFrames
      
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)

      setPlanes(prev => [...prev, {
        id: Date.now() + Math.random(),
        startX,
        startY,
        endX,
        endY,
        currentX: startX,
        currentY: startY,
        progress: 0,
        speed,
        color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
        angle,
        state: "flying",
        opacity: 0.8
      }])
    }

    requestRef.current = requestAnimationFrame(animate)
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [dimensions])

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <svg className="w-full h-full">
        {planes.map(plane => (
          <g key={plane.id} opacity={plane.opacity}>
            {/* Chemtrail */}
            <line
              x1={plane.startX}
              y1={plane.startY}
              x2={plane.currentX}
              y2={plane.currentY}
              stroke={plane.color}
              strokeWidth="4"
              strokeLinecap="round"
              style={{ transition: 'opacity 0.5s ease-out' }}
            />
            {/* Plane */}
            {plane.state === "flying" && (
              <g transform={`translate(${plane.currentX}, ${plane.currentY}) rotate(${plane.angle})`}>
                {/* Minimalistic Plane Icon */}
                <path
                  d="M 12 0 L 8 2 L 4 2 L 0 10 L -3 10 L 0 2 L -6 2 L -9 6 L -11 6 L -9 1 L -11 0 L -9 -1 L -11 -6 L -9 -6 L -6 -2 L 0 -2 L -3 -10 L 0 -10 L 4 -2 L 8 -2 Z"
                  fill={plane.color}
                />
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
