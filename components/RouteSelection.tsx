'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Zap, Clock, Route, ChevronRight, ArrowLeft, Lightbulb } from 'lucide-react'
import { RouteInfo } from '@/types/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface RouteSelectionProps {
  routes: RouteInfo[]
  onSelectRoute: (index: number) => void
  onStartNavigation: () => void
  onBack: () => void
  selectedRouteIndex: number
}

export default function RouteSelection({
  routes,
  onSelectRoute,
  onStartNavigation,
  onBack,
  selectedRouteIndex,
}: RouteSelectionProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.ceil(seconds / 60)
    return `${mins} min`
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`
    }
    return `${(meters / 1000).toFixed(1)} km`
  }

  const getRouteType = (index: number): 'safest' | 'fastest' => {
    // Assuming first route is fastest, second is safest (if available)
    if (routes.length === 1) return 'fastest'
    return index === 0 ? 'fastest' : 'safest'
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border"
      >
        <div className="p-4 space-y-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-medium text-muted-foreground">Choose your route</h3>
          </div>

          {/* Route cards */}
          <div className="space-y-2">
            {routes.map((route, index) => {
              const isSelected = selectedRouteIndex === index
              const routeType = getRouteType(index)
              const isSafest = routeType === 'safest'

              return (
                <Card
                  key={index}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-lg'
                      : 'bg-card border-border hover:bg-accent'
                  }`}
                  onClick={() => onSelectRoute(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {routes.length === 1
                            ? 'Fastest & Safest route'
                            : isSafest
                              ? 'Safest route'
                              : 'Fastest route'}
                        </span>
                        {(routes.length === 1 || (isSafest && routes.length > 1)) && (
                          <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                        {/* Lighting badge with better color coding */}
                        {route.lightingPercentage !== undefined &&
                          route.lightingPercentage >= 80 && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                route.lightingPercentage >= 90
                                  ? 'bg-yellow-500/20 text-yellow-600'
                                  : route.lightingPercentage >= 70
                                    ? 'bg-orange-500/20 text-orange-600'
                                    : route.lightingPercentage >= 50
                                      ? 'bg-orange-600/20 text-orange-700'
                                      : 'bg-red-500/20 text-red-600'
                              }`}
                            >
                              {route.lightingPercentage === 100
                                ? 'Fully lit'
                                : route.lightingPercentage >= 80 && `well-lit`}
                            </span>
                          )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(route.duration)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Route className="h-3 w-3" />
                          <span>{formatDistance(route.distance)}</span>
                        </div>
                        {route.safetyScore && (
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span>Safety: {route.safetyScore}/10</span>
                          </div>
                        )}
                        {/* Always show lighting percentage */}
                        <div className="flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          <span>{(route.lightingPercentage ?? 0).toFixed(0)}% lit</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`h-5 w-5 transition-colors ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Start navigation button */}
          <Button
            onClick={onStartNavigation}
            className="w-full h-14 text-base font-semibold rounded-xl shadow-xl"
            size="lg"
          >
            Go now
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
