'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  CornerUpLeftIcon,
  CornerUpRightIcon,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Compass,
  AlertTriangle,
  Gauge,
} from 'lucide-react'
import { NavigationStep } from '@/types/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import SOSButton from './SOSButton'

interface NavigationModeProps {
  currentStep: NavigationStep | null
  nextStep: NavigationStep | null
  routeDuration: number // seconds remaining
  routeDistance: number // meters remaining
  totalDistance?: number // total route distance in meters
  currentSpeed?: number // speed in m/s from GPS
  onExit: () => void
  onRecenter: () => void
  onReport?: () => void
  onSOS: () => void
  showRecenter: boolean
}

export default function NavigationMode({
  currentStep,
  nextStep,
  routeDuration,
  routeDistance,
  totalDistance,
  currentSpeed,
  onExit,
  onRecenter,
  onReport,
  onSOS,
  showRecenter,
}: NavigationModeProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [displaySpeed, setDisplaySpeed] = useState(0)
  const lastPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null)
  const [calculatedSpeed, setCalculatedSpeed] = useState(0)

  // Update time every minute for ETA
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Calculate speed from GPS if not provided
  useEffect(() => {
    if (currentSpeed !== undefined) {
      // Smooth the speed display
      setDisplaySpeed(prev => {
        const diff = currentSpeed - prev
        return prev + diff * 0.3 // Smooth transition
      })
    } else if (calculatedSpeed > 0) {
      setDisplaySpeed(calculatedSpeed)
    }
  }, [currentSpeed, calculatedSpeed])

  // Watch position for speed calculation if currentSpeed is not provided
  useEffect(() => {
    if (currentSpeed !== undefined) return // Skip if speed is provided

    let watchId: number | null = null

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now()
          const { latitude, longitude } = position.coords

          if (position.coords.speed !== null && position.coords.speed >= 0) {
            setCalculatedSpeed(position.coords.speed)
          } else if (lastPositionRef.current) {
            // Calculate speed from distance/time
            const timeDiff = (now - lastPositionRef.current.time) / 1000
            if (timeDiff > 0.5) {
              const R = 6371e3
              const φ1 = (lastPositionRef.current.lat * Math.PI) / 180
              const φ2 = (latitude * Math.PI) / 180
              const Δφ = ((latitude - lastPositionRef.current.lat) * Math.PI) / 180
              const Δλ = ((longitude - lastPositionRef.current.lng) * Math.PI) / 180

              const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
              const distance = R * c

              const speed = distance / timeDiff
              if (speed < 50) { // Filter out GPS jumps (max ~180 km/h)
                setCalculatedSpeed(speed)
              }
            }
          }

          lastPositionRef.current = { lat: latitude, lng: longitude, time: now }
        },
        () => { },
        { enableHighAccuracy: true, maximumAge: 1000 }
      )
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [currentSpeed])

  const formatDuration = (seconds: number) => {
    const mins = Math.ceil(seconds / 60)
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`
    }
    return `${(meters / 1000).toFixed(1)} km`
  }

  // Format speed in km/h
  const formatSpeed = (metersPerSecond: number) => {
    const kmh = metersPerSecond * 3.6
    return `${Math.round(kmh)}`
  }

  // Get walking/moving status based on speed
  const getSpeedStatus = (metersPerSecond: number) => {
    const kmh = metersPerSecond * 3.6
    if (kmh < 1) return 'Stopped'
    if (kmh < 6) return 'Walking'
    if (kmh < 15) return 'Jogging'
    if (kmh < 30) return 'Cycling'
    return 'Driving'
  }

  // Calculate progress percentage
  const getProgress = () => {
    if (!totalDistance || totalDistance === 0) return 0
    const traveled = totalDistance - routeDistance
    return Math.min(100, Math.max(0, (traveled / totalDistance) * 100))
  }

  const getETA = () => {
    const eta = new Date(currentTime.getTime() + routeDuration * 1000)
    return eta.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const getManeuverIcon = (type?: string) => {
    if (!type) return <ArrowUp className="h-6 w-6" />

    switch (type.toLowerCase()) {
      case 'turn left':
      case 'left':
        return <CornerUpLeftIcon className="h-6 w-6" />
      case 'turn right':
      case 'right':
        return <CornerUpRightIcon className="h-6 w-6" />
      case 'sharp left':
        return <CornerUpLeft className="h-6 w-6" />
      case 'sharp right':
        return <CornerUpRight className="h-6 w-6" />
      case 'arrive':
      case 'arrival':
        return <Flag className="h-6 w-6" />
      default:
        return <ArrowUp className="h-6 w-6" />
    }
  }

  // Strip HTML tags from Google Directions API instructions
  const stripHtml = (html: string): string => {
    if (!html) return ''
    return html
      .replace(/<\/?b>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const getInstructionText = () => {
    if (!currentStep) return 'Continue straight'

    const rawInstruction = currentStep.maneuver?.instruction || currentStep.instruction || 'Continue'
    const instruction = stripHtml(rawInstruction)
    const distance = currentStep.distance

    if (distance < 50) {
      return instruction
    } else if (distance < 200) {
      return `In ${Math.round(distance)} meters, ${instruction.toLowerCase()}`
    } else if (distance < 1000) {
      return `In ${Math.round(distance / 50) * 50} meters, ${instruction.toLowerCase()}`
    } else {
      return `In ${(distance / 1000).toFixed(1)} km, ${instruction.toLowerCase()}`
    }
  }

  const getNextStepText = () => {
    if (!nextStep) return ''
    const rawInstruction = nextStep.maneuver?.instruction || nextStep.instruction || ''
    return stripHtml(rawInstruction)
  }

  const progress = getProgress()

  return (
    <>
      {/* Top instruction bar */}
      <AnimatePresence>
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-0 m-4 rounded-2xl left-0 right-0 z-40 bg-background text-background-foreground shadow-lg overflow-hidden"
        >
          {/* Progress bar at top */}
          {totalDistance && totalDistance > 0 && (
            <div className="h-1 bg-muted w-full">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-primary to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          )}

          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="bg-white text-black rounded-lg p-2">
                {getManeuverIcon(currentStep?.maneuver?.type)}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold">{getInstructionText()}</p>
                {currentStep?.name && <p className="text-sm opacity-90">on {currentStep.name}</p>}
              </div>
            </div>

            {/* Next instruction preview */}
            {nextStep && (
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2 text-xs opacity-80">
                {getManeuverIcon(nextStep.maneuver?.type)}
                <span>Then: {getNextStepText()}</span>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom stats panel */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-0 mx-2 rounded-t-2xl left-0 right-0 z-40 bg-background border-t border-border shadow-2xl"
        >
          <div className="p-4 pb-8">
            {/* Progress indicator */}
            {totalDistance && totalDistance > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground w-12 text-right">
                  {Math.round(progress)}%
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              {/* Stats on the left */}
              <div className="flex-1">
                <div className="text-3xl font-bold text-primary">
                  {formatDuration(routeDuration)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span>{formatDistance(routeDistance)}</span>
                  <span>•</span>
                  <span>ETA {getETA()}</span>
                </div>
              </div>

              {/* Speed display */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center bg-muted/50 rounded-xl px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold text-foreground">{formatSpeed(displaySpeed)}</span>
                    <span className="text-xs text-muted-foreground">km/h</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{getSpeedStatus(displaySpeed)}</span>
                </div>

                {/* Exit button */}
                <Button onClick={onExit} size={'lg'} variant="destructive" className="rounded-full">
                  Exit
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Floating Action Buttons - Bottom Row */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-32 left-0 right-0 px-2 z-40"
      >
        <div className="max-w-lg mx-auto flex gap-2">
          {/* Recenter Button */}
          {showRecenter ? (
            <Button
              onClick={onRecenter}
              className="flex-1 backdrop-blur-2xl h-12"
              variant="outline"
              size={'sm'}
            >
              <Compass className="h-5 w-5 mr-1" />
              <span className="font-medium">Re-center</span>
            </Button>
          ) : (
            <div className="flex-1" />
          )}

          {/* SOS Button */}
          <SOSButton onClick={onSOS} variant="compact" className="flex-1 backdrop-blur-2xl" />

          {/* Report Button */}
          {onReport && (
            <Button onClick={onReport} variant="outline" className="flex-1 backdrop-blur-2xl h-12">
              <AlertTriangle className="h-5 w-5 mr-1" />
              <span>Report</span>
            </Button>
          )}
        </div>
      </motion.div>
    </>
  )
}
