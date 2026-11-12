import type {
  Aircraft,
  AirspaceZone,
  AlertEvent,
  EmergencyEvent,
  FlightMission,
  FlightRoute,
  Vertiport,
} from './types'

const routePoints: [number, number][][] = [
  [[-62, -31], [-42, -20], [-18, -10], [9, -5], [36, 3], [60, 16]],
  [[-55, 25], [-35, 23], [-15, 17], [8, 11], [30, 15], [52, 28]],
  [[-51, -9], [-32, -2], [-13, 5], [8, 4], [28, -7], [51, -18]],
  [[-38, 36], [-21, 25], [-3, 14], [16, 2], [35, -12], [49, -29]],
  [[-60, 8], [-40, 5], [-20, 1], [0, -3], [22, -12], [46, -22]],
  [[-47, -31], [-28, -22], [-8, -16], [13, -18], [35, -26], [57, -32]],
  [[-53, 16], [-33, 10], [-12, 3], [9, -5], [28, -2], [53, 7]],
  [[-42, 29], [-25, 21], [-8, 13], [12, 13], [33, 21], [57, 30]],
]

export const initialRoutes: FlightRoute[] = [
  { id: 'RT-01', name: '锦江河道巡检线', category: 'inspection', status: 'active', points: routePoints[0], duration: '28 min' },
  { id: 'RT-02', name: '高新园区巡查线', category: 'inspection', status: 'active', points: routePoints[1], duration: '34 min' },
  { id: 'RT-03', name: '三环交通巡检线', category: 'inspection', status: 'active', points: routePoints[2], duration: '22 min' },
  { id: 'RT-04', name: '医疗物资转运线', category: 'logistics', status: 'planned', points: routePoints[3], duration: '18 min' },
  { id: 'RT-05', name: '天府机场联络线', category: 'logistics', status: 'active', points: routePoints[4], duration: '31 min' },
  { id: 'RT-06', name: '公园绿地生态线', category: 'inspection', status: 'active', points: routePoints[5], duration: '26 min' },
  { id: 'RT-07', name: '城区训练航线', category: 'training', status: 'exception', points: routePoints[6], duration: '16 min' },
  { id: 'RT-08', name: '城市应急联动线', category: 'emergency', status: 'planned', points: routePoints[7], duration: '12 min' },
]

const aircraftPositions: [number, number][] = [
  [-42, -20], [-32, 2], [-20, 17], [-10, -11], [-2, 9], [9, -5], [19, 5],
  [28, -7], [38, 4], [47, 15], [-40, 27], [50, -19], [-52, -4], [-25, -27],
  [10, 28], [34, 29], [-58, 20], [60, -29],
]

export const initialAircraft: Aircraft[] = aircraftPositions.map(([x, z], index) => {
  const status = index < 12 ? 'flying' : index < 16 ? 'standby' : 'offline'
  const routeId = `RT-${String((index % 8) + 1).padStart(2, '0')}`
  return {
    id: `UAV-${String(index + 1).padStart(2, '0')}`,
    callsign: `蓉翼 ${String(index + 1).padStart(2, '0')}`,
    model: index % 3 === 0 ? '四旋翼 · 巡检型' : index % 3 === 1 ? '复合翼 · 长航时' : '多旋翼 · 载荷型',
    operator: ['成都低空运行中心', '锦江巡检队', '高新应急队'][index % 3],
    status,
    routeId,
    missionId: `MS-${String((index % 6) + 1).padStart(2, '0')}`,
    x,
    z,
    altitude: status === 'flying' ? 68 + (index % 5) * 12 : 0,
    speed: status === 'flying' ? 7.2 + (index % 6) * 1.1 : 0,
    battery: index === 11 ? 28 : Math.max(32, 96 - index * 3),
    signal: status === 'offline' ? 0 : 78 + (index * 7) % 21,
    heading: (index * 41) % 360,
    phase: (index * 0.11) % 1,
  }
})

export const initialZones: AirspaceZone[] = [
  { id: 'AZ-01', name: '天府广场临时空域', type: 'temporary', x: -5, z: 2, radius: 12, height: 22, floor: 0, ceiling: 120, activeFlights: 3, capacity: 8, validUntil: '18:30' },
  { id: 'AZ-02', name: '金融城限飞区', type: 'restricted', x: 19, z: -15, radius: 10, height: 19, floor: 0, ceiling: 90, activeFlights: 2, capacity: 4, validUntil: '持续生效' },
  { id: 'AZ-03', name: '北部枢纽禁飞区', type: 'prohibited', x: -35, z: 27, radius: 9, height: 25, floor: 0, ceiling: 180, activeFlights: 0, capacity: 0, validUntil: '持续生效' },
  { id: 'AZ-04', name: '锦江沿线开放空域', type: 'open', x: 3, z: -20, radius: 13, height: 15, floor: 0, ceiling: 150, activeFlights: 5, capacity: 12, validUntil: '持续生效' },
  { id: 'AZ-05', name: '高新南区开放空域', type: 'open', x: 38, z: 16, radius: 11, height: 16, floor: 0, ceiling: 120, activeFlights: 4, capacity: 10, validUntil: '持续生效' },
  { id: 'AZ-06', name: '东部训练临时区', type: 'temporary', x: 48, z: -14, radius: 9, height: 20, floor: 0, ceiling: 100, activeFlights: 1, capacity: 5, validUntil: '19:00' },
  { id: 'AZ-07', name: '西部山地限飞区', type: 'restricted', x: -49, z: -18, radius: 10, height: 18, floor: 0, ceiling: 100, activeFlights: 1, capacity: 3, validUntil: '持续生效' },
  { id: 'AZ-08', name: '机场净空保护区', type: 'prohibited', x: 56, z: 30, radius: 8, height: 28, floor: 0, ceiling: 240, activeFlights: 0, capacity: 0, validUntil: '持续生效' },
]

export const initialVertiports: Vertiport[] = [
  { id: 'VP-01', name: '天府广场综合起降点', kind: 'hub', x: -7, z: -2, availability: 4, capacity: 6 },
  { id: 'VP-02', name: '高新金融城机巢', kind: 'dock', x: 22, z: -19, availability: 3, capacity: 4 },
  { id: 'VP-03', name: '锦江东岸机巢', kind: 'dock', x: 8, z: -28, availability: 2, capacity: 4 },
  { id: 'VP-04', name: '北部应急备降点', kind: 'emergency', x: -45, z: 32, availability: 2, capacity: 3 },
  { id: 'VP-05', name: '西部公园起降点', kind: 'hub', x: -50, z: -29, availability: 3, capacity: 5 },
  { id: 'VP-06', name: '东部物流机巢', kind: 'dock', x: 52, z: -28, availability: 2, capacity: 4 },
]

export const initialMissions: FlightMission[] = [
  { id: 'MS-01', name: '锦江河道日常巡检', category: 'river', status: 'in-progress', routeId: 'RT-01', aircraftId: 'UAV-01', progress: 62, owner: '锦江巡检队' },
  { id: 'MS-02', name: '高新区道路巡查', category: 'traffic', status: 'in-progress', routeId: 'RT-03', aircraftId: 'UAV-04', progress: 48, owner: '高新运行组' },
  { id: 'MS-03', name: '园区设施巡检', category: 'park', status: 'queued', routeId: 'RT-02', aircraftId: 'UAV-07', progress: 0, owner: '园区保障组' },
  { id: 'MS-04', name: '绿道生态监测', category: 'ecology', status: 'in-progress', routeId: 'RT-06', aircraftId: 'UAV-08', progress: 81, owner: '生态巡检队' },
  { id: 'MS-05', name: '医疗物资联络演练', category: 'logistics', status: 'queued', routeId: 'RT-04', aircraftId: 'UAV-10', progress: 0, owner: '应急联络组' },
  { id: 'MS-06', name: '城区应急联动演示', category: 'emergency', status: 'queued', routeId: 'RT-08', aircraftId: 'UAV-05', progress: 0, owner: '城市应急中心' },
]

export const initialAlerts: AlertEvent[] = [
  { id: 'AL-01', title: '航线偏离预警', detail: 'UAV-07 距计划航线 86 m，正在回归确认', severity: 'warning', status: 'active', time: '14:21:36', entityKind: 'aircraft', entityId: 'UAV-07' },
  { id: 'AL-02', title: '低电量提示', detail: 'UAV-12 剩余电量 28%，建议返航', severity: 'warning', status: 'active', time: '14:19:08', entityKind: 'aircraft', entityId: 'UAV-12' },
  { id: 'AL-03', title: '通信延迟告警', detail: 'UAV-03 C2 链路时延 420 ms', severity: 'critical', status: 'active', time: '14:17:52', entityKind: 'aircraft', entityId: 'UAV-03' },
]

export const simulatedEmergency: EmergencyEvent = {
  id: 'EVT-SIM-01',
  title: '锦江东岸烟雾线索核查',
  location: '锦江东岸 · 模拟点位',
  status: 'monitoring',
  reportedAt: '14:24:10',
  isSimulated: true,
}
