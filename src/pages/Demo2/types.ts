export interface PerspectivePreset {
  name: string
  label: string
  position: [number, number, number]
  target: [number, number, number]
}

export interface MetricItem {
  label: string
  value: string | number
  unit: string
  trend?: 'up' | 'down'
  change?: string
}
