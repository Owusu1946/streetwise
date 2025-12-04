'use client'

import { motion } from 'framer-motion'
import { Bus, Clock, MapPin, Navigation, Wallet, X, FootprintsIcon, Search, Locate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { JourneyResult, TroskiRouteStop } from '@/utils/troski'

interface TroskiJourneyViewProps {
    journey: JourneyResult
    onClose: () => void
    onClearRoute?: () => void
    userLocation?: [number, number] | null
}

// Calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
}

export function TroskiJourneyView({ journey, onClose, onClearRoute, userLocation }: TroskiJourneyViewProps) {
    const { route, stops } = journey

    // Get stop type color
    const getStopColor = (type: string) => {
        switch (type) {
            case 'board':
                return 'bg-blue-500'
            case 'alight':
                return 'bg-orange-500'
            case 'transfer':
                return 'bg-purple-500'
            default:
                return 'bg-gray-500'
        }
    }

    // Get stop type icon
    const getStopIcon = (type: string) => {
        switch (type) {
            case 'board':
                return '🚌'
            case 'alight':
                return '🚶'
            case 'transfer':
                return '🔄'
            default:
                return '📍'
        }
    }

    // Get instruction text
    const getInstruction = (stop: TroskiRouteStop, index: number) => {
        switch (stop.stop_type) {
            case 'board':
                return `Board troski at ${stop.stop_name}`
            case 'alight':
                return `Alight at ${stop.stop_name}`
            case 'transfer':
                return `Transfer at ${stop.stop_name}`
            default:
                return stop.stop_name
        }
    }

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-card rounded-t-[24px] shadow-2xl max-h-[70vh] overflow-hidden"
        >
            {/* Header */}
            <div className="sticky top-0 bg-card z-10 px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <Bus className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Your Journey</h3>
                            <p className="text-xs text-muted-foreground">
                                {stops.length} stop{stops.length !== 1 ? 's' : ''} • Troski route
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Summary stats */}
                <div className="flex items-center gap-4">
                    {route.total_fare && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10">
                            <Wallet className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-600">GH₵{route.total_fare}</span>
                        </div>
                    )}
                    {route.estimated_duration && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{route.estimated_duration} min</span>
                        </div>
                    )}
                    {route.usage_count > 1 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted">
                            <Navigation className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{route.usage_count} travelers</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Journey steps */}
            <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(70vh - 180px)' }}>
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-border" />

                    {/* User's current location (shown if they have location enabled) */}
                    {userLocation && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 }}
                            className="flex items-start gap-4 mb-6"
                        >
                            <div className="relative z-10">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg border-2 border-white">
                                    <Locate className="h-5 w-5 text-white" />
                                </div>
                                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-50" />
                            </div>
                            <div className="flex-1 pt-2">
                                <p className="text-xs text-blue-500 uppercase tracking-wide font-semibold">Your Location</p>
                                <p className="font-semibold text-base">You are here</p>
                                {(() => {
                                    const dist = calculateDistance(
                                        userLocation[1], userLocation[0],
                                        route.origin_latitude, route.origin_longitude
                                    )
                                    return (
                                        <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
                                            <FootprintsIcon className="h-3.5 w-3.5" />
                                            <span className="text-xs">
                                                {dist < 50 ? 'At start point' : `${formatDistance(dist)} to start`}
                                            </span>
                                        </div>
                                    )
                                })()}
                            </div>
                        </motion.div>
                    )}

                    {/* Origin */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: userLocation ? 0.15 : 0.1 }}
                        className="flex items-start gap-4 mb-6"
                    >
                        <div className="relative z-10 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                            <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 pt-2">
                            <p className="text-xs text-emerald-600 uppercase tracking-wide">Board here</p>
                            <p className="font-semibold text-base">{route.origin_name}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
                                <Bus className="h-3.5 w-3.5" />
                                <span className="text-xs">Catch your troski here</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stops */}
                    {stops.map((stop, index) => (
                        <motion.div
                            key={stop.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + index * 0.1 }}
                            className="flex items-start gap-4 mb-6"
                        >
                            <div
                                className={`relative z-10 w-10 h-10 rounded-full ${getStopColor(stop.stop_type)} flex items-center justify-center shadow-lg`}
                            >
                                <span className="text-lg">{getStopIcon(stop.stop_type)}</span>
                            </div>
                            <div className="flex-1 pt-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full text-white ${getStopColor(stop.stop_type)}`}
                                    >
                                        {stop.stop_type}
                                    </span>
                                    {stop.fare_from_previous && (
                                        <span className="text-xs text-emerald-600 font-medium">
                                            +GH₵{stop.fare_from_previous}
                                        </span>
                                    )}
                                </div>
                                <p className="font-semibold text-base">{stop.stop_name}</p>
                                {stop.troski_description && (
                                    <p className="text-sm text-muted-foreground mt-0.5">{stop.troski_description}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">{getInstruction(stop, index)}</p>
                            </div>
                        </motion.div>
                    ))}

                    {/* Destination */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + stops.length * 0.1 }}
                        className="flex items-start gap-4"
                    >
                        <div className="relative z-10 w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                            <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 pt-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Destination</p>
                            <p className="font-semibold text-base">{route.destination_name}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 text-emerald-600">
                                <span className="text-lg">🎉</span>
                                <span className="text-xs font-medium">You've arrived!</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Footer action */}
            <div className="sticky bottom-0 bg-card border-t border-border p-4 space-y-2">
                <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full h-12"
                >
                    Close Journey View
                </Button>
                {onClearRoute && (
                    <Button
                        onClick={onClearRoute}
                        variant="ghost"
                        className="w-full h-10 text-muted-foreground"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Search for New Route
                    </Button>
                )}
            </div>
        </motion.div>
    )
}

