'use client'

import { Switch } from '@/components/ui/switch'
import { Users } from 'lucide-react'

interface CommunityDataToggleProps {
  showCommunityData: boolean
  onToggle: (value: boolean) => void
}

export default function CommunityDataToggle({
  showCommunityData,
  onToggle,
}: CommunityDataToggleProps) {
  return (
    <div className="bg-card/30 backdrop-blur-md rounded-full shadow-md border border-border px-4 py-2">
      <div className="flex items-center space-x-2.5">
        <span className="text-sm font-medium">Reports</span>
        <Switch
          id="community-data"
          checked={showCommunityData}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </div>
  )
}
