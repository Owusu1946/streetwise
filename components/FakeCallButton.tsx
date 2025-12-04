'use client'

import { useRouter } from 'next/navigation'
import { PhoneCall } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FakeCallButtonProps {
  className?: string
}

export function FakeCallButton({ className }: FakeCallButtonProps) {
  const router = useRouter()

  const handleFakeCall = () => {
    router.push('/fake-call')
  }

  return (
    <Button
      onClick={handleFakeCall}
      className={cn('font-semibold text-base flex items-center justify-center gap-2', className)}
    >
      <PhoneCall className="h-5 w-5" />
      <span>Fake Call</span>
    </Button>
  )
}
