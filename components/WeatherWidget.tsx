'use client'

import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
    Cloud,
    CloudFog,
    CloudLightning,
    CloudRain,
    CloudSnow,
    Droplets,
    Moon,
    Sun,
    Thermometer,
    Wind,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface WeatherData {
    temperature: number
    weatherCode: number
    isDay: boolean
    humidity?: number
    windSpeed?: number
}

interface WeatherWidgetProps {
    lat: number
    lng: number
}

// iOS-style spring configuration for buttery smooth animations
const iosSpring = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 1,
}

const smoothSpring = {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
    mass: 0.8,
}

export function WeatherWidget({ lat, lng }: WeatherWidgetProps) {
    const [weather, setWeather] = useState<WeatherData | null>(null)
    const [moonPhase, setMoonPhase] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [isPressed, setIsPressed] = useState(false)

    // Smooth motion values for width
    const targetWidth = isExpanded ? 300 : isHovered ? 220 : 180
    const width = useMotionValue(180)
    const smoothWidth = useSpring(width, { stiffness: 300, damping: 30 })

    useEffect(() => {
        width.set(targetWidth)
    }, [targetWidth, width])

    // Moon phase calculation
    const getMoonPhase = (date: Date) => {
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        const day = date.getDate()

        if (month < 3) {
            year - 1
            month + 12
        }

        const c = 365.25 * year
        const e = 30.6 * month
        const jd = c + e + day - 694039.09
        let b = jd / 29.5305882
        b -= Math.floor(b)
        b *= 8

        b = Math.round(b)
        if (b >= 8) b = 0

        switch (b) {
            case 0:
                return '🌑 New Moon'
            case 1:
                return '🌒 Waxing Crescent'
            case 2:
                return '🌓 First Quarter'
            case 3:
                return '🌔 Waxing Gibbous'
            case 4:
                return '🌕 Full Moon'
            case 5:
                return '🌖 Waning Gibbous'
            case 6:
                return '🌗 Last Quarter'
            case 7:
                return '🌘 Waning Crescent'
            default:
                return '🌑 New Moon'
        }
    }

    // Fetch weather data
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day,relative_humidity_2m,wind_speed_10m`
                )
                const data = await response.json()

                setWeather({
                    temperature: data.current.temperature_2m,
                    weatherCode: data.current.weather_code,
                    isDay: data.current.is_day === 1,
                    humidity: data.current.relative_humidity_2m,
                    windSpeed: data.current.wind_speed_10m,
                })
                setLoading(false)
            } catch (error) {
                console.error('Failed to fetch weather:', error)
                setLoading(false)
            }
        }

        fetchWeather()
        setMoonPhase(getMoonPhase(new Date()))

        const interval = setInterval(fetchWeather, 30 * 60 * 1000)
        return () => clearInterval(interval)
    }, [lat, lng])

    // Get weather icon
    const getWeatherIcon = (code: number, isDay: boolean, size: 'sm' | 'lg' = 'sm') => {
        const sizeClass = size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'

        if (code <= 1)
            return isDay ? (
                <Sun className={`${sizeClass} text-amber-400`} />
            ) : (
                <Moon className={`${sizeClass} text-slate-200`} />
            )
        if (code <= 3) return <Cloud className={`${sizeClass} text-slate-300`} />
        if (code <= 48) return <CloudFog className={`${sizeClass} text-slate-400`} />
        if (code <= 67) return <CloudRain className={`${sizeClass} text-sky-400`} />
        if (code <= 77) return <CloudSnow className={`${sizeClass} text-white`} />
        if (code <= 82) return <CloudRain className={`${sizeClass} text-blue-400`} />
        if (code <= 86) return <CloudSnow className={`${sizeClass} text-white`} />
        if (code <= 99) return <CloudLightning className={`${sizeClass} text-yellow-400`} />

        return <Sun className={sizeClass} />
    }

    // Get weather description
    const getWeatherDescription = (code: number) => {
        if (code <= 1) return 'Clear'
        if (code <= 3) return 'Cloudy'
        if (code <= 48) return 'Foggy'
        if (code <= 67) return 'Rainy'
        if (code <= 77) return 'Snowy'
        if (code <= 82) return 'Showers'
        if (code <= 86) return 'Snow Showers'
        if (code <= 99) return 'Thunderstorm'
        return 'Clear'
    }

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={iosSpring}
                className="h-11 w-[180px] rounded-[50px] bg-black animate-pulse"
            />
        )
    }

    if (!weather) return null

    return (
        <motion.div
            onClick={() => setIsExpanded(!isExpanded)}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onTapStart={() => setIsPressed(true)}
            onTap={() => setIsPressed(false)}
            onTapCancel={() => setIsPressed(false)}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={smoothSpring}
            className="cursor-pointer select-none"
        >
            <motion.div
                className="relative overflow-hidden bg-black shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                style={{
                    width: smoothWidth,
                }}
                animate={{
                    height: isExpanded ? 'auto' : 44,
                    borderRadius: isExpanded ? 28 : 50,
                    scale: isPressed ? 0.97 : 1,
                }}
                transition={iosSpring}
            >
                {/* Subtle inner glow for depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-black/20 pointer-events-none" />

                {/* Ambient glow based on weather */}
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{
                        opacity: isHovered || isExpanded ? 1 : 0,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{
                        background: weather.isDay
                            ? 'radial-gradient(ellipse at 20% 30%, rgba(251, 191, 36, 0.12) 0%, transparent 60%)'
                            : 'radial-gradient(ellipse at 20% 30%, rgba(148, 163, 184, 0.1) 0%, transparent 60%)',
                    }}
                />

                <AnimatePresence mode="popLayout">
                    {!isExpanded ? (
                        /* Compact State - iOS Dynamic Island pill */
                        <motion.div
                            key="compact"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                            className="flex items-center justify-between h-11 px-4"
                        >
                            {/* Left section - Weather */}
                            <motion.div
                                className="flex items-center gap-2.5"
                                layout
                                transition={smoothSpring}
                            >
                                <motion.div
                                    animate={{
                                        rotate: weather.weatherCode <= 1 && weather.isDay ? [0, 3, 0, -3, 0] : 0,
                                        scale: isHovered ? 1.1 : 1,
                                    }}
                                    transition={{
                                        rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                                        scale: { duration: 0.3, ease: 'easeOut' },
                                    }}
                                >
                                    {getWeatherIcon(weather.weatherCode, weather.isDay)}
                                </motion.div>

                                <motion.span
                                    className="text-white font-semibold text-[15px] tabular-nums tracking-tight"
                                    layout
                                >
                                    {Math.round(weather.temperature)}°
                                </motion.span>
                            </motion.div>

                            {/* Divider - Smooth appearance */}
                            <motion.div
                                className="w-px bg-white/20 mx-2"
                                animate={{
                                    height: isHovered ? 20 : 16,
                                    opacity: isHovered ? 0.4 : 0.2,
                                }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            />

                            {/* Right section - Moon phase */}
                            <motion.div
                                className="flex items-center gap-2"
                                layout
                                transition={smoothSpring}
                            >
                                <motion.div
                                    animate={{ scale: isHovered ? 1.15 : 1 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                >
                                    <Moon className="h-4 w-4 text-purple-300/80" />
                                </motion.div>
                                <AnimatePresence mode="popLayout">
                                    {isHovered && (
                                        <motion.span
                                            initial={{ opacity: 0, width: 0, x: -10 }}
                                            animate={{ opacity: 1, width: 'auto', x: 0 }}
                                            exit={{ opacity: 0, width: 0, x: -10 }}
                                            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                                            className="text-white/60 text-xs font-medium whitespace-nowrap overflow-hidden"
                                        >
                                            {moonPhase.split(' ').slice(1).join(' ')}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>
                    ) : (
                        /* Expanded State - Full Dynamic Island */
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                            className="p-5"
                        >
                            {/* Header with main weather info */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        initial={{ scale: 0.6, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{
                                            ...smoothSpring,
                                            delay: 0.05,
                                        }}
                                    >
                                        {getWeatherIcon(weather.weatherCode, weather.isDay, 'lg')}
                                    </motion.div>
                                    <div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.08, duration: 0.3, ease: 'easeOut' }}
                                            className="text-3xl font-bold text-white tabular-nums tracking-tight"
                                        >
                                            {Math.round(weather.temperature)}°C
                                        </motion.div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.12, duration: 0.3, ease: 'easeOut' }}
                                            className="text-white/50 text-sm font-medium"
                                        >
                                            {getWeatherDescription(weather.weatherCode)}
                                        </motion.div>
                                    </div>
                                </div>

                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.15, ...smoothSpring }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.08]"
                                >
                                    <Thermometer className="h-3.5 w-3.5 text-orange-400/80" />
                                    <span className="text-xs text-white/70 font-medium tabular-nums">
                                        {Math.round(weather.temperature)}°
                                    </span>
                                </motion.div>
                            </div>

                            {/* Weather details grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.35, ease: 'easeOut' }}
                                className="grid grid-cols-2 gap-2.5 mb-3"
                            >
                                {/* Humidity */}
                                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/[0.05]">
                                    <Droplets className="h-4 w-4 text-sky-400/80" />
                                    <div>
                                        <div className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                                            Humidity
                                        </div>
                                        <div className="text-sm font-semibold text-white/90 tabular-nums">
                                            {weather.humidity || '--'}%
                                        </div>
                                    </div>
                                </div>

                                {/* Wind */}
                                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/[0.05]">
                                    <motion.div
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                        }}
                                    >
                                        <Wind className="h-4 w-4 text-teal-400/80" />
                                    </motion.div>
                                    <div>
                                        <div className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                                            Wind
                                        </div>
                                        <div className="text-sm font-semibold text-white/90 tabular-nums">
                                            {weather.windSpeed || '--'} km/h
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Moon phase section */}
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.35, ease: 'easeOut' }}
                                className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500/[0.08] to-indigo-500/[0.08]"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="text-base">{moonPhase.split(' ')[0]}</span>
                                    <span className="text-white/70 text-sm font-medium">
                                        {moonPhase.split(' ').slice(1).join(' ')}
                                    </span>
                                </div>
                                <Moon className="h-4 w-4 text-purple-400/50" />
                            </motion.div>

                            {/* Tap hint */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.35, duration: 0.4 }}
                                className="text-center mt-3.5"
                            >
                                <span className="text-[10px] text-white/25 uppercase tracking-[0.15em] font-medium">
                                    Tap to close
                                </span>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}
