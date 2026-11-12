export type LowAltitudeMode = 'overview' | 'airspace' | 'inspection' | 'emergency'
export type EntityKind = 'aircraft' | 'zone' | 'route' | 'vertiport' | 'mission' | 'alert'
export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'

export interface Aircraft {
  id: string
  callsign: string
  model: string
  operator: string
  status: 'flying' | 'standby' | 'offline'
  routeId: string
  missionId: string
  x: number
  z: number
  altitude: number
  speed: number
  battery: number
  signal: number
  heading: number
  phase: number
}

export interface AircraftTelemetry {
  altitude: number
  speed: number
  battery: number
  signal: number
  heading: number
  updatedAt: number
}

export interface AirspaceZone {
  id: string
  name: string
  type: 'open' | 'temporary' | 'restricted' | 'prohibited'
  x: number
  z: number
  radius: number
  height: number
  floor: number
  ceiling: number
  activeFlights: number
  capacity: number
  validUntil: string
}

export interface FlightRoute {
  id: string
  name: string
  category: 'inspection' | 'logistics' | 'training' | 'emergency'
  status: 'active' | 'planned' | 'exception'
  points: [number, number][]
  duration: string
}

export interface Vertiport {
  id: string
  name: string
  kind: 'hub' | 'dock' | 'emergency'
  x: number
  z: number
  availability: number
  capacity: number
}

export interface FlightMission {
  id: string
  name: string
  category: 'river' | 'traffic' | 'park' | 'ecology' | 'logistics' | 'emergency'
  status: 'in-progress' | 'queued' | 'complete' | 'dispatched'
  routeId: string
  aircraftId: string
  progress: number
  owner: string
}

export interface AlertEvent {
  id: string
  title: string
  detail: string
  severity: AlertSeverity
  status: AlertStatus
  time: string
  entityKind: 'aircraft' | 'zone' | 'route'
  entityId: string
}

export interface EmergencyEvent {
  id: string
  title: string
  location: string
  status: 'monitoring' | 'dispatched' | 'closed'
  reportedAt: string
  isSimulated: true
}

export interface LowAltitudeSnapshot {
  airborne: number
  flightsToday: number
  airspaceUsage: number
  activeMissions: number
  unacknowledgedAlerts: number
}

export interface SimulationEvent {
  timestamp: number
  type: string
  entityId: string
  payload: Record<string, unknown>
}

export interface EntitySelection {
  type: EntityKind
  id: string
}
