'use client'

import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun, Wind } from 'lucide-react'
import { useEffect, useState } from 'react'

interface WeatherData {
    temperature: number
    weatherCode: number
    isDay: boolean
}

interface WeatherWidgetProps {
    lat: number
    lng: number
}

export function WeatherWidget({ lat, lng }: WeatherWidgetProps) {
    const [weather, setWeather] = useState<WeatherData | null>(null)
    const [moonPhase, setMoonPhase] = useState<string>('')
    const [loading, setLoading] = useState(true)

    // Moon phase calculation
    const getMoonPhase = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()

        let c = 0
        let e = 0
        let jd = 0
        let b = 0

        if (month < 3) {
            year - 1
            month + 12
        }

        ++c
        c = 365.25 * year
        e = 30.6 * month
        jd = c + e + day - 694039.09 // jd is total days elapsed
        b = jd / 29.5305882 // b is the moon phase (0-8)
        b -= Math.floor(b) // normalize to 0-1
        b *= 8 // normalize to 0-8

        b = Math.round(b)
        if (b >= 8) b = 0

        switch (b) {
            case 0:
                return 'New Moon'
            case 1:
                return 'Waxing Crescent'
            case 2:
                return 'First Quarter'
            case 3:
                return 'Waxing Gibbous'
            case 4:
                return 'Full Moon'
            case 5:
                return 'Waning Gibbous'
            case 6:
                return 'Last Quarter'
            case 7:
                return 'Waning Crescent'
            default:
                return 'New Moon'
        }
    }

    // Fetch weather data
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day`
                )
                const data = await response.json()

                setWeather({
                    temperature: data.current.temperature_2m,
                    weatherCode: data.current.weather_code,
                    isDay: data.current.is_day === 1
                })
                setLoading(false)
            } catch (error) {
                console.error('Failed to fetch weather:', error)
                setLoading(false)
            }
        }

        fetchWeather()
        setMoonPhase(getMoonPhase(new Date()))

        // Refresh every 30 minutes
        const interval = setInterval(fetchWeather, 30 * 60 * 1000)
        return () => clearInterval(interval)
    }, [lat, lng])

    // Get weather icon based on WMO code
    const getWeatherIcon = (code: number, isDay: boolean) => {
        // Clear/Mainly Clear
        if (code <= 1) return isDay ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-300" />
        // Partly Cloudy/Overcast
        if (code <= 3) return <Cloud className="h-5 w-5 text-gray-400" />
        // Fog
        if (code <= 48) return <CloudFog className="h-5 w-5 text-slate-400" />
        // Drizzle/Rain
        if (code <= 67) return <CloudRain className="h-5 w-5 text-blue-400" />
        // Snow
        if (code <= 77) return <CloudSnow className="h-5 w-5 text-white" />
        // Rain Showers
        if (code <= 82) return <CloudRain className="h-5 w-5 text-blue-500" />
        // Snow Showers
        if (code <= 86) return <CloudSnow className="h-5 w-5 text-white" />
        // Thunderstorm
        if (code <= 99) return <CloudLightning className="h-5 w-5 text-yellow-600" />

        return <Sun className="h-5 w-5" />
    }

    if (loading) return null

    return (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-background/60 backdrop-blur-md border border-border shadow-lg transition-all hover:bg-background/80">
            <div className="flex items-center gap-2">
                {weather && getWeatherIcon(weather.weatherCode, weather.isDay)}
                <span className="text-sm font-medium">{Math.round(weather?.temperature || 0)}°C</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-purple-300" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{moonPhase}</span>
            </div>
        </div>
    )
}
