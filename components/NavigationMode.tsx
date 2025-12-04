'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { NavigationStep } from '@/types/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import SOSButton from './SOSButton'

interface NavigationModeProps {
  currentStep: NavigationStep | null
  nextStep: NavigationStep | null
  routeDuration: number // seconds remaining
  routeDistance: number // meters remaining
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
  onExit,
  onRecenter,
  onReport,
  onSOS,
  showRecenter,
}: NavigationModeProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute for ETA
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

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

  const getInstructionText = () => {
    if (!currentStep) return 'Continue straight'

    const instruction = currentStep.maneuver?.instruction || currentStep.instruction || 'Continue'
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

  return (
    <>
      {/* Top instruction bar */}
      <AnimatePresence>
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-0 m-4 rounded-2xl left-0 right-0 z-40 bg-background text-background-foreground shadow-lg"
        >
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
                <span>Then: {nextStep.maneuver?.instruction || nextStep.instruction}</span>
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

              {/* Exit button on the right */}
              <div className="flex items-center gap-2">
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
        className="fixed bottom-28 left-0 right-0 px-2 z-40"
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
