'use client'

import { motion } from 'framer-motion'
import { MapPin, Navigation, Shield } from 'lucide-react'

interface MapLoadingProps {
    message?: string
}

export function MapLoading({ message = 'Loading map...' }: MapLoadingProps) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 z-50">
            <div className="flex flex-col items-center gap-6">
                {/* Animated logo/icon */}
                <div className="relative">
                    {/* Outer pulsing ring */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-primary/20"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        style={{ width: 80, height: 80 }}
                    />

                    {/* Middle pulsing ring */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-primary/30"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.7, 0.2, 0.7],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: 0.3,
                        }}
                        style={{ width: 80, height: 80 }}
                    />

                    {/* Center icon container */}
                    <motion.div
                        className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30"
                        animate={{
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        <motion.div
                            animate={{
                                rotate: [0, 360],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        >
                            <Navigation className="w-8 h-8 text-primary-foreground" />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Loading text */}
                <div className="flex flex-col items-center gap-2">
                    <motion.p
                        className="text-lg font-semibold text-foreground"
                        animate={{
                            opacity: [1, 0.5, 1],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        {message}
                    </motion.p>

                    {/* Animated dots */}
                    <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-primary"
                                animate={{
                                    y: [0, -8, 0],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: i * 0.15,
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Feature hints */}
                <motion.div
                    className="flex items-center gap-6 mt-4 text-sm text-muted-foreground"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>Live tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span>Safety first</span>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export function MapError({ error }: { error: string }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 z-50">
            <motion.div
                className="text-center p-8 max-w-md"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Error icon */}
                <motion.div
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center"
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    <MapPin className="w-8 h-8 text-destructive" />
                </motion.div>

                <h3 className="text-lg font-semibold text-foreground mb-2">
                    Failed to load map
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    {error}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    Try again
                </button>
            </motion.div>
        </div>
    )
}
