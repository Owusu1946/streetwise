'use client'

import { Drawer } from 'vaul'
import {
  X,
  Users,
  Banknote,
  Frown,
  Megaphone,
  Ban,
  UserX,
  Dog,
  Flame,
  Construction,
  Moon,
} from 'lucide-react'

interface ReportDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReportIncident: (type: string) => void
}

const incidentTypes = [
  { id: 'aggressive', label: 'Aggressive individual', icon: Users, color: '#EF4444' }, // Red
  { id: 'pickpocket', label: 'Pickpocket', icon: Banknote, color: '#F97316' }, // Orange
  { id: 'insecurity', label: 'Feeling of insecurity', icon: Frown, color: '#635CFF' }, // Purple (brand)
  { id: 'protest', label: 'Protest', icon: Megaphone, color: '#EAB308' }, // Yellow
  { id: 'harassment', label: 'Harassment', icon: Ban, color: '#DC2626' }, // Dark Red
  { id: 'suspicious', label: 'Suspicious individual', icon: UserX, color: '#FB923C' }, // Light Orange
  { id: 'animal', label: 'Unwanted animal', icon: Dog, color: '#92400E' }, // Brown
  { id: 'vandalism', label: 'Vandalism', icon: Flame, color: '#EA580C' }, // Fire Orange
  { id: 'passage', label: 'Difficult passage', icon: Construction, color: '#6B7280' }, // Gray
  { id: 'poorlight', label: 'Poorly lit street', icon: Moon, color: '#1E3A8A' }, // Dark Blue
]

export default function ReportDrawer({ open, onOpenChange, onReportIncident }: ReportDrawerProps) {
  const handleReport = (type: string) => {
    onReportIncident(type)
    onOpenChange(false)
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal={true}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Drawer.Content className="fixed flex flex-col bg-background rounded-t-[20px] bottom-0 left-0 right-0 h-[85%] z-50 border-t border-border">
          <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mt-3 mb-4" />

          <div className="flex flex-col px-5 pb-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">What do you see?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Try to be as precise as possible
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {incidentTypes.map((incident) => {
                const Icon = incident.icon
                return (
                  <button
                    key={incident.id}
                    onClick={() => handleReport(incident.id)}
                    className="flex flex-col items-center justify-center p-4 bg-card rounded-xl transition-all min-h-[100px]"
                  >
                    <div
                      className="p-3 rounded-full mb-2 transition-opacity"
                      style={{
                        backgroundColor: `${incident.color}15`,
                        borderWidth: '1px',
                        borderColor: `${incident.color}30`,
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: incident.color }} />
                    </div>
                    <span className="text-sm text-center text-foreground">{incident.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
