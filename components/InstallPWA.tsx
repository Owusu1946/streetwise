'use client'

import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface InstallPWAProps {
  className?: string
}

export function InstallPWA({ className = '' }: InstallPWAProps) {
  const [supportsPWA, setSupportsPWA] = useState(false)
  const [promptInstall, setPromptInstall] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Mark that we're on the client
    setIsClient(true)

    // Check if device is mobile
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      // Check for mobile devices (phones and tablets)
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      )
    }

    setIsMobile(checkIfMobile())

    // Check if app is running in standalone mode
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    setIsInstalled(isInStandaloneMode)

    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

    setIsIOS(isIOSDevice)

    // Listen for beforeinstallprompt event (Chrome/Edge on Android)
    const handler = (e: any) => {
      e.preventDefault()
      console.log('PWA install prompt available')
      // Only show on mobile devices
      if (checkIfMobile()) {
        setSupportsPWA(true)
        setPromptInstall(e)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    // For iOS, always show the button if not installed
    if (isIOSDevice && !isInStandaloneMode) {
      setSupportsPWA(true)
    }

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed')
      setIsInstalled(true)
      setSupportsPWA(false)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      // Show iOS installation instructions
      toast(
        <div className="space-y-3">
          <p className="font-semibold text-base">Install Streetwise on iPhone:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>Tap the Share button at the top/bottom</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>Scroll down and tap "Add to Home Screen"</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>Tap "Add" in the top right</span>
            </li>
          </ol>
        </div>,
        {
          duration: 15000,
          position: 'top-center',
          className: 'max-w-sm',
        }
      )
      return
    }

    if (!promptInstall) {
      // Fallback for browsers that don't support the install prompt
      toast.info(
        'To install: Use your browser menu and look for "Install App" or "Add to Home Screen"',
        {
          duration: 8000,
        }
      )
      return
    }

    try {
      // Show the install prompt
      const result = await promptInstall.prompt()

      // Log the user's choice
      console.log('User response to install prompt:', result.outcome)

      if (result.outcome === 'accepted') {
        toast.success('Installing Streetwise... 🎉', {
          description: 'Check your home screen!',
        })
      } else {
        toast.info('You can install later using the browser menu')
      }

      // Clear the saved prompt
      setPromptInstall(null)
      setSupportsPWA(false)
    } catch (error) {
      console.error('Error showing install prompt:', error)
      toast.error('Unable to install right now', {
        description: 'Try using your browser menu instead',
      })
    }
  }

  // Don't render on server, desktop devices, if already installed, or if PWA not supported
  if (!isClient || !isMobile || isInstalled || !supportsPWA) {
    return null
  }

  return (
    <ShimmerButton
      onClick={handleInstallClick}
      className={`text-sm font-semibold ${className}`}
      shimmerColor="black"
    >
      <Download className="mr-2 h-4 w-4" />
      Install App
    </ShimmerButton>
  )
}
