"use client"

import { useState, useEffect, useRef } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"

interface TimelineSliderProps {
  minYear: number
  maxYear: number
  currentYear: number
  onChange: (year: number) => void
}

export function TimelineSlider({ minYear, maxYear, currentYear, onChange }: TimelineSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [year, setYear] = useState(currentYear)
  const animationRef = useRef<number>()
  const lastUpdateRef = useRef<number>()

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp
      const elapsed = timestamp - lastUpdateRef.current

      if (elapsed > 1000) {
        // Update every second
        setYear((prevYear) => {
          const nextYear = prevYear + 1
          if (nextYear > maxYear) {
            setIsPlaying(false)
            return minYear
          }
          return nextYear
        })
        lastUpdateRef.current = timestamp
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, minYear, maxYear])

  useEffect(() => {
    onChange(year)
  }, [year, onChange])

  return (
    <div className="flex items-center gap-4 p-4 bg-background rounded-lg shadow-sm">
      <Button variant="outline" size="icon" onClick={togglePlayPause} className="w-8 h-8">
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Slider
        value={[year]}
        min={minYear}
        max={maxYear}
        step={1}
        onValueChange={(value) => setYear(value[0])}
        className="w-[300px]"
      />
      <div className="min-w-[4rem] text-sm">{year}</div>
    </div>
  )
}

