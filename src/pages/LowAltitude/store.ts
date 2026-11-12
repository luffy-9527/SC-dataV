import { defineStore } from 'pinia'
import { defaultDistrict, districtById, districts } from './districts'
import { createDistrictSnapshot } from './districtData'
import type { DistrictSnapshot } from './districtData'
import type { EntityKind, EntitySelection, LowAltitudeMode } from './types'

const routeColors: Record<string, string> = {
  'RT-01': '#55d6d1',
  'RT-02': '#8bd17c',
  'RT-03': '#70b7ed',
  'RT-04': '#e4c36e',
  'RT-05': '#78cde3',
  'RT-06': '#89cf9a',
  'RT-07': '#f0a45f',
  'RT-08': '#f1c35e',
}

const scenarioSteps = [
  { mode: 'inspection' as const, label: '日常巡检', description: '常态巡检任务运行中' },
  { mode: 'overview' as const, label: '航线偏离', description: '模拟航线偏离预警已生成' },
  { mode: 'airspace' as const, label: '空域预警', description: '模拟进入临时空域边界' },
  { mode: 'emergency' as const, label: '应急联动', description: '模拟应急无人机已派出' },
  { mode: 'inspection' as const, label: '任务闭环', description: '模拟现场核查完成并归档' },
]

const modeLayers = {
  overview: { aircraft: true, routes: true, zones: true, vertiports: true, districts: true, inspectionAreas: false, weather: false },
  airspace: { aircraft: true, routes: true, zones: true, vertiports: true, districts: true, inspectionAreas: false, weather: false },
  inspection: { aircraft: true, routes: true, zones: false, vertiports: true, districts: true, inspectionAreas: true, weather: false },
  emergency: { aircraft: true, routes: true, zones: true, vertiports: true, districts: true, inspectionAreas: true, weather: false },
}

export const useLowAltitudeStore = defineStore('low-altitude', {
  state: () => ({
    districtId: defaultDistrict.id,
    districtSessions: {} as Record<string,DistrictSnapshot>,
    ...createDistrictSnapshot(defaultDistrict),
    mode: 'overview' as LowAltitudeMode,
    selectedEntity: null as EntitySelection | null,
    timestamp: Date.now(),
    layerVisibility: {
      aircraft: true,
      routes: true,
      zones: true,
      vertiports: true,
      districts: true,
      inspectionAreas: false,
      weather: false,
    },
    scenarioRunning: false,
    scenarioStep: -1,
    scenarioLabel: '自动演示',
    scenarioDescription: '演示数据 · 与真实飞行系统隔离',
  }),
  getters: {
    district: state => districtById(state.districtId),
    airspaceCapacity: state => state.zones.reduce((sum,zone)=>sum+zone.capacity,0),
    airborneCount: state => state.aircraft.filter(item => item.status === 'flying').length,
    flightsToday: state => 180 + districtById(state.districtId).seed % 640,
    airspaceUsage: state => Math.round((state.zones.reduce((sum, zone) => sum + zone.activeFlights, 0) / state.zones.reduce((sum,zone)=>sum+zone.capacity,0)) * 100),
    activeMissionCount: state => state.missions.filter(item => item.status === 'in-progress' || item.status === 'dispatched').length,
    unacknowledgedAlerts: state => state.alerts.filter(item => item.status === 'active').length,
    currentScenario: state => scenarioSteps[state.scenarioStep]?.label ?? '自动演示',
    routeColor: () => (id: string) => routeColors[id] ?? '#70b7ed',
  },
  actions: {
    selectDistrict(id:string) {
      if(id===this.districtId || !districts.some(d=>d.id===id))return
      const snapshot:DistrictSnapshot={aircraft:this.aircraft,routes:this.routes,zones:this.zones,vertiports:this.vertiports,missions:this.missions,alerts:this.alerts,emergency:this.emergency,eventLog:this.eventLog}
      this.districtSessions[this.districtId]=JSON.parse(JSON.stringify(snapshot))
      const next=this.districtSessions[id]??createDistrictSnapshot(districtById(id))
      this.scenarioRunning=false
      this.scenarioStep=-1
      this.scenarioLabel='自动演示'
      this.scenarioDescription='演示数据 · 与真实飞行系统隔离'
      this.selectedEntity=null
      Object.assign(this,JSON.parse(JSON.stringify(next)))
      this.districtId=id
      this.timestamp=Date.now()
    },
    selectMode(mode: LowAltitudeMode) {
      this.mode = mode
      Object.assign(this.layerVisibility, modeLayers[mode])
    },
    selectEntity(type: EntityKind, id: string) {
      this.selectedEntity = { type, id }
    },
    focusEntity(type: EntityKind, id: string) {
      this.selectEntity(type, id)
    },
    acknowledgeAlert(id: string) {
      const alert = this.alerts.find(item => item.id === id)
      if (!alert || alert.status !== 'active') return
      alert.status = 'acknowledged'
      this.eventLog.unshift({
        timestamp: Date.now(),
        type: '告警已确认',
        entityId: alert.entityId,
        payload: { label: alert.title },
      })
    },
    toggleLayer(key: keyof typeof this.layerVisibility) {
      this.layerVisibility[key] = !this.layerVisibility[key]
    },
    tick() {
      this.timestamp += 1000
    },
    playScenario() {
      if (this.scenarioRunning) {
        this.scenarioRunning = false
        this.scenarioLabel = '继续演示'
        return
      }
      if (this.scenarioStep >= scenarioSteps.length - 1) this.scenarioStep = -1
      this.scenarioRunning = true
      this.advanceScenario()
    },
    advanceScenario() {
      if (!this.scenarioRunning) return
      const nextStep = this.scenarioStep + 1
      if (nextStep >= scenarioSteps.length) {
        this.scenarioRunning = false
        this.scenarioLabel = '重新演示'
        this.scenarioDescription = '场景演示完成 · 所有控制均为模拟操作'
        return
      }
      this.scenarioStep = nextStep
      const step = scenarioSteps[nextStep]
      this.selectMode(step.mode)
      this.scenarioLabel = step.label
      this.scenarioDescription = `${step.description} · 演示数据`
      const timestamp = Date.now()
      if (nextStep === 0) {
        this.selectedEntity = { type: 'mission', id: 'MS-01' }
      } else if (nextStep === 1) {
        this.selectedEntity = { type: 'aircraft', id: 'UAV-07' }
        const alert = this.alerts.find(item => item.id === 'AL-01')
        if (alert) alert.status = 'active'
      } else if (nextStep === 2) {
        this.selectedEntity = { type: 'zone', id: 'AZ-01' }
      } else if (nextStep === 3) {
        const mission = this.missions.find(item => item.id === 'MS-06')
        const aircraft = this.aircraft.find(item => item.id === 'UAV-05')
        if (mission) {
          mission.status = 'dispatched'
          mission.progress = Math.max(mission.progress, 12)
        }
        if (aircraft) {
          aircraft.status = 'flying'
          aircraft.routeId = 'RT-08'
          aircraft.missionId = 'MS-06'
          // The scene joins the new route from the current pose without teleporting.
        }
        this.emergency.status = 'dispatched'
        this.selectedEntity = { type: 'aircraft', id: 'UAV-05' }
      } else {
        const mission = this.missions.find(item => item.id === 'MS-06')
        if (mission) {
          mission.status = 'complete'
          mission.progress = 100
        }
        this.emergency.status = 'closed'
        this.selectedEntity = { type: 'mission', id: 'MS-06' }
      }
      this.eventLog.unshift({
        timestamp,
        type: step.label,
        entityId: this.selectedEntity?.id ?? 'CITY',
        payload: { label: step.description },
      })
      this.eventLog = this.eventLog.slice(0, 8)
    },
  },
})
