'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SOSButtonProps {
  onClick: () => void
  className?: string
  variant?: 'default' | 'compact'
}

export default function SOSButton({ onClick, className, variant = 'default' }: SOSButtonProps) {
  if (variant === 'compact') {
    // Compact version for navigation mode
    return (
      <Button
        onClick={onClick}
        className={cn(
          'h-12 px-4 font-semibold text-base rounded-xl shadow-lg flex items-center justify-center gap-2 bg-primary text-white',
          className
        )}
      >
        <AlertTriangle className="h-5 w-5" />
        <span>SOS</span>
      </Button>
    )
  }

  // Default version for main screen
  return (
    <Button
      onClick={onClick}
      className={cn(
        'flex-1 h-14 font-semibold text-base rounded-xl shadow-2xl flex items-center justify-center gap-2 bg-primary text-white',
        className
      )}
    >
      <AlertTriangle className="h-5 w-5" />
      Emergency
    </Button>
  )
}
