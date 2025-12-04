export interface RouteInfo {
  duration: number // in seconds
  distance: number // in meters
  safetyScore?: number // 1-10, calculated from incident data
  incidentCount?: number // Number of incidents near this route
  totalPenalty?: number // Total safety penalty from incidents
  lightingPercentage?: number // 0-100, percentage of route that is well-lit
  lightingCount?: number // Number of street lights along the route
  geometry: any // GeoJSON geometry
  legs?: any[]
  steps?: any[]
}

export interface NavigationStep {
  instruction: string
  distance: number
  duration: number
  maneuver?: {
    type: string
    instruction: string
    bearing_after?: number
    bearing_before?: number
    location?: [number, number]
  }
  name?: string
}

export interface Location {
  coordinates: [number, number]
  name?: string
}

export type NavigationState = 'idle' | 'searching' | 'route-selection' | 'navigating'

export interface SelectedRoute {
  route: RouteInfo
  type: 'safest' | 'fastest'
  isSelected: boolean
}
