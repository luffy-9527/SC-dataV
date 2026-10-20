<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { gsap } from 'gsap'

// 7大石油开采核心工序全要素定义
interface ProcessStage {
  id: string
  name: string
  shortCode: string
  desc: string
  sensors: string[]
  telemetry: { label: string; value: string; status: 'normal' | 'warn' | 'active' }[]
  cameraPos: [number, number, number]
  targetPos: [number, number, number]
}

const stages: ProcessStage[] = [
  {
    id: 'siting',
    name: '1. 定井勘测',
    shortCode: 'SURVEY',
    desc: '大漠戈壁高精度GNSS坐标标定、道路地表勘测与地基抗压检测',
    sensors: ['GNSS定位基站', '土壤抗剪测压计', '地基沉降光纤位移计'],
    telemetry: [
      { label: '靶心坐标偏差', value: '±0.02 m', status: 'normal' },
      { label: '沙漠地基强度', value: '420 kPa', status: 'normal' },
      { label: '地表沙坡坡度', value: '0.45°', status: 'normal' },
    ],
    cameraPos: [-75, 45, 90],
    targetPos: [-15, 6, 0],
  },
  {
    id: 'civil',
    name: '2. 基础搬装',
    shortCode: 'CIVIL & RIG',
    desc: '戈壁重型防渗基础浇筑、排管斜坡猫道就位与沙漠越野吊装搬迁',
    sensors: ['基座应变载荷传感器', '猫道角度倾度计', '起重力矩限制器'],
    telemetry: [
      { label: '基台承压载荷', value: '1,920 kN', status: 'normal' },
      { label: '猫道坡度水平', value: '18.2°', status: 'normal' },
      { label: '管架堆存数量', value: '156 根 (1,480m)', status: 'normal' },
    ],
    cameraPos: [-45, 34, 78],
    targetPos: [-15, 8, 25],
  },
  {
    id: 'derrick',
    name: '3. 井架泥浆',
    shortCode: 'DERRICK & MUD',
    desc: '四柱交叉格构钻塔就位、三缸泥浆泵房与多级固控净化联调',
    sensors: ['天车大绳拉力计', '高压管汇压力变送器', '振动筛振频传感'],
    telemetry: [
      { label: '高压泵排量', value: '48.5 L/s', status: 'normal' },
      { label: '立管循环压力', value: '24.2 MPa', status: 'normal' },
      { label: '泥浆固相含量', value: '3.8 %', status: 'normal' },
    ],
    cameraPos: [-48, 44, 76],
    targetPos: [-32, 18, 6],
  },
  {
    id: 'drilling',
    name: '4. 钻进作业',
    shortCode: 'DRILLING',
    desc: '沙漠深井高压泥浆冲洗破岩、转盘高速驱动与MWD随钻实时姿态探测',
    sensors: ['MWD随钻测井探针', '钻压(WOB)计', '顶驱扭矩传感', '泥浆比重计'],
    telemetry: [
      { label: '机械钻速(ROP)', value: '24.8 m/h', status: 'active' },
      { label: '实时进尺钻深', value: '3,852.4 m', status: 'active' },
      { label: '井下随钻倾角', value: '0.82° (优)', status: 'normal' },
    ],
    cameraPos: [28, 24, 62],
    targetPos: [-15, 10, 0],
  },
  {
    id: 'tripping',
    name: '5. 起下换钻',
    shortCode: 'TRIPPING',
    desc: '大钩提放悬重卸扣、二层台立柱排架、金刚石PDC钻头检修更换',
    sensors: ['大钩悬重负荷传感', '吊卡行程位置开关', '钻头磨耗激光仪'],
    telemetry: [
      { label: '大钩提放悬重', value: '1,280 kN', status: 'normal' },
      { label: '起下钻速度', value: '0.65 m/s', status: 'normal' },
      { label: 'PDC钻头磨耗', value: '8.5% (完好)', status: 'normal' },
    ],
    cameraPos: [-10, 38, 42],
    targetPos: [-15, 22, 0],
  },
  {
    id: 'casing',
    name: '6. 电测固井',
    shortCode: 'CASING & CMT',
    desc: '微电阻率电测测井、表层/技术套管阶梯下入与注水泥环固井',
    sensors: ['测井电缆张力计', '水泥车注灰高压流量计', '声幅胶结测井仪'],
    telemetry: [
      { label: '固井注水泥压', value: '19.4 MPa', status: 'active' },
      { label: '水泥浆返出密度', value: '1.92 g/cm³', status: 'normal' },
      { label: '水泥胶结指数', value: '0.90 (优质)', status: 'normal' },
    ],
    cameraPos: [-22, 34, 95],
    targetPos: [-42, 10, 48],
  },
  {
    id: 'completion',
    name: '7. 完井采油',
    shortCode: 'COMPLETION',
    desc: '采油树防喷试压投产、游梁抽油机提捞、沙漠油气集输管网外输',
    sensors: ['采油树井口油压', '抽油机示功图载荷传感', '管线电磁流量计', '储罐雷达液位'],
    telemetry: [
      { label: '日产原油稳产量', value: '1,428.6 t', status: 'normal' },
      { label: '抽油机冲程冲次', value: '3.8m / 4.5min⁻¹', status: 'normal' },
      { label: '储罐实时库容', value: '84.5 %', status: 'normal' },
    ],
    cameraPos: [125, 75, 155],
    targetPos: [0, 8, 0],
  },
]

const currentStageIndex = ref(6) // 默认进入采集设备核心运行工序 (7. 完井采油)
const containerRef = ref<HTMLDivElement | null>(null)
const isAutoRotating = ref(false)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let animFrameId: number | null = null

// 场景动态部件
let drillString: THREE.Group | null = null
let drillBit: THREE.Group | null = null
let travelingBlock: THREE.Group | null = null
let walkingBeam: THREE.Group | null = null
let crankGroup: THREE.Group | null = null
let polishedRod: THREE.Group | THREE.Mesh | null = null
let beaconMesh: THREE.Mesh | null = null
let flameParticles: THREE.Points | null = null
let drillSparksParticles: THREE.Points | null = null
let mudCirculationParticles: THREE.Points | null = null
let oilReservoirParticles: THREE.Points | null = null
let shakerScreenMesh: THREE.Mesh | null = null
let agitatorPaddles: THREE.Mesh[] = []
let pipelinePulses: THREE.Mesh[] = []
let radarScanRing: THREE.Mesh | null = null
let iotPulseRing: THREE.Mesh | null = null
let loggingProbeWave: THREE.Mesh | null = null
let sandDustParticles: THREE.Points | null = null
let pitmanArmLeft: THREE.Group | THREE.Mesh | null = null
let pitmanArmRight: THREE.Group | THREE.Mesh | null = null
let topDriveQuill: THREE.Mesh | null = null
let rotaryHoseMesh: THREE.Mesh | null = null
let mudPressureNeedle: THREE.Mesh | null = null
let mudSurfaces: THREE.Mesh[] = []
let dynamometerLed: THREE.Mesh | null = null
let rtuTxLed: THREE.Mesh | null = null
let rtuWaveRing: THREE.Mesh | null = null
let oilSeepageParticles: THREE.Points | null = null
let skyDomeMesh: THREE.Mesh | null = null
let subsurfaceSuckerRod: THREE.Group | null = null
let pumpPlungerMesh: THREE.Mesh | null = null
let travelingValveMesh: THREE.Mesh | null = null
let standingValveMesh: THREE.Mesh | null = null
let producedOilColumnMesh: THREE.Mesh | null = null
let producedOilBubbles: THREE.Points | null = null
let perforationJets: THREE.Mesh[] = []
let gasCapPlane: THREE.Mesh | null = null
let reservoirMicroStreamlines: THREE.LineSegments | null = null
let oilReservoirFluidMesh: THREE.Mesh | null = null
let windTurbineRotors: THREE.Group[] = []
let perforationMistPoints: THREE.Points | null = null
let oilWallTrickles: THREE.Mesh[] = []
let heaterSmokeParticles: THREE.Points | null = null
let sepOilLayerMesh: THREE.Mesh | null = null
let sepGasLayerMesh: THREE.Mesh | null = null
let heaterBurnerGlow: THREE.PointLight | null = null
let clickableBadges: THREE.Sprite[] = []

// 1#、2#、3# 抽油机多井动力学动画实例
interface PumpUnitAnimItem {
  id: string
  crank: THREE.Group
  beam: THREE.Group
  rod: THREE.Group | THREE.Mesh
  speed: number
  phaseOffset: number
  pitmanLeft?: THREE.Mesh | THREE.Group
  pitmanRight?: THREE.Mesh | THREE.Group
  led?: THREE.Mesh
}
const extraPumpUnits: PumpUnitAnimItem[] = []

// 地下剖面模式、红外热成像、ESD 紧急切断仿真、阀门状态
const isUndergroundView = ref(false)
const isThermalMode = ref(false)
const isEsdTriggered = ref(false)
const isWellValveOpen = ref(true)
const valveNotice = ref('')
let valveNoticeTimer: any = null

// 大漠天气光照系统
const weatherMode = ref<'dusk' | 'noon' | 'sandstorm' | 'night'>('dusk')
let hemiLightRef: THREE.HemisphereLight | null = null
let mainSunRef: THREE.DirectionalLight | null = null
let desertGoldRef: THREE.DirectionalLight | null = null
let skyRimRef: THREE.DirectionalLight | null = null

// 智能工业防爆泛光照明总线与火炬动态光源
interface SceneFloodlightItem {
  light: THREE.Light
  baseIntensity: number
  nightIntensity: number
  duskIntensity: number
  sandstormIntensity: number
  lensMat?: THREE.MeshBasicMaterial
}
const sceneFloodlights: SceneFloodlightItem[] = []
let flareLight: THREE.PointLight | null = null
let beaconLight: THREE.PointLight | null = null
let beaconMatRef: THREE.MeshBasicMaterial | null = null


// 故障注入测试与机组五维健康度
const activeFaultInjection = ref<string | null>(null)

// 智能清管器 PIG
let pigScraperMesh: THREE.Group | null = null
let pigLaserRing: THREE.Mesh | null = null

let terrainMeshRef: THREE.Mesh | null = null
let wellheadAlarmLight: THREE.PointLight | null = null
let wellheadEsbValveStem: THREE.Mesh | null = null
let interactiveValves: THREE.Mesh[] = []
const clickableEquipmentObjects: THREE.Object3D[] = []

// 全息地面选中光环 (Selection Halo Ring)
let selectionHaloGroup: THREE.Group | null = null
let selectionOuterRing: THREE.Mesh | null = null
let selectionInnerRing: THREE.Mesh | null = null

const thermalOriginalMats = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
const thermalMeshes: { mesh: THREE.Mesh; heatLevel: 'high' | 'med' | 'mid' }[] = []

// 采集设备 3D 数据孪生与交互特写
const selectedEquipment = ref<string | null>(null)
const dynamometerPoint = ref({ x: 45, y: 48, load: 86.4, disp: 1.9 })

// 抽油机五维健康度评估计算属性 (机械传动, 轴温负荷, 动密封度, 充满液面, 振动平稳)
const radarLabels = ['传动效能', '轴温负荷', '动密封度', '充满液面', '振动平稳']
const currentRadarScores = computed(() => {
  const base = equipmentPresets[selectedEquipment.value || '']?.radar || [90, 88, 92, 95, 90]
  if (activeFaultInjection.value === 'slip') return [42, 80, 88, 91, 52]
  if (activeFaultInjection.value === 'vib') return [84, 68, 86, 88, 36]
  return base
})

const radarOverallScore = computed(() => {
  const sum = currentRadarScores.value.reduce((acc, val) => acc + val, 0)
  return Math.round(sum / 5)
})

const radarPolygonPoints = computed(() => {
  const scores = currentRadarScores.value
  const cx = 75, cy = 65, maxR = 46
  return scores.map((s, idx) => {
    const a = (idx * Math.PI * 2) / 5 - Math.PI / 2
    const r = (s / 100) * maxR
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
})

const radarLabelPoints = computed(() => {
  const cx = 75, cy = 65, textR = 59
  return radarLabels.map((lbl, idx) => {
    const a = (idx * Math.PI * 2) / 5 - Math.PI / 2
    return {
      name: lbl,
      x: (cx + Math.cos(a) * textR).toFixed(1),
      y: (cy + Math.sin(a) * textR + 3).toFixed(1),
    }
  })
})

interface EquipmentPreset {
  id: string
  name: string
  shortLabel: string
  cameraPos: [number, number, number]
  targetPos: [number, number, number]
  title: string
  status: string
  dynType?: 'normal' | 'leak' | 'gas-lock'
  radar?: [number, number, number, number, number] // 五维健康度: 机械传动, 轴温负荷, 密封度, 动液面, 振动平稳
  metrics: { label: string; value: string; unit?: string; status?: string }[]
}

const equipmentPresets: Record<string, EquipmentPreset> = {
  'pump-jack-1': {
    id: 'pump-jack-1',
    name: '1# 游梁式抽油机 (漏失预警)',
    shortLabel: '1#机(漏失)',
    cameraPos: [66, 22, 54],
    targetPos: [42, 10, 30],
    title: '1# 游梁式抽油机 (游动阀漏失工况)',
    status: '轻度异常 · 产液降低',
    dynType: 'leak',
    radar: [72, 85, 48, 86, 78],
    metrics: [
      { label: '光杆最大载荷', value: '72.4', unit: 'kN', status: 'warning' },
      { label: '光杆最小载荷', value: '34.8', unit: 'kN', status: 'warning' },
      { label: '抽油机冲程', value: '3.8', unit: 'm', status: 'normal' },
      { label: '抽油机冲次', value: '4.2', unit: 'min⁻¹', status: 'normal' },
      { label: '泵充满系数', value: '68.5', unit: '%', status: 'warning' },
      { label: '机组日产油量', value: '24.2', unit: 't/d', status: 'warning' },
      { label: '阀门漏失率', value: '18.4', unit: '%', status: 'warning' },
      { label: '工况诊断', value: '游动阀磨损漏失 · 功图畸变', status: 'warning' },
    ],
  },
  'pump-jack-2': {
    id: 'pump-jack-2',
    name: '2# 游梁式抽油机 (气锁供液不足)',
    shortLabel: '2#机(气锁)',
    cameraPos: [66, 22, 2],
    targetPos: [42, 10, -22],
    title: '2# 游梁式抽油机 (供液不足/气锁工况)',
    status: '供液欠注 · 撞击液面',
    dynType: 'gas-lock',
    radar: [82, 86, 88, 42, 65],
    metrics: [
      { label: '光杆最大载荷', value: '78.6', unit: 'kN', status: 'normal' },
      { label: '光杆最小载荷', value: '19.4', unit: 'kN', status: 'warning' },
      { label: '抽油机冲程', value: '3.8', unit: 'm', status: 'normal' },
      { label: '抽油机冲次', value: '4.8', unit: 'min⁻¹', status: 'normal' },
      { label: '动液面深度', value: '1,890.0', unit: 'm', status: 'warning' },
      { label: '泵充满系数', value: '51.8', unit: '%', status: 'warning' },
      { label: '机组日产油量', value: '18.5', unit: 't/d', status: 'warning' },
      { label: '工况诊断', value: '严重供液不足 · 伴生气气锁', status: 'warning' },
    ],
  },
  'pumping-unit': {
    id: 'pumping-unit',
    name: '3# 游梁式抽油机 (工况良好)',
    shortLabel: '3#机(饱满)',
    cameraPos: [66, 22, 28],
    targetPos: [42, 10, 4],
    title: '3# 游梁式抽油机 (标准饱满工况)',
    status: '稳产运行中',
    dynType: 'normal',
    radar: [95, 88, 92, 96, 91],
    metrics: [
      { label: '光杆最大载荷', value: '86.4', unit: 'kN', status: 'normal' },
      { label: '光杆最小载荷', value: '28.2', unit: 'kN', status: 'normal' },
      { label: '抽油机冲程', value: '3.8', unit: 'm', status: 'normal' },
      { label: '抽油机冲次', value: '4.5', unit: 'min⁻¹', status: 'normal' },
      { label: '动液面深度', value: '1,248.5', unit: 'm', status: 'normal' },
      { label: '泵充满系数', value: '91.2', unit: '%', status: 'normal' },
      { label: '机组日产油量', value: '42.8', unit: 't/d', status: 'normal' },
      { label: '工况诊断', value: '充满良好 · 功图饱满', status: 'success' },
    ],
  },
  'xTree': {
    id: 'xTree',
    name: '井口高压智能采油树',
    shortLabel: '采油树',
    cameraPos: [74, 11, 16],
    targetPos: [60.2, 4.5, 4.0],
    title: 'API 6A 井口高压智能采油树总成',
    status: '井口工况稳定',
    radar: [92, 85, 96, 90, 94],
    metrics: [
      { label: '油压 (PT-101)', value: '14.82', unit: 'MPa', status: 'normal' },
      { label: '套压 (PT-102)', value: '4.25', unit: 'MPa', status: 'normal' },
      { label: '井口油温 (TT-101)', value: '68.5', unit: '℃', status: 'normal' },
      { label: 'ESD 紧急切断阀', value: '100% 全开 (正常)', status: 'success' },
      { label: '盘根动密封微渗', value: '0.02', unit: 'L/h', status: 'normal' },
      { label: '伴生气回收流量', value: '1,860', unit: 'Nm³/d', status: 'normal' },
    ],
  },
  'separator': {
    id: 'separator',
    name: '卧式三相生产分离器',
    shortLabel: '三相分离器',
    cameraPos: [80, 11, 3],
    targetPos: [66.0, 3.5, -9.5],
    title: '卧式三相油气水生产分离计量撬块',
    status: '高效分离中',
    metrics: [
      { label: '容器运行压力', value: '2.45', unit: 'MPa', status: 'normal' },
      { label: '油水界面高度', value: '64.2', unit: '%', status: 'normal' },
      { label: '科氏力质量流量', value: '1,428.6', unit: 't/d', status: 'normal' },
      { label: '气相瞬时流量', value: '42,800', unit: 'Nm³/d', status: 'normal' },
      { label: '原油含水率', value: '18.4', unit: '%', status: 'normal' },
      { label: '安全泄放阀状态', value: '正常微压平衡', status: 'success' },
    ],
  },
  'heater': {
    id: 'heater',
    name: '原油高压水套加热炉',
    shortLabel: '水套加热炉',
    cameraPos: [68, 11, 3],
    targetPos: [54.0, 3.2, -10.0],
    title: '原油高压节能隔热水套加热炉撬块',
    status: '智能控温燃烧',
    metrics: [
      { label: '水套浴温', value: '82.5', unit: '℃', status: 'normal' },
      { label: '原油进/出口温', value: '42.0 / 65.0', unit: '℃', status: 'normal' },
      { label: '燃料气供气压', value: '0.35', unit: 'MPa', status: 'normal' },
      { label: '烟囱排烟温度', value: '148.0', unit: '℃', status: 'normal' },
      { label: '燃烧热效率', value: '91.8', unit: '%', status: 'success' },
      { label: '双联电磁切断阀', value: '安全联锁正常', status: 'success' },
    ],
  },
  'loading-rack': {
    id: 'loading-rack',
    name: '原油外输泵房与装车栈桥',
    shortLabel: '外输装车',
    cameraPos: [-10, 16, -42],
    targetPos: [-32.0, 3.5, -62.0],
    title: '储运区外输增压多级泵与发油鹤管装车栈桥',
    status: '密闭安全发运中',
    metrics: [
      { label: '外输多级泵扬程', value: '180.0', unit: 'm', status: 'normal' },
      { label: '外输瞬时流量', value: '85.0', unit: 'm³/h', status: 'normal' },
      { label: '鹤管装车流速', value: '45.0', unit: 'm³/h', status: 'normal' },
      { label: '槽车当前装载率', value: '76.5', unit: '%', status: 'normal' },
      { label: '防溢防静电联锁', value: '🟢 安全回路导通', status: 'success' },
      { label: '外输管网回压', value: '1.85', unit: 'MPa', status: 'normal' },
    ],
  },
  'long-pipeline': {
    id: 'long-pipeline',
    name: '荒漠长输保温输油管廊与 PIG 清管站',
    shortLabel: '长输管网',
    cameraPos: [-88, 18, -20],
    targetPos: [-112, 3.5, -44],
    title: '荒漠架空长输保温输油管廊与智能 PIG 清管内检测站',
    status: '智能巡检中 · 运行平稳',
    metrics: [
      { label: '管线设计壁厚', value: '14.5', unit: 'mm', status: 'normal' },
      { label: 'PIG 超声测厚', value: '14.2', unit: 'mm', status: 'normal' },
      { label: '管壁减薄余量', value: '0.3', unit: 'mm', status: 'normal' },
      { label: '清管器行进速度', value: '2.4', unit: 'm/s', status: 'normal' },
      { label: '智能探针检测点', value: '128 个/圈', status: 'normal' },
      { label: '管网安全评级', value: 'API Class A (安全)', status: 'success' },
    ],
  },
}

function setWeatherMode(mode: 'dusk' | 'noon' | 'sandstorm' | 'night') {
  weatherMode.value = mode
  if (!scene || !mainSunRef) return

  if (mode === 'noon') {
    gsap.to(mainSunRef.color, { r: 1.0, g: 0.98, b: 0.94, duration: 1.0 })
    gsap.to(mainSunRef, { intensity: 6.2, duration: 1.0 })
    if (hemiLightRef) {
      gsap.to(hemiLightRef.color, { r: 0.65, g: 0.77, b: 0.89, duration: 1.0 })
      gsap.to(hemiLightRef.groundColor, { r: 0.83, g: 0.63, b: 0.41, duration: 1.0 })
      gsap.to(hemiLightRef, { intensity: 4.5, duration: 1.0 })
    }
    if (desertGoldRef) gsap.to(desertGoldRef, { intensity: 3.6, duration: 1.0 })
    if (skyRimRef) gsap.to(skyRimRef, { intensity: 2.8, duration: 1.0 })
    if (skyDomeMesh?.material) {
      gsap.to((skyDomeMesh.material as THREE.MeshBasicMaterial).color, { r: 1.15, g: 1.1, b: 1.0, duration: 1.0 })
    }
    gsap.to(scene.background as THREE.Color, { r: 0.72, g: 0.82, b: 0.92, duration: 1.0 })
    if (scene.fog) {
      gsap.to(scene.fog, { density: 0.0003, duration: 1.0 })
      gsap.to((scene.fog as THREE.FogExp2).color, { r: 0.78, g: 0.85, b: 0.92, duration: 1.0 })
    }
    showValveNotice('☀️ 已切换至【大漠晴朗正午】光照视角')
  } else if (mode === 'dusk') {
    gsap.to(mainSunRef.color, { r: 1.0, g: 0.65, b: 0.35, duration: 1.0 })
    gsap.to(mainSunRef, { intensity: 5.5, duration: 1.0 })
    if (hemiLightRef) {
      gsap.to(hemiLightRef.color, { r: 0.45, g: 0.45, b: 0.85, duration: 1.0 })
      gsap.to(hemiLightRef.groundColor, { r: 0.85, g: 0.47, b: 0.15, duration: 1.0 })
      gsap.to(hemiLightRef, { intensity: 3.5, duration: 1.0 })
    }
    if (desertGoldRef) gsap.to(desertGoldRef, { intensity: 3.2, duration: 1.0 })
    if (skyRimRef) gsap.to(skyRimRef, { intensity: 2.2, duration: 1.0 })
    if (skyDomeMesh?.material) {
      gsap.to((skyDomeMesh.material as THREE.MeshBasicMaterial).color, { r: 1.0, g: 0.95, b: 0.9, duration: 1.0 })
    }
    gsap.to(scene.background as THREE.Color, { r: 0.75, g: 0.65, b: 0.54, duration: 1.0 })
    if (scene.fog) {
      gsap.to(scene.fog, { density: 0.00065, duration: 1.0 })
      gsap.to((scene.fog as THREE.FogExp2).color, { r: 0.77, g: 0.67, b: 0.56, duration: 1.0 })
    }
    showValveNotice('🌅 已切换至【大漠夕阳晚霞】暮色视角')
  } else if (mode === 'sandstorm') {
    gsap.to(mainSunRef.color, { r: 0.88, g: 0.62, b: 0.25, duration: 1.0 })
    gsap.to(mainSunRef, { intensity: 2.2, duration: 1.0 })
    if (hemiLightRef) {
      gsap.to(hemiLightRef.color, { r: 0.71, g: 0.48, b: 0.18, duration: 1.0 })
      gsap.to(hemiLightRef.groundColor, { r: 0.47, g: 0.21, b: 0.06, duration: 1.0 })
      gsap.to(hemiLightRef, { intensity: 2.2, duration: 1.0 })
    }
    if (desertGoldRef) gsap.to(desertGoldRef, { intensity: 1.8, duration: 1.0 })
    if (skyRimRef) gsap.to(skyRimRef, { intensity: 1.2, duration: 1.0 })
    if (skyDomeMesh?.material) {
      gsap.to((skyDomeMesh.material as THREE.MeshBasicMaterial).color, { r: 0.85, g: 0.65, b: 0.35, duration: 1.0 })
    }
    gsap.to(scene.background as THREE.Color, { r: 0.72, g: 0.52, b: 0.28, duration: 1.0 })
    if (scene.fog) {
      gsap.to(scene.fog, { density: 0.0048, duration: 1.0 })
      gsap.to((scene.fog as THREE.FogExp2).color, { r: 0.75, g: 0.55, b: 0.3, duration: 1.0 })
    }
    showValveNotice('🌪️ 已切换至【荒漠扬沙风暴】极端气象模拟')
  } else if (mode === 'night') {
    gsap.to(mainSunRef.color, { r: 0.08, g: 0.14, b: 0.28, duration: 1.0 })
    gsap.to(mainSunRef, { intensity: 0.25, duration: 1.0 })
    if (hemiLightRef) {
      gsap.to(hemiLightRef.color, { r: 0.06, g: 0.1, b: 0.18, duration: 1.0 })
      gsap.to(hemiLightRef.groundColor, { r: 0.02, g: 0.04, b: 0.08, duration: 1.0 })
      gsap.to(hemiLightRef, { intensity: 0.45, duration: 1.0 })
    }
    if (desertGoldRef) gsap.to(desertGoldRef, { intensity: 0.2, duration: 1.0 })
    if (skyRimRef) gsap.to(skyRimRef, { intensity: 0.25, duration: 1.0 })
    if (skyDomeMesh?.material) {
      gsap.to((skyDomeMesh.material as THREE.MeshBasicMaterial).color, { r: 0.12, g: 0.16, b: 0.28, duration: 1.0 })
    }
    gsap.to(scene.background as THREE.Color, { r: 0.02, g: 0.04, b: 0.08, duration: 1.0 })
    if (scene.fog) {
      gsap.to(scene.fog, { density: 0.0012, duration: 1.0 })
      gsap.to((scene.fog as THREE.FogExp2).color, { r: 0.03, g: 0.06, b: 0.12, duration: 1.0 })
    }
    showValveNotice('🌌 已切换至【极夜探照夜视】防爆泛光照明模式')
  }

  // 同步平滑驱动全场防爆投光灯总线 (高杆灯塔、天车站大聚光、钻台防爆灯、猴台灯、铭牌洗墙灯、储罐发运灯)
  sceneFloodlights.forEach(item => {
    let targetIntensity = item.baseIntensity
    if (mode === 'night') {
      targetIntensity = item.nightIntensity
    } else if (mode === 'dusk') {
      targetIntensity = item.duskIntensity
    } else if (mode === 'sandstorm') {
      targetIntensity = item.sandstormIntensity
    }
    gsap.to(item.light, { intensity: targetIntensity, duration: 1.2, ease: 'power2.out' })

    if (item.lensMat) {
      if (mode === 'night') {
        gsap.to(item.lensMat.color, { r: 1.0, g: 0.96, b: 0.88, duration: 1.0 })
      } else if (mode === 'dusk') {
        gsap.to(item.lensMat.color, { r: 1.0, g: 0.9, b: 0.75, duration: 1.0 })
      } else if (mode === 'sandstorm') {
        gsap.to(item.lensMat.color, { r: 1.0, g: 0.82, b: 0.5, duration: 1.0 })
      } else {
        gsap.to(item.lensMat.color, { r: 0.55, g: 0.55, b: 0.55, duration: 1.0 })
      }
    }
  })
}


function injectFault(type: string) {
  if (activeFaultInjection.value === type) {
    activeFaultInjection.value = null
    showValveNotice('已恢复正常状态，抽油机组恢复额定稳态运行')
  } else {
    activeFaultInjection.value = type
    if (type === 'slip') {
      showValveNotice('⚡ 已注入【皮带松动打滑故障】：冲次下降至 2.1 min⁻¹，五维健康度受损，已派发紧固工单！')
    } else if (type === 'vib') {
      showValveNotice('⚡ 已注入【曲柄销异常振动故障】：振动值飙升至 6.8 mm/s，触发声光告警！')
    }
  }
}

function focusEquipment(id: string) {
  selectedEquipment.value = id
  const targetConfig = equipmentPresets[id]
  if (!targetConfig || !camera || !controls) return

  // 联动更新全息地面选中指示光环
  if (selectionHaloGroup) {
    const [tx, , tz] = targetConfig.targetPos
    let ringScale = 1.0
    if (['pumping-unit', 'pump-jack-1', 'pump-jack-2'].includes(id)) {
      ringScale = 1.35
    } else if (id === 'separator' || id === 'heater') {
      ringScale = 1.15
    } else if (id === 'loading-rack' || id === 'long-pipeline') {
      ringScale = 1.6
    } else if (id === 'xTree') {
      ringScale = 0.85
    }
    selectionHaloGroup.position.set(tx, 0.12, tz)
    gsap.killTweensOf(selectionHaloGroup.scale)
    gsap.to(selectionHaloGroup.scale, {
      x: ringScale,
      y: ringScale,
      z: ringScale,
      duration: 0.7,
      ease: 'back.out(1.6)',
    })
  }

  gsap.to(camera.position, {
    x: targetConfig.cameraPos[0],
    y: targetConfig.cameraPos[1],
    z: targetConfig.cameraPos[2],
    duration: 1.6,
    ease: 'power3.inOut',
  })

  gsap.to(controls.target, {
    x: targetConfig.targetPos[0],
    y: targetConfig.targetPos[1],
    z: targetConfig.targetPos[2],
    duration: 1.6,
    ease: 'power3.inOut',
  })
}

function focusOilHarvestingCloseup() {
  focusEquipment('pumping-unit')
  showValveNotice('🎯 已锁定【采油核心机组】高清工业特写视角')
}

function resetEquipmentFocus() {
  selectedEquipment.value = null
  if (selectionHaloGroup) {
    gsap.killTweensOf(selectionHaloGroup.scale)
    gsap.to(selectionHaloGroup.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 0.4,
      ease: 'power2.in',
    })
  }
  if (isUndergroundView.value) {
    toggleUndergroundView()
    return
  }
  selectStage(currentStageIndex.value)
}

function toggleUndergroundView() {
  isUndergroundView.value = !isUndergroundView.value
  if (!camera || !controls) return
  if (isUndergroundView.value) {
    selectedEquipment.value = null
    gsap.to(camera.position, { x: 38, y: -26, z: 46, duration: 1.8, ease: 'power3.inOut' })
    gsap.to(controls.target, { x: 12, y: -38, z: 0, duration: 1.8, ease: 'power3.inOut' })
    if (terrainMeshRef) {
      const mat = terrainMeshRef.material as THREE.MeshStandardMaterial
      mat.transparent = true
      mat.opacity = 0.24
      mat.needsUpdate = true
    }
  } else {
    if (terrainMeshRef) {
      const mat = terrainMeshRef.material as THREE.MeshStandardMaterial
      mat.transparent = false
      mat.opacity = 1.0
      mat.needsUpdate = true
    }
    selectStage(currentStageIndex.value)
  }
}

function toggleThermalMode() {
  isThermalMode.value = !isThermalMode.value
  const heatHighMat = new THREE.MeshBasicMaterial({ color: 0xef4444 })
  const heatMedMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  const heatMidMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff })

  thermalMeshes.forEach(item => {
    if (isThermalMode.value) {
      if (!thermalOriginalMats.has(item.mesh)) {
        thermalOriginalMats.set(item.mesh, item.mesh.material)
      }
      if (item.heatLevel === 'high') item.mesh.material = heatHighMat
      else if (item.heatLevel === 'med') item.mesh.material = heatMedMat
      else item.mesh.material = heatMidMat
    } else {
      const orig = thermalOriginalMats.get(item.mesh)
      if (orig) item.mesh.material = orig
    }
  })
}

function triggerEsdSimulation() {
  isEsdTriggered.value = !isEsdTriggered.value
  if (isEsdTriggered.value) {
    if (wellheadEsbValveStem) {
      gsap.to(wellheadEsbValveStem.position, { y: 2.1, duration: 0.35, ease: 'power2.in' })
    }
    showValveNotice('【ESD 紧急关断系统动作】采油树 PT-101 监测超压 (28.6MPa)，进站安全切断阀已毫秒级自闭关断！')
  } else {
    if (wellheadEsbValveStem) {
      gsap.to(wellheadEsbValveStem.position, { y: 2.6, duration: 0.8, ease: 'power2.out' })
    }
    showValveNotice('采油树 ESD 系统已复位，恢复开井产流')
  }
}

function toggleWellValve() {
  isWellValveOpen.value = !isWellValveOpen.value
  interactiveValves.forEach(v => {
    gsap.to(v.rotation, { z: v.rotation.z + Math.PI / 2, duration: 0.5 })
  })
  showValveNotice(isWellValveOpen.value ? '采油树生产主翼阀已开启 · 恢复产流' : '采油树生产主翼阀已关断 · 产线安全隔离')
}

function showValveNotice(msg: string) {
  valveNotice.value = msg
  if (valveNoticeTimer) clearTimeout(valveNoticeTimer)
  valveNoticeTimer = setTimeout(() => {
    valveNotice.value = ''
  }, 4500)
}

let pointerDownPos = { x: 0, y: 0 }

function onCanvasPointerDown(event: MouseEvent) {
  pointerDownPos = { x: event.clientX, y: event.clientY }
}

function onCanvasClick(event: MouseEvent) {
  if (!containerRef.value || !camera) return
  const dx = event.clientX - pointerDownPos.x
  const dy = event.clientY - pointerDownPos.y
  if (Math.hypot(dx, dy) > 8) {
    // 用户处于拖拽旋转/平移镜头状态，忽略非纯点击事件
    return
  }

  const rect = containerRef.value.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  // 1. 优先判定阀门手轮点击交互
  if (interactiveValves.length > 0) {
    const valveHits = raycaster.intersectObjects(interactiveValves, true)
    if (valveHits.length > 0) {
      toggleWellValve()
      return
    }
  }

  // 2. 判定设备全息标签点击
  const badgeHits = raycaster.intersectObjects(clickableBadges, false)
  if (badgeHits.length > 0) {
    const hit = badgeHits[0].object
    const devKey = hit.userData?.deviceKey
    if (devKey && equipmentPresets[devKey]) {
      focusEquipment(devKey)
      return
    }
  }

  // 3. 判定 3D 实体模型直接点击交互 (直接点抽油机、采油树、分离器等唤起对应数字孪生卡片)
  if (clickableEquipmentObjects.length > 0) {
    const modelHits = raycaster.intersectObjects(clickableEquipmentObjects, true)
    if (modelHits.length > 0) {
      for (const h of modelHits) {
        let cur: THREE.Object3D | null = h.object
        let isPad = false
        while (cur) {
          if (cur.userData?.isGroundPad) {
            isPad = true
            break
          }
          if (cur.userData?.deviceKey) break
          cur = cur.parent
        }
        if (isPad) continue
        const devKey = cur?.userData?.deviceKey
        if (devKey && equipmentPresets[devKey]) {
          focusEquipment(devKey)
          return
        }
      }
    }
  }

  // 4. 若当前处于设备聚焦状态，且用户点击了地面空白处/非设备区域，退出聚焦回到当前工序总览
  if (selectedEquipment.value) {
    resetEquipmentFocus()
  }
}

function onCanvasPointerMove(event: MouseEvent) {
  if (!containerRef.value || !camera) return
  const rect = containerRef.value.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  const hits = raycaster.intersectObjects(
    [...clickableBadges, ...clickableEquipmentObjects, ...interactiveValves],
    true
  )
  let hasValidInteractive = false
  if (hits.length > 0) {
    for (const h of hits) {
      if (h.object.userData?.isValve) {
        hasValidInteractive = true
        break
      }
      let cur: THREE.Object3D | null = h.object
      let isPad = false
      while (cur) {
        if (cur.userData?.isGroundPad) {
          isPad = true
          break
        }
        if (cur.userData?.deviceKey) break
        cur = cur.parent
      }
      if (!isPad && cur?.userData?.deviceKey) {
        hasValidInteractive = true
        break
      }
    }
  }
  containerRef.value.style.cursor = hasValidInteractive ? 'pointer' : 'default'
}

const clock = new THREE.Clock()

function initScene() {
  if (!containerRef.value) return
  const width = containerRef.value.clientWidth || 1920
  const height = containerRef.value.clientHeight || 1080

  // 1. 场景与真实大漠白昼暮霭暖金天幕背景 (精确复刻图二图三深地工程实景)
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xbfa78a) // 大漠苍茫沙尘暖金天际
  scene.fog = new THREE.FogExp2(0xc4ab8e, 0.00065) // 连绵沙丘漫射大气轻雾

  // 2. 摄像机
  camera = new THREE.PerspectiveCamera(40, width / height, 1, 3500)
  camera.position.set(130, 72, 165)

  // 3. 渲染器 (绝对防止任何面内共面深度冲突与痤疮闪烁)
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    logarithmicDepthBuffer: true, // 开启对数深度缓冲，彻底根除远近景所有物体的 Z-Fighting 闪烁！
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.85
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxPolarAngle = Math.PI / 2 + 0.16
  controls.minDistance = 25
  controls.maxDistance = 650
  controls.target.set(0, 8, 0)

  // 4. 沙漠油田全景光照
  setupDesertLighting()

  // 5. 远景浩瀚连绵新月形流动沙丘海 (复刻图二塔克拉玛干沙海)
  buildDesertDunesAndEnvironment()

  // 6. 井场地面、沥青公路、加固防渗混凝土基台
  buildDesertGroundAndInfrastructure()

  // 7. 地下阶梯套管立体地质剖面 (第四系风成砂层/红层泥岩/海相富油砂岩/变质基岩)
  buildDesertStratumAndWellbore()

  // 8. 完整格构钻塔 (万米深地大国重器红白蓝醒目涂装、天车立根台、顶驱)
  buildDerrickAssembly()

  // 9. 井前立式高压泥浆储罐群与除砂储气立罐 (复刻图三井前5座立式灰色储罐)
  buildVerticalAccumulatorTanks()

  // 10. 井场周边大型野外集装箱活动板房营地阵列 (复刻图二图三U型营房群)
  buildModularContainerCamp()

  // 11. 井场大门经典红色标语牌网格刚架 (复刻图三“进军深地挺民族脊梁”等大字标语)
  buildIconicSloganBillboards()

  // 12. 钻具套管排管架与成排管束堆场 (复刻图三入场道两侧钻杆堆场)
  buildHeavyPipeStorageYards()

  // 13. 泥浆循环固控系统 (三联沉淀泥浆池、除砂除泥旋流器组、高频振动筛、高压泥浆泵房)
  buildMudSystem()

  // 14. 现场动力发电机房与BOP防喷器液控房 (Koomey Unit)
  buildPowerAndBOPControl()

  // 15. 特种工程车组 (固井水泥车、测井电缆车、换钻头检测台、重型越野轮胎吊起重机)
  buildSpecialFleet()

  // 16. 游梁式抽油机 (磕头机四连杆动力学)
  buildPumpingUnit()

  // 17. 储罐区与流光管网、火炬塔
  buildStorageAndPipelines()

  // 18. 工业 5G IoT 物联网通信微塔
  buildIoTMast()

  // 19. 3D 全息感知测点数据标签
  buildTelemetryBadges()

  // 20. 防爆高杆泛光照明塔机组
  buildFloodlightTowers()

  // 22. 荒漠长输 PIG 清管内检测站
  buildPigScraperStation()

  // 23. 全息地面选中指示光环
  buildSelectionHalo()

  const st0 = stages[currentStageIndex.value]
  if (st0) {
    camera.position.set(st0.cameraPos[0], st0.cameraPos[1], st0.cameraPos[2])
    controls.target.set(st0.targetPos[0], st0.targetPos[1], st0.targetPos[2])
    controls.update()
  }

  window.addEventListener('resize', handleResize)
  setWeatherMode(weatherMode.value)
  tick()
}

// -------------------------------------------------------------
// 全息地面选中光环系统 (Holographic Ground Selection Halo)
// -------------------------------------------------------------
function buildSelectionHalo() {
  if (!scene) return
  selectionHaloGroup = new THREE.Group()
  selectionHaloGroup.position.set(0, 0.12, 0)
  selectionHaloGroup.scale.set(0.001, 0.001, 0.001)

  // 1. 外层发光细环 (Outer Cyan Glow Ring)
  const outerGeo = new THREE.RingGeometry(11.2, 11.6, 64)
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  selectionOuterRing = new THREE.Mesh(outerGeo, outerMat)
  selectionOuterRing.rotation.x = -Math.PI / 2
  selectionHaloGroup.add(selectionOuterRing)

  // 2. 内层刻度虚线环 (Inner Segmented Ring)
  const innerGeo = new THREE.RingGeometry(8.6, 9.2, 32)
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  selectionInnerRing = new THREE.Mesh(innerGeo, innerMat)
  selectionInnerRing.rotation.x = -Math.PI / 2
  selectionHaloGroup.add(selectionInnerRing)

  // 3. 4 个高科技定位角标与十字瞄准刻度 (Targeting Corner Brackets & Crosshairs)
  const bracketMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2
    // 径向十字短线
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.4), bracketMat)
    tick.rotation.x = -Math.PI / 2
    tick.rotation.z = angle
    tick.position.set(Math.cos(angle) * 11.45, 0.01, Math.sin(angle) * 11.45)
    selectionHaloGroup.add(tick)

    // 瞄准角标
    const corner = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.35), bracketMat)
    corner.rotation.x = -Math.PI / 2
    corner.rotation.z = angle + Math.PI / 4
    corner.position.set(Math.cos(angle + Math.PI / 4) * 10.2, 0.01, Math.sin(angle + Math.PI / 4) * 10.2)
    selectionHaloGroup.add(corner)
  }

  // 4. 地面柔光高亮投影圆盘 (Subtle Ground Projector Glow Disk)
  const discGeo = new THREE.CircleGeometry(11.2, 48)
  const discMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const disc = new THREE.Mesh(discGeo, discMat)
  disc.rotation.x = -Math.PI / 2
  selectionHaloGroup.add(disc)

  // 5. 垂直微波全息聚束圆筒 (Vertical Hologram Light Beam Cylinder)
  const cylGeo = new THREE.CylinderGeometry(11.2, 11.2, 3.2, 48, 1, true)
  const cylMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const selectionVerticalPillar = new THREE.Mesh(cylGeo, cylMat)
  selectionVerticalPillar.position.y = 1.6
  selectionHaloGroup.add(selectionVerticalPillar)

  scene.add(selectionHaloGroup)
}

// -------------------------------------------------------------
// 沙漠油田全景光照：强泛光 + 大漠夕照金光 + 科技清冷轮廓光
// -------------------------------------------------------------
function setupDesertLighting() {
  if (!scene) return

  // 1. 半球天光 (天际清朗浅灰蓝 + 沙漠大地暖金暖沙)
  const hemi = new THREE.HemisphereLight(0xa5c4e2, 0xd4a068, 4.5)
  hemi.position.set(0, 240, 0)
  hemiLightRef = hemi
  scene.add(hemi)

  // 2. 主日光 (强劲沙漠日光金辉，照射沙丘与钻井设备)
  const mainSun = new THREE.DirectionalLight(0xfff7e8, 5.5)
  mainSun.position.set(160, 230, 110)
  mainSun.castShadow = true
  mainSun.shadow.mapSize.width = 2048
  mainSun.shadow.mapSize.height = 2048
  mainSun.shadow.camera.near = 20
  mainSun.shadow.camera.far = 650
  const d = 160
  mainSun.shadow.camera.left = -d
  mainSun.shadow.camera.right = d
  mainSun.shadow.camera.top = d
  mainSun.shadow.camera.bottom = -d
  mainSun.shadow.bias = -0.0003
  mainSun.shadow.normalBias = 0.04
  mainSunRef = mainSun
  scene.add(mainSun)

  // 3. 沙漠大地金黄漫射辅光 (雕刻沙丘迎光背光立体感)
  const desertGold = new THREE.DirectionalLight(0xe8be88, 3.6)
  desertGold.position.set(-140, 120, -100)
  desertGoldRef = desertGold
  scene.add(desertGold)

  // 4. 清透天光侧逆光 (呈现机械轮廓锐度)
  const skyRim = new THREE.DirectionalLight(0xcde1f5, 2.8)
  skyRim.position.set(-100, 160, 140)
  skyRimRef = skyRim
  scene.add(skyRim)

  // 5. 钻井作业平台平稳强聚光工矿灯
  const spotLight = new THREE.SpotLight(0xffffff, 9.0, 220, Math.PI / 3.8, 0.35, 1.2)
  spotLight.position.set(-15, 95, 0)
  spotLight.target.position.set(-15, 12, 0)
  scene.add(spotLight)
  scene.add(spotLight.target)
  sceneFloodlights.push({
    light: spotLight,
    baseIntensity: 2.0,
    nightIntensity: 11.0,
    duskIntensity: 5.5,
    sandstormIntensity: 4.5,
  })

  // 6. 地下油藏中心通透高亮环境光源
  const strataLight = new THREE.PointLight(0xf59e0b, 5.0, 150)
  strataLight.position.set(-15, -38, 5)
  scene.add(strataLight)

  // 7. 钻台下方月池重型 BOP 防喷器与泥浆高架管线专用防爆照明灯 (消除底部死黑)
  const moonpoolLight = new THREE.SpotLight(0x38bdf8, 8.5, 32, Math.PI / 3, 0.35, 1.2)
  moonpoolLight.position.set(-15, 8.2, 5.5)
  moonpoolLight.target.position.set(-15, 2.5, 0)
  scene.add(moonpoolLight)
  scene.add(moonpoolLight.target)
  sceneFloodlights.push({
    light: moonpoolLight,
    baseIntensity: 2.0,
    nightIntensity: 9.5,
    duskIntensity: 5.0,
    sandstormIntensity: 4.0,
  })

  // 8. 4座井场高杆夜间工矿 LED 泛光灯塔
  const towerPositions = [
    [-65, 30, -35],
    [55, 30, -35],
    [-65, 30, 42],
    [55, 30, 42],
  ]

  towerPositions.forEach(([fx, fy, fz]) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, fy, 8), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 }))
    mast.position.set(fx, fy / 2, fz)
    scene?.add(mast)

    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0x334155 }))
    crossBar.position.set(fx, fy, fz)
    scene?.add(crossBar)

    const lampBoxMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    const lampBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.2), lampBoxMat)
    lampBox.position.set(fx, fy + 0.5, fz)
    scene?.add(lampBox)

    const floodLight = new THREE.PointLight(0xffedd5, 3.5, 110)
    floodLight.position.set(fx, fy + 1, fz)
    scene?.add(floodLight)

    sceneFloodlights.push({
      light: floodLight,
      baseIntensity: 1.0,
      nightIntensity: 6.5,
      duskIntensity: 3.5,
      sandstormIntensity: 2.5,
      lensMat: lampBoxMat,
    })
  })
}

// -------------------------------------------------------------
// 5. 远景群山与连绵沙丘沙漠背景环境 (真实还原塔里木/克拉玛依荒漠油田)
// -------------------------------------------------------------
function createSkyDomeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // 1. 真实大漠塔克拉玛干黄昏大片色阶梯度 (深邃蓝紫天顶 -> 金紫晚霞 -> 炽盛金红落日 -> 暖赭沙海交融)
    const grad = ctx.createLinearGradient(0, 0, 0, 1024)
    grad.addColorStop(0.0, '#152232') // 天顶深邃静谧蓝紫
    grad.addColorStop(0.20, '#263b50') // 高空冷暖交界过渡
    grad.addColorStop(0.42, '#5d4157') // 中天紫霞云带
    grad.addColorStop(0.60, '#9e5233') // 绚烂赤金晚霞层
    grad.addColorStop(0.75, '#cb702a') // 炽盛金橙辐射带
    grad.addColorStop(0.86, '#e09848') // 低空落日余晖金黄
    grad.addColorStop(0.93, '#eed29d') // 贴近地平线沙尘漫射亮金弧
    grad.addColorStop(1.0, '#ba8a59') // 无缝融入大漠地表金黄沙垄
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 2048, 1024)

    // 2. 西北方向落日核心与壮观暮光辐射光芒 (Crepuscular Twilight Sun Rays)
    const sunX = 760
    const sunY = 640

    // 放射状云隙光束 (God Rays)
    for (let r = 0; r < 24; r++) {
      const rayAngle = (r * Math.PI) / 12 + 0.1
      ctx.save()
      ctx.translate(sunX, sunY)
      ctx.rotate(rayAngle)
      const rayGrad = ctx.createLinearGradient(0, 0, 900, 0)
      const rayOpacity = 0.08 + Math.sin(r * 2.3) * 0.05
      rayGrad.addColorStop(0, `rgba(255, 240, 200, ${rayOpacity * 2.0})`)
      rayGrad.addColorStop(0.4, `rgba(251, 191, 36, ${rayOpacity})`)
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = rayGrad
      ctx.beginPath()
      ctx.moveTo(0, -18)
      ctx.lineTo(850, -45)
      ctx.lineTo(850, 45)
      ctx.lineTo(0, 18)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // 炽盛日光辐射晕
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 600)
    sunGlow.addColorStop(0.0, 'rgba(255, 255, 245, 0.98)')
    sunGlow.addColorStop(0.12, 'rgba(254, 243, 199, 0.85)')
    sunGlow.addColorStop(0.35, 'rgba(245, 158, 11, 0.42)')
    sunGlow.addColorStop(0.70, 'rgba(217, 119, 6, 0.15)')
    sunGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')
    ctx.fillStyle = sunGlow
    ctx.fillRect(0, 0, 2048, 1024)

    // 3. 高空层次丰富的金紫大漠透视卷积云霞 (Layered Cirrocumulus Clouds)
    for (let i = 0; i < 12; i++) {
      const cy = 340 + i * 42 + Math.sin(i * 1.5) * 16
      const cGrad = ctx.createLinearGradient(0, cy - 20, 0, cy + 20)
      const alpha = 0.16 + (i % 4) * 0.07
      const isGolden = i > 5
      const cloudColor = isGolden ? `251, 191, 36` : `244, 114, 182`
      cGrad.addColorStop(0, `rgba(${cloudColor}, 0)`)
      cGrad.addColorStop(0.5, `rgba(${cloudColor}, ${alpha})`)
      cGrad.addColorStop(1, `rgba(${cloudColor}, 0)`)
      ctx.fillStyle = cGrad

      ctx.beginPath()
      ctx.moveTo(0, cy)
      for (let x = 0; x <= 2048; x += 48) {
        const wave = Math.sin(x * 0.005 + i * 1.1) * 14 + Math.cos(x * 0.015 + i) * 8
        ctx.lineTo(x, cy + wave)
      }
      ctx.lineTo(2048, cy + 30)
      ctx.lineTo(0, cy + 30)
      ctx.closePath()
      ctx.fill()
    }

    // 4. 地平线远山剪影与雅丹风蚀山脊脉络 (Distant Mountain Silhouettes)
    ctx.fillStyle = 'rgba(74, 38, 26, 0.75)'
    ctx.beginPath()
    ctx.moveTo(0, 890)
    for (let x = 0; x <= 2048; x += 32) {
      const mH = Math.sin(x * 0.003) * 45 + Math.cos(x * 0.008) * 22 + Math.sin(x * 0.018) * 12
      ctx.lineTo(x, 880 - mH)
    }
    ctx.lineTo(2048, 1024)
    ctx.lineTo(0, 1024)
    ctx.closePath()
    ctx.fill()

    // 5. 贴地近层金色沙尘晚霞漫射带 (Horizon Dust Haze Ring)
    const hazeGrad = ctx.createLinearGradient(0, 920, 0, 1024)
    hazeGrad.addColorStop(0, 'rgba(238, 210, 157, 0.25)')
    hazeGrad.addColorStop(0.6, 'rgba(224, 152, 72, 0.65)')
    hazeGrad.addColorStop(1.0, 'rgba(186, 138, 89, 0.45)')
    ctx.fillStyle = hazeGrad
    ctx.fillRect(0, 920, 2048, 104)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// 雅丹红层风蚀沉积岩层纹理贴图 (Yardang Stratified Rock Texture)
function createYardangRockTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#652b19'
    ctx.fillRect(0, 0, 512, 512)

    // 绘制多级水平风蚀沉积相条带
    const strataBands = [
      { y: 0, h: 48, c: '#4a1d12' },
      { y: 48, h: 62, c: '#7c381f' },
      { y: 110, h: 36, c: '#9c4c23' },
      { y: 146, h: 72, c: '#5f2316' },
      { y: 218, h: 42, c: '#8d4420' },
      { y: 260, h: 84, c: '#48190f' },
      { y: 344, h: 52, c: '#a45327' },
      { y: 396, h: 68, c: '#6c2e1b' },
      { y: 464, h: 48, c: '#3c140c' },
    ]
    strataBands.forEach(b => {
      ctx.fillStyle = b.c
      ctx.fillRect(0, b.y, 512, b.h)
    })

    // 水平风蚀凹凸侵蚀细刻纹与风蚀空隙
    for (let y = 0; y < 512; y += 4) {
      const alpha = 0.12 + Math.random() * 0.22
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(240, 180, 130, ${alpha})` : `rgba(20, 5, 0, ${alpha})`
      ctx.fillRect(0, y, 512, 2 + Math.random() * 2)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 4)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 大漠地表风成沙细波纹贴图 (Desert Sand Ripple Texture)
function createDesertSandRippleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#c59b6d' // 纯正塔里木大漠金黄暖沙色
    ctx.fillRect(0, 0, 512, 512)

    // 风成微沙垄起伏波痕
    for (let y = 0; y < 512; y += 8) {
      const grad = ctx.createLinearGradient(0, y, 0, y + 8)
      grad.addColorStop(0, 'rgba(248, 222, 180, 0.40)') // 迎风光照沙脊高光
      grad.addColorStop(0.48, 'rgba(152, 108, 65, 0.35)') // 背风微阴影
      grad.addColorStop(1, 'rgba(200, 160, 115, 0.15)')
      ctx.fillStyle = grad
      ctx.fillRect(0, y, 512, 8)
    }

    // 随机矿物沙粒散斑
    for (let p = 0; p < 800; p++) {
      const px = Math.random() * 512
      const py = Math.random() * 512
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 242, 215, 0.25)' : 'rgba(130, 85, 45, 0.2)'
      ctx.fillRect(px, py, 1.5, 1.5)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(48, 48)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 万米钻机正面“深地工程”金属铭牌高清贴图 (复刻图三井架主铭牌)
function createDeepEarthPlaqueTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // 经典深红大国重器拉丝底板，彻底告别刺眼白块
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 360)
    bgGrad.addColorStop(0, '#7f1d1d')
    bgGrad.addColorStop(0.5, '#991b1b')
    bgGrad.addColorStop(1, '#6b1717')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, 1024, 360)

    // 重型拉丝鎏金外边框与内嵌微光双线
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 14
    ctx.strokeRect(7, 7, 1010, 346)

    ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)'
    ctx.lineWidth = 4
    ctx.strokeRect(18, 18, 988, 324)

    // 左侧中石油宝石花标志 (CNPC Emblem)
    const cx = 118
    const cy = 180
    // 金黄色外花瓣
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(cx, cy, 64, 0, Math.PI * 2)
    ctx.fill()
    // 红色内花瓣花朵
    ctx.fillStyle = '#b91c1c'
    for (let p = 0; p < 8; p++) {
      const ang = (p * Math.PI) / 4
      ctx.beginPath()
      ctx.arc(cx + Math.cos(ang) * 36, cy + Math.sin(ang) * 36, 25, 0, Math.PI * 2)
      ctx.fill()
    }
    // 中心黄色五角星
    ctx.fillStyle = '#fef08a'
    ctx.beginPath()
    ctx.arc(cx, cy, 20, 0, Math.PI * 2)
    ctx.fill()

    // 顶部红旗标识与单位小标
    ctx.fillStyle = '#fde047'
    ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('中国石油 TARIM OILFIELD · 深地科学探索工程', 580, 58)

    // 主标题：“深 地 工 程” (大国重器醒目超大鎏金白玉立体字)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 5
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 128px "PingFang SC", "Microsoft YaHei", "SimHei", sans-serif'
    ctx.fillText('深 地 工 程', 580, 165)
    ctx.shadowColor = 'transparent'

    // 英文与工程编号副标
    ctx.fillStyle = '#38bdf8'
    ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText('万米特深井自动化钻机  DEEP EARTH DRILLING 12,000m', 580, 260)

    // 技术规格标注行
    ctx.fillStyle = '#cbd5e1'
    ctx.font = 'bold 20px "SF Mono", monospace, sans-serif'
    ctx.fillText('DESIGN DRILLING DEPTH: 12,000m | MAX HOOK LOAD: 1,000t | TORQUE: 100,000 N·m', 580, 310)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  return tex
}

// 司钻房现代数字化工控多联屏贴图 (钻压/井眼轨迹/泥浆循环遥测仪表)
function createDrillerScreenTexture(screenType: 'left' | 'mid' | 'right'): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#090d16'
    ctx.fillRect(0, 0, 512, 320)

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 512, 40)
    ctx.fillStyle = '#38bdf8'
    ctx.font = 'bold 18px "SF Mono", monospace, sans-serif'
    ctx.textBaseline = 'middle'

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'
    ctx.lineWidth = 1
    for (let x = 40; x < 512; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 40)
      ctx.lineTo(x, 320)
      ctx.stroke()
    }
    for (let y = 70; y < 320; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }

    if (screenType === 'left') {
      ctx.fillText('SYS: DRILLING TELEMETRY · WOB/ROP', 16, 20)
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(20, 220)
      ctx.lineTo(90, 190)
      ctx.lineTo(160, 240)
      ctx.lineTo(240, 160)
      ctx.lineTo(320, 180)
      ctx.lineTo(400, 130)
      ctx.lineTo(490, 140)
      ctx.stroke()

      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 32px "SF Mono", monospace, sans-serif'
      ctx.fillText('24.8 m/h', 20, 80)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '16px sans-serif'
      ctx.fillText('MECHANICAL ROP', 20, 110)

      ctx.fillStyle = '#f59e0b'
      ctx.font = 'bold 28px "SF Mono", monospace, sans-serif'
      ctx.fillText('185 kN', 320, 80)
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('WOB (钻压)', 320, 110)
    } else if (screenType === 'mid') {
      ctx.fillText('SYS: 3D WELLBORE TRAJECTORY & BOP', 16, 20)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(160, 180, 80, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(160, 180, 45, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(172, 175, 8, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = '#00f0ff'
      ctx.font = '900 36px "SF Mono", monospace, sans-serif'
      ctx.fillText('3,852.4 m', 280, 100)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '16px sans-serif'
      ctx.fillText('MEASURED DEPTH (MD)', 280, 130)

      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 22px "SF Mono", monospace, sans-serif'
      ctx.fillText('DEV: 0.82°  AZI: 124.5°', 280, 180)
      ctx.fillStyle = '#22c55e'
      ctx.fillText('BOP STATUS: ARMED', 280, 220)
    } else {
      ctx.fillText('SYS: MUD PUMP & SOLIDS CONTROL', 16, 20)
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(140, 180, 70, Math.PI * 0.75, Math.PI * 2.25)
      ctx.stroke()

      ctx.strokeStyle = '#0284c7'
      ctx.beginPath()
      ctx.arc(140, 180, 70, Math.PI * 0.75, Math.PI * 1.8)
      ctx.stroke()

      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 30px "SF Mono", monospace, sans-serif'
      ctx.fillText('24.2 MPa', 75, 185)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '15px sans-serif'
      ctx.fillText('STANDPIPE PRESS', 65, 270)

      ctx.fillStyle = '#f59e0b'
      ctx.font = 'bold 28px "SF Mono", monospace, sans-serif'
      ctx.fillText('48.5 L/s', 330, 120)
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('FLOW RATE', 330, 150)

      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 28px "SF Mono", monospace, sans-serif'
      ctx.fillText('1.25 g/cm³', 330, 210)
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('MUD DENSITY', 330, 240)
    }

    ctx.strokeStyle = '#0284c7'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, 508, 316)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  return tex
}

// 中石油宝石花圆形徽标贴图 (用于井前立罐与指挥方舱)
function createCnpcEmblemTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256)
    const cx = 128
    const cy = 128

    // 白色圆形衬底与深灰外轮廓
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.arc(cx, cy, 116, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 6
    ctx.stroke()

    // 宝石花金黄底圈
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.arc(cx, cy, 88, 0, Math.PI * 2)
    ctx.fill()

    // 8 瓣红色花瓣
    ctx.fillStyle = '#dc2626'
    for (let p = 0; p < 8; p++) {
      const ang = (p * Math.PI) / 4
      ctx.beginPath()
      ctx.arc(cx + Math.cos(ang) * 44, cy + Math.sin(ang) * 44, 30, 0, Math.PI * 2)
      ctx.fill()
    }

    // 中心黄色圆芯
    ctx.fillStyle = '#fef08a'
    ctx.beginPath()
    ctx.arc(cx, cy, 26, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 井场大门经典红色标语牌贴图 (复刻图三两座白色空间刚架标语)
function createSloganTexture(slogan: string, subtext: string): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 280
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // 红色烤漆底板 (带微光渐变)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 280)
    bgGrad.addColorStop(0, '#b91c1c')
    bgGrad.addColorStop(0.5, '#dc2626')
    bgGrad.addColorStop(1, '#991b1b')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, 2048, 280)

    // 金黄边框
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 12
    ctx.strokeRect(10, 10, 2028, 260)

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 3
    ctx.strokeRect(22, 22, 2004, 236)

    // 核心标语大字 (洁白粗体加微阴影，左右保留充足安全留白，严防贴边)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 3
    ctx.shadowOffsetY = 4

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 84px "PingFang SC", "Microsoft YaHei", "SimHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(slogan, 1024, 115)

    // 消除阴影绘制副标题
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#fde047' // 金黄字副标
    ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(subtext, 1024, 205)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}


// 通用真车 GLB 异步加载与自适应比例定姿辅助函数
function loadRealVehicleGLB(
  url: string,
  targetLength: number,
  pos: [number, number, number],
  rotY: number,
  parent: THREE.Group,
  onLoaded?: (car: THREE.Group) => void,
) {
  try {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    const gltfLoader = new GLTFLoader()
    gltfLoader.setDRACOLoader(dracoLoader)
    gltfLoader.load(
      url,
      (gltf) => {
        const car = gltf.scene
        car.updateMatrixWorld(true)
        const box = new THREE.Box3().setFromObject(car)
        const sz = new THREE.Vector3()
        box.getSize(sz)
        const center = new THREE.Vector3()
        box.getCenter(center)

        const maxHoriz = Math.max(sz.x, sz.z) || 1
        const scale = targetLength / maxHoriz

        // 1. 底盘着地与几何中心归一化：将模型底面精确贴合至 Y=0，水平几何中心对齐 (0, 0)
        car.position.set(-center.x, -box.min.y, -center.z)

        // 2. 外部容器统一承载世界变换（缩放、旋转、绝对/相对位移），杜绝悬空浮空、穿地与偏心旋转
        const wrapper = new THREE.Group()
        wrapper.scale.set(scale, scale, scale)
        wrapper.rotation.y = rotY
        wrapper.position.set(pos[0], pos[1], pos[2])
        wrapper.add(car)

        wrapper.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        parent.add(wrapper)
        if (onLoaded) onLoaded(wrapper)
      },
      undefined,
      (err) => console.warn(`GLTF vehicle load error (${url}):`, err)
    )
  } catch (e) {
    console.warn('GLTFLoader init error:', e)
  }
}

// 荒漠重型 6x6 油罐半挂运输卡车模型 (Heavy-Haul Desert Oil Tanker Semi-Trailer)
function createHeavyTankerTruck(): THREE.Group {
  const truck = new THREE.Group()

  const cabMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.75, roughness: 0.3 })
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.92, roughness: 0.25 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.98, roughness: 0.08 })
  const tankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.18 })
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
  const warningYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6 })

  // 1. 牵引车车头 (Heavy 6x6 Desert Tractor)
  const tractor = new THREE.Group()

  // 车架纵梁
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 8.8), chassisMat)
  chassis.position.y = 1.1
  tractor.add(chassis)

  // 驾驶室本体
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 3.2), cabMat)
  cab.position.set(0, 2.7, 2.2)
  tractor.add(cab)

  // 驾驶室前挡风玻璃 (内倾防反光)
  const windshield = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x082f49, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 })
  )
  windshield.position.set(0, 3.0, 3.82)
  tractor.add(windshield)

  // 前保险杠与重型防撞格栅 (Bull Bar)
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 0.6), chassisMat)
  bumper.position.set(0, 0.9, 4.0)
  tractor.add(bumper)

  const bullBar = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.08, 6, 16, Math.PI), warningYellow)
  bullBar.rotation.x = -Math.PI / 2
  bullBar.position.set(0, 1.4, 4.35)
  tractor.add(bullBar)

  // 前大灯与车头探照灯 (Headlights & Driving Beam)
  for (const lx of [-0.95, 0.95]) {
    const headlight = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), new THREE.MeshBasicMaterial({ color: 0xfff7ed }))
    headlight.position.set(lx, 0.9, 4.32)
    tractor.add(headlight)
  }
  const truckBeam = new THREE.SpotLight(0xfff7ed, 0.8, 30, Math.PI / 4, 0.4, 1.1)
  truckBeam.position.set(0, 1.2, 4.5)
  const tbTarget = new THREE.Object3D()
  tbTarget.position.set(0, 0.5, 20)
  tractor.add(tbTarget)
  truckBeam.target = tbTarget
  tractor.add(truckBeam)
  sceneFloodlights.push({
    light: truckBeam,
    baseIntensity: 0.6,
    nightIntensity: 5.5,
    duskIntensity: 3.0,
    sandstormIntensity: 2.2,
  })

  // 驾驶室顶部高位遮阳罩与警示灯
  const visor = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.15, 0.8), chassisMat)
  visor.position.set(0, 4.0, 2.8)
  visor.rotation.x = 0.2
  tractor.add(visor)

  for (const ax of [-0.8, 0, 0.8]) {
    const amberLight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf59e0b }))
    amberLight.position.set(ax, 4.15, 2.6)
    tractor.add(amberLight)
  }

  // 驾驶室背部双垂直镀铬排气管 (Dual Chrome Stacks)
  for (const ex of [-1.1, 1.1]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.8, 12), chromeMat)
    stack.position.set(ex, 3.2, 0.4)
    tractor.add(stack)

    const stackCurve = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.1, 6, 8, Math.PI / 2), chromeMat)
    stackCurve.position.set(ex, 5.1, 0.22)
    tractor.add(stackCurve)
  }

  // 两侧大容量柴油油箱
  for (const fx of [-1.35, 1.35]) {
    const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 16), chromeMat)
    fuelTank.rotation.x = Math.PI / 2
    fuelTank.position.set(fx, 1.1, -0.6)
    tractor.add(fuelTank)
  }

  // 牵引车轮胎 (前轮单轴，后轮双轴)
  const tractorWheelPositions = [
    [-1.2, 0.7, 2.8], [1.2, 0.7, 2.8],
    [-1.25, 0.7, -1.8], [1.25, 0.7, -1.8],
    [-1.25, 0.7, -3.2], [1.25, 0.7, -3.2],
  ]
  tractorWheelPositions.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.55, 16), tireMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(wx, wy, wz)
    tractor.add(wheel)

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.58, 12), chromeMat)
    hub.rotation.z = Math.PI / 2
    hub.position.set(wx, wy, wz)
    tractor.add(hub)
  })

  // 牵引鞍座 (Fifth Wheel)
  const fifthWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.25, 16), chassisMat)
  fifthWheel.position.set(0, 1.45, -2.5)
  tractor.add(fifthWheel)

  truck.add(tractor)

  // 2. 原油运输半挂罐车 (Semi-Trailer Tanker)
  const trailer = new THREE.Group()
  trailer.position.set(0, 0, -2.5)

  // 挂车前部鹅颈连接总成与牵引销 (Gooseneck & Kingpin Coupling)
  const gooseneck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 2.8), chassisMat)
  gooseneck.position.set(0, 1.45, 0.4)
  trailer.add(gooseneck)

  const kingpin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), chromeMat)
  kingpin.position.set(0, 1.25, 0)
  trailer.add(kingpin)

  // 挂车高压气刹与电气动力螺旋连接管束 (Coiled Air & Electrical Service Lines)
  for (const cOff of [-0.4, 0.4]) {
    const suzieCoil = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 16, Math.PI * 3), warningYellow)
    suzieCoil.rotation.y = Math.PI / 2
    suzieCoil.position.set(cOff, 1.85, 1.4)
    trailer.add(suzieCoil)
  }

  // 挂车车架大梁
  const tChassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 16.5), chassisMat)
  tChassis.position.set(0, 1.4, -7.0)
  trailer.add(tChassis)

  // 42,000L 保温椭圆原油储罐主体 (Elliptical Insulated Tank Vessel)
  const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 14.8, 24), tankMat)
  tankBody.rotation.x = Math.PI / 2
  tankBody.scale.set(1.15, 1.0, 0.85) // 椭圆截面
  tankBody.position.set(0, 2.9, -6.8)
  trailer.add(tankBody)

  // 储罐前后封头
  for (const ts of [-14.2, 0.6]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.85, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), tankMat)
    head.scale.set(1.15, 0.85, 1.0)
    head.rotation.x = ts > -7 ? -Math.PI / 2 : Math.PI / 2
    head.position.set(0, 2.9, ts)
    trailer.add(head)
  }

  // 罐顶安全走道与折叠护栏 (Top Walkway & Handrails)
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 12.5), warningYellow)
  walkway.position.set(0, 4.45, -6.8)
  trailer.add(walkway)

  const wRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 12.5), warningYellow)
  wRail.position.set(0.42, 4.85, -6.8)
  trailer.add(wRail)

  // 罐顶双密闭装车进油人孔密封盖 (与装车栈桥气动平衡活动鹤管垂管毫米级精准对齐：z=-4.5 与 z=-12.0)
  for (const mz of [-12.0, -8.25, -4.5]) {
    const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.35, 16), chassisMat)
    manhole.position.set(0, 4.55, mz)
    trailer.add(manhole)

    // 密闭装车充装法兰口环与气密封圈 (Tight-Fill Seal Collar)
    const hatchRim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 6, 16), warningYellow)
    hatchRim.rotation.x = Math.PI / 2
    hatchRim.position.set(0, 4.75, mz)
    trailer.add(hatchRim)
  }

  // 挂车侧向耐油卸油软管保护箱 (Hose Tubes)
  for (const hx of [-1.55, 1.55]) {
    const hTube = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 13.0, 10), chassisMat)
    hTube.rotation.x = Math.PI / 2
    hTube.position.set(hx, 2.1, -6.8)
    trailer.add(hTube)
  }

  // 挂车后置阀组箱与易燃液体安全警示菱形标牌 (Class 3 Hazmat Diamond)
  const valveCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.8), chassisMat)
  valveCabinet.position.set(0, 1.8, -14.8)
  trailer.add(valveCabinet)

  const hazmatSign = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.08), new THREE.MeshBasicMaterial({ color: 0xdc2626 }))
  hazmatSign.rotation.z = Math.PI / 4
  hazmatSign.position.set(0, 3.2, -14.95)
  trailer.add(hazmatSign)

  // 挂车后下部防钻入重型金属保险杠 (Rear Underrun Protective Device)
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 0.3), warningYellow)
  rearBumper.position.set(0, 0.85, -15.1)
  trailer.add(rearBumper)

  // 挂车红色后示宽尾灯与刹车灯组
  for (const rx of [-1.1, 1.1]) {
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }))
    tailLight.position.set(rx, 0.85, -15.26)
    trailer.add(tailLight)
  }

  // 挂车后三轴重载轮胎组 (12条重载工程轮胎)
  for (let ax = 0; ax < 3; ax++) {
    const az = -10.5 - ax * 1.5
    for (const side of [-1.25, 1.25]) {
      const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 16), tireMat)
      w1.rotation.z = Math.PI / 2
      w1.position.set(side, 0.7, az)
      trailer.add(w1)

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.55, 12), chromeMat)
      hub.rotation.z = Math.PI / 2
      hub.position.set(side, 0.7, az)
      trailer.add(hub)
    }
  }

  truck.add(trailer)
  return truck
}

function buildDesertDunesAndEnvironment() {
  if (!scene) return
  const envGroup = new THREE.Group()

  // 1. 大漠落日暮色沉浸式天幕穹顶 (Sky Dome) - 彻底告别死黑背景，提供暖霞环抱与深邃纵深
  const skyGeo = new THREE.SphereGeometry(1800, 32, 20)
  const skyMat = new THREE.MeshBasicMaterial({
    map: createSkyDomeTexture(),
    side: THREE.BackSide,
    depthWrite: false,
  })
  skyDomeMesh = new THREE.Mesh(skyGeo, skyMat)
  envGroup.add(skyDomeMesh)

  // 2. 广袤大漠起伏沙丘地形网格 (1600x1600 超大延展地面，地平线无缝融入天幕)
  const terrainSize = 1600
  const terrainSegments = 84
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments)
  terrainGeo.rotateX(-Math.PI / 2) // 旋转至水平地面，Y 轴为高程

  const posAttr = terrainGeo.attributes.position
  // 核心装备保护区边界 (涵盖所有地上设施、长输清管站、储罐区围堰、火炬塔、营地与抽油机组)
  const padMinX = -135
  const padMaxX = 92
  const padMinZ = -90
  const padMaxZ = 85

  // 进场公路起止两点 (-180, 95) 至 (-45, 25)
  const roadAx = -180, roadAz = 95
  const roadBx = -45, roadBz = 25
  const roadABx = roadBx - roadAx, roadABz = roadBz - roadAz
  const roadLenSq = roadABx * roadABx + roadABz * roadABz

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i)
    const z = posAttr.getZ(i)

    // 1. 计算到井场设备核心平整矩形的无干涉距离
    const dx = Math.max(0, padMinX - x, x - padMaxX)
    const dz = Math.max(0, padMinZ - z, z - padMaxZ)
    const distToPad = Math.sqrt(dx * dx + dz * dz)

    // 2. 计算到进场主公路的距离
    const tRoad = Math.max(0, Math.min(1, ((x - roadAx) * roadABx + (z - roadAz) * roadABz) / roadLenSq))
    const closeX = roadAx + tRoad * roadABx
    const closeZ = roadAz + tRoad * roadABz
    const distToRoad = Math.sqrt((x - closeX) * (x - closeX) + (z - closeZ) * (z - closeZ))

    let y = 0
    // 只要在井场设施区或公路走廊内，地形高度强制保持 0 (彻底根除沙漠背景吞噬覆盖模型穿模)
    if (distToPad > 0 && distToRoad > 14.0) {
      const padFactor = Math.min(1, distToPad / 45.0)
      const roadFactor = Math.min(1, (distToRoad - 14.0) / 20.0)
      const blend = padFactor * roadFactor
      const smoothBlend = blend * blend * (3 - 2 * blend)

      if (z > 35) {
        // 前景平缓金色沙坡 (保证大屏正面视觉开阔通透，绝不遮挡井场)
        y = (Math.sin(x * 0.012) * 1.0 + Math.cos(z * 0.015) * 1.2) * smoothBlend
      } else {
        // 中后方浩瀚连绵起伏新月形沙垄海 (精确拟合塔克拉玛干沙漠连绵起伏流动沙海，仅在装备安全区外升起)
        const dWave1 = Math.sin(x * 0.007 + z * 0.004) * 24.0
        const dWave2 = Math.cos(x * 0.013 - z * 0.008) * 16.0
        const dWave3 = Math.sin(x * 0.022 + z * 0.014) * 7.5
        const dSharpCrest = Math.pow((Math.sin(x * 0.008 + z * 0.005) + 1) * 0.5, 2.2) * 18.0
        const distFromOrigin = Math.sqrt(x * x + z * z)
        const outerFade = distFromOrigin > 650 ? Math.max(0, 1 - (distFromOrigin - 650) / 200) : 1
        y = (dWave1 + dWave2 + dWave3 + dSharpCrest) * smoothBlend * outerFade
      }
    }
    posAttr.setY(i, y)
  }
  terrainGeo.computeVertexNormals()

  const desertMat = new THREE.MeshStandardMaterial({
    color: 0xc99c6b, // 纯正大漠金黄暖沙基色
    map: createDesertSandRippleTexture(),
    roughness: 0.88,
    metalness: 0.08,
  })
  const terrainMesh = new THREE.Mesh(terrainGeo, desertMat)
  terrainMesh.position.y = 0 // 地面基准高度 Y = 0
  terrainMesh.receiveShadow = true
  terrainMeshRef = terrainMesh
  envGroup.add(terrainMesh)

  // 3. 远景宏大起伏新月形复合沙丘链实体群 (Sweeping Crescent Barchan Dune Chains)
  // 彻底移除生硬突兀的断崖桌状怪山，100%还原图二图三苍茫浩瀚的自然金黄流动沙丘海！
  const duneRidgeGroup = new THREE.Group()

  const duneConfigs = [
    { r: 240, angle: Math.PI * 0.82, w: 180, h: 26 },
    { r: 290, angle: Math.PI * 1.12, w: 220, h: 32 },
    { r: 260, angle: Math.PI * 1.42, w: 190, h: 28 },
    { r: 360, angle: Math.PI * 0.70, w: 250, h: 38 },
    { r: 410, angle: Math.PI * 1.02, w: 280, h: 42 },
    { r: 380, angle: Math.PI * 1.35, w: 240, h: 36 },
    { r: 490, angle: Math.PI * 0.85, w: 320, h: 48 },
    { r: 530, angle: Math.PI * 1.20, w: 340, h: 52 },
    { r: 560, angle: Math.PI * 1.50, w: 300, h: 46 },
    { r: 270, angle: Math.PI * 0.52, w: 160, h: 22 },
    { r: 330, angle: Math.PI * 1.68, w: 200, h: 28 },
    { r: 450, angle: Math.PI * 0.60, w: 230, h: 35 },
  ]

  duneConfigs.forEach((cfg) => {
    const dGroup = new THREE.Group()
    const dx = Math.cos(cfg.angle) * cfg.r
    const dz = Math.sin(cfg.angle) * cfg.r
    dGroup.position.set(dx, 0, dz)
    dGroup.rotation.y = cfg.angle + Math.PI / 2

    // 绘制新月形拱形沙脊曲线
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-cfg.w / 2, 0, -cfg.w * 0.22),
      new THREE.Vector3(-cfg.w * 0.25, cfg.h * 0.68, -cfg.w * 0.06),
      new THREE.Vector3(0, cfg.h, 0),
      new THREE.Vector3(cfg.w * 0.25, cfg.h * 0.68, -cfg.w * 0.06),
      new THREE.Vector3(cfg.w / 2, 0, -cfg.w * 0.22),
    ])

    const dGeo = new THREE.TubeGeometry(curve, 24, cfg.h * 0.6, 8, false)
    dGeo.scale(1.0, 0.42, 1.45) // 压平展开呈舒展沙垄滑落坡
    const dMesh = new THREE.Mesh(dGeo, desertMat)
    dMesh.position.y = cfg.h * 0.22
    dGroup.add(dMesh)

    duneRidgeGroup.add(dGroup)
  })
  envGroup.add(duneRidgeGroup)

  // 4. 大漠白昼漫射耀阳与沙尘高空日冕晕轮 (Desert Daytime Sun & Dust Halo)
  const sunGroup = new THREE.Group()
  sunGroup.position.set(380, 260, -320)

  // 核心白金日光发光球
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(22, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfffaed })
  )
  sunGroup.add(sunDisc)

  // 外层沙尘漫射柔和日晕
  const coronaCanvas = document.createElement('canvas')
  coronaCanvas.width = 128
  coronaCanvas.height = 128
  const cCtx = coronaCanvas.getContext('2d')
  if (cCtx) {
    const cGrad = cCtx.createRadialGradient(64, 64, 0, 64, 64, 64)
    cGrad.addColorStop(0.0, 'rgba(255, 250, 235, 0.95)')
    cGrad.addColorStop(0.25, 'rgba(254, 243, 199, 0.65)')
    cGrad.addColorStop(0.65, 'rgba(245, 218, 165, 0.25)')
    cGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')
    cCtx.fillStyle = cGrad
    cCtx.fillRect(0, 0, 128, 128)
  }
  const coronaTex = new THREE.CanvasTexture(coronaCanvas)
  coronaTex.colorSpace = THREE.SRGBColorSpace

  const coronaMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshBasicMaterial({
      map: coronaTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )
  coronaMesh.rotation.y = -Math.PI / 4
  sunGroup.add(coronaMesh)
  envGroup.add(sunGroup)

  // 5. 荒漠戈壁进场柏油公路与重型运输便道 (Desert Heavy-Haul Highway - 沿东翼开阔带延伸，彻底规避生活营区)
  const roadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(140, 0.25, -420),
    new THREE.Vector3(115, 0.25, -280),
    new THREE.Vector3(88, 0.25, -140),
    new THREE.Vector3(82, 0.25, -60),
    new THREE.Vector3(72, 0.25, 20),
    new THREE.Vector3(45, 0.25, 75),
  ])
  const roadGeo = new THREE.TubeGeometry(roadCurve, 40, 4.5, 4, false)
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.88,
    metalness: 0.15,
  })
  const roadMesh = new THREE.Mesh(roadGeo, roadMat)
  roadMesh.scale.set(1.0, 0.04, 1.0)
  roadMesh.position.y = 0.08
  envGroup.add(roadMesh)

  // 沥青公路黄色中心双实线安全标线
  const markingGeo = new THREE.TubeGeometry(roadCurve, 40, 0.12, 4, false)
  const markingMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  const markingMesh = new THREE.Mesh(markingGeo, markingMat)
  markingMesh.scale.set(1.0, 0.05, 1.0)
  markingMesh.position.y = 0.11
  envGroup.add(markingMesh)

  // 荒漠重型真车工程自卸运输卡车 (Desert Heavy-Haul Real GLB Dump Truck)
  loadRealVehicleGLB('/models/truck.glb', 14.5, [86, 0.28, -95], 2.45 + Math.PI / 2, envGroup)

  // 6. 地平线深处微缩抽油机群与远方集输站夜航火炬星光 (提升大油田广袤纵深感)
  const distantPumps = [
    [-185, 3.5, -210],
    [-130, 4.2, -260],
    [165, 4.0, -195],
    [240, 5.5, -230],
  ]
  const distantPumpMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 })
  distantPumps.forEach(([dx, dy, dz]) => {
    const dp = new THREE.Group()
    dp.position.set(dx, dy, dz)

    // 1. 真实工字钢撬座
    const dBase = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.4, 2.4), distantPumpMat)
    dBase.position.y = 0.2
    dp.add(dBase)

    // 2. 四柱倾斜空间桁架 A 型主支架 (彻底告别尖锐金字塔三角锥！)
    const legH = 9.5
    for (const sx of [-1.8, 1.8]) {
      for (const sz of [-0.9, 0.9]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, legH, 6), distantPumpMat)
        leg.position.set(sx * 0.55, legH / 2 + 0.4, sz * 0.6)
        leg.rotation.z = sx > 0 ? 0.15 : -0.15
        leg.rotation.x = sz > 0 ? -0.1 : 0.1
        dp.add(leg)
      }
    }

    // 3. 游梁主梁 (Walking Beam)
    const dBeam = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.65, 0.5), distantPumpMat)
    dBeam.position.set(0.4, 10.2, 0)
    dBeam.rotation.z = -0.18
    dp.add(dBeam)

    // 4. 前端弧面驴头 (Curved Horsehead Arc)
    const dHeadArc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 0.45, 12, 1, false, 0, Math.PI / 2.2),
      distantPumpMat
    )
    dHeadArc.rotation.z = Math.PI / 1.15
    dHeadArc.position.set(4.6, 9.2, 0)
    dp.add(dHeadArc)

    // 5. 悬垂钢丝绳与光杆
    const dRod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.2, 6), distantPumpMat)
    dRod.position.set(5.8, 6.5, 0)
    dp.add(dRod)

    // 6. 尾部减速箱与扇形平衡重
    const dBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.4), distantPumpMat)
    dBox.position.set(-2.8, 1.2, 0)
    dp.add(dBox)

    const dWeight = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 10, 1, false, 0, Math.PI), distantPumpMat)
    dWeight.rotation.x = Math.PI / 2
    dWeight.rotation.z = 0.6
    dWeight.position.set(-2.8, 2.2, 0.8)
    dp.add(dWeight)

    envGroup.add(dp)
  })

  // 远方联合站闪烁信标星光 (Red Beacon at Distant Horizon)
  const distantBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  )
  distantBeacon.position.set(-280, 22, -380)
  envGroup.add(distantBeacon)

  // 3. 沙漠高压输电走廊与真实悬垂导线 (Transmission Corridor with Catenary Wires)
  const pylonPositions = [
    new THREE.Vector3(175, 10, -135),
    new THREE.Vector3(220, 16, -85),
    new THREE.Vector3(135, 8, -180),
    new THREE.Vector3(80, 6, -225),
  ]

  const pylonGroup = new THREE.Group()
  pylonPositions.forEach(p => {
    const pylon = new THREE.Group()
    pylon.position.copy(p)

    // 塔身高耸桁架
    const towerMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 2.8, 46, 4),
      new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: true }),
    )
    towerMast.position.y = 23
    pylon.add(towerMast)

    // 双层横担 (Crossarms)
    for (const yh of [36, 42]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(15, 0.7, 1.4), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }))
      arm.position.y = yh
      pylon.add(arm)
    }
    pylonGroup.add(pylon)
  })
  envGroup.add(pylonGroup)

  // 铁塔之间的悬垂电力电缆 (CatmullRom 悬链导线)
  const wireMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
  for (let i = 0; i < pylonPositions.length - 1; i++) {
    const p1 = pylonPositions[i].clone()
    const p2 = pylonPositions[i + 1].clone()
    for (const offset of [-6, 6]) {
      const start = new THREE.Vector3(p1.x + offset, p1.y + 40, p1.z)
      const end = new THREE.Vector3(p2.x + offset, p2.y + 40, p2.z)
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
      mid.y -= 7.5 // 模拟自然重力下垂弧度 (Catenary Sag)

      const wireCurve = new THREE.CatmullRomCurve3([start, mid, end])
      const wirePoints = wireCurve.getPoints(24)
      const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints)
      const wireLine = new THREE.Line(wireGeo, wireMat)
      envGroup.add(wireLine)
    }
  }

  // 4. 远景大漠零碳智能油田巨型风力发电机组 (Green Energy Wind Turbines)
  windTurbineRotors = []
  const turbinePositions = [
    new THREE.Vector3(290, 18, -260),
    new THREE.Vector3(370, 26, -190),
    new THREE.Vector3(-240, 16, -290),
  ]
  const windTurbineMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.35,
    roughness: 0.45,
  })
  const bladeTipRed = new THREE.MeshBasicMaterial({ color: 0xef4444 })

  turbinePositions.forEach((pos, idx) => {
    const turbine = new THREE.Group()
    turbine.position.copy(pos)

    // 塔身高耸锥形钢管塔架 (Tapered Tubular Steel Tower - 68m)
    const towerMast = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2.6, 68, 16),
      windTurbineMat
    )
    towerMast.position.y = 34
    turbine.add(towerMast)

    // 机舱本体 (Aerodynamic Nacelle)
    const nacelle = new THREE.Group()
    nacelle.position.set(0, 68, 0)
    nacelle.rotation.y = idx * 0.8 + 0.5 // 迎风偏航角

    const nacelleBody = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 3.2, 10.5),
      windTurbineMat
    )
    nacelleBody.position.z = -2.5
    nacelle.add(nacelleBody)

    // 顶部航标闪烁红灯
    const nacelleBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    )
    nacelleBeacon.position.set(0, 2.0, -3.5)
    nacelle.add(nacelleBeacon)

    // 叶轮轮毂与整流罩 (Rotor Hub & Spinner)
    const rotor = new THREE.Group()
    rotor.position.set(0, 0, 3.2)

    const spinner = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.8),
      windTurbineMat
    )
    spinner.rotation.x = Math.PI / 2
    rotor.add(spinner)

    // 3 片高升力空气动力学风电叶片 (3 Aero-Twisted Blades)
    for (let b = 0; b < 3; b++) {
      const bAngle = (b * Math.PI * 2) / 3
      const bladeGroup = new THREE.Group()
      bladeGroup.rotation.z = bAngle

      // 叶片主梁
      const bladeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 1.35, 34, 10),
        windTurbineMat
      )
      bladeMesh.scale.set(0.4, 1.0, 1.0)
      bladeMesh.position.y = 17
      bladeGroup.add(bladeMesh)

      // 叶尖红色防撞警示色带
      const tipMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.55, 6, 10),
        bladeTipRed
      )
      tipMesh.scale.set(0.41, 1.0, 1.0)
      tipMesh.position.y = 31
      bladeGroup.add(tipMesh)

      rotor.add(bladeGroup)
    }

    nacelle.add(rotor)
    windTurbineRotors.push(rotor)
    turbine.add(nacelle)
    envGroup.add(turbine)
  })

  // 5. 沙漠防风固沙草方格与挡沙栅栏网 (Desert Sand-Fixation Barriers)
  const barrierGroup = new THREE.Group()
  barrierGroup.position.set(-85, 0.1, -55)
  barrierGroup.rotation.y = Math.PI / 4
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 })
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 0.35), fenceMat)
      post.position.set(c * 6, 1.1, r * 5)
      barrierGroup.add(post)

      if (c < 7) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.4, 0.15), fenceMat)
        slat.position.set(c * 6 + 3, 1.1, r * 5)
        barrierGroup.add(slat)
      }
    }
  }
  envGroup.add(barrierGroup)

  // 5. 沙漠耐旱低矮灌木与骆驼刺点缀 (Desert Shrubs)
  const shrubColors = [0x4d6342, 0x5a704d, 0x6e6040]
  const shrubPositions = [
    [-92, 0.2, 35],
    [-78, 0.2, 55],
    [-115, 0.4, 15],
    [85, 0.2, -65],
    [105, 0.4, -40],
    [-60, 0.2, -75],
    [95, 0.3, 50],
  ]
  shrubPositions.forEach(([sx, sy, sz], idx) => {
    const bush = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.6 + (idx % 3) * 0.5, 0),
      new THREE.MeshStandardMaterial({ color: shrubColors[idx % shrubColors.length], roughness: 0.9 }),
    )
    bush.position.set(sx, sy + 1.2, sz)
    bush.scale.set(1.4, 0.8, 1.2)
    envGroup.add(bush)
  })



  // 7. 大漠微风扬沙流动粒子 (Desert Sand Dust Particles)
  const dustCount = 450
  const dustPos = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 360
    dustPos[i * 3 + 1] = 1.0 + Math.random() * 4.5
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 360
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.PointsMaterial({
    color: 0xf59e0b,
    size: 1.5,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
  })
  sandDustParticles = new THREE.Points(dustGeo, dustMat)
  envGroup.add(sandDustParticles)

  scene.add(envGroup)
}

// -------------------------------------------------------------
// 6. 井场地面、进场公路、混凝土加固基台 (彻底杜绝中心地表方块闪烁)
// -------------------------------------------------------------
function buildDesertGroundAndInfrastructure() {
  if (!scene) return
  const group = new THREE.Group()



  // 2. 科技网格与激光同心标尺 (Y = 0.12，高出沙漠地表，彻底杜绝共面)
  const gridHelper = new THREE.PolarGridHelper(160, 16, 8, 64, 0x00f0ff, 0x223c57)
  gridHelper.position.y = 0.12
  group.add(gridHelper)

  // 动态旋转雷达扫描环 (Y = 0.16)
  const ringGeo = new THREE.RingGeometry(94, 97, 64)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
  radarScanRing = new THREE.Mesh(ringGeo, ringMat)
  radarScanRing.rotation.x = -Math.PI / 2
  radarScanRing.position.y = 0.16
  group.add(radarScanRing)

  // 3. 钻井主加固防渗混凝土基台 (物理级分层高度：Y = 0.35 ~ 2.75，厚度 2.4)
  // 关键防闪烁技术：配置 polygonOffset，使得 WebGL 内部自动深度推后，杜绝与边缘线及周围地表共面！
  const padW = 54
  const padH = 2.4
  const padGeo = new THREE.BoxGeometry(padW, padH, 54)
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x2e425b, // 工业级高耐磨防渗加固水泥
    roughness: 0.45,
    metalness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  const pad = new THREE.Mesh(padGeo, padMat)
  pad.position.set(-15, padH / 2 + 0.35, 0) // 底面在 Y = 0.35，顶面在 Y = 2.75
  pad.receiveShadow = true
  pad.castShadow = true
  group.add(pad)

  // 基台表面工业安全警戒边缘条 (Hazard Safety Border)
  const borderGeo = new THREE.BoxGeometry(padW + 0.2, 0.15, padW + 0.2)
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
  const border = new THREE.Mesh(borderGeo, borderMat)
  border.position.set(-15, 2.76, 0)
  group.add(border)

  // 四周水泥倒角护坡坡道 (Bevel Kerb Ramp，连接沙漠与基台，自然过渡消除断层)
  const kerbGeo = new THREE.BoxGeometry(padW + 3.0, 0.4, padW + 3.0)
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0x1e3046, roughness: 0.7 })
  const kerb = new THREE.Mesh(kerbGeo, kerbMat)
  kerb.position.set(-15, 0.2, 0)
  group.add(kerb)

  // 基台四角黄黑警示护柱 (Corner Safety Bollards)
  const cornerOffsets = [
    [-padW / 2 + 2, -padW / 2 + 2],
    [padW / 2 - 2, -padW / 2 + 2],
    [-padW / 2 + 2, padW / 2 - 2],
    [padW / 2 - 2, padW / 2 - 2],
  ]
  cornerOffsets.forEach(([cx, cz]) => {
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 2.0, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7 }),
    )
    bollard.position.set(-15 + cx, 2.75 + 1.0, cz)
    group.add(bollard)
  })

  // 基台边缘霓虹线框 (与 pad 几何完全契合，依靠 polygonOffset 保证表面绝不闪烁)
  const padEdgesGeo = new THREE.EdgesGeometry(padGeo)
  const padEdges = new THREE.LineSegments(
    padEdgesGeo,
    new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 }),
  )
  padEdges.position.copy(pad.position)
  group.add(padEdges)

  // 4. 定井标桩与GNSS差分定位站 (Siting Marker)
  const markerGroup = new THREE.Group()
  markerGroup.position.set(-42, 0.2, 22)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 6, 8), new THREE.MeshStandardMaterial({ color: 0xf59e0b }))
  pole.position.y = 3
  markerGroup.add(pole)
  const domeAntenna = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff }))
  domeAntenna.position.y = 6
  markerGroup.add(domeAntenna)
  group.add(markerGroup)

  // 5. 现代重型液压动力猫道机 (Hydraulic Power Catwalk Machine with V-Trough & Pipe Skate)
  // 彻底告别粗糙实心块：真实展现 API 自动化钻井液压送管机、V型喂料导槽与推管小车
  const catwalkGroup = new THREE.Group()
  catwalkGroup.position.set(-15, 0.2, 28)

  const catSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.28 })
  const catBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.78, roughness: 0.32 })
  const catYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.35 })
  const chromeCyl = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.96, roughness: 0.1 })

  // A. 猫道重型底盘滑道工字主梁 (Base Skid Beam: 28m长)
  for (const sx of [-1.5, 1.5]) {
    const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 28), catSteel)
    mainBeam.position.set(sx, 0.45, 11)
    catwalkGroup.add(mainBeam)
  }

  // B. 中心通长 V 型耐磨喂料导槽 (V-Trough Channel)
  for (const va of [-1, 1]) {
    const vPlate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 26), catSteel)
    vPlate.position.set(va * 0.55, 1.0, 12)
    vPlate.rotation.z = va * (Math.PI / 5.5)
    catwalkGroup.add(vPlate)
  }

  // C. 钻台端液压铰接举升坡道 (Elevating V-Door Ramp: 精确延伸至钻台 V-Door 门槛，绝不内侵钻台工作区)
  const rampLen = 17.2
  // 正向仰角：北端 (-Z) 抬升至钻台 Y = 11.25，南端 (+Z) 伏于猫道槽口 Y = 1.0
  const rampPitch = Math.atan2(10.05, 14.0)
  const rampArm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, rampLen), catBlue)
  rampArm.position.set(0, 6.02, -7.0)
  rampArm.rotation.x = rampPitch
  catwalkGroup.add(rampArm)

  // 坡道顶端钻台搭接过渡舌板 (Threshold Flange Plate - 贴合门槛不穿模)
  const rampLip = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.6), catSteel)
  rampLip.position.set(0, 11.04, -13.9)
  catwalkGroup.add(rampLip)

  // 坡道两侧黄色安全护手导轨
  for (const rx of [-1.7, 1.7]) {
    const rampRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, rampLen), catYellow)
    rampRail.position.set(rx, 6.72, -7.0)
    rampRail.rotation.x = rampPitch
    catwalkGroup.add(rampRail)
  }

  // 双液压变幅举升大油缸 (Twin Heavy Hydraulic Lift Cylinders: 生根于底盘，前顶坡道腹下)
  for (const cx of [-1.2, 1.2]) {
    const cylBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 4.5, 16), catSteel)
    cylBody.position.set(cx, 2.4, -3.8)
    cylBody.rotation.x = -Math.atan2(5.0, 4.65)
    catwalkGroup.add(cylBody)

    const cylRod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.5, 16), chromeCyl)
    cylRod.position.set(cx, 4.25, -6.2)
    cylRod.rotation.x = -Math.atan2(5.0, 4.65)
    catwalkGroup.add(cylRod)
  }

  // D. 液压送管推拔小车 (Pipe Skate Trolley)
  const skateTrolley = new THREE.Group()
  skateTrolley.position.set(0, 1.35, 6)
  const skateBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.8), catYellow)
  skateTrolley.add(skateBody)
  // 顶推钩爪与托管槽
  const skateHead = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.6), catSteel)
  skateHead.position.set(0, 0.5, -1.2)
  skateTrolley.add(skateHead)
  catwalkGroup.add(skateTrolley)

  // G. 正在由液压推车输送上钻台的 API 5-1/2" 重型合金钻杆立根总成 (In-Transit Drill Pipe Stand)
  const pipeDeliveryGroup = new THREE.Group()
  // 斜置在 V 门斜坡与猫道 V 槽之间：斜坡倾角与 rampPitch 一致
  const inTransitPipeLen = 12.0
  pipeDeliveryGroup.position.set(0, 4.4, -4.5)
  pipeDeliveryGroup.rotation.x = rampPitch

  // 钻杆高强合金钢管体 (Quenched Alloy Body)
  const dpBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, inTransitPipeLen, 16),
    new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.92, roughness: 0.22 })
  )
  pipeDeliveryGroup.add(dpBody)

  // 钻杆顶端加厚母接头 (Tool Joint Box - 伸向钻台作业面)
  const toolJointBox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95, roughness: 0.18 })
  )
  toolJointBox.position.y = inTransitPipeLen / 2 + 0.6
  pipeDeliveryGroup.add(toolJointBox)

  // 母接头亮黄色螺纹保护帽 (Thread Protector Cap)
  const threadCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, 0.45, 16),
    catYellow
  )
  threadCap.position.y = inTransitPipeLen / 2 + 1.25
  pipeDeliveryGroup.add(threadCap)

  // API 钢级识别警示色环 (API Grade Marking Rings: 双白标示高钢级 S-135)
  for (const ry of [inTransitPipeLen / 2 - 0.2, inTransitPipeLen / 2 - 0.6]) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.12, 16),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    )
    ring.position.y = ry
    pipeDeliveryGroup.add(ring)
  }

  // 钻杆中部高硬度耐磨带 (Hardbanding Bands - 防止磨损套管)
  for (const hy of [inTransitPipeLen / 2 - 1.8, inTransitPipeLen / 2 - 2.4]) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.25, 16),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.3 })
    )
    band.position.y = hy
    pipeDeliveryGroup.add(band)
  }

  // 钻杆尾端公接头 (Tool Joint Pin - 扣在猫道推车托叉内)
  const toolJointPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 1.0, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95, roughness: 0.18 })
  )
  toolJointPin.position.y = -inTransitPipeLen / 2 - 0.5
  pipeDeliveryGroup.add(toolJointPin)

  catwalkGroup.add(pipeDeliveryGroup)

  // E. 两侧液压翻管臂/翻料踢杆组 (Hydraulic Pipe Kickers & Indexers: 拨管入槽)
  for (let kz = 2; kz <= 22; kz += 5) {
    for (const kx of [-1.8, 1.8]) {
      const kickerArm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.35), catYellow)
      kickerArm.position.set(kx > 0 ? kx + 0.35 : kx - 0.35, 1.15, kz)
      kickerArm.rotation.z = kx > 0 ? -0.35 : 0.35
      catwalkGroup.add(kickerArm)
    }
  }

  // F. 猫道尾端独立的液压集成动力泵站 (HPU Power Pack Skid)
  const hpuBox = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 3.2), catBlue)
  hpuBox.position.set(0, 1.1, 26)
  catwalkGroup.add(hpuBox)

  const hpuMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 14), catSteel)
  hpuMotor.rotation.x = Math.PI / 2
  hpuMotor.position.set(0, 2.4, 26)
  catwalkGroup.add(hpuMotor)

  group.add(catwalkGroup)

  scene.add(group)
}

// -------------------------------------------------------------
// 7. 地下立体阶梯套管剖面 (彻底消除闪烁：顶面严格处于 Y = -0.5 以下，独立展示)
// -------------------------------------------------------------
// -------------------------------------------------------------
// 7. 地下半开放科技地质剖切槽与全息套管剖面 (Open-Face Stratigraphic Cutaway)
// 彻底打破遮挡井筒的浑浊实心方块：前侧与南侧彻底镂空敞开，背壁与西壁呈现层理，侧立高精度深度标尺
// -------------------------------------------------------------
function createStratumCalloutBadge(title: string, desc: string, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = 'rgba(8, 22, 40, 0.92)'
    ctx.fillRect(0, 0, 360, 96)
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.strokeRect(3, 3, 354, 90)

    // 左侧发光色块
    ctx.fillStyle = color
    ctx.fillRect(8, 8, 8, 80)

    // 标题与参数
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText(title, 28, 38)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '16px sans-serif'
    ctx.fillText(desc, 28, 70)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const badgeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.2), badgeMat)
  return badge
}

function createDepthLabelBadge(depthText: string, noteText: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 250
  canvas.height = 72
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = 'rgba(6, 18, 32, 0.94)'
    ctx.fillRect(0, 0, 250, 72)
    ctx.strokeStyle = '#00f0ff'
    ctx.lineWidth = 2
    ctx.strokeRect(2, 2, 246, 68)

    ctx.fillStyle = '#00f0ff'
    ctx.font = 'bold 22px monospace'
    ctx.fillText(depthText, 14, 32)

    ctx.fillStyle = '#cbd5e1'
    ctx.font = '15px sans-serif'
    ctx.fillText(noteText, 14, 58)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.6), mat)
  return mesh
}

// 柔光高斯羽化原油微滴粒子贴图 (彻底消除任何 WebGL 正方形像素方块感，呈现温润流体光晕)
function createSoftOilParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0.0, 'rgba(255, 248, 230, 1.0)') // 核心暖白金原油高光
    grad.addColorStop(0.28, 'rgba(245, 158, 11, 0.90)') // 琥珀金明亮过渡
    grad.addColorStop(0.60, 'rgba(180, 83, 9, 0.45)') // 浓稠黑金原油晕染
    grad.addColorStop(0.85, 'rgba(110, 45, 12, 0.12)') // 柔和外围渐变
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)') // 完全透明超平滑羽化边缘
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// 地下地质层位高精沉积相微相纹理贴图 (1024x512 高清地质露头与岩芯切片级纹理)
function createStratumSedimentaryTexture(type: 'sand' | 'shale' | 'oilSand' | 'granite') {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  if (type === 'sand') {
    // 1. 第四系风成疏松砂岩：板状交错斜层理与波痕韵律层
    ctx.fillStyle = '#2d3d52'
    ctx.fillRect(0, 0, 1024, 512)

    // 斜交沉积层理组 (Cross-Bedding Sets)
    for (let set = 0; set < 8; set++) {
      const baseY = set * 64
      ctx.strokeStyle = 'rgba(70, 95, 125, 0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, baseY)
      ctx.lineTo(1024, baseY + 6)
      ctx.stroke()

      // 组内前积倾斜单层理
      for (let x = -80; x < 1040; x += 18) {
        ctx.strokeStyle = Math.random() > 0.4 ? 'rgba(56, 189, 248, 0.22)' : 'rgba(15, 23, 42, 0.45)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(x, baseY + 6)
        ctx.quadraticCurveTo(x + 25, baseY + 36, x + 50, baseY + 64)
        ctx.stroke()
      }
    }
  } else if (type === 'shale') {
    // 2. 二叠系致密红层泥岩盖层：极薄水平页理与微细铁钙质结核带
    ctx.fillStyle = '#1c2e44'
    ctx.fillRect(0, 0, 1024, 512)

    // 水平微细泥质页理
    for (let y = 0; y < 512; y += 4) {
      const alpha = 0.15 + (Math.sin(y * 0.05) + 1) * 0.18
      ctx.fillStyle = Math.random() > 0.45 ? `rgba(0, 240, 255, ${alpha * 0.4})` : `rgba(8, 14, 24, ${alpha * 1.5})`
      ctx.fillRect(0, y, 1024, 2)
    }

    // 顺层分布的沉积结核透镜斑
    for (let i = 0; i < 90; i++) {
      const cx = Math.random() * 1024
      const cy = Math.random() * 512
      const rx = 8 + Math.random() * 24
      const ry = 2 + Math.random() * 4
      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)'
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (type === 'oilSand') {
    // 3. 三叠系主力高产含油砂岩：沥青质重度原油浸染斑块、孔隙毛细管微网与富油透镜体
    ctx.fillStyle = '#382210'
    ctx.fillRect(0, 0, 1024, 512)

    // 原油饱和浸润斑状渐变底色
    for (let i = 0; i < 35; i++) {
      const ox = Math.random() * 1024
      const oy = Math.random() * 512
      const or = 40 + Math.random() * 80
      const oGrad = ctx.createRadialGradient(ox, oy, 5, ox, oy, or)
      oGrad.addColorStop(0, 'rgba(15, 7, 2, 0.85)') // 核心浓稠黑金重油
      oGrad.addColorStop(0.5, 'rgba(180, 83, 9, 0.55)') // 琥珀原油浸润圈
      oGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)')
      ctx.fillStyle = oGrad
      ctx.fillRect(ox - or, oy - or, or * 2, or * 2)
    }

    // 砂岩微观骨架孔隙原油毛细管流线丝网
    for (let i = 0; i < 800; i++) {
      const px = Math.random() * 1024
      const py = Math.random() * 512
      const pr = 1.2 + Math.random() * 3.5
      ctx.fillStyle = Math.random() > 0.35 ? 'rgba(251, 191, 36, 0.45)' : 'rgba(20, 10, 4, 0.75)'
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fill()
    }

    // 微观导流层理流线
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)'
    ctx.lineWidth = 1.5
    for (let y = 30; y < 512; y += 48) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= 1024; x += 64) {
        ctx.lineTo(x, y + Math.sin(x * 0.02 + y) * 8)
      }
      ctx.stroke()
    }
  } else {
    // 4. 古生界结晶花岗基岩：微晶斑杂结构与高角度剪节理构造裂缝
    ctx.fillStyle = '#121c28'
    ctx.fillRect(0, 0, 1024, 512)

    // 石英与长石微晶粒群
    for (let i = 0; i < 1200; i++) {
      const rx = Math.random() * 1024
      const ry = Math.random() * 512
      const col = Math.random()
      ctx.fillStyle = col > 0.7 ? 'rgba(148, 163, 184, 0.4)' : col > 0.4 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(3, 7, 18, 0.7)'
      ctx.fillRect(rx, ry, 2.5, 2.5)
    }

    // 高角度共轭构造剪切节理裂隙线 (Conjugate Shear Joints)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)'
    ctx.lineWidth = 1.8
    const joints = [
      [120, 0, 450, 512],
      [680, 0, 920, 512],
      [850, 0, 600, 512],
    ]
    joints.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    })
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function buildDesertStratumAndWellbore() {
  if (!scene) return
  const group = new THREE.Group()

  // 1. 半开放科技地质槽剖面 (L-Shaped Cutaway Walls: 北背壁 + 西侧壁 + 底部基岩托盘，前部完全敞开绝无遮挡)
  const cutawayW = 130
  const cutawayD = 48
  const strataCenterX = -10
  const strataBackZ = -18
  const strataWestX = -75

  const strataConfigs = [
    { top: -0.6, thickness: 13.4, color: 0x3d5272, glow: 0x38bdf8, name: '第四系 疏松风成沙层', depthRange: '0 ~ -1000m · 强透水性', texType: 'sand' as const },
    { top: -14.0, thickness: 16.0, color: 0x243e5c, glow: 0x00f0ff, name: '二叠系 致密红层泥岩', depthRange: '-1000 ~ -2100m · 优质区域盖层', texType: 'shale' as const },
    { top: -30.0, thickness: 22.0, color: 0x45311b, glow: 0xf59e0b, name: '三叠系 主力高产油砂层', depthRange: '-2100 ~ -3500m · 孔隙度18.5%', texType: 'oilSand' as const },
    { top: -52.0, thickness: 18.0, color: 0x1a293b, glow: 0x94a3b8, name: '古生界 结晶花岗基岩', depthRange: '-3500m+ · 坚硬不渗透', texType: 'granite' as const },
  ]

  strataConfigs.forEach((layer) => {
    const layerGroup = new THREE.Group()
    const layerTexture = createStratumSedimentaryTexture(layer.texType)

    // A. 北背壁 (North Back Wall) - 位于 Z = strataBackZ，厚度 0.8m，半透明微晶地质质感
    const backGeo = new THREE.BoxGeometry(cutawayW, layer.thickness, 0.8)
    const backMat = new THREE.MeshStandardMaterial({
      color: layer.color,
      map: layerTexture || undefined,
      roughness: 0.45,
      metalness: 0.42,
      transparent: true,
      opacity: 0.52,
    })
    const backWall = new THREE.Mesh(backGeo, backMat)
    backWall.position.set(strataCenterX, layer.top - layer.thickness / 2, strataBackZ)
    backWall.receiveShadow = true
    layerGroup.add(backWall)

    // 背壁表面三维地震反射同相轴层序解释线 (Seismic Horizon Reflectors)
    const seismicReflectorPoints: THREE.Vector3[] = []
    const numWavePts = 24
    for (let r = 1; r <= 2; r++) {
      const refY = layer.top - (layer.thickness * r) / 3
      for (let w = 0; w < numWavePts; w++) {
        const t1 = w / (numWavePts - 1)
        const t2 = (w + 1) / (numWavePts - 1)
        const wx1 = strataCenterX - cutawayW / 2 + t1 * cutawayW
        const wx2 = strataCenterX - cutawayW / 2 + t2 * cutawayW
        const wy1 = refY + Math.sin(t1 * Math.PI * 4 + r) * 0.85
        const wy2 = refY + Math.sin(t2 * Math.PI * 4 + r) * 0.85
        seismicReflectorPoints.push(
          new THREE.Vector3(wx1, wy1, strataBackZ + 0.42),
          new THREE.Vector3(wx2, wy2, strataBackZ + 0.42)
        )
      }
    }
    const seismicGeo = new THREE.BufferGeometry().setFromPoints(seismicReflectorPoints)
    const seismicLineMat = new THREE.LineBasicMaterial({
      color: layer.glow,
      transparent: true,
      opacity: 0.48,
    })
    const seismicLines = new THREE.LineSegments(seismicGeo, seismicLineMat)
    layerGroup.add(seismicLines)

    // 背壁下表面前缘保留层位底界面科技激光线 (Stratum Bottom Interface Line)
    const backLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(strataCenterX - cutawayW / 2, layer.top - layer.thickness, strataBackZ + 0.42),
      new THREE.Vector3(strataCenterX + cutawayW / 2, layer.top - layer.thickness, strataBackZ + 0.42),
    ])
    const backBoundaryLine = new THREE.Line(
      backLineGeo,
      new THREE.LineBasicMaterial({ color: layer.glow, transparent: true, opacity: 0.75 })
    )
    layerGroup.add(backBoundaryLine)

    // B. 西侧壁 (West Side Wall) - 位于 X = strataWestX，进深 cutawayD，厚度 0.8m，半透明交错层理
    const westGeo = new THREE.BoxGeometry(0.8, layer.thickness, cutawayD)
    const westMat = new THREE.MeshStandardMaterial({
      color: layer.color,
      map: layerTexture || undefined,
      roughness: 0.48,
      metalness: 0.4,
      transparent: true,
      opacity: 0.58,
    })
    const westWall = new THREE.Mesh(westGeo, westMat)
    westWall.position.set(strataWestX, layer.top - layer.thickness / 2, strataBackZ + cutawayD / 2)
    westWall.receiveShadow = true
    layerGroup.add(westWall)

    // 西侧壁表面倾向倾角微层理倾斜剖切线 (West Wall Stratum Dip Lines)
    const westDipPts: THREE.Vector3[] = []
    for (let d = 1; d <= 2; d++) {
      const startY = layer.top - (layer.thickness * d) / 3
      const endY = startY - 2.2
      westDipPts.push(
        new THREE.Vector3(strataWestX + 0.42, startY, strataBackZ + 2),
        new THREE.Vector3(strataWestX + 0.42, endY, strataBackZ + cutawayD - 2)
      )
    }
    const westDipGeo = new THREE.BufferGeometry().setFromPoints(westDipPts)
    const westDipLines = new THREE.LineSegments(
      westDipGeo,
      new THREE.LineBasicMaterial({ color: layer.glow, transparent: true, opacity: 0.45 })
    )
    layerGroup.add(westDipLines)

    // 西侧壁底界面分割线
    const westLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(strataWestX + 0.42, layer.top - layer.thickness, strataBackZ),
      new THREE.Vector3(strataWestX + 0.42, layer.top - layer.thickness, strataBackZ + cutawayD),
    ])
    const westBoundaryLine = new THREE.Line(
      westLineGeo,
      new THREE.LineBasicMaterial({ color: layer.glow, transparent: true, opacity: 0.75 })
    )
    layerGroup.add(westBoundaryLine)

    // C. 右侧地质层位悬浮全息标牌与指引激光线 (Holographic Stratum Callout)
    const badgeY = layer.top - layer.thickness / 2
    const badge = createStratumCalloutBadge(layer.name, layer.depthRange, `#${new THREE.Color(layer.glow).getHexString()}`)
    badge.position.set(58, badgeY, strataBackZ + 4)
    layerGroup.add(badge)

    // 导引激光引线 (Guide Leader Line)
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(strataCenterX + cutawayW / 2 - 2, badgeY, strataBackZ),
      new THREE.Vector3(50, badgeY, strataBackZ + 4),
    ])
    const leaderLine = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: layer.glow, transparent: true, opacity: 0.85 })
    )
    layerGroup.add(leaderLine)

    // 闪烁指示光球
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 8, 8),
      new THREE.MeshBasicMaterial({ color: layer.glow })
    )
    dot.position.set(strataCenterX + cutawayW / 2 - 2, badgeY, strataBackZ)
    layerGroup.add(dot)

    group.add(layerGroup)
  })

  // 全息数字化背壁测井标定方格光栅网 (Holographic Seismic Voxel Grid Matrix)
  const gridPts: THREE.Vector3[] = []
  // 垂直网格线 (每隔 15m)
  for (let gx = strataCenterX - cutawayW / 2 + 10; gx < strataCenterX + cutawayW / 2; gx += 15) {
    gridPts.push(
      new THREE.Vector3(gx, -0.6, strataBackZ + 0.41),
      new THREE.Vector3(gx, -70.0, strataBackZ + 0.41)
    )
  }
  // 水平网格线 (每隔 10m)
  for (let gy = -10; gy >= -65; gy -= 10) {
    gridPts.push(
      new THREE.Vector3(strataCenterX - cutawayW / 2, gy, strataBackZ + 0.41),
      new THREE.Vector3(strataCenterX + cutawayW / 2, gy, strataBackZ + 0.41)
    )
  }
  const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPts)
  const gridLines = new THREE.LineSegments(
    gridGeo,
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18 })
  )
  group.add(gridLines)

  // 底部微晶科技托架 (Ultra-Thin Translucent Bedrock Base Tray - 摆脱3米死黑厚块压抑感)
  const floorGeo = new THREE.BoxGeometry(cutawayW + 2, 0.45, cutawayD + 2)
  const floorMesh = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.28,
      metalness: 0.85,
    })
  )
  floorMesh.position.set(strataCenterX, -70.22, strataBackZ + cutawayD / 2)
  group.add(floorMesh)

  // 底部托架高亮青蓝霓虹边框线 (Neon Base Rim Line)
  const baseRimGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(strataCenterX - cutawayW / 2 - 1, -70.0, strataBackZ - 1),
    new THREE.Vector3(strataCenterX + cutawayW / 2 + 1, -70.0, strataBackZ - 1),
    new THREE.Vector3(strataCenterX + cutawayW / 2 + 1, -70.0, strataBackZ + cutawayD + 1),
    new THREE.Vector3(strataCenterX - cutawayW / 2 - 1, -70.0, strataBackZ + cutawayD + 1),
    new THREE.Vector3(strataCenterX - cutawayW / 2 - 1, -70.0, strataBackZ - 1),
  ])
  const baseRimLine = new THREE.Line(
    baseRimGeo,
    new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
  )
  group.add(baseRimLine)

  // 托架四角微型防震合金安装座 (Corner Damping Brackets)
  const bracketGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.8, 6)
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 })
  const cornerCoords = [
    [strataCenterX - cutawayW / 2, strataBackZ],
    [strataCenterX + cutawayW / 2, strataBackZ],
    [strataCenterX + cutawayW / 2, strataBackZ + cutawayD],
    [strataCenterX - cutawayW / 2, strataBackZ + cutawayD],
  ]
  cornerCoords.forEach(([cx, cz]) => {
    const bracket = new THREE.Mesh(bracketGeo, bracketMat)
    bracket.position.set(cx, -70.2, cz)
    group.add(bracket)
  })

  // 2. 垂直科技深度刻度标尺立柱 (3D Stratigraphic Depth Scale Column)
  const depthColumnGroup = new THREE.Group()
  const colX = strataWestX
  const colZ = strataBackZ + cutawayD

  // 垂直高耸方钢标尺立柱
  const mastGeo = new THREE.CylinderGeometry(0.8, 0.8, 70, 8)
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 })
  const colMast = new THREE.Mesh(mastGeo, mastMat)
  colMast.position.set(colX, -35, colZ)
  depthColumnGroup.add(colMast)

  // 柱身青蓝科技发光线
  const colStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 70, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff })
  )
  colStrip.position.set(colX, -35, colZ + 0.85)
  depthColumnGroup.add(colStrip)

  // 深度刻度标牌节点 (0m, -1000m, -2000m, -3200m, -4500m)
  const depthMilestones = [
    { y: -0.6, depth: '0m', note: '地表基准井口' },
    { y: -14.0, depth: '-1000m', note: '表层套管完钻封固' },
    { y: -30.0, depth: '-2000m', note: '技术套管隔离层' },
    { y: -44.0, depth: '-3200m', note: '三叠系主力产油层' },
    { y: -68.0, depth: '-4500m', note: '终孔设计设计靶深' },
  ]

  depthMilestones.forEach(m => {
    // 刻度环
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.45, 16),
      new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9 })
    )
    ring.position.set(colX, m.y, colZ)
    depthColumnGroup.add(ring)

    // 水平激光标尺线指向井眼
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(colX, m.y, colZ),
      new THREE.Vector3(colX + 16, m.y, colZ),
    ])
    const laserLine = new THREE.Line(
      laserGeo,
      new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
    )
    depthColumnGroup.add(laserLine)

    // 刻度牌
    const badge = createDepthLabelBadge(m.depth, m.note)
    badge.position.set(colX - 6.5, m.y, colZ)
    depthColumnGroup.add(badge)
  })
  group.add(depthColumnGroup)

  // 3. 通透无遮挡阶梯套管组与水泥环 (Casing & Cementing Assembly)
  const wellboreGroup = new THREE.Group()
  wellboreGroup.position.set(-15, 0, 0) // 井口严格对准钻台中心

  // 高强度 API Spec 5CT P110/Q125 淬火重载深井合金钢套管材质 (Dark Gunmetal Alloy Casing)
  const casingSteel = new THREE.MeshStandardMaterial({
    color: 0x223246,
    metalness: 0.94,
    roughness: 0.25,
  })
  const collarSteel = new THREE.MeshStandardMaterial({
    color: 0x334458,
    metalness: 0.96,
    roughness: 0.18,
  })
  const apiGradeYellow = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  const chromeCollar = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.98,
    roughness: 0.1,
  })

  // 1. 表层套管 (Surface Casing 20")
  const surfCasing = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 16, 24), casingSteel)
  surfCasing.position.y = -8
  wellboreGroup.add(surfCasing)

  // 表层套管接箍环与 API 钢级橙金色标带 (Casing Collars with Grade Bands)
  for (let cy = -2; cy >= -14; cy -= 4) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.65, 24), collarSteel)
    collar.position.y = cy
    wellboreGroup.add(collar)

    const gradeBand = new THREE.Mesh(new THREE.CylinderGeometry(2.52, 2.52, 0.16, 24), apiGradeYellow)
    gradeBand.position.y = cy
    wellboreGroup.add(gradeBand)
  }

  // 固井水泥环 (真实微粒砂灰岩石胶结层，半透明呈现套管层阶)
  const cementMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.85,
    metalness: 0.1,
    transparent: true,
    opacity: 0.52,
  })
  const surfCement = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 16, 24), cementMat)
  surfCement.position.y = -8
  wellboreGroup.add(surfCement)

  // 套管鞋 (Casing Shoe)
  const shoe1 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.1, 1.2, 24), chromeCollar)
  shoe1.position.y = -16
  wellboreGroup.add(shoe1)

  // 2. 技术套管 (Intermediate Casing 13-3/8")
  const interCasing = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 18, 24), casingSteel)
  interCasing.position.y = -25
  wellboreGroup.add(interCasing)

  for (let cy = -19; cy >= -31; cy -= 4) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.92, 0.55, 24), collarSteel)
    collar.position.y = cy
    wellboreGroup.add(collar)

    const gradeBand = new THREE.Mesh(new THREE.CylinderGeometry(1.94, 1.94, 0.14, 24), apiGradeYellow)
    gradeBand.position.y = cy
    wellboreGroup.add(gradeBand)
  }

  const interCement = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 18, 24), cementMat)
  interCement.position.y = -25
  wellboreGroup.add(interCement)

  const shoe2 = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.6, 1.2, 24), chromeCollar)
  shoe2.position.y = -34
  wellboreGroup.add(shoe2)

  // 3. 生产套管 (Production Casing 7") - 带有 180° 超宽广角半剖视窗展示深井抽油机械与原油涌流
  const prodCasingUpper = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 6, 24), casingSteel)
  prodCasingUpper.position.y = -37
  wellboreGroup.add(prodCasingUpper)

  // 半剖透视段 (Half-Cutaway Casing Section: Y = -40 ~ -52) - 角度正对正面主视角
  const cutawayCasingGeo = new THREE.CylinderGeometry(1.25, 1.25, 14, 24, 1, false, 0, Math.PI * 1.25)
  const prodCasingCutaway = new THREE.Mesh(cutawayCasingGeo, casingSteel)
  prodCasingCutaway.rotation.y = Math.PI * 0.72
  prodCasingCutaway.position.y = -47
  wellboreGroup.add(prodCasingCutaway)

  // 视窗剖切口厚度高光边框线 (Machined Cutaway Bevel Highlight Edge) - 高清冷光轮廓
  const cutawayEdgeGeo = new THREE.EdgesGeometry(cutawayCasingGeo)
  const cutawayEdgeLine = new THREE.LineSegments(
    cutawayEdgeGeo,
    new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
  )
  cutawayEdgeLine.rotation.copy(prodCasingCutaway.rotation)
  cutawayEdgeLine.position.copy(prodCasingCutaway.position)
  wellboreGroup.add(cutawayEdgeLine)

  // 底部闭合套管段
  const prodCasingLower = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 6, 24), casingSteel)
  prodCasingLower.position.y = -57
  wellboreGroup.add(prodCasingLower)

  // 4. 深井机械有杆抽油泵核心机械总成 (Subsurface Sucker Rod Pump Assembly)
  // A. 悬垂抽油杆柱 (Sucker Rod String) - 贯穿井眼中心，随抽油机往复做垂直抽汲运动！
  subsurfaceSuckerRod = new THREE.Group()
  const rodMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.15 })
  const rodShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 44, 12), rodMat)
  rodShaft.position.y = -22
  subsurfaceSuckerRod.add(rodShaft)

  // 抽油杆六角接箍与耐磨尼龙扶正块 (Couplings & Centralizers)
  for (let ry = -4; ry >= -40; ry -= 5.5) {
    const rCoupling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9 })
    )
    rCoupling.position.y = ry
    subsurfaceSuckerRod.add(rCoupling)

    // 三翼扶正刮蜡器
    const wing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.35, 3),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    )
    wing.position.y = ry + 0.6
    subsurfaceSuckerRod.add(wing)
  }

  // B. 抽油泵柱塞总成 (Pump Plunger Assembly) - 位于油层射孔段
  const plungerGroup = new THREE.Group()
  plungerGroup.position.y = -43

  // 镀铬精密抽油柱塞 (带环形密封迷宫槽)
  const plungerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.98, roughness: 0.08 })
  pumpPlungerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 7.2, 16), plungerMat)
  plungerGroup.add(pumpPlungerMesh)

  // 柱塞顶端游动阀座与发光金黄色游动阀球 (Traveling Ball Valve)
  const tValveCage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 1.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 })
  )
  tValveCage.position.y = 3.6
  plungerGroup.add(tValveCage)

  travelingValveMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  )
  travelingValveMesh.position.y = 3.6
  plungerGroup.add(travelingValveMesh)

  subsurfaceSuckerRod.add(plungerGroup)
  wellboreGroup.add(subsurfaceSuckerRod)

  // C. 泵筒固定阀与底部防砂过滤吸入管 (Stationary Barrel & Standing Valve)
  const standingValveGroup = new THREE.Group()
  standingValveGroup.position.y = -48.5

  const sValveBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 1.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
  )
  standingValveGroup.add(sValveBody)

  // 发光固定阀球 (Standing Valve Ball)
  standingValveMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  )
  standingValveMesh.position.y = 0.2
  standingValveGroup.add(standingValveMesh)

  // 底部防砂过滤花管 (Slotted Strainer Pipe)
  const strainer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 4.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: true })
  )
  strainer.position.y = -2.6
  standingValveGroup.add(strainer)

  wellboreGroup.add(standingValveGroup)

  // 生产层金黄色射孔孔眼 (Perforation Clusters)
  for (let p = -36; p >= -50; p -= 1.8) {
    const perfRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.36, 0.18, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    )
    perfRing.rotation.x = Math.PI / 2
    perfRing.position.y = p
    wellboreGroup.add(perfRing)
  }

  // 4. 生产套管内部：采出原油高速升举动态油柱 (Upward Produced Oil Column inside Tubing)
  // 位于 Y = -34 ~ -54 的半剖生产管柱内部，呈现深黑金至明亮琥珀原油流体流动
  const oilColGeo = new THREE.CylinderGeometry(0.85, 0.85, 22, 16)
  const oilColMat = new THREE.MeshStandardMaterial({
    color: 0x2b1502,
    roughness: 0.15,
    metalness: 0.95,
    transparent: true,
    opacity: 0.82,
  })
  producedOilColumnMesh = new THREE.Mesh(oilColGeo, oilColMat)
  producedOilColumnMesh.position.y = -44
  wellboreGroup.add(producedOilColumnMesh)

  // 井筒内部伴生天然气微气泡与高亮油滴粒子 (Rising Gas Bubbles & Oil Droplets)
  const bubbleCount = 220
  const bPos = new Float32Array(bubbleCount * 3)
  const bColors = new Float32Array(bubbleCount * 3)
  const amberColor = new THREE.Color(0xf59e0b)
  const bubbleCyan = new THREE.Color(0x38bdf8)

  for (let i = 0; i < bubbleCount; i++) {
    const r = Math.random() * 0.72
    const theta = Math.random() * Math.PI * 2
    bPos[i * 3] = Math.cos(theta) * r
    bPos[i * 3 + 1] = -54 + Math.random() * 22
    bPos[i * 3 + 2] = Math.sin(theta) * r

    const c = Math.random() > 0.35 ? amberColor : bubbleCyan
    bColors[i * 3] = c.r
    bColors[i * 3 + 1] = c.g
    bColors[i * 3 + 2] = c.b
  }
  const softOilSprite = createSoftOilParticleTexture()

  const bGeo = new THREE.BufferGeometry()
  bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3))
  bGeo.setAttribute('color', new THREE.BufferAttribute(bColors, 3))
  producedOilBubbles = new THREE.Points(
    bGeo,
    new THREE.PointsMaterial({
      size: 2.2,
      map: softOilSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )
  wellboreGroup.add(producedOilBubbles)

  // MWD 随钻测井探测波
  const waveGeo = new THREE.CylinderGeometry(6.2, 6.2, 1.4, 24, 1, true)
  const waveMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
  loggingProbeWave = new THREE.Mesh(waveGeo, waveMat)
  loggingProbeWave.position.y = -44
  wellboreGroup.add(loggingProbeWave)

  group.add(wellboreGroup)

  // 5. 泥浆环空高速上返流体粒子 (Mud Annular Return Particles - 采用柔光微粒彻底消除像素块)
  const mudCount = 280
  const mPos = new Float32Array(mudCount * 3)
  for (let i = 0; i < mudCount; i++) {
    const isUp = i % 2 === 0
    mPos[i * 3] = -15 + (Math.random() - 0.5) * (isUp ? 2.4 : 0.7)
    mPos[i * 3 + 1] = -Math.random() * 54
    mPos[i * 3 + 2] = (Math.random() - 0.5) * (isUp ? 2.4 : 0.7)
  }
  const mGeo = new THREE.BufferGeometry()
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3))
  mudCirculationParticles = new THREE.Points(
    mGeo,
    new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 2.2,
      map: softOilSprite,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )
  group.add(mudCirculationParticles)

  // 6. 三维有机起伏高反光多相原油储层实体 (Three-Tiered Organic Reservoir Body: 气顶穹窿 + 黑金油层 + 底水相)
  // 采用双层流体有机凹凸波面：深邃黑金半透基底 + 内部琥珀流光微相，彻底告别硬方盒与圆柱切片
  const reservoirGeo = new THREE.CylinderGeometry(38, 44, 16, 48, 8)
  const resPos = reservoirGeo.attributes.position
  for (let i = 0; i < resPos.count; i++) {
    const px = resPos.getX(i)
    const py = resPos.getY(i)
    const pz = resPos.getZ(i)
    const dist = Math.sqrt(px * px + pz * pz)
    // 真实含油砂岩沉积微相起伏波
    const noise = Math.sin(px * 0.12) * Math.cos(pz * 0.12) * 2.2 + Math.sin(py * 0.25) * 1.4
    // 井筒中心产生抽吸向心缓坡汇聚 (Cone of Depression)
    const suction = dist < 14 ? (1 - dist / 14) * -2.8 : 0
    resPos.setXYZ(i, px + Math.sin(py * 0.3) * 1.1, py + noise + suction, pz + Math.cos(px * 0.2) * 1.1)
  }
  reservoirGeo.computeVertexNormals()

  const oilFluidMat = new THREE.MeshStandardMaterial({
    color: 0x140802, // 深邃黑金重质原油基底
    emissive: 0x3d1402, // 内部深沉原油地温温润微光
    emissiveIntensity: 0.45,
    roughness: 0.08, // 极致湿润镜面高光反射
    metalness: 0.95,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  })
  oilReservoirFluidMesh = new THREE.Mesh(reservoirGeo, oilFluidMat)
  oilReservoirFluidMesh.position.set(-15, -42, 2)
  oilReservoirFluidMesh.scale.set(1.2, 1.0, 0.75) // 沿地质走向延展
  group.add(oilReservoirFluidMesh)

  // 内部高饱和富油琥珀流光核心 (High-Saturation Amber Oil Core)
  const coreGeo = new THREE.CylinderGeometry(25, 29, 9, 36)
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // 琥珀原油流金微相
    emissive: 0xb45309, // 琥珀原油高亮自发光核心
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.88,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  })
  const oilCoreMesh = new THREE.Mesh(coreGeo, coreMat)
  oilCoreMesh.position.set(-15, -43, 2)
  oilCoreMesh.scale.set(1.18, 1.0, 0.74)
  group.add(oilCoreMesh)

  // 井筒射孔孔眼高压原油高光喷涌射流束 (Perforation Inflow Jets - 与抽油机冲程做脉冲联动)
  perforationJets = []
  for (let j = 0; j < 8; j++) {
    const angle = (j * Math.PI * 2) / 8
    const jetCurve = new THREE.LineCurve3(
      new THREE.Vector3(-15 + Math.cos(angle) * 7.5, -43 + Math.sin(j * 1.5) * 4.0, Math.sin(angle) * 5.5),
      new THREE.Vector3(-15 + Math.cos(angle) * 1.4, -43, Math.sin(angle) * 1.4)
    )
    const jetMesh = new THREE.Mesh(
      new THREE.TubeGeometry(jetCurve, 10, 0.16, 6, false),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 })
    )
    perforationJets.push(jetMesh)
    group.add(jetMesh)
  }

  // 井下射孔孔眼喷射高压原油微雾光晕粒子群 (Perforation Atomized Mist Halos)
  const mistCount = 240
  const mistPos = new Float32Array(mistCount * 3)
  const mistColors = new Float32Array(mistCount * 3)
  const amberMist = new THREE.Color(0xfbbf24)
  const goldMist = new THREE.Color(0xf59e0b)

  for (let j = 0; j < 8; j++) {
    const angle = (j * Math.PI * 2) / 8
    const rootX = -15 + Math.cos(angle) * 1.45
    const rootY = -43 + ((j % 3) - 1) * 1.2
    const rootZ = Math.sin(angle) * 1.45

    for (let k = 0; k < 30; k++) {
      const pIdx = (j * 30 + k) * 3
      const spread = 0.85
      mistPos[pIdx] = rootX + (Math.random() - 0.5) * spread
      mistPos[pIdx + 1] = rootY + (Math.random() - 0.5) * spread
      mistPos[pIdx + 2] = rootZ + (Math.random() - 0.5) * spread

      const c = Math.random() > 0.4 ? amberMist : goldMist
      mistColors[pIdx] = c.r
      mistColors[pIdx + 1] = c.g
      mistColors[pIdx + 2] = c.b
    }
  }

  const mistGeo = new THREE.BufferGeometry()
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3))
  mistGeo.setAttribute('color', new THREE.BufferAttribute(mistColors, 3))
  perforationMistPoints = new THREE.Points(
    mistGeo,
    new THREE.PointsMaterial({
      size: 3.2,
      map: softOilSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )
  group.add(perforationMistPoints)

  // 油气顶界面微光盘与轻烃微晶穹窿 (Gas-Oil Contact GOC Level at -30m)
  const gocGeo = new THREE.PlaneGeometry(cutawayW * 0.72, cutawayD * 0.75)
  const gocMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  gasCapPlane = new THREE.Mesh(gocGeo, gocMat)
  gasCapPlane.rotation.x = -Math.PI / 2
  gasCapPlane.position.set(-15, -30.2, strataBackZ + cutawayD * 0.42)
  group.add(gasCapPlane)

  // 气顶半透明轻烃透镜穹窿 (Gas Cap Dome Lens)
  const gasDomeGeo = new THREE.CylinderGeometry(28, 38, 2.8, 32)
  const gasDomeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  })
  const gasCapDome = new THREE.Mesh(gasDomeGeo, gasDomeMat)
  gasCapDome.position.set(-15, -31.4, 2)
  gasCapDome.scale.set(1.18, 1.0, 0.74)
  group.add(gasCapDome)

  // 油水界面微光底盘 (Oil-Water Contact OWC Level at -49m)
  const owcGeo = new THREE.PlaneGeometry(cutawayW * 0.72, cutawayD * 0.75)
  const owcMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const owcPlane = new THREE.Mesh(owcGeo, owcMat)
  owcPlane.rotation.x = -Math.PI / 2
  owcPlane.position.set(-15, -49, strataBackZ + cutawayD * 0.42)
  group.add(owcPlane)

  // 7. 三维平滑向心汇聚原油流体流线束 (Smooth Capillary Inflow Streamlines)
  // 代替散乱像素杂点：原油在多孔砂岩中沿 28 组平滑流体曲线向井眼孔眼汇集
  const streamlineGroup = new THREE.Group()
  const streamlineMat = new THREE.LineBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.65,
  })
  for (let s = 0; s < 28; s++) {
    const sAngle = (s * Math.PI * 2) / 28
    const sRad = 12 + (s % 4) * 8
    const startPt = new THREE.Vector3(
      -15 + Math.cos(sAngle) * sRad,
      -36 - (s % 5) * 2.2,
      Math.sin(sAngle) * (sRad * 0.72)
    )
    const midPt = new THREE.Vector3(
      -15 + Math.cos(sAngle + 0.3) * (sRad * 0.45),
      -42 + Math.sin(s) * 1.2,
      Math.sin(sAngle + 0.3) * (sRad * 0.35)
    )
    const endPt = new THREE.Vector3(-15 + Math.cos(sAngle) * 1.4, -43.0, Math.sin(sAngle) * 1.4)

    const sCurve = new THREE.CatmullRomCurve3([startPt, midPt, endPt])
    const sLineGeo = new THREE.BufferGeometry().setFromPoints(sCurve.getPoints(16))
    const sLine = new THREE.Line(sLineGeo, streamlineMat)
    streamlineGroup.add(sLine)
  }
  group.add(streamlineGroup)

  // 三维水力压裂人工主裂缝网络与微震监测系统 (Hydraulic Fracturing Network & Microseismic Events)
  // 模拟现代非常规油气压裂改造：以射孔孔眼段为原点向储层东西两侧伸展多级树枝状人工裂隙导流通道
  const fracSegments: THREE.Vector3[] = []
  const microseismicPts: THREE.Vector3[] = []

  // 东西两侧双翼压裂主干裂缝 (East-West Major Hydraulic Frac Wings)
  const fracWings = [
    { dirX: 1, count: 6, angleOffset: 0.15 },
    { dirX: -1, count: 6, angleOffset: -0.15 },
  ]

  fracWings.forEach(({ dirX, count, angleOffset }) => {
    for (let w = 0; w < count; w++) {
      const startY = -40 - (w % 4) * 1.8
      let curX = -15 + dirX * 1.5
      let curY = startY
      let curZ = Math.sin(w * 1.8) * 1.2

      const steps = 4 + (w % 3)
      for (let st = 0; st < steps; st++) {
        const nextX = curX + dirX * (4.5 + Math.random() * 3.5)
        const nextY = curY + (Math.random() - 0.5) * 1.6
        const nextZ = curZ + (Math.sin(st + w) * 1.8 + angleOffset * 2.0)

        fracSegments.push(new THREE.Vector3(curX, curY, curZ), new THREE.Vector3(nextX, nextY, nextZ))

        // 二级分叉微裂隙 (Secondary Branching Micro-Fissures)
        if (st >= 1 && Math.random() > 0.3) {
          const branchX = nextX + dirX * (Math.random() * 3.0)
          const branchY = nextY + (Math.random() - 0.5) * 3.2
          const branchZ = nextZ + (Math.random() - 0.5) * 3.8
          fracSegments.push(new THREE.Vector3(nextX, nextY, nextZ), new THREE.Vector3(branchX, branchY, branchZ))

          // 记录微裂隙尖端微震监测事件点 (Microseismic Event Dot)
          microseismicPts.push(new THREE.Vector3(branchX, branchY, branchZ))
        }

        // 主裂缝破裂前缘微震点
        if (Math.random() > 0.4) {
          microseismicPts.push(new THREE.Vector3(nextX, nextY, nextZ))
        }

        curX = nextX
        curY = nextY
        curZ = nextZ
      }
    }
  })

  // 压裂发光裂缝线网
  const fracGeo = new THREE.BufferGeometry().setFromPoints(fracSegments)
  const fracMat = new THREE.LineBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.72,
  })
  const fractureLines = new THREE.LineSegments(fracGeo, fracMat)
  group.add(fractureLines)

  // 微震监测高亮点云 (Microseismic Energy Emission Points - 天青色/金黄脉冲能量响应)
  if (microseismicPts.length > 0) {
    const msCount = microseismicPts.length
    const msPos = new Float32Array(msCount * 3)
    const msColors = new Float32Array(msCount * 3)
    const cCyan = new THREE.Color(0x00f0ff)
    const cGold = new THREE.Color(0xf59e0b)

    for (let i = 0; i < msCount; i++) {
      const p = microseismicPts[i]
      msPos[i * 3] = p.x
      msPos[i * 3 + 1] = p.y
      msPos[i * 3 + 2] = p.z

      const c = i % 3 === 0 ? cCyan : cGold
      msColors[i * 3] = c.r
      msColors[i * 3 + 1] = c.g
      msColors[i * 3 + 2] = c.b
    }

    const msGeo = new THREE.BufferGeometry()
    msGeo.setAttribute('position', new THREE.BufferAttribute(msPos, 3))
    msGeo.setAttribute('color', new THREE.BufferAttribute(msColors, 3))
    const microseismicMesh = new THREE.Points(
      msGeo,
      new THREE.PointsMaterial({
        size: 2.8,
        map: softOilSprite,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    group.add(microseismicMesh)
  }

  // 8. 储层原油孔隙向井筒汇聚的动态达西渗流柔光微滴群 (Soft Glowing Viscous Darcy Droplets)
  // 采用高斯羽化软光晕贴图，彻底告别刺眼正方形像素块，呈现丝滑流体光晕
  const seepCount = 1100
  const sPos = new Float32Array(seepCount * 3)
  const sColors = new Float32Array(seepCount * 3)
  const goldColor = new THREE.Color(0xf59e0b)
  const brightAmber = new THREE.Color(0xfbbf24)
  const deepCrude = new THREE.Color(0xd97706)

  for (let i = 0; i < seepCount; i++) {
    const radius = 3.5 + Math.random() * 44
    const theta = Math.random() * Math.PI * 2
    sPos[i * 3] = -15 + Math.cos(theta) * radius
    sPos[i * 3 + 1] = -34 - Math.random() * 17
    sPos[i * 3 + 2] = Math.sin(theta) * (radius * 0.72)

    const randC = Math.random()
    const c = randC > 0.55 ? brightAmber : randC > 0.2 ? goldColor : deepCrude
    sColors[i * 3] = c.r
    sColors[i * 3 + 1] = c.g
    sColors[i * 3 + 2] = c.b
  }
  const sGeo = new THREE.BufferGeometry()
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
  sGeo.setAttribute('color', new THREE.BufferAttribute(sColors, 3))
  oilSeepageParticles = new THREE.Points(
    sGeo,
    new THREE.PointsMaterial({
      size: 3.2,
      map: softOilSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )
  group.add(oilSeepageParticles)

  // 9. 地质剖面三叠系含油砂岩原生原油渗出细流 (Rock Wall Viscous Crude Oil Trickles)
  // 模拟真实富油岩芯切面原油自发微孔渗出溢淌，呈现高光黑金原油缓缓淌下挂壁油痕
  const trickleMat = new THREE.MeshStandardMaterial({
    color: 0x140701,
    roughness: 0.08,
    metalness: 0.96,
    transparent: true,
    opacity: 0.92,
  })
  const trickleDropletGeo = new THREE.SphereGeometry(0.24, 8, 8)
  oilWallTrickles = []

  // 北背壁渗流 (North Cutaway Wall Trickles, Z = strataBackZ + 0.42)
  const northXCoords = [-58, -48, -36, -26, -6, 8, 20, 32, 44]
  northXCoords.forEach((tx, idx) => {
    const topY = -31 - (idx % 3) * 1.5
    const btmY = -48 - (idx % 2) * 2.0
    const midY = (topY + btmY) * 0.5
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tx, topY, strataBackZ + 0.44),
      new THREE.Vector3(tx + (idx % 2 === 0 ? 0.6 : -0.6), midY, strataBackZ + 0.48),
      new THREE.Vector3(tx + (idx % 3 === 0 ? -0.4 : 0.4), btmY + 2, strataBackZ + 0.46),
      new THREE.Vector3(tx, btmY, strataBackZ + 0.44),
    ])
    const tMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.16 + (idx % 3) * 0.05, 8, false), trickleMat)
    group.add(tMesh)
    oilWallTrickles.push(tMesh)

    // 渗流末端悬垂油滴 (Viscous Teardrop Bead)
    const droplet = new THREE.Mesh(trickleDropletGeo, trickleMat)
    droplet.scale.set(1.0, 1.4, 1.0)
    droplet.position.set(tx, btmY - 0.25, strataBackZ + 0.46)
    group.add(droplet)
  })

  // 西侧壁渗流 (West Cutaway Wall Trickles, X = strataWestX + 0.42)
  const westZCoords = [-12, -4, 4, 12, 18, 26, 34]
  westZCoords.forEach((tz, idx) => {
    const topY = -31.5 - (idx % 3) * 1.2
    const btmY = -48.5 - (idx % 2) * 2.2
    const midY = (topY + btmY) * 0.5
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(strataWestX + 0.44, topY, tz),
      new THREE.Vector3(strataWestX + 0.48, midY, tz + (idx % 2 === 0 ? 0.5 : -0.5)),
      new THREE.Vector3(strataWestX + 0.46, btmY + 2, tz + (idx % 3 === 0 ? -0.4 : 0.4)),
      new THREE.Vector3(strataWestX + 0.44, btmY, tz),
    ])
    const tMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.16 + (idx % 3) * 0.05, 8, false), trickleMat)
    group.add(tMesh)
    oilWallTrickles.push(tMesh)

    const droplet = new THREE.Mesh(trickleDropletGeo, trickleMat)
    droplet.scale.set(1.0, 1.4, 1.0)
    droplet.position.set(strataWestX + 0.46, btmY - 0.25, tz)
    group.add(droplet)
  })

  // 9. 数字孪生智能地下地质透明勘探剖切窗口与透视引导激光 (Digital Twin Seismic Slice Window)
  // 解决地表实心地面遮挡地下油藏的问题：在基台北侧地表开辟半透明科技微晶透视窗与激光引导框
  const windowGroup = new THREE.Group()
  windowGroup.position.set(strataCenterX, 0.22, strataBackZ + cutawayD * 0.45)

  // A. 半透明微晶科技勘探透视板 (Translucent Geological Glass Aperture)
  const glassGeo = new THREE.PlaneGeometry(cutawayW * 0.95, cutawayD * 0.9)
  const glassMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const glassMesh = new THREE.Mesh(glassGeo, glassMat)
  glassMesh.rotation.x = -Math.PI / 2
  windowGroup.add(glassMesh)

  // B. 勘探窗口四周霓虹科技发光护栏与边框 (Seismic Survey Boundary Ring)
  const borderEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(cutawayW * 0.95, 0.4, cutawayD * 0.9)),
    new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
  )
  windowGroup.add(borderEdges)

  // C. 四角重型全息勘探垂直激光标定立柱 (Survey Laser Corner Pillars)
  const halfWinW = (cutawayW * 0.95) / 2
  const halfWinD = (cutawayD * 0.9) / 2
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
  for (const cx of [-halfWinW, halfWinW]) {
    for (const cz of [-halfWinD, halfWinD]) {
      const pCol = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 3.2, 8), pillarMat)
      pCol.position.set(cx, 1.6, cz)
      windowGroup.add(pCol)

      // 顶部垂直向下穿透地底的高能勘探激光束 (Penetrating Downward Seismic Laser Line)
      const laserGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(cx, 3.2, cz),
        new THREE.Vector3(cx, -68, cz),
      ])
      const laserLine = new THREE.Line(
        laserGeo,
        new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65 })
      )
      windowGroup.add(laserLine)
    }
  }

  group.add(windowGroup)

  scene.add(group)
}

// -------------------------------------------------------------
// 8. 完整格构钻塔 (立根台、立根管柱、顶驱水龙头、水龙带、铁钻工)
// -------------------------------------------------------------
function buildDerrickAssembly() {
  if (!scene) return
  const rigGroup = new THREE.Group()
  rigGroup.position.set(-15, 2.75, 0) // 精确安装在防渗混凝土基台表面 (Y = 2.75)

  // 1. 钻台箱式镂空双立柱钢桁架底座 (彻底告别实心大黑方块！通透机械桁架)
  const floorH = 8.5
  const floorW = 28
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.82, roughness: 0.3 }) // 中石油工程海蓝
  const yellowSafety = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.4 })
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.28 })
  const steelOrange = new THREE.MeshStandardMaterial({ color: 0xea580c, metalness: 0.75, roughness: 0.35 })
  const silverChrome = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 })
  const castIron = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.92, roughness: 0.22 })
  // 万米深地特深井红白蓝专用涂装材质
  const derrickRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.78, roughness: 0.32 })
  const derrickWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.75, roughness: 0.35 })
  const derrickBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.82, roughness: 0.3 })

  // 左右两座立式箱型承重桁架 (左箱梁与右箱梁，中间镂空形成井口月池空间)
  for (const side of [-1, 1]) {
    const boxGroup = new THREE.Group()
    boxGroup.position.set(side * 10, 0, 0)

    // 4根角立柱
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.2, floorH, 1.2), trussMat)
        col.position.set(sx * 3.2, floorH / 2, sz * 13)
        boxGroup.add(col)
      }
    }
    // 侧面 X 型剪刀斜撑
    for (let seg = -1; seg <= 1; seg += 2) {
      createStrut(boxGroup, new THREE.Vector3(-3.2, 0.5, seg * 13), new THREE.Vector3(3.2, floorH - 0.5, seg * 13), trussMat)
      createStrut(boxGroup, new THREE.Vector3(3.2, 0.5, seg * 13), new THREE.Vector3(-3.2, floorH - 0.5, seg * 13), trussMat)
    }
    // 纵向斜拉撑杆
    for (let zseg = -10; zseg <= 10; zseg += 10) {
      createStrut(boxGroup, new THREE.Vector3(side * 3.2, 0.5, zseg - 4), new THREE.Vector3(side * 3.2, floorH - 0.5, zseg + 4), trussMat)
    }
    rigGroup.add(boxGroup)
  }

  // 钻台跳板平台 (Drill Floor with Moonpool Opening)
  const floorBase = new THREE.Mesh(new THREE.BoxGeometry(floorW, 0.8, floorW), trussMat)
  floorBase.position.y = floorH - 0.4
  rigGroup.add(floorBase)

  // 钻台中心旋转转盘 (Rotary Table)
  const rotaryTable = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 0.35, 24), darkMetal)
  rotaryTable.position.set(0, floorH + 0.1, 0)
  rigGroup.add(rotaryTable)

  const rotaryCenter = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 24), yellowSafety)
  rotaryCenter.position.set(0, floorH + 0.15, 0)
  rigGroup.add(rotaryCenter)

  // 钻台转盘外围重型防滑工作台面与安全警示踢脚边框 (Rotary Working Deck & Safety Warning Border)
  const rotaryDeck = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.12, 8), darkMetal)
  rotaryDeck.position.set(0, floorH + 0.04, 0)
  rotaryDeck.rotation.y = Math.PI / 8
  rigGroup.add(rotaryDeck)

  const rotaryDeckBorder = new THREE.Mesh(new THREE.CylinderGeometry(5.45, 5.45, 0.08, 8), yellowSafety)
  rotaryDeckBorder.position.set(0, floorH + 0.02, 0)
  rotaryDeckBorder.rotation.y = Math.PI / 8
  rigGroup.add(rotaryDeckBorder)

  // 钻台工序 5 专用：PDC 金刚石刮刀钻头检修与断扣保养台座 (PDC Bit Breakout & Inspection Stand)
  // 部署于钻台西侧边缘 (X = -7.5, Z = 6.2)，完全避开转盘主通廊，直观展现大国重器金刚石钻头精工细节
  const bitStandGroup = new THREE.Group()
  bitStandGroup.position.set(-7.5, floorH, 6.2)

  // 1. 重型抗震型钢检修台座底架与黄色防碰护沿
  const standBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.65, 12), darkMetal)
  standBase.position.y = 0.325
  bitStandGroup.add(standBase)

  const standRim = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.08, 6, 16), yellowSafety)
  standRim.rotation.x = Math.PI / 2
  standRim.position.y = 0.65
  bitStandGroup.add(standRim)

  // 断扣卸扣卡瓦卡板 (Bit Breaker Plate)
  const breakerPlate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 2.4), darkMetal)
  breakerPlate.position.y = 0.72
  bitStandGroup.add(breakerPlate)

  // 2. 刚刚起出待检的 API 12-1/4" 五翼高强度金刚石 PDC 刮刀钻头 (Crown Body Upward - 胎体朝上展露金黄刀翼与黑色切削齿)
  const pdcDisplayGroup = new THREE.Group()
  pdcDisplayGroup.position.y = 0.8
  pdcDisplayGroup.scale.set(0.68, 0.68, 0.68)

  const bitSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.92, roughness: 0.22 })
  const goldMatrix = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.88, roughness: 0.28 })
  const pdcCutter = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.98, roughness: 0.08 })
  const bitNozzleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.94, roughness: 0.15 })

  // 钻头螺纹接头柄部 (插在台座卡口内)
  const bitShank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 1.8, 20), bitSteel)
  bitShank.position.y = 0.9
  pdcDisplayGroup.add(bitShank)

  // 钻头金黄碳化钨基体胎体冠部
  const bitCrown = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.3, 2.6, 24), goldMatrix)
  bitCrown.position.y = 2.4
  pdcDisplayGroup.add(bitCrown)

  // 5 道螺旋扭曲外旋切削刀翼与黑色 PDC 聚晶金刚石复合片切削齿群
  for (let b = 0; b < 5; b++) {
    const bAngle = (b * Math.PI * 2) / 5
    const bGroup = new THREE.Group()
    bGroup.rotation.y = bAngle
    bGroup.position.y = 2.4

    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.4, 1.4), goldMatrix)
    bMesh.position.set(1.4, -0.7, 0)
    bMesh.rotation.z = -0.22
    bMesh.rotation.y = 0.18
    bGroup.add(bMesh)

    // 刀翼外缘耐磨保径块
    const gPad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.7), bitSteel)
    gPad.position.set(1.95, -0.3, 0)
    bGroup.add(gPad)

    // 4 颗高反光圆盘形黑色 PDC 人造金刚石切削齿
    for (let c = 0; c < 4; c++) {
      const cutter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12), pdcCutter)
      cutter.rotation.x = Math.PI / 2
      cutter.rotation.y = -0.25
      cutter.position.set(0.8 + c * 0.35, -1.6 + c * 0.45, 0.6)
      bGroup.add(cutter)
    }
    pdcDisplayGroup.add(bGroup)
  }

  // 3 组水力排屑冲洗喷嘴
  for (let n = 0; n < 3; n++) {
    const nAng = (n * Math.PI * 2) / 3 + 0.3
    const mudNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 12), bitNozzleMat)
    mudNozzle.position.set(Math.cos(nAng) * 0.9, 3.4, Math.sin(nAng) * 0.9)
    pdcDisplayGroup.add(mudNozzle)
  }
  bitStandGroup.add(pdcDisplayGroup)

  // 3. 悬臂吊专用合金卸扣与吊索 (Drill Bit Lifting Slings)
  const bitSling = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 16), silverChrome)
  bitSling.position.set(0, 3.5, 0)
  bitStandGroup.add(bitSling)

  const hoistWire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6), silverChrome)
  hoistWire.position.set(0, 5.25, 0)
  bitStandGroup.add(hoistWire)

  rigGroup.add(bitStandGroup)

  // 钻台四周安全防护围栏 (Safety Handrails - 正面开辟 4.8m 宽标准 V-Door 提管大门开口)
  const vDoorGap = 4.8
  const halfWingW = (floorW - vDoorGap) / 2

  // 背面完整护栏 (side = -1)
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(floorW, 1.6, 0.15), yellowSafety)
  backRail.position.set(0, floorH + 0.8, -(floorW / 2 - 0.2))
  rigGroup.add(backRail)

  // 正面左右双翼护栏 (side = 1)，中间空出 4.8m V-Door 大门
  for (const wingSide of [-1, 1]) {
    const frontWing = new THREE.Mesh(new THREE.BoxGeometry(halfWingW, 1.6, 0.15), yellowSafety)
    frontWing.position.set(wingSide * (vDoorGap / 2 + halfWingW / 2), floorH + 0.8, floorW / 2 - 0.2)
    rigGroup.add(frontWing)

    // V-Door 开口端部立柱防撞警示挡铁
    const postStop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 8), darkMetal)
    postStop.position.set(wingSide * (vDoorGap / 2), floorH + 0.9, floorW / 2 - 0.2)
    rigGroup.add(postStop)
  }

  // 左右两侧护栏
  for (const side of [-1, 1]) {
    const railZ = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, floorW), yellowSafety)
    railZ.position.set(side * (floorW / 2 - 0.2), floorH + 0.8, 0)
    rigGroup.add(railZ)
  }


  // 从地面基台直通钻台东侧的重型工业刚架安全步梯总成 (Rig Floor Stairway & Landing Platform)
  // 严格贴合中石油井架 API 规范：顶接钻台踏板 (Y = 8.5)，底座牢固落地 (Y = 0)，彻底消除浮空
  const stairGroup = new THREE.Group()
  stairGroup.position.set(floorW / 2 + 1.2, 0, 0)

  // 1. 顶部钻台对接检修休息平台 (Top Landing Platform at Y = floorH)
  const landingW = 2.4
  const landingL = 2.6
  const landingBase = new THREE.Mesh(new THREE.BoxGeometry(landingW, 0.35, landingL), darkMetal)
  landingBase.position.set(0, floorH - 0.18, 4.2)
  stairGroup.add(landingBase)

  // 休息平台支撑立柱 (落地生根)
  for (const lx of [-landingW / 2 + 0.3, landingW / 2 - 0.3]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, floorH, 0.35), darkMetal)
    post.position.set(lx, floorH / 2, 4.2)
    stairGroup.add(post)
  }

  // 休息平台外侧黄色安全防护栏
  const landRailBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, landingL), yellowSafety)
  landRailBack.position.set(landingW / 2, floorH + 0.7, 4.2)
  stairGroup.add(landRailBack)

  // 2. 纵向倾角 37° 落地大斜梯 (Stair Stringers & Grating Steps: 从 Z = 5.5, Y = 8.5 延伸至 Z = 16.8, Y = 0)
  const stairRunZ = 11.3
  const stairDeltaY = floorH
  const stairStringerLen = Math.sqrt(stairRunZ * stairRunZ + stairDeltaY * stairDeltaY)
  const stairPitch = Math.atan2(stairDeltaY, stairRunZ)
  const midZ = 5.5 + stairRunZ / 2
  const midY = stairDeltaY / 2

  // 左右双侧重型槽钢大梯梁 (Side Stringer Beams)
  for (const sx of [-landingW / 2 + 0.2, landingW / 2 - 0.2]) {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, stairStringerLen), darkMetal)
    stringer.position.set(sx, midY, midZ)
    stringer.rotation.x = stairPitch
    stairGroup.add(stringer)

    // 梯身两侧随坡黄色安全护栏 (Handrails)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, stairStringerLen), yellowSafety)
    rail.position.set(sx, midY + 0.85, midZ)
    rail.rotation.x = stairPitch
    stairGroup.add(rail)
  }

  // 落地梯脚防滑承压接地靴板 (Bottom Ground Shoe Plate)
  const baseShoe = new THREE.Mesh(new THREE.BoxGeometry(landingW + 0.4, 0.2, 1.2), darkMetal)
  baseShoe.position.set(0, 0.1, 5.5 + stairRunZ)
  stairGroup.add(baseShoe)

  // 梯身横向等间距 14 阶防滑钢格板踏步 (Horizontal Anti-Slip Steps)
  const stepCount = 14
  for (let s = 0; s < stepCount; s++) {
    const t = s / (stepCount - 1)
    const stepY = 0.35 + (1 - t) * (floorH - 0.6)
    const stepZ = (5.5 + stairRunZ - 0.4) - (1 - t) * (stairRunZ - 0.8)
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(landingW - 0.5, 0.12, 0.6), darkMetal)
    stepMesh.position.set(0, stepY, stepZ)
    stairGroup.add(stepMesh)
  }
  rigGroup.add(stairGroup)

  // 钻台主提升绞车机组 (Heavy Drawworks with Hydraulic Disc Brakes & AC Drive)
  const drawworksGroup = new THREE.Group()
  drawworksGroup.position.set(0, floorH, -floorW / 2 + 4.2)

  const dwSkid = new THREE.Mesh(new THREE.BoxGeometry(11, 2.2, 5.5), trussMat)
  dwSkid.position.y = 1.1
  drawworksGroup.add(dwSkid)

  const dwDrum = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6.5, 20), silverChrome)
  dwDrum.rotation.z = Math.PI / 2
  dwDrum.position.set(0, 2.6, 0)
  drawworksGroup.add(dwDrum)

  for (const ds of [-3.4, 3.4]) {
    const discBrake = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.4, 24), darkMetal)
    discBrake.rotation.z = Math.PI / 2
    discBrake.position.set(ds, 2.6, 0)
    drawworksGroup.add(discBrake)

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 1.4), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 }))
    caliper.position.set(ds, 3.4, -0.6)
    drawworksGroup.add(caliper)
  }

  for (const mx of [-2.8, 2.8]) {
    const dwMotor = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.6, 16), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 }))
    dwMotor.rotation.x = Math.PI / 2
    dwMotor.position.set(mx, 2.2, -3.2)
    drawworksGroup.add(dwMotor)
  }

  // 绞车大滚筒液压排绳导向摆臂与防偏角补偿轮 (Wireline Spooler Arm & Compensator)
  const spoolerArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 0.35), darkMetal)
  spoolerArm.position.set(0, 4.4, 0.8)
  spoolerArm.rotation.x = 0.4
  drawworksGroup.add(spoolerArm)

  const spoolerRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12), yellowSafety)
  spoolerRoller.rotation.z = Math.PI / 2
  spoolerRoller.position.set(0, 5.6, 1.4)
  drawworksGroup.add(spoolerRoller)
  rigGroup.add(drawworksGroup)

  // 2. 真实镂空月池井口区：重型高压多层防喷器组 (BOP Stack with Flowline & Hydraulic Lines)
  const bopGroup = new THREE.Group()
  bopGroup.position.set(0, 0, 0)

  // 套管头法兰 (Casing Head)
  const casingHead = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 1.4, 16), darkMetal)
  casingHead.position.y = 0.7
  bopGroup.add(casingHead)

  // 钻井四通与节流压井高压管线 (Drilling Spool with Choke/Kill Valves)
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.6, 16), darkMetal)
  spool.position.y = 2.2
  bopGroup.add(spool)

  // 左右伸出的高压压井与节流阀门手轮及阀箱仪表组 (API 16C Choke & Kill Valves)
  for (const s of [-1, 1]) {
    const valvePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5.0, 8), darkMetal)
    valvePipe.rotation.z = Math.PI / 2
    valvePipe.position.set(s * 3.5, 2.2, 0)
    bopGroup.add(valvePipe)

    const valveHandwheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 6, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }))
    valveHandwheel.rotation.y = Math.PI / 2
    valveHandwheel.position.set(s * 6.0, 2.2, 0)
    bopGroup.add(valveHandwheel)

    // 节流压井高压液动平板闸阀阀体与红色执行器
    const vActuator = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 12), new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.8 }))
    vActuator.position.set(s * 4.2, 3.2, 0)
    bopGroup.add(vActuator)

    // 抗震高压泥浆压力表
    const bGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 14), silverChrome)
    bGauge.rotation.x = Math.PI / 2
    bGauge.position.set(s * 4.2, 4.0, 0)
    bopGroup.add(bGauge)

    const bDial = new THREE.Mesh(new THREE.CircleGeometry(0.26, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }))
    bDial.position.set(s * 4.2, 4.0, 0.07)
    bopGroup.add(bDial)

    // 高压由壬活接头 (Hammer Union)
    const union = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.55, 12), yellowSafety)
    union.rotation.z = Math.PI / 2
    union.position.set(s * 5.3, 2.2, 0)
    bopGroup.add(union)
  }

  // 防喷器闸板高压阻燃液控软管管束 (Hydraulic Umbilical Control Lines to Koomey)
  const umbilicalColors = [0xf59e0b, 0xdc2626, 0x0284c7, 0x10b981]
  for (let u = 0; u < 4; u++) {
    const uCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(u % 2 === 0 ? 3.8 : -3.8, 4.4, (u < 2 ? 1.2 : -1.2)),
      new THREE.Vector3(u % 2 === 0 ? 5.2 : -5.2, 2.8, -2.5 + u * 1.2),
      new THREE.Vector3(u % 2 === 0 ? 4.5 : -4.5, 0.6, -6.5),
      new THREE.Vector3(0, 0.4, -9.5),
    ])
    const uMesh = new THREE.Mesh(
      new THREE.TubeGeometry(uCurve, 20, 0.1, 8, false),
      new THREE.MeshStandardMaterial({ color: umbilicalColors[u], roughness: 0.6 })
    )
    bopGroup.add(uMesh)
  }

  // 月池下部防爆钢格栅作业检修平台与护栏 (Moonpool Work Floor & Safety Rails)
  const moonFloor = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.25, 10.5), darkMetal)
  moonFloor.position.set(0, 1.2, 0)
  bopGroup.add(moonFloor)

  for (const rz of [-5.1, 5.1]) {
    const mRail = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.1, 0.08), yellowSafety)
    mRail.position.set(0, 1.85, rz)
    bopGroup.add(mRail)
  }

  // 双闸板防喷器 (Double Ram BOP: 带有突出的 4 个液压锁紧油缸)
  const ramBody = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 4.8), new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.85 }))
  ramBody.position.y = 4.4
  bopGroup.add(ramBody)

  // 闸板液压油缸与高压液控软管管束 (Hydraulic Locking Cylinders & Umbilical Lines)
  for (const rx of [-3.4, 3.4]) {
    for (const rz of [-1.2, 1.2]) {
      const ramCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.4, 12), darkMetal)
      ramCyl.rotation.z = Math.PI / 2
      ramCyl.position.set(rx, 4.4, rz)
      bopGroup.add(ramCyl)

      // 液控管线接头 (Hydraulic Fitting)
      const fitting = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6), silverChrome)
      fitting.position.set(rx > 0 ? rx + 1.2 : rx - 1.2, 4.4, rz)
      bopGroup.add(fitting)
    }
  }

  // 顶部环形防喷器 (Annular BOP - 经典球形封头胶芯壳体)
  const annularBop = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 }))
  annularBop.position.y = 6.4
  bopGroup.add(annularBop)

  // 环形防喷器上部钟形罩 (Bell Nipple) 与通往泥浆固控振动筛的倾斜导流大管 (Mud Return Flowline)
  const bellNipple = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, 1.2, 16), darkMetal)
  bellNipple.position.y = 7.6
  bopGroup.add(bellNipple)

  // 倾斜高架泥浆返出管线 (Flowline from Bell Nipple to Shale Shakers Header Box)
  // 钻台位于 (-15, 2.75, 0)，固控振动筛进浆箱位于 (-38.8, 5.5, 8.8)
  const flowlineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 7.6, 0),
    new THREE.Vector3(-7.5, 6.2, 2.8),
    new THREE.Vector3(-16.0, 4.5, 5.8),
    new THREE.Vector3(-23.8, 2.75, 8.8),
  ])
  const flowlineMesh = new THREE.Mesh(
    new THREE.TubeGeometry(flowlineCurve, 24, 0.55, 12, false),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 })
  )
  bopGroup.add(flowlineMesh)

  // 高架泥浆返出管线专用落地支撑桁架 (Ground-Anchored Pipe Trestle Stanchions)
  const stanchionData = [
    { x: -7.5, topY: 5.9, z: 2.8 },
    { x: -16.0, topY: 4.2, z: 5.8 },
  ]
  stanchionData.forEach(({ x, topY, z }) => {
    const groundY = -2.75
    const h = topY - groundY
    const midY = groundY + h / 2

    // 双肢工字钢立柱
    for (const sx of [-0.35, 0.35]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, 0.25), darkMetal)
      col.position.set(x + sx, midY, z)
      bopGroup.add(col)
    }

    // 柱间剪刀斜撑
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.12), trussMat)
    brace.position.set(x, midY, z)
    bopGroup.add(brace)

    // 顶托梁与黄色弧形鞍座管卡
    const saddleBeam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), darkMetal)
    saddleBeam.position.set(x, topY, z)
    bopGroup.add(saddleBeam)

    const pipeClamp = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 6, 12, Math.PI), yellowSafety)
    pipeClamp.rotation.z = Math.PI
    pipeClamp.position.set(x, topY + 0.3, z)
    bopGroup.add(pipeClamp)

    // 落地加固混凝土独立基础短柱
    const footing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.2), darkMetal)
    footing.position.set(x, groundY + 0.22, z)
    bopGroup.add(footing)
  })
  rigGroup.add(bopGroup)

  // 3. 司钻房现代工业切角控制舱 (Driller's Cabin with Tilted Observation Windows)
  const cabin = new THREE.Group()
  cabin.position.set(11, floorH, 6)

  const cabinBody = new THREE.Mesh(new THREE.BoxGeometry(7, 4.8, 6.5), new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.65, roughness: 0.35 }))
  cabinBody.position.y = 2.4
  cabin.add(cabinBody)

  // 大面积外倾防眩光观察窗 (Tilted Glass Windows)
  const windowGlass = new THREE.Mesh(
    new THREE.BoxGeometry(6.6, 2.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x082f49, roughness: 0.1, metalness: 0.95, transparent: true, opacity: 0.85 }),
  )
  windowGlass.position.set(0, 3.2, -3.3)
  windowGlass.rotation.x = -0.15
  cabin.add(windowGlass)

  // 司钻房内部数字化工控多联屏操作台与人体工学司钻椅 (Driller's Cyber Chair Console)
  const drillerDesk = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.4, 2.0), darkMetal)
  drillerDesk.position.set(0, 1.4, -1.8)
  cabin.add(drillerDesk)

  // 3 联数字化工控大屏 (左屏：ROP钻速钻压折线图；中屏：3D井眼轨迹；右屏：泥浆泵排量立管压力)
  const screenTypes = ['left', 'mid', 'right']
  const screenXOffsets = [-1.55, 0, 1.55]
  screenTypes.forEach((sType, idx) => {
    const sTex = createDrillerScreenTexture(sType)
    const sMat = new THREE.MeshBasicMaterial({ map: sTex })
    const screenMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.85, 0.08),
      [darkMetal, darkMetal, darkMetal, darkMetal, darkMetal, sMat]
    )
    screenMesh.position.set(screenXOffsets[idx], 2.3, -2.4)
    screenMesh.rotation.x = -0.15
    if (idx === 0) screenMesh.rotation.y = 0.15
    if (idx === 2) screenMesh.rotation.y = -0.15
    cabin.add(screenMesh)
  })

  // 司钻人体工学操控座椅 (Cyber Chair)
  const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.8, 12), darkMetal)
  chairBase.position.set(0, 0.4, -0.6)
  cabin.add(chairBase)

  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 1.2), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }))
  chairSeat.position.set(0, 0.9, -0.6)
  cabin.add(chairSeat)

  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }))
  chairBack.position.set(0, 1.5, -0.05)
  cabin.add(chairBack)

  // 司钻椅左右扶手与双轴控制手柄 (Dual Control Joysticks)
  for (const as of [-0.75, 0.75]) {
    const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.9), darkMetal)
    armrest.position.set(as, 1.2, -0.6)
    cabin.add(armrest)

    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), silverChrome)
    stick.position.set(as, 1.45, -0.85)
    cabin.add(stick)

    const stickKnob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), yellowSafety)
    stickKnob.position.set(as, 1.7, -0.85)
    cabin.add(stickKnob)
  }

  // 司钻房顶置防爆空调与警示灯
  const cabinAC = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.6), darkMetal)
  cabinAC.position.set(0, 5.4, 1.0)
  cabin.add(cabinAC)
  rigGroup.add(cabin)

  // 4. 机械化铁钻工总成 (Mechanized Iron Roughneck)
  // 4. 机械化铁钻工总成 (Mechanized Iron Roughneck - 归位至钻台西侧边缘待命轨道)
  const roughneck = new THREE.Group()
  roughneck.position.set(-8.8, floorH, 4.2)
  roughneck.rotation.y = -Math.PI / 4

  // 铁钻工地面重载滑移导轨与拖链管束 (Iron Roughneck Tracks & Cable Drag Chain)
  const trackBed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 5.5), darkMetal)
  trackBed.position.set(0, 0.04, -1.8)
  roughneck.add(trackBed)

  for (const ts of [-0.65, 0.65]) {
    const railBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 5.5), silverChrome)
    railBar.position.set(ts, 0.12, -1.8)
    roughneck.add(railBar)
  }

  // 回转底座与立柱导轨
  const rnTurret = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.0, 12), darkMetal)
  rnTurret.position.y = 0.5
  roughneck.add(rnTurret)

  const rnMast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.0, 1.2), trussMat)
  rnMast.position.set(0, 3.0, 0)
  roughneck.add(rnMast)

  // 折叠液压冲扣卡瓦臂 (收拢在待命位，钻台中部转盘完全畅通通透)
  const rnArm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 1.4), yellowSafety)
  rnArm.position.set(1.4, 3.4, 0)
  roughneck.add(rnArm)

  const rnJaw = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 8), darkMetal)
  rnJaw.position.set(2.6, 3.4, 0)
  roughneck.add(rnJaw)
  rigGroup.add(roughneck)

  // 钻台小鼠洞管口平齐保护盖 (Flush Drill Floor Mousehole Socket with Safety Latch - 消除突兀立柱)
  const mousehole = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.12, 16), darkMetal)
  mousehole.position.set(4.5, floorH + 0.06, 3.2)
  rigGroup.add(mousehole)

  const mouseholeCover = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16), yellowSafety)
  mouseholeCover.position.set(4.5, floorH + 0.12, 3.2)
  rigGroup.add(mouseholeCover)

  // 井架与钻台工业级防爆 PTZ 云台监控球机 (Explosion-Proof Dome Cameras)
  for (const camPos of [
    new THREE.Vector3(floorW / 2 - 0.5, floorH + 3.8, -floorW / 2 + 1.2),
    new THREE.Vector3(-floorW / 2 + 1.2, floorH + 3.8, floorW / 2 - 1.2),
  ]) {
    const ctvBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), darkMetal)
    ctvBase.position.copy(camPos)
    rigGroup.add(ctvBase)

    const ctvDome = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }))
    ctvDome.position.set(camPos.x, camPos.y - 0.35, camPos.z)
    rigGroup.add(ctvDome)
  }

  // 5. 真实 JJ450/45-K 型前开口重型空间桁架井架 (K-Type Open-Front Drilling Mast)
  // 复刻图三“深地工程”红白蓝醒目涂装：底部中石油蓝、中部洁白工程钢构并挂设“深地工程”主铭牌、顶部红白警示相间！
  const towerH = 56
  const bottomW = 18
  const topW = 7.0
  const tiers = 7
  const tower = new THREE.Group()
  tower.position.y = floorH

  // 7 层分段材料映射：底部蓝、中段白、上段红白警示相间 (复刻图三万米深地重器涂装)
  const tierMats = [
    derrickBlue,  // Tier 0: 0 ~ 8m (底部中石油经典蓝)
    derrickWhite, // Tier 1: 8 ~ 16m (高强度工程洁白)
    derrickWhite, // Tier 2: 16 ~ 24m (悬挂“深地工程”主铭牌层，洁白衬底)
    derrickRed,   // Tier 3: 24 ~ 32m (航空警戒红)
    derrickWhite, // Tier 4: 32 ~ 40m (工程洁白)
    derrickRed,   // Tier 5: 40 ~ 48m (航空警戒红)
    derrickWhite, // Tier 6: 48 ~ 56m (工程洁白连通天车站)
  ]

  // 4 根主受力角柱方位
  const cornerCols = [
    [1, 1],   // 右前
    [-1, 1],  // 左前
    [-1, -1], // 左后
    [1, -1],  // 右后
  ]

  // 井架内部垂直顶驱防扭导向滑轨 (Top Drive Torque Track Rails)
  for (const s of [-1.2, 1.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.45, towerH - 4, 0.45), darkMetal)
    rail.position.set(s, towerH / 2, -2.6)
    tower.add(rail)
  }

  // 井架防风防沙保温护壁帷幔 (复刻图三洁白面板带中石油蓝腰线装饰)
  const windbreakMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.35,
    roughness: 0.45,
    side: THREE.DoubleSide,
  })
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
  const panelH = 15
  const panelW = bottomW * 0.94
  for (const face of [1, 2, 3]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), windbreakMat)
    panel.position.y = panelH / 2 + 0.5
    if (face === 1) panel.position.z = -bottomW / 2 + 0.2
    if (face === 2) {
      panel.rotation.y = Math.PI / 2
      panel.position.x = bottomW / 2 - 0.2
    }
    if (face === 3) {
      panel.rotation.y = -Math.PI / 2
      panel.position.x = -bottomW / 2 + 0.2
    }
    tower.add(panel)

    // 防风棚深蓝醒目腰线
    const trim = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.65, 0.1), trimMat)
    trim.position.y = panelH * 0.55
    if (face === 1) trim.position.z = -bottomW / 2 + 0.26
    if (face === 2) {
      trim.rotation.y = Math.PI / 2
      trim.position.x = bottomW / 2 - 0.26
    }
    if (face === 3) {
      trim.rotation.y = -Math.PI / 2
      trim.position.x = -bottomW / 2 + 0.26
    }
    tower.add(trim)
  }

  // 分层构建角柱与 K 型桁架体系
  for (let t = 0; t < tiers; t++) {
    const y0 = (t / tiers) * towerH
    const y1 = ((t + 1) / tiers) * towerH
    const yMid = (y0 + y1) * 0.5
    const w0 = bottomW + (topW - bottomW) * (t / tiers)
    const w1 = bottomW + (topW - bottomW) * ((t + 1) / tiers)
    const wMid = (w0 + w1) * 0.5
    const tMat = tierMats[t]

    // 4 根角柱分段型钢 (带层级专用色彩涂装)
    cornerCols.forEach(([sx, sz]) => {
      const p1 = new THREE.Vector3((sx * w0) / 2, y0, (sz * w0) / 2)
      const p2 = new THREE.Vector3((sx * w1) / 2, y1, (sz * w1) / 2)
      createCornerLeg(tower, p1, p2, tMat)

      // 层间高强螺栓拼接法兰
      if (t > 0) {
        const flange = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), darkMetal)
        flange.position.copy(p1)
        tower.add(flange)
      }
    })

    // 水平承重拉梁 (Horizontal Girts)
    for (const face of [1, 2, 3]) {
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(wMid, 0.85, 0.85), tMat)
      if (face === 1) hBar.position.set(0, yMid, -wMid / 2)
      if (face === 2) {
        hBar.rotation.y = Math.PI / 2
        hBar.position.set(wMid / 2, yMid, 0)
      }
      if (face === 3) {
        hBar.rotation.y = Math.PI / 2
        hBar.position.set(-wMid / 2, yMid, 0)
      }
      tower.add(hBar)

      // K 型斜撑杆件 (采用 0.45m 大口径承压钢管)
      let pTopL = new THREE.Vector3(), pTopR = new THREE.Vector3()
      let pBtmL = new THREE.Vector3(), pBtmR = new THREE.Vector3()
      let pCenter = new THREE.Vector3()

      if (face === 1) { // 背壁
        pBtmL.set(-w0 / 2, y0, -w0 / 2)
        pBtmR.set(w0 / 2, y0, -w0 / 2)
        pTopL.set(-w1 / 2, y1, -w1 / 2)
        pTopR.set(w1 / 2, y1, -w1 / 2)
        pCenter.set(0, yMid, -wMid / 2)
      } else if (face === 2) { // 右侧壁
        pBtmL.set(w0 / 2, y0, -w0 / 2)
        pBtmR.set(w0 / 2, y0, w0 / 2)
        pTopL.set(w1 / 2, y1, -w1 / 2)
        pTopR.set(w1 / 2, y1, w1 / 2)
        pCenter.set(wMid / 2, yMid, 0)
      } else { // 左侧壁
        pBtmL.set(-w0 / 2, y0, -w0 / 2)
        pBtmR.set(-w0 / 2, y0, w0 / 2)
        pTopL.set(-w1 / 2, y1, -w1 / 2)
        pTopR.set(-w1 / 2, y1, w1 / 2)
        pCenter.set(-wMid / 2, yMid, 0)
      }

      createStrut(tower, pBtmL, pCenter, tMat, 0.45)
      createStrut(tower, pBtmR, pCenter, tMat, 0.45)
      createStrut(tower, pTopL, pCenter, tMat, 0.45)
      createStrut(tower, pTopR, pCenter, tMat, 0.45)
    }

    // 正面开口侧：Tier 0 设置重型 V 门人字形大门框构架 (V-Door A-Frame Portal)
    if (t === 0) {
      createStrut(tower, new THREE.Vector3(-w0 / 2, 0, w0 / 2), new THREE.Vector3(-w1 * 0.35, y1, w1 / 2), tMat, 0.55)
      createStrut(tower, new THREE.Vector3(w0 / 2, 0, w0 / 2), new THREE.Vector3(w1 * 0.35, y1, w1 / 2), tMat, 0.55)
      const archTop = new THREE.Mesh(new THREE.BoxGeometry(w1 * 0.72, 0.85, 0.85), tMat)
      archTop.position.set(0, y1, w1 / 2)
      tower.add(archTop)

      // V 门门楣“深地工程”大国重器一体化实体铭牌 (复刻深地塔科1井门楣主横匾，单体实体网格彻底杜绝共面闪烁，高悬猫道上方 5.5m 彻底杜绝穿模！)
      const plaqueW = 10.2
      const plaqueH = 1.85
      const plaqueTex = createDeepEarthPlaqueTexture()
      const plaqueFrontMat = new THREE.MeshBasicMaterial({ map: plaqueTex })
      const plaqueGeo = new THREE.BoxGeometry(plaqueW, plaqueH, 0.22)
      // 使用单体 Box 六面材质数组：仅正面(+Z，索引 4)赋予铭牌贴图，其余五面赋予深色金属，彻底消灭共面与 Z-fighting！
      const plaqueMesh = new THREE.Mesh(plaqueGeo, [
        darkMetal, // +X
        darkMetal, // -X
        darkMetal, // +Y
        darkMetal, // -Y
        plaqueFrontMat, // +Z (正面贴图)
        darkMetal, // -Z
      ])
      plaqueMesh.position.set(0, y1, w1 / 2 + 0.55)
      tower.add(plaqueMesh)

      // 铭牌周圈黄色加固工字型安全防撞护框 (与铭牌保持安全物理厚度差)
      const plaqueBorder = new THREE.Mesh(new THREE.BoxGeometry(plaqueW + 0.35, plaqueH + 0.35, 0.12), yellowSafety)
      plaqueBorder.position.set(0, y1, w1 / 2 + 0.42)
      tower.add(plaqueBorder)

      // “深地工程”铭牌专用防爆线性洗墙投光灯 (复刻实景洗墙照明，向下精准照亮金字铭牌)
      for (const px of [-3.8, 3.8]) {
        const pLamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.45), darkMetal)
        pLamp.position.set(px, y1 + 1.25, w1 / 2 + 0.85)
        tower.add(pLamp)

        const pLensMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 })
        const pLens = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.28), pLensMat)
        pLens.position.set(px, y1 + 1.15, w1 / 2 + 0.95)
        pLens.rotation.x = 0.65
        tower.add(pLens)

        const pSpot = new THREE.SpotLight(0xffedd5, 0.6, 16, Math.PI / 2.5, 0.3, 1.0)
        pSpot.position.set(px, y1 + 1.25, w1 / 2 + 0.85)
        const pTarget = new THREE.Object3D()
        pTarget.position.set(px, y1, w1 / 2 + 0.55)
        tower.add(pTarget)
        pSpot.target = pTarget
        tower.add(pSpot)

        sceneFloodlights.push({
          light: pSpot,
          baseIntensity: 0.6,
          nightIntensity: 4.5,
          duskIntensity: 2.5,
          sandstormIntensity: 1.8,
          lensMat: pLensMat,
        })
      }
    }

    // 正面开口侧顶部层加设高空横梁加强整体抗扭刚度
    if (t >= tiers - 2) {
      const frontBar = new THREE.Mesh(new THREE.BoxGeometry(w1, 0.85, 0.85), tMat)
      frontBar.position.set(0, y1, w1 / 2)
      tower.add(frontBar)
    }

    // 保持前开口通畅，顶驱/游车/大绳起下动作通透无阻
  }

  // 6. 二层台猴台与梳齿指梁高空排管架 (Monkeyboard & Fingerboard with 36 Pipe Stands)
  const monkeyH = 26.5 // 标准二层台高度
  const monkeyGroup = new THREE.Group()
  monkeyGroup.position.set(-2.0, monkeyH, -2.5)

  // 猴台悬挑格栅平台 (Working Floor with Handrails)
  const monkeyPlatform = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.45, 6.5), darkMetal)
  monkeyPlatform.position.set(-2.0, 0, -1.0)
  monkeyGroup.add(monkeyPlatform)

  // 安全防坠落栏杆与护笼
  const monkeyRail = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.5, 0.12), yellowSafety)
  monkeyRail.position.set(-2.0, 0.85, 2.2)
  monkeyGroup.add(monkeyRail)

  // 梳齿形立根指梁 (Fingerboard with Dividing Fingers)
  const fingerBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 6.2), darkMetal)
  fingerBase.position.set(1.5, 0.4, -1.0)
  monkeyGroup.add(fingerBase)

  for (let fi = -3.2; fi <= 1.8; fi += 1.2) {
    const finger = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 0.25), yellowSafety)
    finger.position.set(3.4, 0.4, fi)
    monkeyGroup.add(finger)
  }

  // 钻杆立根矩阵 (3 排共 36 根整齐排列的 127mm 重型加重钻杆立根 Stands)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 12; c++) {
      const standPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, monkeyH + 4, 12),
        silverChrome
      )
      standPipe.position.set(-4.5 + r * 1.1, (monkeyH + 4) / 2 - monkeyH, -3.8 + c * 0.65)
      monkeyGroup.add(standPipe)

      // 钻杆高强耐磨对焊公母接头 (Tool Joints)
      const joint = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.9, 12),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 })
      )
      joint.position.set(-4.5 + r * 1.1, 1.2, -3.8 + c * 0.65)
      monkeyGroup.add(joint)
    }
  }

  // 猴台夜间作业防爆投光灯 (向排管与操作台斜照)
  const mbLamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), darkMetal)
  mbLamp.position.set(-1.0, 1.8, 2.3)
  mbLamp.rotation.x = -0.5
  monkeyGroup.add(mbLamp)

  const mbLensMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 })
  const mbLens = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), mbLensMat)
  mbLens.position.set(-1.0, 1.7, 2.05)
  mbLens.rotation.x = Math.PI - 0.5
  monkeyGroup.add(mbLens)

  const mbSpot = new THREE.SpotLight(0xffedd5, 0.8, 32, Math.PI / 3, 0.4, 1.2)
  mbSpot.position.set(-1.0, 1.8, 2.3)
  const mbTarget = new THREE.Object3D()
  mbTarget.position.set(0, -6, -2)
  monkeyGroup.add(mbTarget)
  mbSpot.target = mbTarget
  monkeyGroup.add(mbSpot)

  sceneFloodlights.push({
    light: mbSpot,
    baseIntensity: 0.8,
    nightIntensity: 4.8,
    duskIntensity: 2.6,
    sandstormIntensity: 2.0,
    lensMat: mbLensMat,
  })

  tower.add(monkeyGroup)

  // 7. TC-450 重型天车总成 (Crown Block with 7 Wire-Rope Sheaves)
  // 彻底告别实心平顶方块：真正的天车结构包含铸钢支架、7 联带绳槽大直径天车滑轮、快绳轮与安全防跳绳罩！
  const crownGroup = new THREE.Group()
  crownGroup.position.set(0, towerH, 0)

  // 天车工字钢承载底架与操作平台 (航空红防腐喷涂)
  const crownBase = new THREE.Mesh(new THREE.BoxGeometry(topW + 2.5, 1.2, topW + 2.5), derrickRed)
  crownBase.position.y = 0.6
  crownGroup.add(crownBase)

  const crownFloor = new THREE.Mesh(new THREE.BoxGeometry(topW + 3.2, 0.2, topW + 3.2), yellowSafety)
  crownFloor.position.y = 1.25
  crownGroup.add(crownFloor)

  // 天车周围安全护栏与检修爬梯
  for (const s of [-1, 1]) {
    const cRail = new THREE.Mesh(new THREE.BoxGeometry(topW + 3.0, 1.4, 0.12), yellowSafety)
    cRail.position.set(0, 2.0, s * (topW / 2 + 1.4))
    crownGroup.add(cRail)
  }

  // 天车滑轮主轴承箱 (Main Sheave Cluster Bearing Blocks)
  for (const bs of [-1.8, 1.8]) {
    const sBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.8, 2.8), castIron)
    sBlock.position.set(bs, 2.5, 0)
    crownGroup.add(sBlock)
  }

  // 7 联带槽铸钢天车滑轮组 (7 Heavy Sheaves with Wire Grooves)
  for (let si = -3; si <= 3; si++) {
    const sheave = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 0.32, 24),
      silverChrome
    )
    sheave.rotation.z = Math.PI / 2
    sheave.position.set(si * 0.42, 2.8, 0)
    crownGroup.add(sheave)

    // 滑轮中心铸造轮毂与轴承盖
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.45, 16),
      darkMetal
    )
    hub.rotation.z = Math.PI / 2
    hub.position.set(si * 0.42, 2.8, 0)
    crownGroup.add(hub)
  }

  // 快绳导向天轮 (Fastline Sheave) - 倾斜指向钻台主绞车
  const fastSheave = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.35, 20), silverChrome)
  fastSheave.rotation.z = Math.PI / 2.3
  fastSheave.rotation.y = 0.25
  fastSheave.position.set(2.4, 3.8, -1.8)
  crownGroup.add(fastSheave)

  // 弧形防跳绳安全防护罩 (Sheave Guards)
  const sheaveGuard = new THREE.Mesh(
    new THREE.CylinderGeometry(2.65, 2.65, 3.4, 24, 1, false, 0, Math.PI),
    derrickRed
  )
  sheaveGuard.rotation.z = Math.PI / 2
  sheaveGuard.rotation.x = -Math.PI / 2
  sheaveGuard.position.set(0, 3.0, 0)
  crownGroup.add(sheaveGuard)

  // 顶部夜间航空障碍红灯球与金属防护鸟笼 (Aviation Obstruction Beacon & Bird Spike Cage)
  const beaconGeo = new THREE.SphereGeometry(0.75, 12, 12)
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 })
  beaconMesh = new THREE.Mesh(beaconGeo, beaconMat)
  beaconMesh.position.set(0, 5.8, 0)
  beaconMatRef = beaconMat
  crownGroup.add(beaconMesh)

  // 保护笼支架与防雷尖顶
  for (let ci = 0; ci < 4; ci++) {
    const cAngle = (ci * Math.PI) / 2
    const cageBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), yellowSafety)
    cageBar.position.set(Math.cos(cAngle) * 0.9, 5.8, Math.sin(cAngle) * 0.9)
    crownGroup.add(cageBar)
  }
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.2, 6), silverChrome)
  spike.position.set(0, 7.2, 0)
  crownGroup.add(spike)

  // 红色脉冲点光源
  beaconLight = new THREE.PointLight(0xef4444, 1.8, 45)
  beaconLight.position.set(0, 5.8, 0)
  crownGroup.add(beaconLight)

  // 天车站底部大功率工业防爆投光灯 (高空投光向下照亮井架内部与钻台)
  for (const cx of [-2.4, 2.4]) {
    const lampGroup = new THREE.Group()
    lampGroup.position.set(cx, -0.2, 0)

    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.9), darkMetal)
    lampGroup.add(housing)

    const ring = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 1.0), yellowSafety)
    ring.position.set(0, -0.4, 0)
    lampGroup.add(ring)

    const lensMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), lensMat)
    lens.rotation.x = Math.PI / 2
    lens.position.set(0, -0.42, 0)
    lampGroup.add(lens)

    crownGroup.add(lampGroup)

    const spot = new THREE.SpotLight(0xffedd5, 1.2, 95, Math.PI / 3.8, 0.45, 1.1)
    spot.position.set(cx, -0.5, 0)
    const spotTarget = new THREE.Object3D()
    spotTarget.position.set(0, -50, 0)
    crownGroup.add(spotTarget)
    spot.target = spotTarget
    crownGroup.add(spot)

    sceneFloodlights.push({
      light: spot,
      baseIntensity: 1.0,
      nightIntensity: 6.5,
      duskIntensity: 3.5,
      sandstormIntensity: 2.5,
      lensMat,
    })
  }

  tower.add(crownGroup)
  rigGroup.add(tower)

  // 钻台面四角主立柱防爆工作投光灯 (Drill Floor Mast Base Area Floodlights)
  const floorLampPositions = [
    { x: bottomW / 2 - 0.5, z: bottomW / 2 - 0.5, tx: 0, tz: 3.5 },     // 右前 -> 朝向司钻房前与猫道
    { x: -bottomW / 2 + 0.5, z: bottomW / 2 - 0.5, tx: 0, tz: 3.5 },    // 左前 -> 朝向检修台与猫道
    { x: bottomW / 2 - 0.5, z: -bottomW / 2 + 0.5, tx: 0, tz: -2.0 },   // 右后 -> 朝向转盘与铁钻工
    { x: -bottomW / 2 + 0.5, z: -bottomW / 2 + 0.5, tx: 0, tz: -2.0 },  // 左后 -> 朝向立管与泥浆返出
  ]
  floorLampPositions.forEach(({ x, z, tx, tz }) => {
    const flGroup = new THREE.Group()
    flGroup.position.set(x, floorH + 3.2, z)

    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.7), darkMetal)
    housing.rotation.x = 0.35
    flGroup.add(housing)

    const ring = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.68, 0.1), yellowSafety)
    ring.position.set(0, 0, 0.36)
    ring.rotation.x = 0.35
    flGroup.add(ring)

    const flLensMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.52), flLensMat)
    lens.position.set(0, 0, 0.42)
    lens.rotation.x = 0.35
    flGroup.add(lens)

    rigGroup.add(flGroup)

    const spot = new THREE.SpotLight(0xffedd5, 1.0, 36, Math.PI / 3, 0.4, 1.1)
    spot.position.set(x, floorH + 3.2, z)
    const target = new THREE.Object3D()
    target.position.set(tx, floorH + 0.5, tz)
    rigGroup.add(target)
    spot.target = target
    rigGroup.add(spot)

    sceneFloodlights.push({
      light: spot,
      baseIntensity: 0.9,
      nightIntensity: 5.5,
      duskIntensity: 3.0,
      sandstormIntensity: 2.2,
      lensMat: flLensMat,
    })
  })

  // 立管与高压水龙带 (Standpipe & Rotary Hose)
  const standpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 38, 12), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }))
  standpipe.position.set(-bottomW / 2 + 1.2, floorH + 19, -bottomW / 2 + 1.2)
  rigGroup.add(standpipe)

  // 钻台角部高压立管汇流阀组与高压泥浆压力表 (Standpipe Manifold & Mud Gauge)
  const spManifold = new THREE.Group()
  spManifold.position.set(-bottomW / 2 + 1.2, floorH, -bottomW / 2 + 1.2)

  const spBaseBlock = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 1.6), darkMetal)
  spBaseBlock.position.y = 1.2
  spManifold.add(spBaseBlock)

  for (const vs of [-0.9, 0.9]) {
    const vWheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 12), new THREE.MeshStandardMaterial({ color: 0xdc2626 }))
    vWheel.rotation.y = Math.PI / 2
    vWheel.position.set(0, 1.6, vs)
    spManifold.add(vWheel)
  }

  const mudGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 16), silverChrome)
  mudGauge.rotation.x = Math.PI / 2
  mudGauge.position.set(1.1, 2.6, 0)
  spManifold.add(mudGauge)

  const mudGaugeDial = new THREE.Mesh(new THREE.CircleGeometry(0.48, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }))
  mudGaugeDial.position.set(1.1, 2.6, 0.12)
  spManifold.add(mudGaugeDial)
  rigGroup.add(spManifold)

  // 弯曲自然下垂的高压泥浆水龙带 (Catenary Rotary Kelly Hose - 随动顶驱起下钻柔性重力自然悬垂)
  const hoseCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-bottomW / 2 + 1.2, floorH + 37, -bottomW / 2 + 1.2),
    new THREE.Vector3(-4, floorH + 42, 2),
    new THREE.Vector3(0, floorH + 32, 0),
  )
  rotaryHoseMesh = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 24, 0.42, 10, false), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }))
  rigGroup.add(rotaryHoseMesh)

  // 水龙带立管端与水龙头端高压快速活接头 (Hammer Unions & Bend Restrictors)
  for (const hp of [
    new THREE.Vector3(-bottomW / 2 + 1.2, floorH + 37, -bottomW / 2 + 1.2),
    new THREE.Vector3(0, floorH + 32, 0)
  ]) {
    const unionCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.7, 12), yellowSafety)
    unionCollar.position.copy(hp)
    rigGroup.add(unionCollar)
  }

  // 从天车引向绞车的快绳钢丝绳 (Reeved Fastline Wire Rope)
  const fastlineCurve = new THREE.LineCurve3(
    new THREE.Vector3(2.4, floorH + towerH + 3.8, -1.8),
    new THREE.Vector3(0, floorH + 2.6, -bottomW / 2 + 4.2)
  )
  const fastlineWire = new THREE.Mesh(
    new THREE.TubeGeometry(fastlineCurve, 8, 0.08, 6, false),
    silverChrome
  )
  rigGroup.add(fastlineWire)

  // 6. 游车大钩与重型顶驱机械系统 (Traveling Block & Top Drive System)
  travelingBlock = new THREE.Group()
  travelingBlock.position.set(0, floorH + towerH * 0.55, 0)

  // 游车滑轮流线型箱体 (Streamlined Tapered Traveling Block Body)
  const blockMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.85, roughness: 0.25 })
  const blockBody = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 4.4, 16), blockMat)
  travelingBlock.add(blockBody)

  // 游车内部带槽大直径滑轮组 (Internal Sheave Cluster)
  for (let bi = -2; bi <= 2; bi++) {
    const bSheave = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.22, 20), silverChrome)
    bSheave.rotation.z = Math.PI / 2
    bSheave.position.set(bi * 0.35, 0.4, 0)
    travelingBlock.add(bSheave)
  }

  // 游车滑轮侧护板与黄色警示条带 (Side Plates with Hazard Stripe)
  for (const bs of [-1.2, 1.2]) {
    const sPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.8, 2.8), darkMetal)
    sPlate.position.set(bs, 0, 0)
    travelingBlock.add(sPlate)

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 2.6), yellowSafety)
    stripe.position.set(bs, 0, 0)
    travelingBlock.add(stripe)
  }

  // 重型旋转大钩总成 (Forged Alloy Drilling Hook with Latch)
  const hookShank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 1.8, 16), darkMetal)
  hookShank.position.y = -2.8
  travelingBlock.add(hookShank)

  const hookCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.45, 16), yellowSafety)
  hookCollar.position.y = -2.2
  travelingBlock.add(hookCollar)

  const hookCurv = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.28, 12, 24, Math.PI * 1.2), darkMetal)
  hookCurv.rotation.z = Math.PI / 1.1
  hookCurv.position.set(0.35, -3.8, 0)
  travelingBlock.add(hookCurv)

  // 顶驱本体 (Heavy Top Drive Assembly - BPM DQ-120BSC / Varco TDS-11SA 级)
  const topDriveGroup = new THREE.Group()
  topDriveGroup.position.set(0, -4.8, 0)

  // 顶驱核心重载齿轮箱箱体 (Gearbox Housing)
  const tdsHousing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 2.8), darkMetal)
  tdsHousing.position.set(0, -1.2, 0)
  topDriveGroup.add(tdsHousing)

  // 齿轮箱两翼机体框架与吊挂大耳孔 (Lift Bails)
  for (const side of [-1.7, 1.7]) {
    const liftEar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 2.2), darkMetal)
    liftEar.position.set(side, -0.9, 0)
    topDriveGroup.add(liftEar)
  }

  // 顶驱交流变频钻井电机 (AC Drilling Motor with Ribbed Cooling Jacket)
  const tdsMotor = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 2.8, 20), derrickBlue)
  tdsMotor.position.set(0, 0.8, 0)
  topDriveGroup.add(tdsMotor)

  // 电机顶部强迫风冷离心鼓风机与风罩 (Cooling Blower & Intake Hood)
  const blower = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 0.9, 16), darkMetal)
  blower.position.set(0, 2.5, 0)
  topDriveGroup.add(blower)

  // 鹅颈冲管水龙头与高压泥浆进液管 (Gooseneck Mud Swivel & Washpipe)
  const swivel = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.32, 10, 20, Math.PI * 0.9), derrickBlue)
  swivel.position.set(0, 2.2, 0.6)
  swivel.rotation.x = Math.PI / 2
  topDriveGroup.add(swivel)

  // 顶驱旋转主轴与耐磨接头 (Chrome Drive Quill & Saver Sub)
  topDriveQuill = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2.6, 20), silverChrome)
  topDriveQuill.position.set(0, -3.8, 0)
  topDriveGroup.add(topDriveQuill)

  const saverSub = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.9, 16), derrickBlue)
  saverSub.position.set(0, -4.6, 0)
  topDriveGroup.add(saverSub)

  // 内防喷器阀体与液控执行器 (IBOP Valve & Actuator)
  const ibopBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.6), darkMetal)
  ibopBox.position.set(0, -3.4, 0)
  topDriveGroup.add(ibopBox)

  // 液压倾角摆动吊环吊耳与立根吊卡 (Hydraulic Link Tilt Arms & Drill Pipe Elevator)
  for (const ls of [-1.55, 1.55]) {
    const linkArm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.8, 10), darkMetal)
    linkArm.position.set(ls, -3.6, 0)
    topDriveGroup.add(linkArm)

    // 液压摆头油缸 (Link Tilt Cylinders)
    const tiltCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), silverChrome)
    tiltCyl.position.set(ls * 0.85, -2.4, 0.65)
    tiltCyl.rotation.x = 0.45
    topDriveGroup.add(tiltCyl)
  }
  const elevator = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 1.8), yellowSafety)
  elevator.position.set(0, -5.8, 0)
  topDriveGroup.add(elevator)

  // 顶驱背部防扭抗震导向滑车 (Torque Guide Dolly & Rollers)
  const dollyBeam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.4, 0.7), darkMetal)
  dollyBeam.position.set(0, -1.2, -2.3)
  topDriveGroup.add(dollyBeam)

  // 4 组滑车导向滚轮 (Guide Rollers engaging vertical torque track rails)
  for (const rs of [-1.2, 1.2]) {
    for (const ry of [0.1, -2.5]) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.55, 16), yellowSafety)
      roller.rotation.x = Math.PI / 2
      roller.position.set(rs, ry, -2.3)
      topDriveGroup.add(roller)
    }
  }

  // 游车滑轮上方的游动多股大绳 (Traveling Block Reeved Drilling Lines - 连通天车滑轮)
  for (const sx of [-0.9, 0.9]) {
    for (const sz of [-0.5, 0.5]) {
      const lineMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 32, 6), silverChrome)
      lineMesh.position.set(sx, 16 + 2.4, sz)
      travelingBlock.add(lineMesh)
    }
  }

  travelingBlock.add(topDriveGroup)
  rigGroup.add(travelingBlock)

  // 钻柱与转盘井口动力卡瓦总成 (Heavy Drill String with Rotary Master Bushing & Power Slips)
  drillString = new THREE.Group()
  drillString.position.y = floorH

  // 1. 地下深井加重钻柱 (深入井筒 65m，外径符合 240mm 重型合金钻具工业规范)
  const pipeRadius = 0.12
  const undergroundPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(pipeRadius, pipeRadius, 65, 20),
    new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.88, roughness: 0.22 })
  )
  undergroundPipe.position.y = -65 / 2
  drillString.add(undergroundPipe)

  // 2. 钻台转盘上方标准露出钻杆与外加厚母接头 (Tool Joint Box: 规范露出 0.75m，彻底消除原先 5m 高突兀粗柱！)
  const jointBox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.75, 20),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 })
  )
  jointBox.position.y = 0.75 / 2
  drillString.add(jointBox)

  // 钻具接头上部 API 螺纹保护接箍与黄色耐磨带 (Hardbanding & Thread Protector)
  const protectorRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.22, 20),
    yellowSafety
  )
  protectorRing.position.y = 0.75 - 0.11
  drillString.add(protectorRing)

  // 3. 转盘中心四瓣重型气动/液压防滑动力卡瓦组 (Rotary Power Slips - 紧锁钻杆，完全符合起下钻操作规范)
  const slipsGroup = new THREE.Group()
  slipsGroup.position.y = 0.18
  for (let s = 0; s < 4; s++) {
    const sAng = (s * Math.PI) / 2 + Math.PI / 4
    const slipSegment = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.28, 0.35, 8, 1, false, sAng - 0.28, 0.56),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8, roughness: 0.3 })
    )
    slipsGroup.add(slipSegment)
  }
  // 卡瓦提放同步环与安全导向销
  const slipsRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 16), yellowSafety)
  slipsRing.rotation.x = Math.PI / 2
  slipsRing.position.y = 0.35
  slipsGroup.add(slipsRing)
  drillString.add(slipsGroup)

  // 真实 API Spec 7-1 工业级 5 翼 PDC 聚晶金刚石复合片重型刮刀钻头 (彻底淘汰生硬尖锐三角锥！)
  drillBit = new THREE.Group()
  drillBit.position.y = -52

  const bitSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // 淬火高耐磨合金钢
    metalness: 0.92,
    roughness: 0.22,
  })
  const goldMatrixMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // 碳化钨基体金黄耐磨硬面涂层
    metalness: 0.88,
    roughness: 0.28,
  })
  const pdcCutterMat = new THREE.MeshStandardMaterial({
    color: 0x09090b, // 黑色超硬人造聚晶金刚石切削片 (PDC)
    metalness: 0.98,
    roughness: 0.08,
  })
  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // 耐磨硬质合金水力冲洗喷嘴
    metalness: 0.94,
    roughness: 0.15,
  })

  // 1. 钻头上部 API 4-1/2" REG 螺纹接头台肩与上扣扳手槽 (Pin Shoulder & Breaker Slots)
  const pinShank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 1.8, 20), bitSteelMat)
  pinShank.position.y = 1.4
  drillBit.add(pinShank)

  for (const bx of [-1.55, 1.55]) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 1.2), bitSteelMat)
    slot.position.set(bx, 1.4, 0)
    drillBit.add(slot)
  }

  // 2. 钻头流线型胎体冠部 (Fluid Matrix Crown Body)
  const crownBody = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.3, 2.6, 24), goldMatrixMat)
  crownBody.position.y = -0.4
  drillBit.add(crownBody)

  // 3. 5 道螺旋扭曲外旋切削刀翼与 PDC 金刚石复合片切削齿群 (5 Spiral Blades & PDC Cutters)
  for (let b = 0; b < 5; b++) {
    const bAngle = (b * Math.PI * 2) / 5
    const bladeGroup = new THREE.Group()
    bladeGroup.rotation.y = bAngle

    // 刀翼主刃骨架 (流线型向心后倾斜切叶片)
    const bladeGeo = new THREE.BoxGeometry(0.65, 2.4, 1.4)
    const blade = new THREE.Mesh(bladeGeo, goldMatrixMat)
    blade.position.set(1.4, -0.7, 0)
    blade.rotation.z = -0.22 // 外倾保径角
    blade.rotation.y = 0.18 // 螺旋排屑前角
    bladeGroup.add(blade)

    // 刀翼外侧耐磨保径块 (Gauge Wear Pad with Trimmers)
    const gaugePad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.7), bitSteelMat)
    gaugePad.position.set(1.95, -0.3, 0)
    bladeGroup.add(gaugePad)

    // 沿切削刃镶嵌 4 颗精密圆盘形 PDC 金刚石切削齿 (PDC Diamond Cutters)
    for (let c = 0; c < 4; c++) {
      const cutter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12), pdcCutterMat)
      cutter.rotation.x = Math.PI / 2
      cutter.rotation.y = -0.25 // 切削前倾角
      cutter.position.set(0.8 + c * 0.35, -1.6 + c * 0.45, 0.6)
      bladeGroup.add(cutter)
    }

    drillBit.add(bladeGroup)
  }

  // 4. 刀翼间的高压钻井泥浆排屑水眼喷嘴 (Hydraulic Mud Jet Nozzles)
  for (let n = 0; n < 3; n++) {
    const nAngle = (n * Math.PI * 2) / 3 + 0.35
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.6, 12), nozzleMat)
    nozzle.rotation.z = Math.PI / 1.1
    nozzle.position.set(Math.cos(nAngle) * 0.9, -1.4, Math.sin(nAngle) * 0.9)
    drillBit.add(nozzle)
  }

  drillString.add(drillBit)
  rigGroup.add(drillString)

  const sparkCount = 180
  const sPos = new Float32Array(sparkCount * 3)
  for (let i = 0; i < sparkCount; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 5
    sPos[i * 3 + 1] = -52 + Math.random() * 5
    sPos[i * 3 + 2] = (Math.random() - 0.5) * 5
  }
  const sGeo = new THREE.BufferGeometry()
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
  drillSparksParticles = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0x38bdf8, size: 1.4, transparent: true, blending: THREE.AdditiveBlending }))
  rigGroup.add(drillSparksParticles)

  scene.add(rigGroup)
}

function createStrut(parent: THREE.Group, p1: THREE.Vector3, p2: THREE.Vector3, mat: THREE.Material, radius = 0.35) {
  const dist = p1.distanceTo(p2)
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dist, 12), mat)
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
  strut.position.copy(mid)
  strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize())
  parent.add(strut)
}

function createCornerLeg(parent: THREE.Group, p1: THREE.Vector3, p2: THREE.Vector3, mat: THREE.Material) {
  const dist = p1.distanceTo(p2)
  // 12000米特深井高强耐候结构重载圆管腿柱 (消除方管由于锥度交汇产生的断阶穿模与粗糙突兀感)
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, dist, 16), mat)
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
  leg.position.copy(mid)
  leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize())
  parent.add(leg)

  // 腿柱纵向重载抗弯加劲肋条 (External Structural Stiffener)
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, dist * 0.96, 0.25), mat)
  rib.position.copy(mid)
  rib.quaternion.copy(leg.quaternion)
  parent.add(rib)
}

// -------------------------------------------------------------
// 9. 井前立式高压泥浆储罐群与除砂储气立罐 (复刻图三井前5座立式灰色储罐)
// -------------------------------------------------------------
function buildVerticalAccumulatorTanks() {
  if (!scene) return
  const tanksGroup = new THREE.Group()
  // 位于基台表面 (Y = 2.75)，排布在井架西翼底座前沿 (X = -27.5, Z = 14.5)，完美契合泥浆流线、不挡猫道中轴
  tanksGroup.position.set(-27.5, 2.75, 14.5)

  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // 工业浅灰涂装
    metalness: 0.65,
    roughness: 0.32,
  })
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.88,
    roughness: 0.25,
  })
  const yellowSafety = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.6,
    roughness: 0.4,
  })
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.1,
  })
  const valveRed = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    metalness: 0.75,
    roughness: 0.25,
  })

  const emblemTex = createCnpcEmblemTexture()
  const emblemMat = new THREE.MeshBasicMaterial({
    map: emblemTex,
    transparent: true,
  })

  const tankCount = 5
  const spacing = 3.2
  const startX = -((tankCount - 1) * spacing) / 2 // 相对 tanksGroup 中心居中排布
  const tankRadius = 1.35
  const tankH = 8.5

  // 1. 5 座立式储罐单体
  for (let i = 0; i < tankCount; i++) {
    const tx = startX + i * spacing
    const tSingle = new THREE.Group()
    tSingle.position.x = tx

    // 混凝土基墩与重型承重圆盘底圈
    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(tankRadius * 1.25, tankRadius * 1.3, 0.7, 24), baseMat)
    basePlinth.position.y = 0.35
    tSingle.add(basePlinth)

    // 圆柱形承压主罐身
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(tankRadius, tankRadius, tankH, 24), tankMat)
    cylinder.position.y = 0.7 + tankH / 2
    tSingle.add(cylinder)

    // 顶部半球形椭圆封头
    const domeHead = new THREE.Mesh(
      new THREE.SphereGeometry(tankRadius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      tankMat
    )
    domeHead.position.y = 0.7 + tankH
    tSingle.add(domeHead)

    // 罐体环形加强箍筋 (Stiffener Rings)
    for (const ry of [2.5, 5.0, 7.5]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(tankRadius + 0.06, tankRadius + 0.06, 0.25, 24), baseMat)
      ring.position.y = 0.7 + ry
      tSingle.add(ring)
    }

    // 罐身正面中国石油红色宝石花徽标
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), emblemMat)
    badge.position.set(0, 0.7 + tankH * 0.58, tankRadius + 0.08)
    tSingle.add(badge)

    // 底部排污与泥浆阀组
    const drainValve = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12), baseMat)
    drainValve.rotation.x = Math.PI / 2
    drainValve.position.set(0, 1.4, tankRadius + 0.35)
    tSingle.add(drainValve)

    const handwheel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 6, 12), valveRed)
    handwheel.position.set(0, 1.4, tankRadius + 0.75)
    tSingle.add(handwheel)

    // 罐壁垂直检修直梯
    const ladderGroup = new THREE.Group()
    ladderGroup.position.set(tankRadius + 0.15, 0.7, 0)
    for (const lz of [-0.25, 0.25]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, tankH, 0.06), yellowSafety)
      rail.position.set(0, tankH / 2, lz)
      ladderGroup.add(rail)
    }
    for (let r = 0; r < tankH; r += 0.45) {
      const step = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), yellowSafety)
      step.rotation.x = Math.PI / 2
      step.position.set(0, r, 0)
      ladderGroup.add(step)
    }
    tSingle.add(ladderGroup)

    tanksGroup.add(tSingle)
  }

  // 2. 位于 5 座立罐后侧的专用联动巡检走道桥与安全护栏 (Rear Gangway Walkway - 彻底杜绝穿透罐体！)
  const gangwayLen = (tankCount - 1) * spacing + 2.2
  const gangwayZ = -(tankRadius + 0.75)
  const gangwayY = 0.7 + tankH * 0.75

  const walkwayFloor = new THREE.Mesh(new THREE.BoxGeometry(gangwayLen, 0.18, 1.2), baseMat)
  walkwayFloor.position.set(0, gangwayY, gangwayZ)
  tanksGroup.add(walkwayFloor)

  // 走道外侧单侧黄色安全护手护栏
  const wRail = new THREE.Mesh(new THREE.BoxGeometry(gangwayLen, 1.2, 0.08), yellowSafety)
  wRail.position.set(0, gangwayY + 0.6, gangwayZ - 0.55)
  tanksGroup.add(wRail)

  // 每座储罐背部生根的走道悬挑承重牛腿 (Cantilever Support Brackets)
  for (let i = 0; i < tankCount; i++) {
    const tx = startX + i * spacing
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 1.2), baseMat)
    bracket.position.set(tx, gangwayY - 0.25, -(tankRadius + 0.3))
    tanksGroup.add(bracket)
  }

  // 3. 罐前外挂高压泥浆汇流大管与罐后气平衡管 (全部外挂于罐壁支座，彻底杜绝穿模)
  const mudPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, gangwayLen, 16), chromeMat)
  mudPipe.rotation.z = Math.PI / 2
  mudPipe.position.set(0, 1.8, tankRadius + 0.35)
  tanksGroup.add(mudPipe)

  const gasPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, gangwayLen, 16), chromeMat)
  gasPipe.rotation.z = Math.PI / 2
  gasPipe.position.set(0, 0.7 + tankH - 1.2, -(tankRadius + 0.35))
  tanksGroup.add(gasPipe)

  scene.add(tanksGroup)
}

// -------------------------------------------------------------
// 10. 井场周边大型野外集装箱活动板房营地阵列 (复刻图二图三U型营房群)
// -------------------------------------------------------------
function buildModularContainerCamp() {
  if (!scene) return
  const campGroup = new THREE.Group()

  const wallWhite = new THREE.MeshStandardMaterial({
    color: 0xcfd8dc, // 工程钛灰耐候防晒彩钢板，温润沉稳告别死白
    metalness: 0.35,
    roughness: 0.55,
  })
  const frameBlue = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // 中石油标准工程海蓝边框
    metalness: 0.72,
    roughness: 0.35,
  })
  const cornerDark = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // ISO角件铸钢
    metalness: 0.9,
    roughness: 0.2,
  })
  const windowGlass = new THREE.MeshStandardMaterial({
    color: 0x0f2744, // 遮阳双层钢化反光玻璃
    roughness: 0.1,
    metalness: 0.92,
  })
  const padGravel = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // 井坪硬化级配碎石地面
    roughness: 0.9,
    metalness: 0.15,
  })
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.65,
    roughness: 0.35,
  })

  // 创建单栋工业级标准活动集装箱营房 (12m x 3.6m x 3.2m)
  function createCabin(hasDish?: boolean): THREE.Group {
    const cabin = new THREE.Group()
    const L = 12.0
    const W = 3.6
    const H = 3.2

    // 营房主体箱壳
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, H, W), wallWhite)
    body.position.y = H / 2
    cabin.add(body)

    // 4 根四角垂直承重立柱
    for (const sx of [-L / 2, L / 2]) {
      for (const sz of [-W / 2, W / 2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, H, 0.35), frameBlue)
        post.position.set(sx, H / 2, sz)
        cabin.add(post)

        // 顶底 ISO 集装箱锁具角件
        for (const py of [0.15, H - 0.15]) {
          const corner = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), cornerDark)
          corner.position.set(sx, py, sz)
          cabin.add(corner)
        }
      }
    }

    // 顶部与底部水平海蓝色承重骨架边框
    for (const hy of [0.15, H - 0.15]) {
      const topBeamX = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, 0.3), frameBlue)
      topBeamX.position.set(0, hy, W / 2)
      cabin.add(topBeamX)

      const btmBeamX = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, 0.3), frameBlue)
      btmBeamX.position.set(0, hy, -W / 2)
      cabin.add(btmBeamX)
    }

    // 正面两组双扇推拉铝合金窗
    for (const wx of [-2.8, 2.8]) {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.12), frameBlue)
      winFrame.position.set(wx, 1.8, W / 2 + 0.04)
      cabin.add(winFrame)

      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.1, 0.08), windowGlass)
      winGlass.position.set(wx, 1.8, W / 2 + 0.07)
      cabin.add(winGlass)

      // 遮阳雨棚
      const awning = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.6), frameBlue)
      awning.position.set(wx, 2.6, W / 2 + 0.3)
      awning.rotation.x = 0.2
      cabin.add(awning)
    }

    // 端部入户保温防盗门
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 1.2), doorMat)
    door.position.set(L / 2 + 0.02, 1.15, 0)
    cabin.add(door)

    // 外挂工业变频空调室外机
    const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.5), wallWhite)
    acUnit.position.set(-L / 2 + 1.2, 1.6, -W / 2 - 0.28)
    cabin.add(acUnit)

    const fanGrille = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), cornerDark)
    fanGrille.rotation.y = Math.PI
    fanGrille.position.set(-L / 2 + 1.2, 1.6, -W / 2 - 0.54)
    cabin.add(fanGrille)

    // 卫星天线 (VSAT 通信雷达锅)
    if (hasDish) {
      const dishGroup = new THREE.Group()
      dishGroup.position.set(0, H + 0.15, 0)

      const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8), cornerDark)
      dishMast.position.y = 0.6
      dishGroup.add(dishMast)

      const dishBowl = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.5),
        wallWhite
      )
      dishBowl.rotation.x = -Math.PI / 3.2
      dishBowl.position.set(0, 1.4, 0)
      dishGroup.add(dishBowl)

      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), cornerDark)
      horn.rotation.x = -Math.PI / 3.2
      horn.position.set(0, 1.7, 0.6)
      dishGroup.add(horn)

      cabin.add(dishGroup)
    }

    return cabin
  }

  // 1. 西翼生活营区 (Living & Accommodation Camp)
  // 位于井场西侧平整碎石场地: X = -82, Z = 8，与固控泥浆区保持10米安全消防通道距离
  const westPad = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 52), padGravel)
  westPad.position.set(-82, 0.15, 8)
  campGroup.add(westPad)

  const westRows = [-88, -76]
  const westZs = [-10, 2, 14, 26]
  westRows.forEach((rx) => {
    westZs.forEach((rz) => {
      const c = createCabin()
      c.position.set(rx, 0.3, rz)
      c.rotation.y = rx === -88 ? Math.PI : 0 // 门窗朝向中间营区主道
      campGroup.add(c)
    })
  })

  // 2. 东北翼地质录井与综合指挥营区 (Mud-Logging & Command Center)
  // 布局于井场东北后翼平整碎石场地: X = 46, Z = -62，彻底避免与采油机组产生空间干涉穿模
  const eastPad = new THREE.Mesh(new THREE.BoxGeometry(32, 0.3, 44), padGravel)
  eastPad.position.set(46, 0.15, -62)
  campGroup.add(eastPad)

  const eastRows = [39, 53]
  const eastZs = [-74, -62, -50]
  eastRows.forEach((rx) => {
    eastZs.forEach((rz) => {
      const isChief = rx === 39 && rz === -62
      const c = createCabin(isChief)
      c.position.set(rx, 0.3, rz)
      c.rotation.y = rx === 39 ? 0 : Math.PI // 门窗朝向中间内道
      campGroup.add(c)
    })
  })

  // 3. 营区照明路灯 (Street Lamps)
  const lampConfigs = [
    { lx: -82, lz: -4 },
    { lx: -82, lz: 8 },
    { lx: -82, lz: 20 },
    { lx: 46, lz: -72 },
    { lx: 46, lz: -62 },
    { lx: 46, lz: -52 },
  ]
  lampConfigs.forEach(({ lx, lz }) => {
    const lamp = new THREE.Group()
    lamp.position.set(lx, 0.3, lz)

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5.5, 8), frameBlue)
    pole.position.y = 2.75
    lamp.add(pole)

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), frameBlue)
    arm.position.set(lx > 0 ? -0.5 : 0.5, 5.4, 0)
    lamp.add(arm)

    const lightHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.3), cornerDark)
    lightHead.position.set(lx > 0 ? -1.0 : 1.0, 5.35, 0)
    lamp.add(lightHead)

    const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.25), new THREE.MeshBasicMaterial({ color: 0xfffaed }))
    bulb.rotation.x = Math.PI / 2
    bulb.position.set(lx > 0 ? -1.0 : 1.0, 5.27, 0)
    lamp.add(bulb)

    campGroup.add(lamp)
  })

  scene.add(campGroup)
}

// -------------------------------------------------------------
// 11. 井场大门经典红色标语牌网格刚架 (彻底根治Z-fighting闪烁，一体化多材质实心箱体)
// -------------------------------------------------------------
function buildIconicSloganBillboards() {
  if (!scene) return
  const sloganGroup = new THREE.Group()

  const whiteSteel = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.85,
    roughness: 0.25,
  })
  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.88,
    roughness: 0.22,
  })
  const bollardYellow = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.65,
    roughness: 0.35,
  })

  // 标语1贴图：进军深地挺民族脊梁 挑战禁区铸大国重器
  const tex1 = createSloganTexture('进军深地挺民族脊梁  挑战禁区铸大国重器', '中国石油塔里木油田 · 万米特深科学探索井')
  const mat1 = new THREE.MeshStandardMaterial({
    map: tex1,
    roughness: 0.28,
    metalness: 0.45,
  })

  // 标语2贴图：当好深地科技种子队 争做能源保供顶梁柱
  const tex2 = createSloganTexture('当好深地科技种子队  争做能源保供顶梁柱', '中国石油塔里木油田 · 国家战略科技力量')
  const mat2 = new THREE.MeshStandardMaterial({
    map: tex2,
    roughness: 0.28,
    metalness: 0.45,
  })

  function createBillboardRig(sloganMat: THREE.Material, rotY: number, pos: THREE.Vector3): THREE.Group {
    const bb = new THREE.Group()
    bb.position.copy(pos)
    bb.rotation.y = rotY

    const colSpan = 15.0
    const colH = 6.8
    const boardW = 18.5
    const boardH = 2.6
    const boardDepth = 0.3
    const boardCenterY = 5.2

    const colMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.28 })
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.92, roughness: 0.18 })

    // 立柱完全后置于标语牌背部 (严禁立柱穿插正面挡字)
    const colZ = -boardDepth / 2 - 0.22 // z = -0.37

    // 1. 左右两根深色重型工业立柱与规整底座 (全背置后托，正面文字 100% 零遮挡)
    for (const sx of [-colSpan / 2, colSpan / 2]) {
      // 干净稳固的低矮混凝土基台 (位于背面)
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.2), baseMat)
      plinth.position.set(sx, 0.225, colZ)
      bb.add(plinth)

      // 干净刚劲的主承重立柱 (位于背面贴合标语牌后壳，绝不凸出正面)
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.44, colH - 0.45, 0.44), colMat)
      col.position.set(sx, (colH + 0.45) / 2, colZ)
      bb.add(col)

      // 立柱根部加劲法兰底板
      const fBase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.85), colMat)
      fBase.position.set(sx, 0.49, colZ)
      bb.add(fBase)
    }

    // 背部两道水平加固支撑槽钢 (Backside Support Rails)
    for (const dy of [-0.65, 0.65]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(colSpan + 1.2, 0.18, 0.18), colMat)
      rail.position.set(0, boardCenterY + dy, colZ + 0.12)
      bb.add(rail)
    }

    // 2. 标语牌主体 (完整无暇处于最前侧，正面大红底板与大白字 100% 毫无遮挡)
    const boxMaterials = [
      colMat, // +X
      colMat, // -X
      colMat, // +Y
      colMat, // -Y
      sloganMat, // +Z (正面大红标语，完整露在最前方)
      colMat, // -Z
    ]
    const mainBoardGeo = new THREE.BoxGeometry(boardW, boardH, boardDepth)
    const mainBoardMesh = new THREE.Mesh(mainBoardGeo, boxMaterials)
    mainBoardMesh.position.set(0, boardCenterY, 0)
    bb.add(mainBoardMesh)

    // 精致平整的钛金细压边框 (Slim Titanium-Gold Beveled Trim)
    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.12, 0.08, boardDepth + 0.06), goldTrimMat)
    topTrim.position.set(0, boardCenterY + boardH / 2 + 0.04, 0)
    bb.add(topTrim)

    const btmTrim = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.12, 0.08, boardDepth + 0.06), goldTrimMat)
    btmTrim.position.set(0, boardCenterY - boardH / 2 - 0.04, 0)
    bb.add(btmTrim)

    for (const sx of [-boardW / 2 - 0.04, boardW / 2 + 0.04]) {
      const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, boardH + 0.16, boardDepth + 0.06), goldTrimMat)
      sideTrim.position.set(sx, boardCenterY, 0)
      bb.add(sideTrim)
    }

    // 3. 极简平直的防雨挑檐折板 (Slim Protective Canopy)
    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.35, 0.08, 0.55), colMat)
    canopyRoof.position.set(0, boardCenterY + boardH / 2 + 0.08, 0.12)
    bb.add(canopyRoof)

    // 4 组内嵌式工业 LED 下照射灯与洗墙聚光灯
    for (let fx = -boardW * 0.36; fx <= boardW * 0.36; fx += boardW * 0.24) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.18), colMat)
      lamp.position.set(fx, boardCenterY + boardH / 2 + 0.04, 0.38)
      bb.add(lamp)

      const spotLensMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb })
      const spotLens = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.1), spotLensMat)
      spotLens.position.set(fx, boardCenterY + boardH / 2 - 0.02, 0.39)
      spotLens.rotation.x = 0.5
      bb.add(spotLens)
    }

    // 标语牌正前方柔和下照洗墙聚光灯 (均匀洗亮红底金字标语牌)
    const bbSpot = new THREE.SpotLight(0xfff7ed, 0.8, 18, Math.PI / 2.6, 0.45, 1.0)
    bbSpot.position.set(0, boardCenterY + boardH / 2 + 0.3, 1.2)
    const bbTarget = new THREE.Object3D()
    bbTarget.position.set(0, boardCenterY, 0.2)
    bb.add(bbTarget)
    bbSpot.target = bbTarget
    bb.add(bbSpot)

    sceneFloodlights.push({
      light: bbSpot,
      baseIntensity: 0.6,
      nightIntensity: 5.0,
      duskIntensity: 2.8,
      sandstormIntensity: 2.0,
    })

    return bb
  }

  // 左标语牌：坐落于主干道西侧路肩外缘 (面向大道中央迎宾，绝不遮挡特种车队与井口通道)
  const b1 = createBillboardRig(mat1, 0.25, new THREE.Vector3(-45, 0.2, 55))
  sloganGroup.add(b1)

  // 右标语牌：坐落于主干道东侧路肩外缘 (与左牌对称呼应，留出宽达77m的通畅主干道中央视距)
  const b2 = createBillboardRig(mat2, -0.25, new THREE.Vector3(32, 0.2, 55))
  sloganGroup.add(b2)

  scene.add(sloganGroup)
}

// -------------------------------------------------------------
// 12. 钻具套管排管架与成排管束堆场 (复刻图三入场道两侧钻杆堆场)
// -------------------------------------------------------------
function buildHeavyPipeStorageYards() {
  if (!scene) return
  const yardGroup = new THREE.Group()

  const pipeSteel = new THREE.MeshStandardMaterial({
    color: 0x64748b, // 淬火高强度钻杆合金钢
    metalness: 0.9,
    roughness: 0.22,
  })
  const yellowCap = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // 亮黄耐磨螺纹公接头保护帽
    metalness: 0.55,
    roughness: 0.35,
  })
  const blueCap = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // 天蓝耐磨螺纹母接头保护帽
    metalness: 0.6,
    roughness: 0.35,
  })
  const skidSteel = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.88,
    roughness: 0.28,
  })
  const timberPad = new THREE.MeshStandardMaterial({
    color: 0xb45309, // 防震防磕碰硬木垫木条
    roughness: 0.8,
  })
  const slingYellow = new THREE.MeshStandardMaterial({
    color: 0xeab308, // 吊装合成纤维扁平吊带
    roughness: 0.5,
  })

  // 创建单组钻具排管台架与成捆管束堆 (Pipe Rack with Stacked Drill Pipes)
  function createPipeRack(yardPos: THREE.Vector3, rotY = 0): THREE.Group {
    const rack = new THREE.Group()
    rack.position.copy(yardPos)
    rack.rotation.y = rotY

    const pipeLen = 13.5
    const pipeR = 0.22
    const rackW = 6.4

    // 1. 三道地面重型工字钢承载排架 (Transverse Skid Sleepers)
    for (const sz of [-pipeLen * 0.38, 0, pipeLen * 0.38]) {
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(rackW, 0.45, 0.5), skidSteel)
      sleeper.position.set(0, 0.25, sz)
      rack.add(sleeper)

      const wood = new THREE.Mesh(new THREE.BoxGeometry(rackW - 0.2, 0.12, 0.4), timberPad)
      wood.position.set(0, 0.52, sz)
      rack.add(wood)

      // 排架两端防滚动三角止退铁块 (Wedge Chocks)
      for (const cx of [-rackW / 2 + 0.25, rackW / 2 - 0.25]) {
        const chock = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), yellowCap)
        chock.position.set(cx, 0.65, sz)
        rack.add(chock)
      }
    }

    // 2. 金字塔形稳定分层堆叠钻具管柱 (3 层堆叠)
    const layers = [
      { count: 7, startX: -rackW * 0.38, y: 0.52 + pipeR, spacing: pipeR * 2.15 },
      { count: 6, startX: -rackW * 0.38 + pipeR * 1.075, y: 0.52 + pipeR + pipeR * 1.73, spacing: pipeR * 2.15 },
      { count: 5, startX: -rackW * 0.38 + pipeR * 2.15, y: 0.52 + pipeR + pipeR * 3.46, spacing: pipeR * 2.15 },
    ]

    layers.forEach((layer) => {
      for (let p = 0; p < layer.count; p++) {
        const px = layer.startX + p * layer.spacing
        const pSingle = new THREE.Group()
        pSingle.position.set(px, layer.y, 0)

        // 钻杆主合金钢管身
        const pipeBody = new THREE.Mesh(new THREE.CylinderGeometry(pipeR, pipeR, pipeLen, 16), pipeSteel)
        pipeBody.rotation.x = Math.PI / 2
        pSingle.add(pipeBody)

        // 前端螺纹保护帽 (Pin Protector: 亮黄色)
        const frontCap = new THREE.Mesh(new THREE.CylinderGeometry(pipeR * 1.15, pipeR * 1.15, 0.55, 16), yellowCap)
        frontCap.rotation.x = Math.PI / 2
        frontCap.position.z = pipeLen / 2 + 0.15
        pSingle.add(frontCap)

        // 后端加厚母接头螺纹保护帽 (Box Protector: 天蓝色)
        const backCap = new THREE.Mesh(new THREE.CylinderGeometry(pipeR * 1.25, pipeR * 1.25, 0.75, 16), blueCap)
        backCap.rotation.x = Math.PI / 2
        backCap.position.z = -pipeLen / 2 - 0.2
        pSingle.add(backCap)

        rack.add(pSingle)
      }
    })

    // 3. 捆绑固定管束的高强黄色吊装带 (Lifting Slings)
    for (const lz of [-pipeLen * 0.3, pipeLen * 0.3]) {
      const sling = new THREE.Mesh(new THREE.BoxGeometry(rackW * 0.78, 0.08, 0.25), slingYellow)
      sling.position.set(0, 0.52 + pipeR * 4.4, lz)
      rack.add(sling)
    }

    return rack
  }

  // 1. 西排管堆场 (West Pipe Yard: 猫道西侧，完美平行对齐)
  const yard1 = createPipeRack(new THREE.Vector3(-27, 0.2, 34), 0)
  yardGroup.add(yard1)

  const yard2 = createPipeRack(new THREE.Vector3(-27, 0.2, 49), 0)
  yardGroup.add(yard2)

  // 2. 东排管堆场 (East Pipe Yard: 猫道东侧，对称呼应)
  const yard3 = createPipeRack(new THREE.Vector3(-3, 0.2, 34), 0)
  yardGroup.add(yard3)

  const yard4 = createPipeRack(new THREE.Vector3(-3, 0.2, 49), 0)
  yardGroup.add(yard4)

  scene.add(yardGroup)
}

// -------------------------------------------------------------
// 9. 泥浆循环固控系统
// -------------------------------------------------------------
function buildMudSystem() {
  if (!scene) return
  const mudGroup = new THREE.Group()
  mudGroup.position.set(-52, 0.2, 8)

  const heavyMetal = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.88, roughness: 0.22 })
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.92, roughness: 0.26 })
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.78, roughness: 0.32 })
  const safetyYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.35 })
  const silverChrome = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.96, roughness: 0.12 })
  const valveRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.75, roughness: 0.25 })
  const liquidMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 })

  // 1. F-1600 三缸单作用重型钻井高压泥浆泵机组 (Triplex Mud Pump Unit with Inspection Covers)
  const pumpSkid = new THREE.Group()
  pumpSkid.position.set(0, 0, -8)

  // 撬装工字钢重型槽钢滑移底座
  for (const bz of [-4.5, 4.5]) {
    const mainSkid = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 0.8), heavyMetal)
    mainSkid.position.set(0, 0.45, bz)
    pumpSkid.add(mainSkid)
  }
  for (let bx = -8; bx <= 8; bx += 4) {
    const crossSkid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 8.2), heavyMetal)
    crossSkid.position.set(bx, 0.45, 0)
    pumpSkid.add(crossSkid)
  }

  // 动力端高强度铸钢曲轴箱体 (Crankcase with Round Inspection Covers)
  const crankcase = new THREE.Mesh(new THREE.BoxGeometry(11, 4.8, 8.5), blueMat)
  crankcase.position.set(-3.0, 3.2, 0)
  pumpSkid.add(crankcase)

  // 曲轴箱两侧圆形轴承检修压盖 (带 6 颗沉头紧固螺栓)
  for (const cz of [-4.35, 4.35]) {
    const coverGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.25, 20)
    const cover = new THREE.Mesh(coverGeo, darkSteel)
    cover.rotation.x = Math.PI / 2
    cover.position.set(-3.0, 3.2, cz)
    pumpSkid.add(cover)

    for (let bi = 0; bi < 6; bi++) {
      const theta = (bi * Math.PI) / 3
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 6), silverChrome)
      bolt.rotation.x = Math.PI / 2
      bolt.position.set(-3.0 + Math.cos(theta) * 1.1, 3.2 + Math.sin(theta) * 1.1, cz + (cz > 0 ? 0.06 : -0.06))
      pumpSkid.add(bolt)
    }
  }

  // 液力端三缸锻造高压阀箱 (Fluid End with 3 Cylinders & Valve Covers)
  for (let c = -2.6; c <= 2.6; c += 2.6) {
    // 阀盖盲板法兰
    const valveCap = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.2, 16), heavyMetal)
    valveCap.rotation.z = Math.PI / 2
    valveCap.position.set(4.0, 3.2, c)
    pumpSkid.add(valveCap)

    const fluidCyl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 2.2), heavyMetal)
    fluidCyl.position.set(3.0, 3.2, c)
    pumpSkid.add(fluidCyl)

    // 缸套锁紧螺栓
    for (const dy of [-1.1, 1.1]) {
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.5, 8), silverChrome)
      stud.rotation.z = Math.PI / 2
      stud.position.set(4.2, 3.2 + dy, c)
      pumpSkid.add(stud)
    }
  }

  // 红色高压充氮空气稳压包 (Pulsation Dampener with Nitrogen Charge Valve)
  const dampener = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), valveRed)
  dampener.position.set(3.5, 6.2, 0)
  pumpSkid.add(dampener)

  const n2Valve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), silverChrome)
  n2Valve.position.set(3.5, 7.8, 0)
  pumpSkid.add(n2Valve)

  // 稳压包高压充油抗震泥浆压力表与指针
  const dampenerGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.2, 16), silverChrome)
  dampenerGauge.rotation.x = Math.PI / 2
  dampenerGauge.position.set(4.8, 6.2, 0)
  pumpSkid.add(dampenerGauge)

  const dDial = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }))
  dDial.position.set(4.8, 6.2, 0.11)
  pumpSkid.add(dDial)

  mudPressureNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.02), valveRed)
  mudPressureNeedle.position.set(4.8, 6.2, 0.12)
  pumpSkid.add(mudPressureNeedle)

  // 泥浆高压排出主管路与剪切安全阀
  const dischargeManifold = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 8.0, 12), heavyMetal)
  dischargeManifold.position.set(3.5, 4.6, 0)
  pumpSkid.add(dischargeManifold)

  // 泥浆高压输浆地面主管线与防沉降管枕 (Ground High-Pressure Mud Line to Derrick Standpipe)
  const hpLineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.5, 4.6, 4.0),
    new THREE.Vector3(3.5, 1.2, 5.0),
    new THREE.Vector3(14.0, 1.2, 5.0),
    new THREE.Vector3(26.0, 1.2, 2.0),
  ])
  const hpLineMesh = new THREE.Mesh(
    new THREE.TubeGeometry(hpLineCurve, 16, 0.35, 10, false),
    heavyMetal
  )
  pumpSkid.add(hpLineMesh)

  // 地面混凝土管枕与黄色防震固定管卡 (Pipe Sleepers with Safety Clamps)
  for (const px of [9.0, 18.0]) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 1.8), darkSteel)
    sleeper.position.set(px, 0.22, 5.0)
    pumpSkid.add(sleeper)

    const sleeperClamp = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 12, Math.PI), safetyYellow)
    sleeperClamp.rotation.z = Math.PI
    sleeperClamp.position.set(px, 0.85, 5.0)
    pumpSkid.add(sleeperClamp)
  }
  mudGroup.add(pumpSkid)

  // 2. 真实敞口净化泥浆罐组与走道护栏 (Mud Tanks with Access Stairway & Handrails)
  for (let t = 0; t < 2; t++) {
    const tankGroup = new THREE.Group()
    tankGroup.position.set(0, 0, 4 + t * 9)

    // 罐体外壳 (带有四周加强型钢外框)
    const tankWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5.0, 8.0), heavyMetal)
    tankWall.position.y = 2.5
    tankGroup.add(tankWall)

    // 外壁横向槽钢加筋圈
    for (const ry of [1.6, 3.4]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(16.3, 0.35, 8.3), darkSteel)
      rib.position.y = ry
      tankGroup.add(rib)
    }

    // 罐内真实泥浆液面 (Liquid Level)
    const mudSurface = new THREE.Mesh(new THREE.PlaneGeometry(15.2, 7.2), liquidMat)
    mudSurface.rotation.x = -Math.PI / 2
    mudSurface.position.y = 4.6
    mudSurfaces.push(mudSurface)
    tankGroup.add(mudSurface)

    // 罐顶钢格栅检修走道与黄色安全护栏 (Walkway & Handrails)
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 2.0), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }))
    walkway.position.set(0, 5.1, 3.0)
    tankGroup.add(walkway)

    const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 1.4, 0.1), safetyYellow)
    rail.position.set(0, 5.8, 3.9)
    tankGroup.add(rail)

    // 登罐 45° 钢格栅斜梯与扶手 (仅在第1个罐外侧)
    if (t === 0) {
      const stairGroup = new THREE.Group()
      stairGroup.position.set(8.2, 0, 2.5)
      const sRamp = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.25, 1.4), darkSteel)
      sRamp.position.set(2.5, 2.5, 0)
      sRamp.rotation.z = -Math.PI / 4.2
      stairGroup.add(sRamp)

      const sRail = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.2, 0.08), safetyYellow)
      sRail.position.set(2.5, 3.3, 0.7)
      sRail.rotation.z = -Math.PI / 4.2
      stairGroup.add(sRail)
      tankGroup.add(stairGroup)
    }

    // 罐顶防爆泥浆搅拌器电机与传动轴
    for (let a = -4; a <= 4; a += 8) {
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.0, 12), blueMat)
      motor.position.set(a, 6.2, 0)
      tankGroup.add(motor)

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8), heavyMetal)
      shaft.position.set(a, 4.0, 0)
      tankGroup.add(shaft)

      const paddle = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.25, 0.45), new THREE.MeshBasicMaterial({ color: 0x00f0ff }))
      paddle.position.set(a, 4.0, 0)
      agitatorPaddles.push(paddle)
      tankGroup.add(paddle)
    }
    mudGroup.add(tankGroup)
  }

  // 3. 高频椭圆双联振动筛总成 (Derrick Hyperpool Shale Shakers with Coil Springs & Back Log)
  const shakerGroup = new THREE.Group()
  shakerGroup.position.set(13.2, 0, 4)

  // 镂空型钢滑槽撬装底架
  const skidFrame = new THREE.Group()
  for (const sz of [-3.4, 3.4]) {
    const sBeam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.7, 0.5), heavyMetal)
    sBeam.position.set(0, 0.35, sz)
    skidFrame.add(sBeam)
  }
  for (let sx = -3.6; sx <= 3.6; sx += 3.6) {
    const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 6.6), heavyMetal)
    crossB.position.set(sx, 0.35, 0)
    skidFrame.add(crossB)
  }
  shakerGroup.add(skidFrame)

  // 四角高刚度合金减震隔离弹簧座 (4 Heavy-Duty Isolation Coil Springs)
  const springPositions = [
    [-2.8, -2.4], [2.8, -2.4],
    [-2.8, 2.4], [2.8, 2.4],
  ]
  springPositions.forEach(([spx, spz]) => {
    // 弹簧下支座
    const sBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.4, 12), darkSteel)
    sBase.position.set(spx, 0.9, spz)
    shakerGroup.add(sBase)

    // 螺旋减震弹簧 (模拟重型机械螺旋弹簧圈)
    for (let c = 0; c < 4; c++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 6, 12), silverChrome)
      coil.rotation.x = Math.PI / 2
      coil.position.set(spx, 1.2 + c * 0.35, spz)
      shakerGroup.add(coil)
    }
  })

  // 倾斜悬挂高强度筛箱 (Tilted Screen Basket with Stiffeners)
  shakerScreenMesh = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.45, 5.5), safetyYellow)
  shakerScreenMesh.position.set(0, 3.2, 0)
  shakerScreenMesh.rotation.x = 0.16
  shakerGroup.add(shakerScreenMesh)

  // 筛网侧壁侧压紧楔块条 (Wedge Clamping Rails)
  for (const wz of [-2.78, 2.78]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.9, 0.2), darkSteel)
    rail.position.set(0, 3.6, wz)
    rail.rotation.x = 0.16
    shakerGroup.add(rail)
  }

  // 顶部激振电机支架与双自同步激振电机 (Dual Vibrator Motors)
  for (const vm of [-2.2, 2.2]) {
    const vMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 14), blueMat)
    vMotor.rotation.z = Math.PI / 2
    vMotor.position.set(vm, 4.4, 0.4)
    shakerGroup.add(vMotor)

    // 电机端盖偏心块防护壳 (Weight Covers)
    for (const ec of [-1.2, 1.2]) {
      const eCap = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.3, 14), darkSteel)
      eCap.rotation.z = Math.PI / 2
      eCap.position.set(vm + ec, 4.4, 0.4)
      shakerGroup.add(eCap)
    }
  }

  // 筛箱后部缓冲分流进浆箱 (Back Tank / Header Box with Overflow Weir)
  const headerBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 5.2), blueMat)
  headerBox.position.set(0, 4.2, -3.2)
  shakerGroup.add(headerBox)

  // 进浆导流管法兰对接短节 (Inlet Mating Flange - 承接 flowlineMesh)
  const inletFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.35, 16), heavyMetal)
  inletFlange.position.set(0, 5.35, 0)
  headerBox.add(inletFlange)

  // 前端岩屑排渣溜槽 (Sand Discharge Chute with Stiffened Lip)
  const chute = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 3.2), heavyMetal)
  chute.rotation.x = -Math.PI / 3.8
  chute.position.set(0, 2.1, 3.8)
  shakerGroup.add(chute)

  // 振动筛下部岩屑收集漏斗槽与钻屑砂石堆 (Cuttings Catch Box & Drill Cuttings Pile)
  const catchBox = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.8, 2.4), darkSteel)
  catchBox.position.set(0, 0.4, 5.2)
  shakerGroup.add(catchBox)

  const cuttingsMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.95 })
  const cuttingsPile = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 12), cuttingsMat)
  cuttingsPile.position.set(0, 0.45, 5.2)
  shakerGroup.add(cuttingsPile)
  mudGroup.add(shakerGroup)

  // 4. 水力除砂除泥清洁器机组 (Drilling Mud Cleaner & Hydrocyclone Desander Unit)
  // 专业工业级重构：采用耐磨深工业耐磨防腐材质 + 黄色安全法兰圈 + 底部接砂收集沉降槽与撬装基座，彻底告别悬空冰淇淋甜筒感
  const cycloneSkid = new THREE.Group()
  cycloneSkid.position.set(13.2, 0, 11)

  // 撬装工字钢重型底座与接地基承
  const skidBase = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.5, 3.6), heavyMetal)
  skidBase.position.set(0, 0.25, 0)
  cycloneSkid.add(skidBase)

  // 支撑重型方管钢柱与斜撑
  for (const cx of [-3.2, 3.2]) {
    const cCol = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7.2, 8), darkSteel)
    cCol.position.set(cx, 3.85, 0)
    cycloneSkid.add(cCol)
  }

  // 底部不锈钢固相落砂收集沉降槽 (Underflow Catch Pan & Discharge Chute)
  const catchPan = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.8, 1.8), darkSteel)
  catchPan.position.set(0, 3.4, 0)
  cycloneSkid.add(catchPan)

  const panLip = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.15, 2.0), heavyMetal)
  panLip.position.set(0, 3.8, 0)
  cycloneSkid.add(panLip)

  // 下部排砂导流溜槽 (引流至排砂外运区)
  const sandChute = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.6), heavyMetal)
  sandChute.position.set(0, 1.8, 1.6)
  sandChute.rotation.x = -Math.PI / 5
  cycloneSkid.add(sandChute)

  // 下层切向进料汇管与上层洁净泥浆溢流汇管 (Inlet & Overflow Manifolds)
  const inletHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 7.4, 14), heavyMetal)
  inletHeader.rotation.z = Math.PI / 2
  inletHeader.position.set(0, 7.2, -0.6)
  cycloneSkid.add(inletHeader)

  const overflowHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 7.6, 14), heavyMetal)
  overflowHeader.rotation.z = Math.PI / 2
  overflowHeader.position.set(0, 8.6, 0)
  cycloneSkid.add(overflowHeader)

  // 5 组工业耐磨聚氨酯水力除砂旋流器 (重型工业质感 + 黄色检修连接法兰)
  const cycBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
  for (let c = -2.4; c <= 2.4; c += 1.2) {
    const cycUnit = new THREE.Group()
    cycUnit.position.set(c, 7.2, 0)

    // A. 顶部切向进料圆柱腔 (深铁灰高刚度筒体)
    const feedChamber = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.9, 14), cycBodyMat)
    feedChamber.position.y = 0
    cycUnit.add(feedChamber)

    // 醒目的中段工业黄色紧固法兰卡箍圈
    const clampRing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 16), safetyYellow)
    clampRing.position.y = -0.45
    cycUnit.add(clampRing)

    // 切向进料短节与法兰对接
    const feedPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 8), heavyMetal)
    feedPipe.rotation.x = Math.PI / 2
    feedPipe.position.set(0.3, 0, -0.32)
    cycUnit.add(feedPipe)

    // B. 中下部渐缩耐磨旋流锥体 (直通下方集砂槽)
    const coneBody = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.16, 2.3, 14), cycBodyMat)
    coneBody.position.y = -1.6
    cycUnit.add(coneBody)

    // C. 底部合金排砂底流咀 (深入集砂槽内)
    const apexNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.65, 12), safetyYellow)
    apexNozzle.position.y = -3.0
    cycUnit.add(apexNozzle)

    // D. 顶部溢流导向 90° 弯头连接上集管
    const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.14, 6, 12, Math.PI / 2), silverChrome)
    elbow.position.set(0, 0.75, 0)
    elbow.rotation.z = Math.PI / 2
    cycUnit.add(elbow)

    cycloneSkid.add(cycUnit)
  }

  // 旋流进料高压充油抗震泥浆压力表与仪表柱
  const cGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 16), silverChrome)
  cGauge.rotation.x = Math.PI / 2
  cGauge.position.set(3.9, 7.2, -0.6)
  cycloneSkid.add(cGauge)

  const cDial = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }))
  cDial.position.set(3.9, 7.2, -0.51)
  cycloneSkid.add(cDial)
  mudGroup.add(cycloneSkid)

  // 5. 负压真空除气器机组 (Vacuum Degasser with Vent Stack & Discharge Valve)
  const degasserGroup = new THREE.Group()
  degasserGroup.position.set(13.2, 0, -4.5)

  const degasserVessel = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4.8, 16), blueMat)
  degasserVessel.position.y = 4.2
  degasserGroup.add(degasserVessel)

  const degasserCap = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), blueMat)
  degasserCap.position.y = 6.6
  degasserGroup.add(degasserCap)

  // 罐体下部进浆蝶阀与排浆管
  const degInlet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.8, 8), darkSteel)
  degInlet.rotation.z = Math.PI / 2
  degInlet.position.set(1.6, 2.4, 0)
  degasserGroup.add(degInlet)

  const degHandle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.25), valveRed)
  degHandle.position.set(2.4, 2.8, 0)
  degasserGroup.add(degHandle)

  // 顶部天然气高架安全排气立管 (Vent Stack)
  const ventLine = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8.5, 8), heavyMetal)
  ventLine.position.set(0, 10.5, 0)
  degasserGroup.add(ventLine)

  // 真空泵电动机组与皮带轮护罩
  const vacMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 12), heavyMetal)
  vacMotor.rotation.z = Math.PI / 2
  vacMotor.position.set(-2.2, 2.5, 0)
  degasserGroup.add(vacMotor)

  const beltGuard = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 1.2), safetyYellow)
  beltGuard.position.set(-3.4, 2.5, 0)
  degasserGroup.add(beltGuard)
  mudGroup.add(degasserGroup)

  // 6. 加重混浆漏斗作业平台与重晶石托盘 (Mud Mixing Hopper Skid with Venturi Nozzle & Bag Cutters)
  const hopperSkid = new THREE.Group()
  hopperSkid.position.set(-11, 0, 16)

  // 防滑钢格栅操作平台与黄色护栏
  const hPlatform = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.2, 8.0), heavyMetal)
  hPlatform.position.y = 0.6
  hopperSkid.add(hPlatform)

  const hRail = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.3, 0.1), safetyYellow)
  hRail.position.set(0, 1.85, 3.9)
  hopperSkid.add(hRail)

  // 双文丘里射流加重漏斗 (Twin Industrial Venturi Jet Hoppers - 消除生硬尖锐圆锥体！)
  for (const hx of [-1.6, 1.6]) {
    const hopperGroup = new THREE.Group()
    hopperGroup.position.set(hx, 0, 0)

    // 漏斗上部开口加固法兰圈
    const topRim = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.15, 16), safetyYellow)
    topRim.position.y = 3.9
    hopperGroup.add(topRim)

    // 漏斗斜向收敛冲压筒身 (Upper Flanged Funnel Shell)
    const funnelBody = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.45, 1.8, 16), safetyYellow)
    funnelBody.position.y = 2.95
    hopperGroup.add(funnelBody)

    // 漏斗底部出料口调节蝶阀 (Butterfly Control Valve with Lever)
    const bValve = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12), darkSteel)
    bValve.position.y = 1.9
    hopperGroup.add(bValve)

    const vHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), valveRed)
    vHandle.rotation.z = Math.PI / 3
    vHandle.position.set(0.4, 2.1, 0)
    hopperGroup.add(vHandle)

    // 漏斗顶部防落网格栅与十字割袋刀片架 (Cross Bag Cutters)
    const cutterX = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.08), silverChrome)
    cutterX.position.y = 3.9
    hopperGroup.add(cutterX)

    const cutterZ = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.8), silverChrome)
    cutterZ.position.y = 3.9
    hopperGroup.add(cutterZ)

    // 下部高压文丘里喉管喷嘴主管 (Venturi Throat Tube)
    const venturiTube = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.6, 12), darkSteel)
    venturiTube.rotation.z = Math.PI / 2
    venturiTube.position.y = 1.4
    hopperGroup.add(venturiTube)

    hopperSkid.add(hopperGroup)
  }

  // 整齐码放的防潮重晶石加重粉料袋托盘 (Palletized Barite Sacks on Wooden Pallets)
  const woodPallet = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 2.8), new THREE.MeshStandardMaterial({ color: 0x78350f }))
  woodPallet.position.set(0, 1.35, 2.2)
  hopperSkid.add(woodPallet)

  for (let sx = -1.6; sx <= 1.6; sx += 1.6) {
    for (let sy = 0; sy < 3; sy++) {
      const sack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.42, 2.2), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 }))
      sack.position.set(sx, 1.68 + sy * 0.42, 2.2)
      hopperSkid.add(sack)
    }
  }
  mudGroup.add(hopperSkid)

  scene.add(mudGroup)
}

// -------------------------------------------------------------
// 10. 现场动力房与BOP防喷器液控房 (Koomey Unit)
// -------------------------------------------------------------
function buildPowerAndBOPControl() {
  if (!scene) return
  const powerGroup = new THREE.Group()
  // 位于井场南后方动力公用区 (X = 4, Z = 66)，与排管堆场及抽油机保持充足安全间距，彻底消除穿模
  powerGroup.position.set(4, 0.2, 66)

  const containerSteel = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 })
  const frameDark = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 })
  const louverMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
  const silencerChrome = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 })
  const bottleRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.75, roughness: 0.25 })
  const koomeyBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 })
  const yellowRail = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.35 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 })

  // 1. 卡特彼勒/康明斯 1800kW 集装箱式重型柴油发电机房 (Containerized Diesel Generator House)
  const genContainer = new THREE.Group()
  genContainer.position.set(2, 0, 0)

  // 集装箱主体 (12m长 x 3.6m高 x 3.4m宽)
  const genBody = new THREE.Mesh(new THREE.BoxGeometry(12, 3.6, 3.4), containerSteel)
  genBody.position.y = 1.8
  genContainer.add(genBody)

  // 四周外骨骼结构型钢立柱与角件
  for (const cx of [-6, 6]) {
    for (const cz of [-1.7, 1.7]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.35), frameDark)
      post.position.set(cx, 1.8, cz)
      genContainer.add(post)
    }
  }
  for (const hy of [0.15, 3.45]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 0.3), frameDark)
    beam.position.set(0, hy, 1.7)
    genContainer.add(beam)
    const beamB = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 0.3), frameDark)
    beamB.position.set(0, hy, -1.7)
    genContainer.add(beamB)
  }

  // 侧壁工业散热百叶窗 (Louver Panels)
  for (const lx of [-3, 3]) {
    const louver = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), louverMat)
    louver.position.set(lx, 2.0, 1.72)
    genContainer.add(louver)
  }

  // 顶部大功率排风消音器与防雨弯头排气立管 (Twin Rooftop Silencer Stacks)
  for (const sx of [-2.2, 2.2]) {
    const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.8, 16), silencerChrome)
    silencer.rotation.z = Math.PI / 2
    silencer.position.set(sx, 4.2, 0)
    genContainer.add(silencer)

    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.2, 12), silencerChrome)
    stack.position.set(sx, 5.5, 0)
    genContainer.add(stack)

    const rainCap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.35, 12), frameDark)
    rainCap.position.set(sx, 6.7, 0)
    genContainer.add(rainCap)
  }
  powerGroup.add(genContainer)

  // 2. API 16D 标准 Koomey 防喷器远程地面高压液控蓄能器撬 (Koomey BOP Control Unit)
  const koomeyGroup = new THREE.Group()
  koomeyGroup.position.set(-10, 0, 0)

  // 撬装重载槽钢底座
  const kSkid = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.45, 3.6), frameDark)
  kSkid.position.y = 0.22
  koomeyGroup.add(kSkid)

  // 液压控制操作工作舱
  const kCabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 3.2), koomeyBlue)
  kCabin.position.set(2.2, 1.45, 0)
  koomeyGroup.add(kCabin)

  // 控制面板带防爆压力表与三位四通换向阀手柄
  for (let gy = 1.4; gy <= 2.2; gy += 0.4) {
    for (let gz = -1.0; gz <= 1.0; gz += 0.5) {
      const kGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), chromeMat)
      kGauge.rotation.z = Math.PI / 2
      kGauge.position.set(3.42, gy, gz)
      koomeyGroup.add(kGauge)
    }
  }

  // 氮气蓄能器钢瓶阵列 (2排 x 6瓶 = 12只重型充氮高压囊式储能胶囊瓶)
  const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 2.8), frameDark)
  rackFrame.position.set(-1.2, 1.5, 0)
  koomeyGroup.add(rackFrame)

  for (let row = -0.8; row <= 0.8; row += 1.6) {
    for (let col = -1.8; col <= 1.8; col += 0.72) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.2, 14), bottleRed)
      bottle.position.set(-1.2 + col, 1.4, row)
      koomeyGroup.add(bottle)

      const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), bottleRed)
      topCap.position.set(-1.2 + col, 2.5, row)
      koomeyGroup.add(topCap)

      const bValve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8), chromeMat)
      bValve.position.set(-1.2 + col, 2.8, row)
      koomeyGroup.add(bValve)
    }
  }

  // 蓄能器外侧黄色安全防护栏
  const kRail = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.2, 3.2), yellowRail)
  kRail.position.set(-1.2, 1.8, 0)
  koomeyGroup.add(kRail)

  powerGroup.add(koomeyGroup)
  scene.add(powerGroup)
}

// -------------------------------------------------------------
// 11. 特种工程车组 (起重机、固井水泥混浆车、压裂车、电测测井车与巡检皮卡)
// -------------------------------------------------------------
function buildSpecialFleet() {
  if (!scene) return
  const fleetGroup = new THREE.Group()

  const truckYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.55, roughness: 0.35 })
  const darkTire = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 })
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
  const safetyYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.4 })
  const valveRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.75, roughness: 0.25 })
  const cabGlass = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.92, roughness: 0.1, transparent: true, opacity: 0.88 })
  const truckRed = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.7, roughness: 0.3 })
  const truckWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.65, roughness: 0.35 })

  // 1. 重型越野全地面起重机 (Heavy All-Terrain Mobile Crane - 搭载真实高精工业级起重机 3D 资产)
  // 位于西排管堆场外侧开阔通道 (X = -38, Z = 38)，车身朝北、主吊臂顺畅仰向排管堆场，彻底告别方块玩具感与穿模
  loadRealVehicleGLB('/models/crane.glb', 16.5, [-38, 0.2, 38], Math.PI / 2, fleetGroup)


  // 辅助构建：工业级重型特种卡车通用底盘总成 (6x6 / 8x8 Heavy Oilfield Special Truck Chassis & Cab)
  function buildTruckChassis(
    parent: THREE.Group,
    cabColor: number,
    chassisLen: number,
    cabZ: number,
    wheels: number[][]
  ) {
    const cabMaterial = new THREE.MeshStandardMaterial({ color: cabColor, metalness: 0.75, roughness: 0.3 })
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.3 })
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    const chromeMaterial = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 })
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 })

    // 1. 承载双大梁纵梁 (Chassis Frame Rails)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, chassisLen), chassisMat)
    frame.position.set(0, 1.15, 0)
    parent.add(frame)

    // 2. 承载防滑上装甲板 (Deck Plate)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, chassisLen - 3.8), chassisMat)
    deck.position.set(0, 1.45, -1.8)
    parent.add(deck)

    // 3. 现代化平头重卡驾驶室 (Heavy Cab)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.7, 3.2), cabMaterial)
    cab.position.set(0, 2.7, cabZ)
    parent.add(cab)

    // 前风挡玻璃 (倾角防反光)
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.1), glassMat)
    windshield.position.set(0, 3.0, cabZ + 1.62)
    parent.add(windshield)

    // 两侧车门观察车窗与后视镜
    for (const sx of [-1.41, 1.41]) {
      const sideWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), glassMat)
      sideWindow.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2
      sideWindow.position.set(sx, 3.0, cabZ + 0.3)
      parent.add(sideWindow)

      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.28), chassisMat)
      mirror.position.set(sx * 1.18, 3.0, cabZ + 1.4)
      parent.add(mirror)
    }

    // 重型防撞前保险杠与防爆大灯
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.75, 0.5), chassisMat)
    bumper.position.set(0, 0.9, cabZ + 1.7)
    parent.add(bumper)

    for (const lx of [-1.05, 1.05]) {
      const headlight = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), new THREE.MeshBasicMaterial({ color: 0xffedd5 }))
      headlight.position.set(lx, 0.9, cabZ + 1.96)
      parent.add(headlight)
    }

    // 驾驶室顶部高位行车警示探照灯
    for (const rx of [-0.9, 0, 0.9]) {
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf59e0b }))
      beacon.position.set(rx, 4.15, cabZ + 1.2)
      parent.add(beacon)
    }

    // 驾驶室背部双高位直通镀铬排气管
    for (const ex of [-1.2, 1.2]) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 12), chromeMaterial)
      stack.position.set(ex, 3.2, cabZ - 1.65)
      parent.add(stack)
    }

    // 底盘两侧大容量柴油油箱与储气筒
    for (const fx of [-1.55, 1.55]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 14), chromeMaterial)
      tank.rotation.x = Math.PI / 2
      tank.position.set(fx, 1.1, cabZ - 2.8)
      parent.add(tank)
    }

    // 车轮与轮毂
    wheels.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.55, 16), wheelMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(wx, wy, wz)
      parent.add(wheel)

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.58, 12), chromeMaterial)
      hub.rotation.z = Math.PI / 2
      hub.position.set(wx, wy, wz)
      parent.add(hub)
    })
  }

  // 2. 双机双泵重型固井水泥混浆车 (Dual-Pump Cementing Truck - 工业级 6x6 重型特种卡车底盘)
  // 位于南侧大道入口区 (X = -44, Z = 70)，车身朝北正对井场大门，威严霸气
  const cTruck = new THREE.Group()
  cTruck.position.set(-44, 0.2, 70)
  cTruck.rotation.y = Math.PI

  // 生成自包含 6x6 重型底盘与驾驶室
  buildTruckChassis(cTruck, 0xdc2626, 13.8, 4.8, [
    [-1.35, 0.72, 4.8], [1.35, 0.72, 4.8],
    [-1.4, 0.72, -2.2], [1.4, 0.72, -2.2],
    [-1.4, 0.72, -4.2], [1.4, 0.72, -4.2],
  ])

  // 上装专业固井作业甲板：左右双三缸柱塞固井泵 (Twin Triplex Cementing Pumps)
  for (const px of [-1.1, 1.1]) {
    const pumpBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 2.6), steelDark)
    pumpBody.position.set(px, 2.4, 0.4)
    cTruck.add(pumpBody)

    // 柱塞液力端与镀铬阀盖
    for (let c = -0.7; c <= 0.7; c += 0.7) {
      const vCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 12), chromeMat)
      vCap.position.set(px, 3.2, 0.4 + c)
      cTruck.add(vCap)
    }
  }

  // 均质混浆罐组 (Twin Stainless Steel Slurry Mixing Tanks)
  for (const tx of [-1.0, 1.0]) {
    const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 16), chromeMat)
    tub.position.set(tx, 2.8, -2.4)
    cTruck.add(tub)

    // 罐顶搅拌电机
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 10), steelDark)
    motor.position.set(tx, 4.0, -2.4)
    cTruck.add(motor)
  }

  // 高能喷射混浆漏斗 (RJM Jet Mixer Funnel)
  const rjmHopper = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.28, 1.2, 14), truckWhite)
  rjmHopper.position.set(0, 3.0, -3.8)
  cTruck.add(rjmHopper)

  // 车尾高压 Chicksan 活接弯头管汇架与旋塞阀组
  const manifoldRack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.7), steelDark)
  manifoldRack.position.set(0, 1.8, -5.5)
  cTruck.add(manifoldRack)

  for (const vx of [-1.2, -0.4, 0.4, 1.2]) {
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.6, 10), valveRed)
    valve.position.set(vx, 2.4, -5.5)
    cTruck.add(valve)
  }
  fleetGroup.add(cTruck)

  // 2b. 固井水泥车至井场的高压 Chicksan 活接硬管汇与安全警戒线 (High-Pressure Cementing Treating Iron)
  const cementingIronGroup = new THREE.Group()
  cementingIronGroup.position.set(-44, 0.2, 70)

  // 弯头与管线由壬三通 (Fig 1502 High-Pressure Chiksan Piping)
  const cIronCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.8, 5.8),
    new THREE.Vector3(0, 0.6, 7.5),
    new THREE.Vector3(6.5, 0.4, 7.5),
    new THREE.Vector3(12.0, 0.4, -6.0),
    new THREE.Vector3(16.0, 0.4, -22.0),
    new THREE.Vector3(20.0, 0.8, -38.0),
  ])
  const cIronMesh = new THREE.Mesh(
    new THREE.TubeGeometry(cIronCurve, 32, 0.14, 8, false),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.82, roughness: 0.25 })
  )
  cementingIronGroup.add(cIronMesh)

  // 由壬活接凸缘 (Hammer Union Collars)
  const unionPoints = [0.15, 0.35, 0.55, 0.75, 0.9]
  unionPoints.forEach(p => {
    const pt = cIronCurve.getPointAt(p)
    const unionRing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 10), safetyYellow)
    unionRing.position.copy(pt)
    cementingIronGroup.add(unionRing)
  })

  // 沿线安全防撞警戒锥桶 (Traffic Safety Cones with Reflective Sleeves)
  const conePositions = [
    [2.5, 6.2], [6.5, 6.2], [10.5, 0.5], [14.0, -14.0], [18.0, -28.0]
  ]
  conePositions.forEach(([cx, cz]) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 })
    )
    cone.position.set(cx, 0.55, cz)
    cementingIronGroup.add(cone)

    // 反光白色警示环
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 0.35, 12),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    )
    sleeve.position.set(cx, 0.6, cz)
    cementingIronGroup.add(sleeve)

    // 橡胶黑色底座
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), darkTire)
    base.position.set(cx, 0.04, cz)
    cementingIronGroup.add(base)
  })

  fleetGroup.add(cementingIronGroup)

  // 3. 沙漠超重型高压压裂混砂车 (Fracturing Pumper Truck - 工业级 8x8 四轴越野重卡底盘)
  // 位于西南作业阵列 (X = -66, Z = 66)，与固井车并列停泊、保持 22m 开阔净距，杜绝穿模
  const fracTruck = new THREE.Group()
  fracTruck.position.set(-66, 0.15, 66)
  fracTruck.rotation.y = Math.PI

  // 生成自包含 8x8 重卡底盘与驾驶室
  buildTruckChassis(fracTruck, 0xb91c1c, 14.5, 5.2, [
    [-1.35, 0.72, 5.2], [1.35, 0.72, 5.2],
    [-1.35, 0.72, 3.4], [1.35, 0.72, 3.4],
    [-1.4, 0.72, -2.4], [1.4, 0.72, -2.4],
    [-1.4, 0.72, -4.4], [1.4, 0.72, -4.4],
  ])

  // 2500HP 重型 V16 柴油机动力舱上装与消音排气
  const engineCover = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 4.8), truckRed)
  engineCover.position.set(0, 2.6, 0.2)
  fracTruck.add(engineCover)

  for (const ex of [-1.2, 1.2]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 12), chromeMat)
    stack.position.set(ex, 3.8, 2.4)
    fracTruck.add(stack)
  }

  // 尾部五缸超高压压裂柱塞泵 (Quintuplex Plunger Pump & Fluid End)
  const qPump = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 2.4), steelDark)
  qPump.position.set(0, 2.4, -3.8)
  fracTruck.add(qPump)

  // 5 个镀铬锻钢柱塞压盖与大口径排出高压汇管
  for (let c = -1.2; c <= 1.2; c += 0.6) {
    const pCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.28, 12), chromeMat)
    pCap.position.set(c, 3.4, -3.8)
    fracTruck.add(pCap)
  }
  const fracIron = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.8, 14), chromeMat)
  fracIron.rotation.z = Math.PI / 2
  fracIron.position.set(0, 2.4, -5.2)
  fracTruck.add(fracIron)

  fleetGroup.add(fracTruck)

  // 4. 换钻头检修台 (Bit Service & Inspection Bench)
  // 部署于西翼开阔工具待命区 (X = -36, Z = 22)，地面标高 0.2m 稳固就位，彻底消除半空浮空
  const bitBench = new THREE.Group()
  bitBench.position.set(-36, 0.2, 22)

  const benchTable = new THREE.Mesh(new THREE.BoxGeometry(5, 1.6, 3), darkTire)
  benchTable.position.y = 0.8
  bitBench.add(benchTable)

  // 真实工业级钻头检测总成：微型 PDC 复合片钻头 + 三牙轮硬质合金钻头 (彻底消除三角锥与纯圆柱！)
  const benchBitsGroup = new THREE.Group()

  // A. 备用 4 翼 PDC 金刚石复合片钻头
  const benchPdc = new THREE.Group()
  benchPdc.position.set(-1.3, 1.6, 0)
  const pdcShank = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.9, 16), steelDark)
  pdcShank.position.y = 0.45
  benchPdc.add(pdcShank)
  const pdcHead = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.6, 1.3, 16), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 }))
  pdcHead.position.y = 1.45
  benchPdc.add(pdcHead)
  for (let b = 0; b < 4; b++) {
    const ba = (b * Math.PI) / 2
    const bBlade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.65), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95 }))
    bBlade.position.set(Math.cos(ba) * 0.75, 1.4, Math.sin(ba) * 0.75)
    bBlade.rotation.y = ba
    benchPdc.add(bBlade)
  }
  bitBench.add(benchPdc)

  // B. 备用三牙轮重载硬质合金钻头 (Tricone Roller Cone Bit)
  const benchTricone = new THREE.Group()
  benchTricone.position.set(1.3, 1.6, 0)
  const triShank = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.9, 16), steelDark)
  triShank.position.y = 0.45
  benchTricone.add(triShank)
  // 3 个相互呈 120° 交错咬合的滚子牙轮
  for (let t = 0; t < 3; t++) {
    const ta = (t * Math.PI * 2) / 3
    const coneLug = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.5), steelDark)
    coneLug.position.set(Math.cos(ta) * 0.55, 1.1, Math.sin(ta) * 0.55)
    benchTricone.add(coneLug)

    const coneRoller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.48, 0.85, 12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.92, roughness: 0.25 })
    )
    coneRoller.rotation.z = Math.PI / 3.8
    coneRoller.rotation.y = ta
    coneRoller.position.set(Math.cos(ta) * 0.42, 1.65, Math.sin(ta) * 0.42)
    benchTricone.add(coneRoller)
  }
  bitBench.add(benchTricone)
  fleetGroup.add(bitBench)

  // 5. 营区指挥车位与专属停车标线 (Dedicated Vehicle Parking Bays - 扩建为 3 专属车位)
  const parkPad = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.15, 12),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
  )
  parkPad.position.set(-71, 0.12, 36)
  fleetGroup.add(parkPad)

  // 黄色停车位分界标线与停止限位条 (3 车位标线)
  const parkLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  for (const px of [-82, -75, -68, -61]) {
    const pLine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 10.5), parkLineMat)
    pLine.position.set(px, 0.22, 36)
    fleetGroup.add(pLine)
  }
  for (const px of [-78.5, -71.5, -64.5]) {
    // 挡车防撞胶条 (Rubber Wheel Stops)
    const wheelStop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.35), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }))
    wheelStop.position.set(px, 0.25, 40.5)
    fleetGroup.add(wheelStop)
    const stopStripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.37), parkLineMat)
    stopStripe.position.set(px, 0.25, 40.5)
    fleetGroup.add(stopStripe)
  }

  // 5a. 营区 VIP 车位 A: 真实宝马指挥座驾 (Draco 官方真车 3D 模型 BMW M4)
  loadRealVehicleGLB('/bmw_m4.glb', 5.0, [-71.5, 0.16, 36], 0, fleetGroup)

  // 5b. 营区专属车位 B: 野外巡检重载四驱全地形指挥车 (Cesium GroundVehicle 官方高精真车 3D 模型)
  loadRealVehicleGLB('/models/ground_vehicle.glb', 5.6, [-78.5, 0.16, 36], 0, fleetGroup)

  // 5c. 营区专属车位 C: 野外大漠地质勘探全地形越野车 (Field Exploration Buggy - 移出起重机夹角，列队规整停泊)
  loadRealVehicleGLB('/models/buggy.glb', 4.8, [-64.5, 0.16, 36], 0, fleetGroup)

  // 6. 测井电缆电测车 (Wireline Logging Truck - 工业级 6x6 重型特种卡车底盘)
  // 部署于西南专业车队专属泊位 (X = -55, Z = 52)，车头朝北正对井场大门
  const lTruck = new THREE.Group()
  lTruck.position.set(-55, 0.2, 52)
  lTruck.rotation.y = Math.PI

  // 生成自包含 6x6 重型底盘与驾驶室 (象牙白工程涂装)
  buildTruckChassis(lTruck, 0xf1f5f9, 13.5, 4.6, [
    [-1.35, 0.72, 4.6], [1.35, 0.72, 4.6],
    [-1.4, 0.72, -2.0], [1.4, 0.72, -2.0],
    [-1.4, 0.72, -4.0], [1.4, 0.72, -4.0],
  ])

  // 密闭空调仪器工作舱 (Laboratory Recording Cabin)
  const labCabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 4.0), truckWhite)
  labCabin.position.set(0, 2.4, 0.2)
  lTruck.add(labCabin)

  // 仪器舱顶置高通量车载卫星通信天线 (Mobile Satellite Dome)
  const satDome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), chromeMat)
  satDome.position.set(0, 3.5, 1.2)
  lTruck.add(satDome)

  // 尾部液压测井绞车滚筒 (Hydraulic Cable Drum & Winch)
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 16), chromeMat)
  drum.rotation.z = Math.PI / 2
  drum.position.set(0, 2.2, -3.2)
  lTruck.add(drum)

  for (const ds of [-1.3, 1.3]) {
    const dFlange = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.15, 16), steelDark)
    dFlange.rotation.z = Math.PI / 2
    dFlange.position.set(ds, 2.2, -3.2)
    lTruck.add(dFlange)
  }

  // 测井天滑轮门架 (A-Frame Sheave Mast)
  const sheaveMast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 8), truckYellow)
  sheaveMast.position.set(0, 3.5, -4.4)
  sheaveMast.rotation.x = -0.28
  lTruck.add(sheaveMast)

  const sheave = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 8, 16), chromeMat)
  sheave.position.set(0, 4.7, -4.8)
  lTruck.add(sheave)

  fleetGroup.add(lTruck)

  scene.add(fleetGroup)
}

// -------------------------------------------------------------
// API Spec 11E 重工业级高精度游梁式抽油机参数化生成系统 (1#、2#、3# 机组共用)
// 包含四柱空间桁架、安全爬梯护笼、变截面箱形工字游梁、仿生弧形双导轨导向驴头、
// 双级人字齿轮减速箱、扇形月牙铸铁平衡重带黄黑 Chevron 警示条带、密集散热肋条电机、
// 悬绳器光杆总成与无线示功仪载荷传感器，以及丛式井专属独立精工井口装置与工况诊断传感器
// -------------------------------------------------------------
interface DetailedPumpJackOptions {
  unitId: string
  parentGroup?: THREE.Group
  pos?: [number, number, number]
  rotY?: number
  primaryColor?: number
  hazardColor?: number
  sensorColor?: number
  ledColor?: number
  isClusterUnit?: boolean
  wellheadType?: 'leak' | 'gas-lock'
}

function buildDetailedPumpJack(config: DetailedPumpJackOptions) {
  const root = config.parentGroup || new THREE.Group()
  if (config.pos) root.position.set(config.pos[0], config.pos[1], config.pos[2])
  if (config.rotY !== undefined) root.rotation.y = config.rotY
  root.userData = { deviceKey: config.unitId }
  clickableEquipmentObjects.push(root)

  const indColor = config.primaryColor ?? 0x0284c7
  const hazColor = config.hazardColor ?? 0xf59e0b
  const sensColor = config.sensorColor ?? 0x15803d
  const ledCol = config.ledColor ?? 0x22c55e

  const industrialBlue = new THREE.MeshStandardMaterial({ color: indColor, metalness: 0.78, roughness: 0.32 })
  const heavySteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.28 })
  const hazardYellow = new THREE.MeshStandardMaterial({ color: hazColor, metalness: 0.65, roughness: 0.35 })
  const chromeRod = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.96, roughness: 0.08 })
  const castIron = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.92, roughness: 0.22 })
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 })
  const valveRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.7, roughness: 0.3 })

  // 0. 重型防渗钢筋混凝土硬化基础台 (Reinforced Concrete Foundation Pad)
  const padGroup = new THREE.Group()
  padGroup.userData = { isGroundPad: true }
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92, metalness: 0.15 })
  const hazardStripeMat = new THREE.MeshStandardMaterial({ color: hazColor, roughness: 0.5, metalness: 0.5 })
  const padMesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.6, 12), concreteMat)
  padMesh.position.set(-2, -0.28, 0)
  padMesh.receiveShadow = true
  padMesh.userData = { isGroundPad: true }
  padGroup.add(padMesh)

  // 基础四周安全反光警戒边框 (Perimeter Hazard Curb)
  for (const pz of [-6.0, 6.0]) {
    const curbZ = new THREE.Mesh(new THREE.BoxGeometry(44.4, 0.35, 0.45), hazardStripeMat)
    curbZ.position.set(-2, 0.05, pz)
    padGroup.add(curbZ)
  }
  for (const px of [-24, 20]) {
    const curbX = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 12.4), hazardStripeMat)
    curbX.position.set(px, 0.05, 0)
    padGroup.add(curbX)
  }

  // 10 套重型地脚螺栓与方形垫板 (Anchor Bolts & Base Plates)
  for (const bx of [-18, -10, 0, 10, 16]) {
    for (const bz of [-4.5, 4.5]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.2), heavySteel)
      plate.position.set(bx, 0.05, bz)
      padGroup.add(plate)

      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.8, 6), chromeRod)
      bolt.position.set(bx, 0.35, bz)
      padGroup.add(bolt)
    }
  }
  root.add(padGroup)

  // 1. 重型工字槽钢焊接撬装橇座 (Heavy Structural Skid Base)
  const skidGroup = new THREE.Group()
  for (const sz of [-3.8, 3.8]) {
    const mainChannel = new THREE.Mesh(new THREE.BoxGeometry(38, 1.2, 0.9), heavySteel)
    mainChannel.position.set(-2, 0.6, sz)
    skidGroup.add(mainChannel)
  }
  for (let sx = -19; sx <= 15; sx += 8.5) {
    const crossChannel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 7.6), heavySteel)
    crossChannel.position.set(sx, 0.6, 0)
    skidGroup.add(crossChannel)
  }
  const skidPlating = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.2, 7.4),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.8 })
  )
  skidPlating.position.set(-2, 1.25, 0)
  skidGroup.add(skidPlating)
  root.add(skidGroup)

  // 2. 立体四柱空间桁架 A 型支架 (Four-leg Space-Truss Samson Post)
  const postH = 22.8
  const samsonPostGroup = new THREE.Group()

  const postLegs = [
    { p1: new THREE.Vector3(4.5, 1.3, -3.2), p2: new THREE.Vector3(0.8, postH, -1.3) },
    { p1: new THREE.Vector3(4.5, 1.3, 3.2), p2: new THREE.Vector3(0.8, postH, 1.3) },
    { p1: new THREE.Vector3(-4.5, 1.3, -3.2), p2: new THREE.Vector3(-0.8, postH, -1.3) },
    { p1: new THREE.Vector3(-4.5, 1.3, 3.2), p2: new THREE.Vector3(-0.8, postH, 1.3) },
  ]
  postLegs.forEach(leg => {
    const dist = leg.p1.distanceTo(leg.p2)
    const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, dist, 8), industrialBlue)
    const mid = new THREE.Vector3().addVectors(leg.p1, leg.p2).multiplyScalar(0.5)
    legMesh.position.copy(mid)
    legMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leg.p2.clone().sub(leg.p1).normalize())
    samsonPostGroup.add(legMesh)
  })

  // 上下两道矩形空间受力环框 (Ring Tie Beams)
  for (const hRatio of [0.35, 0.7]) {
    const curH = 1.3 + (postH - 1.3) * hRatio
    const halfX = 4.5 + (0.8 - 4.5) * hRatio
    const halfZ = 3.2 + (1.3 - 3.2) * hRatio

    for (const zSide of [-halfZ, halfZ]) {
      const tieX = new THREE.Mesh(new THREE.BoxGeometry(halfX * 2, 0.45, 0.45), industrialBlue)
      tieX.position.set(0, curH, zSide)
      samsonPostGroup.add(tieX)
    }
    for (const xSide of [-halfX, halfX]) {
      const tieZ = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, halfZ * 2), industrialBlue)
      tieZ.position.set(xSide, curH, 0)
      samsonPostGroup.add(tieZ)
    }
  }

  // 剪刀交叉支撑拉杆 (X-Bracing Struts)
  createStrut(samsonPostGroup, new THREE.Vector3(4.5, 1.3, -3.2), new THREE.Vector3(-4.5, 8.8, -3.2), industrialBlue)
  createStrut(samsonPostGroup, new THREE.Vector3(-4.5, 1.3, -3.2), new THREE.Vector3(4.5, 8.8, -3.2), industrialBlue)
  createStrut(samsonPostGroup, new THREE.Vector3(4.5, 1.3, 3.2), new THREE.Vector3(-4.5, 8.8, 3.2), industrialBlue)
  createStrut(samsonPostGroup, new THREE.Vector3(-4.5, 1.3, 3.2), new THREE.Vector3(4.5, 8.8, 3.2), industrialBlue)

  // 支架侧面检修爬梯与安全护笼 (Ladder & Safety Cage)
  const ladderGroup = new THREE.Group()
  ladderGroup.position.set(0, 0, 3.2)
  for (const lx of [-0.65, 0.65]) {
    const lRail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, postH - 2, 6), hazardYellow)
    lRail.position.set(lx, (postH - 2) / 2 + 1.3, 0.5)
    ladderGroup.add(lRail)
  }
  for (let ly = 3; ly < postH; ly += 1.8) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6), hazardYellow)
    rung.rotation.z = Math.PI / 2
    rung.position.set(0, ly, 0.5)
    ladderGroup.add(rung)

    if (ly > 8) {
      const cageRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 6, 12, Math.PI * 1.3), hazardYellow)
      cageRing.position.set(0, ly, 0.9)
      ladderGroup.add(cageRing)
    }
  }
  samsonPostGroup.add(ladderGroup)

  // 支架顶端中央铸铁鞍子轴承箱 (Center Saddle Bearing Assembly)
  const saddleHousing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 4.8), castIron)
  saddleHousing.position.set(0, postH, 0)
  samsonPostGroup.add(saddleHousing)

  const saddlePin = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 5.4, 16), chromeRod)
  saddlePin.rotation.x = Math.PI / 2
  saddlePin.position.set(0, postH + 0.6, 0)
  samsonPostGroup.add(saddlePin)
  root.add(samsonPostGroup)

  // 3. 重型箱形加强游梁总成 (Heavy Box-Girder Walking Beam Assembly)
  const beam = new THREE.Group()
  beam.position.set(0, postH + 0.6, 0)

  // 箱形主梁上翼板 (带有吊装耳板与防雨倒角)
  const topFlange = new THREE.Mesh(new THREE.BoxGeometry(32, 0.45, 2.6), industrialBlue)
  topFlange.position.set(0.5, 1.35, 0)
  beam.add(topFlange)

  // 游梁吊装重型耳板 (Lifting Lugs)
  for (const lx of [-4.5, 6.5]) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.25), heavySteel)
    lug.position.set(lx, 1.9, 0)
    beam.add(lug)

    const lugHole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), chromeRod)
    lugHole.rotation.x = Math.PI / 2
    lugHole.position.set(lx, 1.9, 0)
    beam.add(lugHole)
  }

  // 箱形主梁下翼板
  const btmFlange = new THREE.Mesh(new THREE.BoxGeometry(32, 0.45, 2.6), industrialBlue)
  btmFlange.position.set(0.5, -1.35, 0)
  beam.add(btmFlange)

  // 双侧垂直主腹板 (形成密闭高抗扭箱梁)
  for (const bz of [-1.15, 1.15]) {
    const webPlate = new THREE.Mesh(new THREE.BoxGeometry(32, 2.3, 0.3), industrialBlue)
    webPlate.position.set(0.5, 0, bz)
    beam.add(webPlate)

    // 腹板外侧横向与垂直加强筋条带
    for (let rx = -12; rx <= 13; rx += 3.4) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.4), industrialBlue)
      rib.position.set(rx, 0, bz + (bz > 0 ? 0.25 : -0.25))
      beam.add(rib)

      // 六角螺栓紧固节点
      for (const by of [-0.6, 0.6]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), chromeRod)
        bolt.rotation.x = Math.PI / 2
        bolt.position.set(rx, by, bz + (bz > 0 ? 0.35 : -0.35))
        beam.add(bolt)
      }
    }
  }

  // 中央分体对开式重型鞍子轴承箱 (Split Pillow Block Saddle Housing)
  const clampBase = new THREE.Group()
  const housingLower = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.8, 3.8), castIron)
  housingLower.position.y = -0.8
  clampBase.add(housingLower)

  const housingCap = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.6, 3.8), castIron)
  housingCap.position.y = 0.8
  clampBase.add(housingCap)

  for (const bx of [-1.8, 1.8]) {
    for (const bz of [-1.4, 1.4]) {
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.6, 8), chromeRod)
      stud.position.set(bx, 0, bz)
      clampBase.add(stud)

      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.45, 6), heavySteel)
      nut.position.set(bx, 1.7, bz)
      clampBase.add(nut)
    }
  }

  const greaseCup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 12), hazardYellow)
  greaseCup.position.set(0, 1.85, 0)
  clampBase.add(greaseCup)
  beam.add(clampBase)

  // 4. 前端弧面导轨驴头 (Heavy Horsehead with Truss & Grease Zerk)
  const horsehead = new THREE.Group()
  horsehead.position.set(15.2, -1.2, 0)

  // 双层外弧形精密钢丝绳导向轮缘槽
  for (const hz of [-0.95, 0.95]) {
    const arcMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(7.5, 7.5, 0.45, 32, 1, false, 0, Math.PI / 2.2),
      hazardYellow
    )
    arcMesh.rotation.z = Math.PI / 1.15
    arcMesh.position.set(-0.6, -1.2, hz)
    horsehead.add(arcMesh)

    const arcRim = new THREE.Mesh(
      new THREE.CylinderGeometry(7.65, 7.65, 0.12, 32, 1, false, 0, Math.PI / 2.2),
      heavySteel
    )
    arcRim.rotation.z = Math.PI / 1.15
    arcRim.position.set(-0.6, -1.2, hz + (hz > 0 ? 0.22 : -0.22))
    horsehead.add(arcRim)
  }

  // 驴头重载焊接仿生弧线型腹板 (Organic Curved Horsehead Web)
  const webShape = new THREE.Shape()
  webShape.moveTo(-2.4, -4.8)
  webShape.lineTo(2.8, -4.8)
  webShape.quadraticCurveTo(3.8, -1.2, 2.8, 2.4)
  webShape.lineTo(-1.8, 2.4)
  webShape.quadraticCurveTo(-0.8, -1.2, -2.4, -4.8)
  webShape.closePath()

  const webGeo = new THREE.ExtrudeGeometry(webShape, {
    depth: 0.45,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  })
  const headWeb = new THREE.Mesh(webGeo, hazardYellow)
  headWeb.position.set(0.4, 0, -0.22)
  horsehead.add(headWeb)

  // 驴头减重与检修圆孔
  for (const hy of [-2.6, -0.6]) {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.8, 16), heavySteel)
    hole.rotation.x = Math.PI / 2
    hole.position.set(0.8, hy, 0)
    horsehead.add(hole)
  }

  // 驴头斜撑后桁架
  const trussBrace = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.8, 1.8), industrialBlue)
  trussBrace.rotation.z = 0.55
  trussBrace.position.set(-1.8, -1.8, 0)
  horsehead.add(trussBrace)

  // 弧顶毛辫子固定卡压板与销轴
  const bridleClamp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 2.8), castIron)
  bridleClamp.position.set(2.8, 2.8, 0)
  horsehead.add(bridleClamp)

  const zerk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8), chromeRod)
  zerk.position.set(2.8, 3.3, 0)
  horsehead.add(zerk)
  beam.add(horsehead)

  // 5. 游梁尾端尾轴承箱与横梁销轴 (Equalizer Beam & Tail Bearing)
  const tailBearingBox = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.4, 3.0), castIron)
  tailBearingBox.position.set(-12.5, 0, 0)
  beam.add(tailBearingBox)

  const tailPin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 10.2, 16), chromeRod)
  tailPin.rotation.x = Math.PI / 2
  tailPin.position.set(-12.5, 0, 0)
  beam.add(tailPin)

  for (const es of [-5.0, 5.0]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.4, 12), castIron)
    cap.rotation.x = Math.PI / 2
    cap.position.set(-12.5, 0, es)
    beam.add(cap)
  }
  root.add(beam)

  // 6. 左右重型推拉连杆 (Left & Right Pitman Arms)
  const nominalLen = 15.59
  function createPitmanArm() {
    const armGroup = new THREE.Group()
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, nominalLen, 16), industrialBlue)
    armGroup.add(tube)

    const midSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 4.5, 16), heavySteel)
    armGroup.add(midSleeve)

    const topLug = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.35, 10, 16), castIron)
    topLug.rotation.x = Math.PI / 2
    topLug.position.y = nominalLen / 2
    armGroup.add(topLug)

    const btmBox = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 1.8), castIron)
    btmBox.position.y = -nominalLen / 2
    armGroup.add(btmBox)

    for (const bx of [-0.7, 0.7]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.0, 8), chromeRod)
      bolt.position.set(bx, -nominalLen / 2, 0)
      armGroup.add(bolt)

      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.4, 6), heavySteel)
      nut.position.set(bx, -nominalLen / 2 + 1.4, 0)
      armGroup.add(nut)
    }
    return armGroup
  }

  const pitmanLeft = createPitmanArm()
  pitmanLeft.position.set(-11.0, 15.0, -4.2)
  root.add(pitmanLeft)

  const pitmanRight = createPitmanArm()
  pitmanRight.position.set(-11.0, 15.0, 4.2)
  root.add(pitmanRight)

  // 7. 重型双级人字齿轮减速器与机械抱闸制动器 (Gearbox & Brake System)
  const gearBox = new THREE.Group()
  gearBox.position.set(-9.5, 4.2, 0)

  const lowerHousing = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.4, 6.4), castIron)
  lowerHousing.position.y = -1.6
  gearBox.add(lowerHousing)

  for (const fz of [-3.5, 3.5]) {
    const footPlate = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.45, 0.9), heavySteel)
    footPlate.position.set(0, -3.1, fz)
    gearBox.add(footPlate)

    for (let fx = -2.8; fx <= 2.8; fx += 1.8) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6), chromeRod)
      bolt.position.set(fx, -2.7, fz)
      gearBox.add(bolt)
    }
  }

  const upperCover = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 6.4, 20, 1, false, 0, Math.PI), castIron)
  upperCover.rotation.z = Math.PI / 2
  upperCover.position.set(0, 0.1, 0)
  gearBox.add(upperCover)

  for (const bz of [-3.3, 3.3]) {
    const splitFlange = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.35, 0.6), heavySteel)
    splitFlange.position.set(0, 0.1, bz)
    gearBox.add(splitFlange)

    for (let bx = -3.0; bx <= 3.0; bx += 1.2) {
      const sBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6), chromeRod)
      sBolt.position.set(bx, 0.1, bz)
      gearBox.add(sBolt)
    }
  }

  for (const sideZ of [-3.25, 3.25]) {
    const bearingCap = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.35, 16), heavySteel)
    bearingCap.rotation.x = Math.PI / 2
    bearingCap.position.set(0, 3.3, sideZ)
    gearBox.add(bearingCap)

    for (let a = 0; a < 6; a++) {
      const ang = (a * Math.PI) / 3
      const capBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 6), chromeRod)
      capBolt.rotation.x = Math.PI / 2
      capBolt.position.set(Math.cos(ang) * 1.35, 3.3 + Math.sin(ang) * 1.35, sideZ + (sideZ > 0 ? 0.2 : -0.2))
      gearBox.add(capBolt)
    }
  }

  for (const fz of [-3.25, 3.25]) {
    const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 0.2), heavySteel)
    rib1.rotation.z = 0.65
    rib1.position.set(-1.0, -1.2, fz)
    gearBox.add(rib1)

    const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 0.2), heavySteel)
    rib2.rotation.z = -0.65
    rib2.position.set(1.0, -1.2, fz)
    gearBox.add(rib2)
  }

  const sightGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff }))
  sightGlass.rotation.x = Math.PI / 2
  sightGlass.position.set(2.0, -1.2, 3.25)
  gearBox.add(sightGlass)

  const sightRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.08, 6, 16), hazardYellow)
  sightRing.position.set(2.0, -1.2, 3.36)
  gearBox.add(sightRing)

  const drainPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.4, 6), chromeRod)
  drainPlug.rotation.x = Math.PI / 2
  drainPlug.position.set(0, -3.0, 3.25)
  gearBox.add(drainPlug)

  const oilTempSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), industrialBlue)
  oilTempSensor.rotation.z = Math.PI / 2
  oilTempSensor.position.set(3.4, -0.6, 1.8)
  gearBox.add(oilTempSensor)

  const breather = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.4, 12), chromeRod)
  breather.position.set(1.5, 3.8, 0)
  gearBox.add(breather)

  const hatch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.6), heavySteel)
  hatch.position.set(-1.0, 3.3, 0)
  gearBox.add(hatch)

  const outShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 9.2, 20), chromeRod)
  outShaft.rotation.x = Math.PI / 2
  outShaft.position.y = 3.3
  gearBox.add(outShaft)

  const brakeDrum = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.9, 20), castIron)
  brakeDrum.rotation.z = Math.PI / 2
  brakeDrum.position.set(-3.5, 0.8, -2.4)
  gearBox.add(brakeDrum)

  const brakeShoe = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 0.7, 16, 1, true, 0, Math.PI * 1.2), heavySteel)
  brakeShoe.rotation.z = Math.PI / 2
  brakeShoe.position.set(-3.5, 0.8, -2.4)
  gearBox.add(brakeShoe)

  const bSpring = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), hazardYellow)
  bSpring.position.set(-3.5, 2.2, -2.4)
  gearBox.add(bSpring)
  root.add(gearBox)

  // 8. 旋转曲柄、调冲程销孔与平衡重丝杠微调机构
  const crank = new THREE.Group()
  crank.position.set(-9.5, 7.5, 0)

  for (const side of [-4.2, 4.2]) {
    const singleCrank = new THREE.Group()
    singleCrank.position.z = side

    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11.2, 1.1), heavySteel)
    armMesh.position.y = 2.6
    singleCrank.add(armMesh)

    for (let h = 0.8; h <= 5.2; h += 1.4) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.3, 12), castIron)
      hole.rotation.x = Math.PI / 2
      hole.position.y = h
      singleCrank.add(hole)

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 6, 12), chromeRod)
      ring.position.set(0, h, side > 0 ? 0.6 : -0.6)
      singleCrank.add(ring)
    }

    const scalePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 5.8, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.2 })
    )
    scalePlate.position.set(side > 0 ? 0.9 : -0.9, 3.0, side > 0 ? 0.6 : -0.6)
    singleCrank.add(scalePlate)

    const leadScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 8.5, 12), chromeRod)
    leadScrew.position.set(0, 4.2, side > 0 ? 1.6 : -1.6)
    singleCrank.add(leadScrew)

    const hWheel = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.1, 6, 16), valveRed)
    hWheel.position.set(0, 8.4, side > 0 ? 1.6 : -1.6)
    singleCrank.add(hWheel)

    const cweightShape = new THREE.Shape()
    const rOuter = 4.8
    const rInner = 1.3
    const aSpan = Math.PI * 0.46
    cweightShape.absarc(0, 0, rOuter, Math.PI / 2 - aSpan / 2, Math.PI / 2 + aSpan / 2, false)
    cweightShape.absarc(0, 0, rInner, Math.PI / 2 + aSpan / 2, Math.PI / 2 - aSpan / 2, true)
    cweightShape.closePath()

    const cweightGeo = new THREE.ExtrudeGeometry(cweightShape, {
      depth: 2.1,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.14,
      bevelThickness: 0.14,
    })
    const weightBlock = new THREE.Mesh(cweightGeo, hazardYellow)
    weightBlock.position.set(0, 3.2, side > 0 ? -0.35 : -1.75)
    singleCrank.add(weightBlock)

    for (let wy = 3.6; wy <= 6.6; wy += 1.4) {
      const wRib = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 0.22), heavySteel)
      wRib.position.set(0, wy, side > 0 ? 1.75 : -1.75)
      singleCrank.add(wRib)
    }

    for (const stripX of [-1.2, 0, 1.2]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 0.08), heavySteel)
      stripe.position.set(stripX, 5.2, side > 0 ? 1.82 : -1.82)
      singleCrank.add(stripe)
    }

    for (const wx of [-1.8, 1.8]) {
      const tieRod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7.2, 8), chromeRod)
      tieRod.position.set(wx, 4.6, side > 0 ? 0.7 : -0.7)
      singleCrank.add(tieRod)

      for (const ny of [1.1, 8.1]) {
        const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 6), heavySteel)
        nut.position.set(wx, ny, side > 0 ? 0.7 : -0.7)
        singleCrank.add(nut)
      }
    }

    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.8, 16), chromeRod)
    pin.rotation.x = Math.PI / 2
    pin.position.set(0, 4.2, 0)
    singleCrank.add(pin)

    const cotterPin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), castIron)
    cotterPin.position.set(0, 4.2, side > 0 ? 1.0 : -1.0)
    singleCrank.add(cotterPin)

    crank.add(singleCrank)
  }
  root.add(crank)

  // 9. 机械手动抱闸刹车操纵系统 (Manual Lever Brake Assembly)
  const brakeGroup = new THREE.Group()
  brakeGroup.position.set(-14.5, 1.25, -2.6)

  const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.2, 8), hazardYellow)
  lever.rotation.z = -0.35
  lever.position.set(0, 2.5, 0)
  brakeGroup.add(lever)

  const grip = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), castIron)
  grip.position.set(-0.85, 4.8, 0)
  brakeGroup.add(grip)

  const ratchet = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 0.25, 16, 1, false, 0, Math.PI / 1.5),
    heavySteel
  )
  ratchet.rotation.z = Math.PI / 3.5
  ratchet.position.set(0, 1.0, 0)
  brakeGroup.add(ratchet)

  const brakeCable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.5, 8), cableMat)
  brakeCable.rotation.z = Math.PI / 2.2
  brakeCable.position.set(2.8, 1.5, 0)
  brakeGroup.add(brakeCable)
  root.add(brakeGroup)

  // 10. 动力电机与皮带传动组 (Prime Mover & Belt Transmission)
  const motorGroup = new THREE.Group()
  motorGroup.position.set(-17.5, 1.25, 0)

  const rails = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 4.2), heavySteel)
  rails.position.y = 0.2
  motorGroup.add(rails)

  for (const rz of [-1.8, 1.8]) {
    const tensionScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), chromeRod)
    tensionScrew.rotation.z = Math.PI / 2
    tensionScrew.position.set(-2.8, 0.35, rz)
    motorGroup.add(tensionScrew)

    const tensionNut = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), heavySteel)
    tensionNut.position.set(-3.8, 0.35, rz)
    motorGroup.add(tensionNut)
  }

  const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 4.5, 20), industrialBlue)
  motorBody.rotation.z = Math.PI / 2
  motorBody.position.y = 2.0
  motorGroup.add(motorBody)

  for (let f = 0; f < 12; f++) {
    const fAng = (f * Math.PI * 2) / 12
    const fin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 0.08), heavySteel)
    fin.position.set(0, 2.0 + Math.sin(fAng) * 1.72, Math.cos(fAng) * 1.72)
    fin.rotation.x = fAng
    motorGroup.add(fin)
  }

  const eyeBolt = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 6, 12), chromeRod)
  eyeBolt.position.set(0, 3.85, 0)
  motorGroup.add(eyeBolt)

  const fanCowl = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.0, 16), heavySteel)
  fanCowl.rotation.z = Math.PI / 2
  fanCowl.position.set(-2.5, 2.0, 0)
  motorGroup.add(fanCowl)

  const jBox = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), castIron)
  jBox.position.set(0, 3.8, 0)
  motorGroup.add(jBox)

  const sheaveGroup = new THREE.Group()
  sheaveGroup.position.set(4.6, 2.4, -2.4)
  sheaveGroup.rotation.x = Math.PI / 2

  const sheaveRim = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.45, 24), castIron)
  sheaveGroup.add(sheaveRim)

  const sheaveHub = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.65, 16), heavySteel)
  sheaveGroup.add(sheaveHub)

  for (let sp = 0; sp < 6; sp++) {
    const sAng = (sp * Math.PI) / 3
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 1.6), castIron)
    spoke.position.set(Math.cos(sAng) * 1.25, 0, Math.sin(sAng) * 1.25)
    spoke.rotation.y = -sAng
    sheaveGroup.add(spoke)
  }
  motorGroup.add(sheaveGroup)

  const motorPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 16), heavySteel)
  motorPulley.rotation.x = Math.PI / 2
  motorPulley.position.set(0, 2.0, -2.4)
  motorGroup.add(motorPulley)

  const beltGuard = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.6, 1.2), hazardYellow)
  beltGuard.position.set(3.8, 2.6, -2.4)
  beltGuard.rotation.z = 0.22
  motorGroup.add(beltGuard)

  for (let l = -1.4; l <= 1.4; l += 0.55) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.18), heavySteel)
    louver.position.set(3.8, 2.6 + l, -1.78)
    louver.rotation.z = 0.22
    motorGroup.add(louver)
  }
  root.add(motorGroup)

  // 11. 悬绳器、镜面光杆总成与核心感知设备：无线示功仪载荷传感器
  const rodAssembly = new THREE.Group()
  rodAssembly.position.set(18.2, 10.5, 0)

  const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 26, 20), chromeRod)
  rodMesh.position.y = 0
  rodAssembly.add(rodMesh)

  const carrierBar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 3.2), castIron)
  carrierBar.position.y = 8.5
  rodAssembly.add(carrierBar)

  for (const bz of [-1.15, 1.15]) {
    const keeper = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.45), hazardYellow)
    keeper.position.set(0, 9.0, bz)
    rodAssembly.add(keeper)
  }

  const rodClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.9, 16), hazardYellow)
  rodClamp.position.y = 9.8
  rodAssembly.add(rodClamp)

  const backupClamp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 1.1), heavySteel)
  backupClamp.position.y = 10.6
  rodAssembly.add(backupClamp)

  const dynaSensor = new THREE.Group()
  dynaSensor.position.set(0, 9.15, 0)

  const sensorBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 0.7, 16),
    new THREE.MeshStandardMaterial({ color: sensColor, metalness: 0.85, roughness: 0.25 })
  )
  dynaSensor.add(sensorBody)

  const sensorAntenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8),
    new THREE.MeshBasicMaterial({ color: 0x1e293b })
  )
  sensorAntenna.position.set(0.45, 0.6, 0)
  dynaSensor.add(sensorAntenna)

  const ledGeo = new THREE.SphereGeometry(0.09, 8, 8)
  const ledMat = new THREE.MeshBasicMaterial({ color: ledCol })
  const led = new THREE.Mesh(ledGeo, ledMat)
  led.position.set(0.48, 0.1, 0.3)
  dynaSensor.add(led)
  rodAssembly.add(dynaSensor)

  const bridleSteel = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.96, roughness: 0.12 })
  for (const bz of [-1.15, 1.15]) {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 8.5, 12), bridleSteel)
    cable.position.set(0, 12.8, bz)
    rodAssembly.add(cable)

    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.25, 0.8, 12), castIron)
    socket.position.set(0, 8.8, bz)
    rodAssembly.add(socket)
  }
  root.add(rodAssembly)

  // 为丛式井 1#、2# 附加高精独立井口装置 (Stand-alone Smart Wellhead Unit)
  if (config.isClusterUnit) {
    const wellheadGroup = new THREE.Group()
    wellheadGroup.position.set(18.2, 0, 0)

    // 套管头法兰与底座
    const cHead = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.4, 16), castIron)
    cHead.position.y = 0.7
    wellheadGroup.add(cHead)

    // 油管头总成 (Tubing Head Spool)
    const tHead = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.6, 16), heavySteel)
    tHead.position.y = 2.2
    wellheadGroup.add(tHead)

    // 双侧高压法兰生产阀
    for (const sz of [-1.8, 1.8]) {
      const valveArm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12), castIron)
      valveArm.rotation.x = Math.PI / 2
      valveArm.position.set(0, 2.2, sz * 0.5)
      wellheadGroup.add(valveArm)

      const handWheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 16), valveRed)
      handWheel.position.set(0, 2.2, sz)
      wellheadGroup.add(handWheel)
    }

    // 光杆盘根密封自封盒 (Stuffing Box with Packoff Gland)
    const stuffingBox = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 1.8, 16), hazardYellow)
    stuffingBox.position.y = 3.9
    wellheadGroup.add(stuffingBox)

    const glandNut = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.5, 6), heavySteel)
    glandNut.position.y = 4.8
    wellheadGroup.add(glandNut)

    // 抗震不锈钢耐震油压表
    const gaugeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), chromeRod)
    gaugeStem.position.set(1.2, 3.2, 0)
    gaugeStem.rotation.z = -Math.PI / 2
    wellheadGroup.add(gaugeStem)

    const gaugeDial = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 16), chromeRod)
    gaugeDial.rotation.z = Math.PI / 2
    gaugeDial.position.set(1.5, 3.2, 0)
    wellheadGroup.add(gaugeDial)

    const gaugeGlass = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }))
    gaugeGlass.rotation.y = Math.PI / 2
    gaugeGlass.position.set(1.58, 3.2, 0)
    wellheadGroup.add(gaugeGlass)

    // 智能专属诊断传感器
    if (config.wellheadType === 'leak') {
      const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.7, 12), hazardYellow)
      probe.position.set(0, 2.8, -1.2)
      wellheadGroup.add(probe)
    } else if (config.wellheadType === 'gas-lock') {
      const echoProbe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), new THREE.MeshStandardMaterial({ color: 0xf97316 }))
      echoProbe.position.set(0, 2.9, 1.2)
      wellheadGroup.add(echoProbe)
    }

    // 地面排油柔性输送管线延伸入地
    const lineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.2, -1.8),
      new THREE.Vector3(2.5, 1.6, -2.6),
      new THREE.Vector3(5.0, 0.3, -3.2),
      new THREE.Vector3(7.5, 0.0, -3.8),
    ])
    const lineMesh = new THREE.Mesh(
      new THREE.TubeGeometry(lineCurve, 16, 0.22, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.28 })
    )
    wellheadGroup.add(lineMesh)

    root.add(wellheadGroup)
  }

  thermalMeshes.push({ mesh: gearBox, heatLevel: 'high' }, { mesh: motorBody, heatLevel: 'med' })

  return {
    group: root,
    crank,
    beam,
    rod: rodAssembly,
    pitmanLeft,
    pitmanRight,
    led,
    gearBox,
    motorBody,
  }
}

// -------------------------------------------------------------
// 12. 游梁式抽油机 (立体四柱空间桁架与四连杆真实机械传动)
// -------------------------------------------------------------
function buildPumpingUnit() {
  if (!scene) return
  const pumpGroup = new THREE.Group()
  // 3# 核心采油机组：统一部署于东部丛式井排中心位 (X = 42, Z = 4)，正向东朝向 (rotY = 0)，与主井台保持10m距离，彻底杜绝交叉穿模
  pumpGroup.position.set(42, 0.2, 4)
  pumpGroup.rotation.y = 0
  pumpGroup.userData = { deviceKey: 'pumping-unit' }
  clickableEquipmentObjects.push(pumpGroup)

  const industrialBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.78, roughness: 0.32 })
  const heavySteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.28 })
  const darkSteel = heavySteel
  const hazardYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.35 })
  const chromeRod = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.96, roughness: 0.08 })
  const castIron = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.92, roughness: 0.22 })
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 })
  const valveRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.7, roughness: 0.3 })

  // 调用统一的 API Spec 11E 高精度抽油机模型生成 3# 核心采油机组
  const res3 = buildDetailedPumpJack({
    unitId: 'pumping-unit',
    parentGroup: pumpGroup,
    primaryColor: 0x0284c7,
    hazardColor: 0xf59e0b,
    sensorColor: 0x15803d,
    ledColor: 0x22c55e,
  })
  crankGroup = res3.crank
  walkingBeam = res3.beam
  polishedRod = res3.rod
  pitmanArmLeft = res3.pitmanLeft
  pitmanArmRight = res3.pitmanRight
  dynamometerLed = res3.led


  // 11. 井口高压智能采油树 (Multi-Gauge Flanged Smart Christmas Tree)
  const xTree = new THREE.Group()
  xTree.position.set(18.2, 1.25, 0)
  xTree.userData = { deviceKey: 'xTree' }
  clickableEquipmentObjects.push(xTree)

  // 套管头本体与下法兰盘 (Casing Head Housing)
  const casingHead = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 2.2, 16), castIron)
  casingHead.position.y = 1.1
  xTree.add(casingHead)

  // 辅助函数：在指定高度加装高压对焊双法兰与 8 颗六角螺栓群
  function addFlangePair(parent: THREE.Group, fy: number) {
    const fMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.94, roughness: 0.18 })
    for (const dy of [-0.12, 0.12]) {
      const fRing = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.22, 16), fMat)
      fRing.position.y = fy + dy
      parent.add(fRing)
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.56, 6), chromeRod)
      bolt.position.set(Math.cos(a) * 1.1, fy, Math.sin(a) * 1.1)
      parent.add(bolt)
    }
  }

  // 套管头与总闸阀连接法兰 (Y = 2.05)
  addFlangePair(xTree, 2.05)

  // 真实 API 6A 锻钢高压主总闸门 (Master Gate Valve Assembly - 彻底消除正方块！)
  const masterValveGroup = new THREE.Group()
  masterValveGroup.position.y = 2.85

  // 阀体中心锻造球柱过渡通径腔 (Forged Valve Center Cavity)
  const valveSph = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), castIron)
  masterValveGroup.add(valveSph)

  const valveNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.5, 16), castIron)
  masterValveGroup.add(valveNeck)

  // 侧向明杆阀盖与填料函 (OS&Y Valve Bonnet & Yoke)
  const bonnet = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.9, 12), castIron)
  bonnet.rotation.z = -Math.PI / 2
  bonnet.position.set(0.8, 0, 0)
  masterValveGroup.add(bonnet)

  const yokeRod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), chromeRod)
  yokeRod.rotation.z = -Math.PI / 2
  yokeRod.position.set(1.4, 0, 0)
  masterValveGroup.add(yokeRod)

  // 铸钢四辐条深红大直径操作手轮
  const mWheel = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.12, 8, 20), valveRed)
  mWheel.rotation.y = Math.PI / 2
  mWheel.position.set(2.1, 0, 0)
  masterValveGroup.add(mWheel)

  for (let s = 0; s < 4; s++) {
    const sAng = (s * Math.PI) / 2
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), valveRed)
    spoke.rotation.z = sAng
    spoke.rotation.x = Math.PI / 2
    spoke.position.set(2.1, 0, 0)
    masterValveGroup.add(spoke)
  }
  xTree.add(masterValveGroup)

  // 总闸阀与十字四通连接法兰 (Y = 3.65)
  addFlangePair(xTree, 3.65)

  // 真实高压锻钢十字四通 (Forged Steel Flanged Cross Body)
  const crossGroup = new THREE.Group()
  crossGroup.position.y = 4.4

  const crossCore = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 14), castIron)
  crossGroup.add(crossCore)

  const crossVertical = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.5, 16), castIron)
  crossGroup.add(crossVertical)

  const crossHorizontal = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.5, 16), castIron)
  crossHorizontal.rotation.x = Math.PI / 2
  crossGroup.add(crossHorizontal)

  xTree.add(crossGroup)

  // 左右出油生产翼阀与节流阀组 (Flanged Wing Valves & Choke Valves)
  for (const ws of [-1, 1]) {
    const wingPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.4, 12), heavySteel)
    wingPipe.rotation.x = Math.PI / 2
    wingPipe.position.set(0, 4.4, ws * 1.2)
    xTree.add(wingPipe)

    // 翼阀法兰盘
    const wingFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.2, 12), heavySteel)
    wingFlange.rotation.x = Math.PI / 2
    wingFlange.position.set(0, 4.4, ws * 1.8)
    xTree.add(wingFlange)

    // 生产翼阀手轮 (Wing Valve Handwheel)
    const wingWheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 6, 12), valveRed)
    wingWheel.position.set(0, 4.4, ws * 2.5)
    wingWheel.userData = { isValve: true }
    interactiveValves.push(wingWheel)
    xTree.add(wingWheel)

    // 终端针型高压节流调节阀 (Needle Choke Valve)
    const chokeBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), industrialBlue)
    chokeBody.position.set(0, 4.4, ws * 3.1)
    xTree.add(chokeBody)

    const chokeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), chromeRod)
    chokeStem.position.set(0, 5.0, ws * 3.1)
    xTree.add(chokeStem)

    const chokeWheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 12), hazardYellow)
    chokeWheel.rotation.x = Math.PI / 2
    chokeWheel.position.set(0, 5.4, ws * 3.1)
    xTree.add(chokeWheel)

    // 在主生产翼阀加装 API 6A 级液动紧急切断阀 (Surface Safety Valve - SSV / ESD Actuator)
    if (ws === 1) {
      const ssvActuator = new THREE.Group()
      ssvActuator.position.set(0, 4.4, ws * 3.9)

      // 锻钢高压液压执行机构缸体 (Hydraulic Cylinder Body)
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.4, 16), valveRed)
      cyl.rotation.x = Math.PI / 2
      ssvActuator.add(cyl)

      // 顶部阀位行程指示杆 (Valve Position Indicator Stem)
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), chromeRod)
      stem.rotation.x = Math.PI / 2
      stem.position.z = 0.95
      wellheadEsbValveStem = stem
      ssvActuator.add(stem)

      // 应急手动覆盖手轮 (Emergency Manual Override Wheel)
      const mOverride = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 12), hazardYellow)
      mOverride.position.z = 1.2
      ssvActuator.add(mOverride)

      // 液压控制不锈钢仪表导管 (Hydraulic Tubing)
      const ssvTubing = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.8, 6), chromeRod)
      ssvTubing.position.set(0.45, -1.8, 0)
      ssvActuator.add(ssvTubing)

      xTree.add(ssvActuator)
    }
  }

  // 井口防爆声光告警指示灯 (ESD 联动)
  const wellAlarm = new THREE.PointLight(0xef4444, 0, 20)
  wellAlarm.position.set(0, 8.5, 0)
  wellheadAlarmLight = wellAlarm
  xTree.add(wellAlarm)

  // 四通上方清蜡防喷法兰 (Y = 5.15)
  addFlangePair(xTree, 5.15)

  // 真实光杆动密封防喷盒总成与防污接油盘 (Polished Rod Stuffing Box & Drip Tray)
  const boxGroup = new THREE.Group()
  boxGroup.position.y = 6.2

  const stuffingBox = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 2.0, 16), hazardYellow)
  boxGroup.add(stuffingBox)

  // 动密封盘根压盖与 4 根垂直调紧螺柱 (Gland Follower Flange & Studs)
  const glandFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.25, 16), heavySteel)
  glandFlange.position.y = 0.9
  boxGroup.add(glandFlange)

  for (let a = 0; a < 4; a++) {
    const aAng = (a * Math.PI) / 2
    const gBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), chromeRod)
    gBolt.position.set(Math.cos(aAng) * 0.78, 0.9, Math.sin(aAng) * 0.78)
    boxGroup.add(gBolt)
  }

  // 顶部耐磨光杆防尘除砂刮刀环 (Polished Rod Wiper & Scraper)
  const wiperRing = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.25, 16), heavySteel)
  wiperRing.position.y = 1.15
  boxGroup.add(wiperRing)

  // 顶部自润滑调压油杯 (Grease Regulator Cup)
  const greaseReg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8), hazardYellow)
  greaseReg.position.set(-0.82, 0.5, 0)
  boxGroup.add(greaseReg)

  // 黄铜自动注脂咀与渗油引流回收软管 (Brass Zerk & Drain Hose)
  const boxZerk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.45, 8), hazardYellow)
  boxZerk.rotation.z = Math.PI / 2
  boxZerk.position.set(0.9, 0.2, 0)
  boxGroup.add(boxZerk)

  // 盘根微渗原油引流耐油橡胶软管 (Braided Effluent Drain Hose)
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.1, 0.2, 0),
    new THREE.Vector3(1.5, -0.4, 0.3),
    new THREE.Vector3(1.4, -1.8, 0.35),
    new THREE.Vector3(1.4, -4.5, 0.35),
  ])
  const drainHose = new THREE.Mesh(
    new THREE.TubeGeometry(hoseCurve, 16, 0.05, 8, false),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
  )
  boxGroup.add(drainHose)

  xTree.add(boxGroup)

  // 井口微渗原油防爆废油收集桶 (Effluent Catch Drum 20L)
  const drainDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 1.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.82, roughness: 0.3 })
  )
  drainDrum.position.set(1.4, 0.6, 0.35)
  xTree.add(drainDrum)

  const drumLid = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.1, 16), hazardYellow)
  drumLid.position.set(1.4, 1.22, 0.35)
  xTree.add(drumLid)

  const dripTray = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, 0.35, 16), heavySteel)
  dripTray.position.y = 5.2
  xTree.add(dripTray)

  // 多表位高压防震指针压力表群 (总压、油压、套压 3联表)
  const gaugeOffsets = [
    { x: 0.95, y: 7.2, z: 0, rotY: 0 },
    { x: 0, y: 5.6, z: 1.25, rotY: Math.PI / 2 },
    { x: 0, y: 5.6, z: -1.25, rotY: -Math.PI / 2 },
  ]
  gaugeOffsets.forEach(g => {
    const pStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), chromeRod)
    pStem.position.set(g.x, g.y - 0.6, g.z)
    xTree.add(pStem)

    const pGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.25, 16), chromeRod)
    pGauge.rotation.x = Math.PI / 2
    pGauge.rotation.y = g.rotY
    pGauge.position.set(g.x, g.y, g.z)
    xTree.add(pGauge)

    // 表盘发光刻度面
    const dial = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
    )
    dial.position.set(g.x + (g.rotY === 0 ? 0.14 : 0), g.y, g.z + (g.rotY !== 0 ? (g.z > 0 ? 0.14 : -0.14) : 0))
    if (g.rotY !== 0) dial.rotation.y = g.rotY
    xTree.add(dial)
  })

  // 1. 无线高压智能数字压力变送器 (Wireless Pressure Transmitter PT-101)
  const ptGroup = new THREE.Group()
  ptGroup.position.set(0, 5.8, 2.2)

  const ptStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), chromeRod)
  ptStem.position.y = -0.45
  ptGroup.add(ptStem)

  const ptHead = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 14), industrialBlue)
  ptGroup.add(ptHead)

  const ptDisplay = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 12),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
  )
  ptDisplay.position.set(0, 0, 0.31)
  ptGroup.add(ptDisplay)

  const ptAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), castIron)
  ptAnt.position.set(0.3, 0.45, 0)
  ptGroup.add(ptAnt)

  xTree.add(ptGroup)

  // 2. 一体化热电阻井口温度变送器 (Temperature Transmitter TT-101)
  const ttGroup = new THREE.Group()
  ttGroup.position.set(-0.95, 4.8, 0)

  const ttStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), chromeRod)
  ttStem.rotation.z = Math.PI / 2
  ttStem.position.x = 0.4
  ttGroup.add(ttStem)

  const ttHead = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.5, 12), industrialBlue)
  ttHead.rotation.z = Math.PI / 2
  ttGroup.add(ttHead)

  const ttDisplay = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
  )
  ttDisplay.rotation.y = -Math.PI / 2
  ttDisplay.position.set(-0.26, 0, 0)
  ttGroup.add(ttDisplay)

  xTree.add(ttGroup)

  // 3. 井口高压防溅取样阀组 (Sampling Cock Assembly)
  const sampleValve = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), castIron)
  sampleValve.position.set(0, 3.8, -2.1)
  xTree.add(sampleValve)

  const sampleWheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 10), valveRed)
  sampleWheel.position.set(0, 4.15, -2.1)
  xTree.add(sampleWheel)

  const sampleSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), chromeRod)
  sampleSpout.position.set(0, 3.55, -2.1)
  xTree.add(sampleSpout)

  // 4. 套管伴生气防憋压平衡跨接管线 (Casing Gas Equalizing Line with Check Valve)
  const eqCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.2, -1.8),
    new THREE.Vector3(-1.2, 2.8, -1.8),
    new THREE.Vector3(-1.2, 4.4, -1.2),
    new THREE.Vector3(0, 4.4, -0.9),
  ])
  const eqPipe = new THREE.Mesh(
    new THREE.TubeGeometry(eqCurve, 16, 0.05, 8, false),
    new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
  )
  xTree.add(eqPipe)

  const checkValve = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.35, 8), valveRed)
  checkValve.position.set(-1.2, 3.6, -1.5)
  xTree.add(checkValve)

  pumpGroup.add(xTree)

  // 12. 井口双联太阳能光伏电池供电板撬块 (Solar PV Array Skid)
  // 荒漠绿色智能油田标准配置：为井口无线传感器与 RTU 提供全天候太阳能自给自足动力
  const solarSkid = new THREE.Group()
  solarSkid.position.set(24.5, 0.2, 12.5)

  // 角钢倾斜安装桁架 (倾角 38° 迎向大漠暖阳)
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 })
  for (const rx of [-3.5, 3.5]) {
    const postFront = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 0.25), rackMat)
    postFront.position.set(rx, 1.0, 1.8)
    solarSkid.add(postFront)

    const postRear = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.2, 0.25), rackMat)
    postRear.position.set(rx, 2.6, -1.8)
    solarSkid.add(postRear)

    const diagonal = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.6, 0.22), rackMat)
    diagonal.rotation.x = 0.65
    diagonal.position.set(rx, 2.2, 0)
    solarSkid.add(diagonal)
  }

  // 2组深蓝高效单晶硅太阳能电池组件 (Solar PV Panels)
  const pvMat = new THREE.MeshStandardMaterial({
    color: 0x0c4a6e,
    metalness: 0.9,
    roughness: 0.15,
  })
  const pvBorderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 })

  for (const px of [-2.4, 2.4]) {
    const panelGroup = new THREE.Group()
    panelGroup.position.set(px, 3.6, 0)
    panelGroup.rotation.x = 0.65

    const panelMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.2, 0.15), pvMat)
    panelGroup.add(panelMesh)

    const border = new THREE.Mesh(new THREE.BoxGeometry(4.4, 5.4, 0.1), pvBorderMat)
    panelGroup.add(border)

    // 导电栅格细线
    const gridMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 5.0),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.4 })
    )
    gridMesh.position.z = 0.09
    panelGroup.add(gridMesh)

    solarSkid.add(panelGroup)
  }

  // 储能防爆蓄电池与充放电控制箱
  const batteryBox = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.4, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
  )
  batteryBox.position.set(0, 0.7, 0)
  solarSkid.add(batteryBox)

  pumpGroup.add(solarSkid)

  // 13. 井口智能 RTU 遥测无线通信箱与高耸天线 (Wellhead Intelligent RTU & Antenna Mast)
  const rtuGroup = new THREE.Group()
  rtuGroup.position.set(22.0, 0.2, 5.5)

  // 304 不锈钢户外立柱与防雨箱体
  const rtuStand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 8), rackMat)
  rtuStand.position.y = 1.2
  rtuGroup.add(rtuStand)

  const rtuBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.2, 1.0),
    new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.92, roughness: 0.2 })
  )
  rtuBox.position.y = 2.8
  rtuGroup.add(rtuBox)

  // RTU 前面板高亮 OLED 监视屏
  const rtuScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.6),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff })
  )
  rtuScreen.position.set(0, 3.1, 0.51)
  rtuGroup.add(rtuScreen)

  // TX/RX 无线收发指示灯 (实时高频脉冲闪烁)
  const rtuLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  )
  rtuLed.position.set(0.55, 3.1, 0.52)
  rtuTxLed = rtuLed
  rtuGroup.add(rtuLed)

  // 4G/5G/北斗工业全向鞭状高增益天线
  const antPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
  )
  antPole.position.set(0.65, 4.8, 0)
  rtuGroup.add(antPole)

  const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }))
  antTip.position.set(0.65, 6.9, 0)
  rtuGroup.add(antTip)

  // 4G/5G/北斗微波无线数据发射光波环 (RTU Transmission RF Wave Ring)
  const waveMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  })
  rtuWaveRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.45, 24), waveMat)
  rtuWaveRing.rotation.x = -Math.PI / 2
  rtuWaveRing.position.set(0.65, 6.95, 0)
  rtuGroup.add(rtuWaveRing)

  pumpGroup.add(rtuGroup)

  // 14. 井口地面直驱螺杆泵辅助采油机组撬块 (Surface Direct-Drive PC Pump Auxiliary Skid)
  const pcpSkid = new THREE.Group()
  pcpSkid.position.set(18.2, 0.2, -6.5)

  const pcpBase = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.6, 3.2), heavySteel)
  pcpBase.position.y = 0.3
  pcpSkid.add(pcpBase)

  const pcpMotor = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.8, 16), industrialBlue)
  pcpMotor.position.y = 2.0
  pcpSkid.add(pcpMotor)

  const pcpGear = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8), castIron)
  pcpGear.position.y = 0.9
  pcpSkid.add(pcpGear)

  // 连接至采油树的高压保温汇油管
  const pcpPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 5.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85 })
  )
  pcpPipe.rotation.x = Math.PI / 2
  pcpPipe.position.set(0, 1.8, 3.2)
  pcpSkid.add(pcpPipe)

  pumpGroup.add(pcpSkid)

  // 15. 抽油机旋转曲柄安全防护围栏与钢网护罩 (API RP 11G Tubular Steel Wire Mesh Crank Guards)
  // 彻底淘汰生硬实心长方体板：真实还原框架方管立柱、密排防绞钢丝网格与警示标牌
  const fenceGroup = new THREE.Group()
  const guardYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.35 })
  const guardMeshMat = new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: true, transparent: true, opacity: 0.85 })
  const toeBoardMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })

  for (const fz of [-5.8, 5.8]) {
    const singleGuard = new THREE.Group()

    // A. 顶部与底部重型方钢主导轨 (Top & Bottom Frame Rails)
    for (const ry of [1.0, 4.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.22, 0.22), guardYellow)
      rail.position.set(-9.5, ry, fz)
      singleGuard.add(rail)
    }

    // B. 5 根加重矩形方管承载立柱 (Vertical Tubular Posts)
    for (let px = -16.5; px <= -2.5; px += 3.5) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 0.25), guardYellow)
      post.position.set(px, 2.3, fz)
      singleGuard.add(post)

      // 立柱底座接地法兰盘
      const postFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8), heavySteel)
      postFlange.position.set(px, 0.25, fz)
      singleGuard.add(postFlange)
    }

    // C. 底部安全防踢挡板 (Industrial Toe Board)
    const toeBoard = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.6, 0.08), toeBoardMat)
    toeBoard.position.set(-9.5, 0.6, fz)
    singleGuard.add(toeBoard)

    // D. 中间防机械绞伤微孔钢丝网面 (Steel Wire Safety Mesh - 告别实心板，呈现通透安全网)
    const meshPlane = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 3.2, 18, 6), guardMeshMat)
    meshPlane.position.set(-9.5, 2.7, fz)
    singleGuard.add(meshPlane)

    // E. 对角线抗剪防扭斜撑拉条 (Diagonal Reinforcement Braces)
    for (let bx = -16.5; bx < -2.5; bx += 3.5) {
      const braceGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(bx, 1.0, fz),
        new THREE.Vector3(bx + 3.5, 4.4, fz),
      ])
      const braceLine = new THREE.Line(braceGeo, new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 }))
      singleGuard.add(braceLine)
    }

    // F. 标准黄黑危险警示标志牌 (Danger Hazard Warning Sign: "当心机械伤人")
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.14), guardYellow)
    signBoard.position.set(-9.5, 3.0, fz + (fz > 0 ? 0.12 : -0.12))
    singleGuard.add(signBoard)

    const signInner = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.95, 0.16), castIron)
    signInner.position.set(-9.5, 3.0, fz + (fz > 0 ? 0.13 : -0.13))
    singleGuard.add(signInner)

    const signDecal = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ color: 0xfacc15 }))
    signDecal.position.set(-9.5, 3.0, fz + (fz > 0 ? 0.22 : -0.22))
    if (fz < 0) signDecal.rotation.y = Math.PI
    singleGuard.add(signDecal)

    fenceGroup.add(singleGuard)
  }

  // G. 尾部防卷入半圆围挡隔栅 (Rear Safety Barrier linking both sides at X = -16.5)
  const rearArc = new THREE.Mesh(
    new THREE.CylinderGeometry(5.8, 5.8, 3.4, 16, 1, true, -Math.PI / 2, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: 0.65 })
  )
  rearArc.position.set(-16.5, 2.7, 0)
  rearArc.rotation.z = Math.PI / 2
  fenceGroup.add(rearArc)

  pumpGroup.add(fenceGroup)

  // 16. 抽油机智能变频驱动控制柜 (Pumping Unit VFD Cabinet)
  const vfdCabinet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.4, 1.4), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 }))
  vfdCabinet.position.set(-16.0, 3.0, 5.2)
  pumpGroup.add(vfdCabinet)

  const vfdScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ color: 0x00f0ff }))
  vfdScreen.position.set(-16.0, 3.5, 5.91)
  pumpGroup.add(vfdScreen)

  // 17. 原油采集高压水套加热炉撬块 (Water Bath Production Heater Skid)
  // 荒漠高凝稠油采集核心设施：加热原油防止长输管网析蜡与冻结
  const heaterGroup = new THREE.Group()
  heaterGroup.position.set(12.0, 0.2, -14.0)
  heaterGroup.userData = { deviceKey: 'heater' }
  clickableEquipmentObjects.push(heaterGroup)

  // 撬装槽钢底座
  const htrSkid = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.7, 5.5), heavySteel)
  htrSkid.position.y = 0.35
  heaterGroup.add(htrSkid)

  // 卧式隔热保温水套炉本体 (Cylindrical Water Bath Vessel)
  const htrBody = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 8.5, 20),
    new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.92, roughness: 0.22 })
  )
  htrBody.rotation.z = Math.PI / 2
  htrBody.position.y = 2.4
  heaterGroup.add(htrBody)

  // 两侧椭圆封头
  for (const es of [-4.25, 4.25]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.9 }))
    head.rotation.z = es > 0 ? -Math.PI / 2 : Math.PI / 2
    head.position.set(es, 2.4, 0)
    heaterGroup.add(head)
  }

  // 炉前全自动防爆燃气燃烧器与微光观火孔 (Automated Gas Burner with Sight Port)
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.65, 1.8, 14), castIron)
  burner.rotation.z = Math.PI / 2
  burner.position.set(-5.0, 2.0, 0)
  heaterGroup.add(burner)

  // 燃烧器端盖法兰与耐高温石英玻璃观火孔 (Flame Sight Port with Glow)
  const sightFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 12), castIron)
  sightFlange.rotation.z = Math.PI / 2
  sightFlange.position.set(-5.95, 2.0, 0)
  heaterGroup.add(sightFlange)

  const sightGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 12),
    new THREE.MeshBasicMaterial({ color: 0xfb923c })
  )
  sightGlass.rotation.y = -Math.PI / 2
  sightGlass.position.set(-6.07, 2.0, 0)
  heaterGroup.add(sightGlass)

  // 炉膛燃烧微弱温暖点光源
  heaterBurnerGlow = new THREE.PointLight(0xf97316, 0.8, 8.5)
  heaterBurnerGlow.position.set(-5.8, 2.0, 0)
  heaterGroup.add(heaterBurnerGlow)

  // 炉前燃气管汇与双联安全切断防爆电磁阀组 (Fuel Gas Train & Solenoid Valves)
  const gasTrainGroup = new THREE.Group()
  gasTrainGroup.position.set(-5.0, 1.1, 1.2)

  const gPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), chromeRod)
  gPipe.rotation.x = Math.PI / 2
  gasTrainGroup.add(gPipe)

  for (const sz of [-0.5, 0.5]) {
    const solValve = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.52, 0.32), valveRed)
    solValve.position.set(0, 0.18, sz)
    gasTrainGroup.add(solValve)

    const solStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6), chromeRod)
    solStem.position.set(0, 0.5, sz)
    gasTrainGroup.add(solStem)
  }
  heaterGroup.add(gasTrainGroup)

  // 炉体侧面检修人孔法兰盖 (Cleanout Manhole with Bolted Flange)
  const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.18, 16), castIron)
  manhole.position.set(0, 2.4, 1.95)
  manhole.rotation.x = Math.PI / 2
  heaterGroup.add(manhole)

  // 顶部不锈钢高空烟囱与防雨风帽 (Exhaust Stack & Flared Weather Cap)
  const stackPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.2, 12), chromeRod)
  stackPipe.position.set(2.8, 5.4, 0)
  heaterGroup.add(stackPipe)

  const rainCap = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.35, 0.35, 16), castIron)
  rainCap.position.set(2.8, 8.1, 0)
  heaterGroup.add(rainCap)

  // 烟道出口微弱微风伴生排气粒子 (Flue Gas Micro Convection Particles)
  const smokeCount = 36
  const smokeGeo = new THREE.BufferGeometry()
  const smokePositions = new Float32Array(smokeCount * 3)
  for (let i = 0; i < smokeCount; i++) {
    smokePositions[i * 3] = 2.8 + (Math.random() - 0.5) * 0.4
    smokePositions[i * 3 + 1] = 8.3 + Math.random() * 5.2
    smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4
  }
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3))
  const smokeMat = new THREE.PointsMaterial({
    color: 0xf1f5f9,
    size: 0.5,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
  heaterSmokeParticles = new THREE.Points(smokeGeo, smokeMat)
  heaterGroup.add(heaterSmokeParticles)

  // 烟道排气温度热电偶探头与就地防爆接线盒 (Flue Gas Thermocouple Sensor)
  const stackProbe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), chromeRod)
  stackProbe.rotation.z = Math.PI / 2
  stackProbe.position.set(2.3, 6.2, 0)
  heaterGroup.add(stackProbe)

  const stackJb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.28), industrialBlue)
  stackJb.position.set(1.9, 6.2, 0)
  heaterGroup.add(stackJb)

  // 原油进出高压加热盘管与法兰阀门
  for (const py of [-1.6, 1.6]) {
    const coilPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 8), chromeRod)
    coilPipe.rotation.x = Math.PI / 2
    coilPipe.position.set(3.2, 2.4, py)
    heaterGroup.add(coilPipe)

    const cValve = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 12), valveRed)
    cValve.position.set(3.2, 2.4, py > 0 ? 2.8 : -2.8)
    heaterGroup.add(cValve)
  }
  pumpGroup.add(heaterGroup)

  // 18. 原油采油集输生产阀组管汇排 (Production Gathering Manifold Skid)
  const manifoldGroup = new THREE.Group()
  manifoldGroup.position.set(18.2, 0.2, -3.2)

  const mSkid = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.4, 3.2), heavySteel)
  mSkid.position.y = 0.2
  manifoldGroup.add(mSkid)

  // 生产总管与测试副管 (Production Header & Test Header)
  for (const hz of [-0.6, 0.6]) {
    const mHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 5.8, 12), chromeRod)
    mHeader.rotation.z = Math.PI / 2
    mHeader.position.set(0, 1.2, hz)
    manifoldGroup.add(mHeader)

    // 4 组法兰截止平板闸阀与针型节流阀手轮
    for (let vx = -2.0; vx <= 2.0; vx += 1.3) {
      const vBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), castIron)
      vBody.position.set(vx, 1.2, hz)
      manifoldGroup.add(vBody)

      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 6, 12), valveRed)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(vx, 1.6, hz)
      manifoldGroup.add(wheel)
    }

    // 管汇排污放空导淋针型阀 (Bleed & Drain Valve)
    const drainV = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), chromeRod)
    drainV.position.set(2.8, 0.8, hz)
    manifoldGroup.add(drainV)

    const dWheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 8), valveRed)
    dWheel.position.set(2.8, 0.45, hz)
    manifoldGroup.add(dWheel)
  }
  pumpGroup.add(manifoldGroup)

  // 19. 卧式三相生产分离器撬块 (Horizontal Three-Phase Production Separator Skid)
  // 荒漠集输站关键油气水分离设备：实现高压原油脱气、脱水与精准计量
  const separatorGroup = new THREE.Group()
  separatorGroup.position.set(24.0, 0.2, -13.5)
  separatorGroup.userData = { deviceKey: 'separator' }
  clickableEquipmentObjects.push(separatorGroup)

  // 撬装槽钢重载基座
  const sepSkid = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.7, 5.5), heavySteel)
  sepSkid.position.y = 0.35
  separatorGroup.add(sepSkid)

  // 鞍式防震支撑座 (Dual Saddle Supports)
  for (const sx of [-3.4, 3.4]) {
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 4.4), heavySteel)
    saddle.position.set(sx, 1.3, 0)
    separatorGroup.add(saddle)
  }

  // 卧式隔热耐压分离容器本体 (Pressure Vessel Shell)
  const sepVessel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.7, 8.8, 20),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.88, roughness: 0.26 })
  )
  sepVessel.rotation.z = Math.PI / 2
  sepVessel.position.y = 2.7
  separatorGroup.add(sepVessel)

  // 观察透视切片视窗 (Cutaway Inspection Window - 原油/天然气/污水三相层析切片)
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.0, 0.25), heavySteel)
  winFrame.position.set(0, 2.7, 1.68)
  separatorGroup.add(winFrame)

  const winGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 1.6),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0.9,
    })
  )
  winGlass.position.set(0, 2.7, 1.82)
  separatorGroup.add(winGlass)

  // 内部天然气层 (气相 微淡蓝)
  const gasLayer = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.45, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7 })
  )
  gasLayer.position.set(0, 3.25, 1.72)
  separatorGroup.add(gasLayer)
  sepGasLayerMesh = gasLayer

  // 内部原油乳化层 (油相 琥珀浓黑金)
  const oilLayer = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.55, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xb45309, transparent: true, opacity: 0.88 })
  )
  oilLayer.position.set(0, 2.75, 1.72)
  separatorGroup.add(oilLayer)
  sepOilLayerMesh = oilLayer

  // 内部采出水沉降层 (水相 清澈水蓝)
  const waterLayer = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.45, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.78 })
  )
  waterLayer.position.set(0, 2.25, 1.72)
  separatorGroup.add(waterLayer)

  // 视镜上方防爆微型照视射灯 (Sight Glass Inspection Luminaire)
  const winLamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), heavySteel)
  winLamp.position.set(0, 3.8, 1.95)
  winLamp.rotation.x = 0.4
  separatorGroup.add(winLamp)

  const winLens = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.15), new THREE.MeshBasicMaterial({ color: 0xffedd5 }))
  winLens.position.set(0, 3.75, 2.05)
  winLens.rotation.x = 0.4
  separatorGroup.add(winLens)

  // 两侧标准椭圆封头 (Elliptical Heads)
  for (const es of [-4.4, 4.4]) {
    const eHead = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 })
    )
    eHead.rotation.z = es > 0 ? -Math.PI / 2 : Math.PI / 2
    eHead.position.set(es, 2.7, 0)
    separatorGroup.add(eHead)
  }

  // 容器顶部安全弹簧式泄压放空阀与阻火器 (Safety Relief Valve - SRV & Flame Arrester)
  const srvGroup = new THREE.Group()
  srvGroup.position.set(-2.2, 4.4, 0)
  const srvStem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8), chromeRod)
  srvStem.position.y = 0.6
  srvGroup.add(srvStem)
  const srvBonnet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 12), valveRed)
  srvBonnet.position.y = 1.6
  srvGroup.add(srvBonnet)

  const flameArrester = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.65, 12), castIron)
  flameArrester.position.y = 2.6
  srvGroup.add(flameArrester)

  separatorGroup.add(srvGroup)

  // 双色磁翻板液位计与红绿指示标尺 (Magnetic Level Gauge with Bicolor Scale)
  const mlGauge = new THREE.Group()
  mlGauge.position.set(0, 2.7, 1.85)
  const mlPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), chromeRod)
  mlGauge.add(mlPipe)
  const mlScale = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 2.8, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  )
  mlScale.position.set(0, 0, 0.12)
  mlGauge.add(mlScale)
  separatorGroup.add(mlGauge)

  // 气相汇出管与涡轮气体流量计 (Gas Outlet Piping with Flowmeter)
  const gasPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.4, 8), chromeRod)
  gasPipe.position.set(3.2, 5.1, 0)
  separatorGroup.add(gasPipe)

  const gasMeter = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.6, 12), castIron)
  gasMeter.rotation.x = Math.PI / 2
  gasMeter.position.set(3.2, 5.6, 0)
  separatorGroup.add(gasMeter)

  // 原油出口外输精密科氏力质量流量计 (Coriolis Mass Flowmeter - 双 U 型弯管与防爆数显表头)
  const flowmeterGroup = new THREE.Group()
  flowmeterGroup.position.set(-1.0, 1.0, -1.8)

  const flowmeterSensor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.7), industrialBlue)
  flowmeterGroup.add(flowmeterSensor)

  const uTube = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 8, 16, Math.PI), heavySteel)
  uTube.rotation.z = Math.PI
  uTube.position.set(0, -0.2, 0)
  flowmeterGroup.add(uTube)

  const fHead = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.45, 12), industrialBlue)
  fHead.position.set(0, 0.68, 0)
  flowmeterGroup.add(fHead)

  const fFace = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), new THREE.MeshBasicMaterial({ color: 0x00f0ff }))
  fFace.position.set(0, 0.68, 0.24)
  flowmeterGroup.add(fFace)

  separatorGroup.add(flowmeterGroup)

  // 现场防爆电控箱与显示屏 (Local Explosion-Proof Panel)
  const sepPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 })
  )
  sepPanel.position.set(-4.5, 2.2, 1.8)
  separatorGroup.add(sepPanel)

  const sepScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.6),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff })
  )
  sepScreen.position.set(-4.5, 2.5, 2.21)
  separatorGroup.add(sepScreen)

  pumpGroup.add(separatorGroup)

  // 20. 采油树至地面管汇、加热炉与分离器的真实高压出油流线管网 (Interconnecting Flowline Piping)
  // 彻底告别设备孤岛：工艺流向 采油树节流阀 -> 地面管托 -> 生产管汇排 -> 水套加热炉 -> 三相分离器
  const flowlineGroup = new THREE.Group()

  // 地面高压管托混凝土支墩 (Pipe Support Piers with Galvanized Clamps)
  const pierPositions = [
    new THREE.Vector3(18.2, 0.35, -1.2),
    new THREE.Vector3(18.2, 0.35, -2.4),
    new THREE.Vector3(15.2, 0.35, -8.6),
    new THREE.Vector3(18.2, 0.35, -14.0),
  ]
  pierPositions.forEach(p => {
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.7, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
    )
    pier.position.copy(p)
    flowlineGroup.add(pier)

    const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 12, Math.PI), hazardYellow)
    clamp.rotation.x = -Math.PI / 2
    clamp.position.set(p.x, p.y + 0.35, p.z)
    flowlineGroup.add(clamp)
  })

  // 管线 A：采油树翼阀节流阀出口 -> 垂直下弯 -> 地面管托 -> 生产管汇进油端
  const curveA = new THREE.CatmullRomCurve3([
    new THREE.Vector3(18.2, 4.4, -3.1), // 采油树节流阀出口
    new THREE.Vector3(18.2, 2.2, -3.1), // 垂直下行
    new THREE.Vector3(18.2, 0.7, -2.6), // 弯向地面管托
    new THREE.Vector3(18.2, 0.7, -1.6),
    new THREE.Vector3(18.2, 1.2, -0.6), // 汇入管汇
  ])
  const pipeGeoA = new THREE.TubeGeometry(curveA, 24, 0.18, 12, false)
  const pipeMatA = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.92, roughness: 0.22 })
  const pipeA = new THREE.Mesh(pipeGeoA, pipeMatA)
  flowlineGroup.add(pipeA)

  // 管线 B：生产管汇出油端 -> 蜿蜒跨接 -> 水套加热炉进油盘管
  const curveB = new THREE.CatmullRomCurve3([
    new THREE.Vector3(18.2, 1.2, -3.2),
    new THREE.Vector3(15.5, 0.7, -7.0),
    new THREE.Vector3(14.0, 0.7, -11.0),
    new THREE.Vector3(12.0 + 3.2, 2.4, -14.0 - 1.6), // 接入水套加热炉盘管
  ])
  const pipeGeoB = new THREE.TubeGeometry(curveB, 24, 0.18, 12, false)
  const pipeB = new THREE.Mesh(pipeGeoB, pipeMatA)
  flowlineGroup.add(pipeB)

  // 管线 C：水套加热炉出油端 -> 连通 -> 三相分离器进料口
  const curveC = new THREE.CatmullRomCurve3([
    new THREE.Vector3(12.0 + 3.2, 2.4, -14.0 + 1.6),
    new THREE.Vector3(18.5, 1.6, -13.5),
    new THREE.Vector3(24.0 - 4.4, 2.7, -13.5), // 接入三相分离器端部法兰
  ])
  const pipeGeoC = new THREE.TubeGeometry(curveC, 24, 0.2, 12, false)
  const pipeC = new THREE.Mesh(pipeGeoC, pipeMatA)
  flowlineGroup.add(pipeC)

  // 管道黄色 API 高压原油防爆反光标带 (API Warning Bands)
  const warningBandMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  for (let b = 0.2; b <= 0.8; b += 0.3) {
    const ptA = curveA.getPoint(b)
    const bandA = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 12), warningBandMat)
    bandA.position.copy(ptA)
    flowlineGroup.add(bandA)

    const ptB = curveB.getPoint(b)
    const bandB = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 12), warningBandMat)
    bandB.position.copy(ptB)
    flowlineGroup.add(bandB)
  }

  // 管道高压原油动态输送流光脉冲 (Dynamic Produced Crude Oil Flow Pulses)
  const pulseGeom = new THREE.SphereGeometry(0.24, 10, 8)
  const pulseMatA = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  const pulseMatB = new THREE.MeshBasicMaterial({ color: 0x00f0ff })

  for (let p = 0; p < 2; p++) {
    const pulseA = new THREE.Mesh(pulseGeom, pulseMatA)
    pulseA.userData = { path: curveA, progress: p * 0.5 }
    pipelinePulses.push(pulseA)
    flowlineGroup.add(pulseA)
  }
  for (let p = 0; p < 2; p++) {
    const pulseB = new THREE.Mesh(pulseGeom, pulseMatB)
    pulseB.userData = { path: curveB, progress: p * 0.5 }
    pipelinePulses.push(pulseB)
    flowlineGroup.add(pulseB)
  }
  for (let p = 0; p < 2; p++) {
    const pulseC = new THREE.Mesh(pulseGeom, pulseMatA)
    pulseC.userData = { path: curveC, progress: p * 0.5 }
    pipelinePulses.push(pulseC)
    flowlineGroup.add(pulseC)
  }

  pumpGroup.add(flowlineGroup)

  // 21. 抽油机钢筋混凝土加固基台与地脚螺栓压板 (Rigid Reinforced Concrete Foundation Pad)
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.2 })
  const mainPad = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 10.5), foundationMat)
  mainPad.position.set(-2, 0.25, 0)
  mainPad.userData = { isGroundPad: true }
  pumpGroup.add(mainPad)

  // 减速机下方铸铁二次灌浆抗震垫铁与地脚螺栓 (Anchor Bolts)
  for (const ax of [-12.5, -6.5]) {
    for (const az of [-3.8, 3.8]) {
      const anchorPlate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.4), castIron)
      anchorPlate.position.set(ax, 0.55, az)
      pumpGroup.add(anchorPlate)

      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 6), chromeRod)
      bolt.position.set(ax, 0.85, az)
      pumpGroup.add(bolt)
    }
  }

  // 22. 井口化学药剂高压加药撬块 (Corrosion Inhibitor & Demulsifier Chemical Dosing Skid)
  // 荒漠重油开采标准设施：持续向采油树翼阀注入缓蚀阻垢剂与降粘破乳剂
  const dosingSkid = new THREE.Group()
  dosingSkid.position.set(13.8, 0.2, 6.8)

  // 撬装槽钢框架与二次防溢围堰托盘 (Containment Skid)
  const dSkidBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.45, 3.2), heavySteel)
  dSkidBase.position.y = 0.22
  dosingSkid.add(dSkidBase)

  const dCurb = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 3.4), hazardYellow)
  dCurb.position.y = 0.45
  dosingSkid.add(dCurb)

  // 316L 不锈钢立式药剂储罐 (Chemical Reagent Drum)
  const chemTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 2.4, 16),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 })
  )
  chemTank.position.set(-1.0, 1.5, 0)
  dosingSkid.add(chemTank)

  // 罐顶加药漏斗与防雨呼吸器
  const chemFunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.12, 0.5, 12), castIron)
  chemFunnel.position.set(-1.0, 2.9, 0.3)
  dosingSkid.add(chemFunnel)

  // 罐体磁翻板液位计
  const chemLg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8), chromeRod)
  chemLg.position.set(-1.0, 1.5, 0.92)
  dosingSkid.add(chemLg)

  // 双联防爆高压柱塞计量泵组 (Dual Explosion-Proof Plunger Dosing Pumps)
  const chemPump = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.9, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85 })
  )
  chemPump.position.set(1.0, 0.8, 0)
  dosingSkid.add(chemPump)

  // 脉动阻尼蓄能器 (Pulsation Dampener Bottle)
  const dampener = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), castIron)
  dampener.position.set(1.0, 1.6, 0.3)
  dosingSkid.add(dampener)

  // 高压毛细注药管线直连采油树翼阀 (Capillary Injection Line)
  const injCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.0, 1.4, -0.2),
    new THREE.Vector3(1.8, 1.8, -1.8),
    new THREE.Vector3(3.2, 2.8, -4.5),
    new THREE.Vector3(4.4, 4.4, -5.6), // 注入采油树翼阀加药孔
  ])
  const injLine = new THREE.Mesh(
    new THREE.TubeGeometry(injCurve, 20, 0.04, 6, false),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 })
  )
  dosingSkid.add(injLine)

  pumpGroup.add(dosingSkid)
  scene.add(pumpGroup)

  // 丛式井组：派生 1# 抽油机 (游动阀漏失工况) 与 2# 抽油机 (气锁/供液不足工况)
  // 全面升级为 API Spec 11E 重工业级高精度独立机组，全平行阵列部署 (间距26m，rotY=0)，与3#机组完美对齐
  const res1 = buildDetailedPumpJack({
    unitId: 'pump-jack-1',
    pos: [42, 0.2, 30],
    rotY: 0,
    primaryColor: 0x0369a1,
    hazardColor: 0xf59e0b,
    sensorColor: 0xb45309,
    ledColor: 0xf59e0b,
    isClusterUnit: true,
    wellheadType: 'leak',
  })
  scene.add(res1.group)
  extraPumpUnits.push({
    id: 'pump-jack-1',
    crank: res1.crank,
    beam: res1.beam,
    rod: res1.rod,
    speed: 1.85,
    phaseOffset: 1.4,
    pitmanLeft: res1.pitmanLeft,
    pitmanRight: res1.pitmanRight,
    led: res1.led,
  })

  // 2# 抽油机 (部署在井场北侧 X=42, Z=-22，与3#、1#构成标准丛式井三机平行排，间距26m)
  const res2 = buildDetailedPumpJack({
    unitId: 'pump-jack-2',
    pos: [42, 0.2, -22],
    rotY: 0,
    primaryColor: 0x1e3a5f,
    hazardColor: 0xf97316,
    sensorColor: 0xc2410c,
    ledColor: 0xef4444,
    isClusterUnit: true,
    wellheadType: 'gas-lock',
  })
  scene.add(res2.group)
  extraPumpUnits.push({
    id: 'pump-jack-2',
    crank: res2.crank,
    beam: res2.beam,
    rod: res2.rod,
    speed: 2.15,
    phaseOffset: 2.8,
    pitmanLeft: res2.pitmanLeft,
    pitmanRight: res2.pitmanRight,
    led: res2.led,
  })
}

function buildStorageAndPipelines() {
  if (!scene) return
  const infraGroup = new THREE.Group()

  const tankMat = new THREE.MeshStandardMaterial({ color: 0x1e3650, roughness: 0.38, metalness: 0.82 })
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.92, roughness: 0.25 })
  const safetyYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.35 })
  const silverPipe = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 })
  const valveRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.75, roughness: 0.25 })
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.78, roughness: 0.32 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.98, roughness: 0.08 })

  // 1. 储罐区防溢二次围堰混凝土防火堤 (Secondary Containment Bund Dike)
  const dikeW = 58
  const dikeD = 38
  const dikeH = 1.8
  const dikeCenterX = -72
  const dikeCenterZ = -44
  const dikeWallThick = 0.8
  const dikeMat = new THREE.MeshStandardMaterial({ color: 0x273b52, roughness: 0.8, metalness: 0.35 })

  // 围堰防渗底板
  const dikeFloor = new THREE.Mesh(
    new THREE.BoxGeometry(dikeW, 0.25, dikeD),
    new THREE.MeshStandardMaterial({ color: 0x1a2636, roughness: 0.9 })
  )
  dikeFloor.position.set(dikeCenterX, 0.325, dikeCenterZ)
  infraGroup.add(dikeFloor)

  // 4 面独立围堤防溢混凝土外墙 (中空盆地结构，杜绝实体大方块填满内部)
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(dikeW, dikeH, dikeWallThick), dikeMat)
  northWall.position.set(dikeCenterX, dikeH / 2 + 0.2, dikeCenterZ - dikeD / 2 + dikeWallThick / 2)
  infraGroup.add(northWall)

  const southWall = new THREE.Mesh(new THREE.BoxGeometry(dikeW, dikeH, dikeWallThick), dikeMat)
  southWall.position.set(dikeCenterX, dikeH / 2 + 0.2, dikeCenterZ + dikeD / 2 - dikeWallThick / 2)
  infraGroup.add(southWall)

  const westWall = new THREE.Mesh(new THREE.BoxGeometry(dikeWallThick, dikeH, dikeD - dikeWallThick * 2), dikeMat)
  westWall.position.set(dikeCenterX - dikeW / 2 + dikeWallThick / 2, dikeH / 2 + 0.2, dikeCenterZ)
  infraGroup.add(westWall)

  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(dikeWallThick, dikeH, dikeD - dikeWallThick * 2), dikeMat)
  eastWall.position.set(dikeCenterX + dikeW / 2 - dikeWallThick / 2, dikeH / 2 + 0.2, dikeCenterZ)
  infraGroup.add(eastWall)

  // 2. 现代大型立式拱顶原油储罐群 (API 650 Heavy Storage Tanks with Spiral Staircase & Breather Valves)
  const tanks = [
    { pos: [-58, -44], r: 13, h: 22, color: 0x00f0ff },
    { pos: [-86, -44], r: 11, h: 20, color: 0xf59e0b },
  ]

  tanks.forEach(t => {
    const singleTank = new THREE.Group()
    singleTank.position.set(t.pos[0], 0.2, t.pos[1])

    // 罐体主圆筒 (Tank Shell)
    const tankMesh = new THREE.Mesh(new THREE.CylinderGeometry(t.r, t.r, t.h, 36), tankMat)
    tankMesh.position.y = t.h / 2
    singleTank.add(tankMesh)

    // 罐体圆周抗风槽钢加强圈 (Wind Girders)
    for (const wy of [t.h * 0.35, t.h * 0.7]) {
      const girder = new THREE.Mesh(new THREE.CylinderGeometry(t.r + 0.22, t.r + 0.22, 0.35, 36), darkSteel)
      girder.position.y = wy
      singleTank.add(girder)
    }

    // API 650 标准储罐固定拱锥顶 (Conical Roof - 锥底紧密贴合罐壁顶部，彻底消除10米浮空缺口)
    const roofH = 2.4
    const roof = new THREE.Mesh(new THREE.ConeGeometry(t.r + 0.35, roofH, 36), tankMat)
    roof.position.y = t.h + roofH / 2
    singleTank.add(roof)

    // 罐顶边缘抗风角钢包边圈 (Top Curb Angle Ring)
    const curbRing = new THREE.Mesh(new THREE.CylinderGeometry(t.r + 0.36, t.r + 0.36, 0.35, 36), darkSteel)
    curbRing.position.y = t.h
    singleTank.add(curbRing)

    // 动态全息液位指示圈 (Real-Time Level Ring)
    const levelRing = new THREE.Mesh(new THREE.TorusGeometry(t.r + 0.25, 0.35, 8, 36), new THREE.MeshBasicMaterial({ color: t.color }))
    levelRing.rotation.x = Math.PI / 2
    levelRing.position.y = t.h * 0.72
    singleTank.add(levelRing)

    // 螺旋式外钢楼梯与护栏 (Spiral Staircase wrapping around the tank)
    const stairSteps = 32
    const startAngle = 0
    const endAngle = Math.PI * 1.35
    for (let s = 0; s < stairSteps; s++) {
      const ratio = s / (stairSteps - 1)
      const curAngle = startAngle + ratio * (endAngle - startAngle)
      const curY = 0.5 + ratio * (t.h - 0.5)
      const rad = t.r + 0.95

      // 踏步踏板 (Step Tread)
      const tread = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.65), darkSteel)
      tread.position.set(Math.cos(curAngle) * rad, curY, Math.sin(curAngle) * rad)
      tread.rotation.y = -curAngle + Math.PI / 2
      singleTank.add(tread)

      // 踏步外侧安全立柱与扶手 (Outer Handrail Posts)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), safetyYellow)
      const postRad = t.r + 1.65
      post.position.set(Math.cos(curAngle) * postRad, curY + 0.7, Math.sin(curAngle) * postRad)
      singleTank.add(post)
    }

    // 罐顶中央环形操作平台与护栏 (Roof Platform & Circular Guardrails - 稳坐锥顶平台，紧密相接)
    const platformR = t.r * 0.42
    const roofPlatform = new THREE.Mesh(
      new THREE.RingGeometry(platformR - 1.2, platformR + 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.DoubleSide })
    )
    roofPlatform.rotation.x = -Math.PI / 2
    roofPlatform.position.y = t.h + roofH + 0.05
    singleTank.add(roofPlatform)

    const roofRail = new THREE.Mesh(
      new THREE.TorusGeometry(platformR + 1.2, 0.08, 6, 24),
      safetyYellow
    )
    roofRail.rotation.x = Math.PI / 2
    roofRail.position.y = t.h + roofH + 1.2
    singleTank.add(roofRail)

    // 罐顶防爆阻火呼吸阀组 (Breather Valve & Flame Arrester)
    const breatherGroup = new THREE.Group()
    breatherGroup.position.set(0, t.h + roofH + 0.1, 0)

    const bStem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 12), silverPipe)
    breatherGroup.add(bStem)

    const bValve = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), darkSteel)
    bValve.position.y = 1.0
    breatherGroup.add(bValve)

    const bHood = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.65, 0.6, 14), valveRed)
    bHood.position.y = 1.6
    breatherGroup.add(bHood)
    singleTank.add(breatherGroup)

    // 罐顶泡沫灭火发生器与垂直消防管线 (Foam Chamber & Foam Line)
    const foamPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, t.h, 8), valveRed)
    foamPipe.position.set(t.r + 0.3, t.h / 2, 0)
    singleTank.add(foamPipe)

    const foamChamber = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.45, 1.6, 12), valveRed)
    foamChamber.position.set(t.r + 0.3, t.h - 0.4, 0)
    singleTank.add(foamChamber)

    // 罐底清砂人孔法兰 (Manhole with Bolted Blind Flange)
    const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.7, 16), darkSteel)
    manhole.rotation.z = Math.PI / 2
    manhole.position.set(t.r + 0.35, 1.8, 0)
    singleTank.add(manhole)

    const mFlange = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.25, 16), silverPipe)
    mFlange.rotation.z = Math.PI / 2
    mFlange.position.set(t.r + 0.7, 1.8, 0)
    singleTank.add(mFlange)

    // 8 颗六角螺栓
    for (let bi = 0; bi < 8; bi++) {
      const theta = (bi * Math.PI) / 4
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 6), darkSteel)
      bolt.rotation.z = Math.PI / 2
      bolt.position.set(t.r + 0.8, 1.8 + Math.sin(theta) * 0.95, Math.cos(theta) * 0.95)
      singleTank.add(bolt)
    }

    infraGroup.add(singleTank)
  })

  // 原油主输送主管线与发光流动脉冲 (送达 1# 储罐 - 沿场区规范综合管廊敷设，彻底避开装车栈桥行车通道)
  const pipePath1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(42, 2.7, 4),
    new THREE.Vector3(12, 2.0, 4),
    new THREE.Vector3(-2, 2.0, -38),
    new THREE.Vector3(-34, 2.4, -42),
    new THREE.Vector3(-58, 2.7, -44),
  ])
  const tube = new THREE.Mesh(new THREE.TubeGeometry(pipePath1, 48, 0.9, 12, false), silverPipe)
  infraGroup.add(tube)

  for (let p = 0; p < 3; p++) {
    const pulseMesh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.3, 8, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff }))
    pulseMesh.userData = { path: pipePath1, progress: (p / 3) * 0.8 }
    pipelinePulses.push(pulseMesh)
    infraGroup.add(pulseMesh)
  }

  // 4. 原油外输增压多级离心泵组 (Dual Oil Export Booster Pumps with Manifold Valves)
  // 部署于防火堤东侧设备区 (X = -34, Z = -42)，与防火堤外壁保持 4m 检修通道
  const pumpSkidGroup = new THREE.Group()
  pumpSkidGroup.position.set(-34, 0.2, -42)
  pumpSkidGroup.userData = { deviceKey: 'loading-rack' }
  clickableEquipmentObjects.push(pumpSkidGroup)

  // 撬装重载槽钢底座与防溢围堰
  const bSkid = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.5, 6.2), darkSteel)
  bSkid.position.y = 0.25
  pumpSkidGroup.add(bSkid)

  const bCurb = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.35, 6.6), safetyYellow)
  bCurb.position.y = 0.5
  pumpSkidGroup.add(bCurb)

  for (const py of [-2.4, 2.4]) {
    // 卧式高压多级离心泵壳体 (Multistage Centrifugal Pump)
    const pCasing = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 3.8, 16), darkSteel)
    pCasing.rotation.x = Math.PI / 2
    pCasing.position.set(py, 1.4, 1.2)
    pumpSkidGroup.add(pCasing)

    // 膜片联轴器黄色防护罩
    const pGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.1, 12), safetyYellow)
    pGuard.rotation.x = Math.PI / 2
    pGuard.position.set(py, 1.4, -0.9)
    pumpSkidGroup.add(pGuard)

    // 隔爆型高压驱动电机 (Explosion-Proof Electric Motor)
    const pMotor = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.4, 16), blueMat)
    pMotor.rotation.x = Math.PI / 2
    pMotor.position.set(py, 1.4, -2.8)
    pumpSkidGroup.add(pMotor)

    // 泵排出侧高压止回阀与截止手轮
    const pWheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 12), valveRed)
    pWheel.position.set(py, 3.0, 1.2)
    pumpSkidGroup.add(pWheel)

    // 泵出口抗震高压指针压力表
    const pGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), chromeMat)
    pGauge.rotation.x = Math.PI / 2
    pGauge.position.set(py, 3.6, 1.2)
    pumpSkidGroup.add(pGauge)
  }

  // 进出口高压汇流总管 (Suction & Discharge Headers)
  const inHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 7.8, 12), silverPipe)
  inHeader.rotation.z = Math.PI / 2
  inHeader.position.set(0, 1.4, 2.8)
  pumpSkidGroup.add(inHeader)

  const outHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 7.8, 12), silverPipe)
  outHeader.rotation.z = Math.PI / 2
  outHeader.position.set(0, 2.4, 1.2)
  pumpSkidGroup.add(outHeader)

  // 现场防爆电气控制箱 (Local Explosion-Proof Station)
  const pJb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.8), darkSteel)
  pJb.position.set(-4.5, 1.8, -1.8)
  pumpSkidGroup.add(pJb)

  const pScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshBasicMaterial({ color: 0x00f0ff }))
  pScreen.position.set(-4.5, 2.0, -1.39)
  pumpSkidGroup.add(pScreen)

  infraGroup.add(pumpSkidGroup)

  // 4b. 原油发油鹤管装车栈桥与装车区 (Crude Tanker Loading Rack with Articulated Loading Arms)
  // 规范部署于储油罐区东侧专用公路发运场 (X = -32, Z = -62)，彻底移出钻井水泥基台，与井台保持 35m 安全净距，绝对零穿模！
  const loadingRackGroup = new THREE.Group()
  loadingRackGroup.position.set(-32, 0.2, -62)
  loadingRackGroup.userData = { deviceKey: 'loading-rack' }
  clickableEquipmentObjects.push(loadingRackGroup)

  // 钢构栈桥高台承重桁架与防滑走道平台 (Platform & Support Structure)
  const pPlat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 4.4), darkSteel)
  pPlat.position.set(0, 4.2, 0)
  loadingRackGroup.add(pPlat)

  // 6 根承重钢管立柱
  for (let cX = -6.0; cX <= 6.0; cX += 4.0) {
    for (const cZ of [-1.8, 1.8]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.2, 8), darkSteel)
      col.position.set(cX, 2.1, cZ)
      loadingRackGroup.add(col)
    }
  }

  // 平台黄色安全防跌落护栏与踢脚挡板
  for (const rz of [-2.1, 2.1]) {
    const handrail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.15, 0.15), safetyYellow)
    handrail.position.set(0, 5.3, rz)
    loadingRackGroup.add(handrail)

    const midrail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 0.1), safetyYellow)
    midrail.position.set(0, 4.8, rz)
    loadingRackGroup.add(midrail)
  }

  // 登台斜坡钢梯 (Access Stairs)
  const stairStrut = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.8, 1.8), darkSteel)
  stairStrut.rotation.z = 0.65
  stairStrut.position.set(8.2, 2.1, 0)
  loadingRackGroup.add(stairStrut)

  // 发油栈桥高空黄色防爆作业投光灯 (照亮鹤管与罐车顶部人孔作业区)
  for (const lx of [-5.0, 5.0]) {
    const lamp = new THREE.Group()
    lamp.position.set(lx, 5.8, 0)

    const lampH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), darkSteel)
    lamp.add(lampH)

    const lampR = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.1, 0.68), safetyYellow)
    lampR.position.y = -0.28
    lamp.add(lampR)

    const lLensMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    const lLens = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.52), lLensMat)
    lLens.rotation.x = Math.PI / 2
    lLens.position.y = -0.32
    lamp.add(lLens)

    loadingRackGroup.add(lamp)

    const lSpot = new THREE.SpotLight(0xffedd5, 0.9, 24, Math.PI / 3, 0.4, 1.1)
    lSpot.position.set(lx, 5.8, 0)
    const lTarget = new THREE.Object3D()
    lTarget.position.set(lx * 0.6, 0.5, 4.2)
    loadingRackGroup.add(lTarget)
    lSpot.target = lTarget
    loadingRackGroup.add(lSpot)

    sceneFloodlights.push({
      light: lSpot,
      baseIntensity: 0.8,
      nightIntensity: 5.2,
      duskIntensity: 2.8,
      sandstormIntensity: 2.0,
      lensMat: lLensMat,
    })
  }

  // 2 套 API 旋转接头气动平衡活动鹤管 (Articulated Top-Loading Arms)
  for (const armX of [-2.8, 2.8]) {
    const singleArm = new THREE.Group()
    singleArm.position.set(armX, 4.4, 1.8)

    // 发油立管 (Base Riser)
    const rPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.2, 12), silverPipe)
    rPipe.position.y = 1.1
    singleArm.add(rPipe)

    // 旋转接头与回转支承 (Swivel Joint)
    const sJoint = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), valveRed)
    sJoint.position.y = 2.2
    singleArm.add(sJoint)

    // 内臂上提管与外伸管 (Inboard & Outboard Arms)
    const inArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.2, 8), silverPipe)
    inArm.rotation.x = -0.45
    inArm.position.set(0, 3.2, 1.2)
    singleArm.add(inArm)

    // 配重铸铁平衡块 (Counterweight Block)
    const cBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.8), darkSteel)
    cBlock.position.set(0, 1.8, -0.6)
    singleArm.add(cBlock)

    // 插入式铝合金垂管 (Vertical Drop Tube - 深入罐车注油口)
    const dropTube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8), chromeMat)
    dropTube.position.set(0, 1.6, 2.4)
    singleArm.add(dropTube)

    // 垂管底部防溅密封压盖与静电导线
    const sealCap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 12), darkSteel)
    sealCap.position.set(0, 2.6, 2.4)
    singleArm.add(sealCap)

    loadingRackGroup.add(singleArm)
  }

  // 防爆批量发油控制仪与静电接地联锁监控箱 (Batch Controller & Static Grounding Monitor)
  const batchJb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.5), darkSteel)
  batchJb.position.set(0, 5.0, -1.8)
  loadingRackGroup.add(batchJb)

  const bLed = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }))
  bLed.position.set(0.4, 5.2, -1.54)
  loadingRackGroup.add(bLed)

  // 专属硬化平整装车车道基础 (彻底杜绝栈桥柱脚悬空，规整工业站场)
  const loadingRoad = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.25 })
  )
  loadingRoad.position.set(0, 0.1, 2.5)
  loadingRackGroup.add(loadingRoad)

  // 车位黄色停车安全停止线
  const parkLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  const stopLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 9.5), parkLineMat)
  stopLine.position.set(12.0, 0.12, 2.5)
  loadingRackGroup.add(stopLine)

  // 发油栈桥出场沥青主干联络道 (Tanker Highway Connection Road: 长 44m, 宽 7.5m, 带边缘白线)
  const accessRoad = new THREE.Mesh(
    new THREE.BoxGeometry(44, 0.18, 7.5),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.86, metalness: 0.22 })
  )
  accessRoad.position.set(22.0, 0.09, 4.2)
  loadingRackGroup.add(accessRoad)

  // 车道白色道路边缘反光导向标线
  for (const rz of [-3.6, 3.6]) {
    const edgeLine = new THREE.Mesh(
      new THREE.BoxGeometry(44, 0.2, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    )
    edgeLine.position.set(22.0, 0.11, 4.2 + rz)
    loadingRackGroup.add(edgeLine)
  }

  // 装车车位四角重型黄黑防撞安全隔离立柱 (Crash Bollards with Warning Stripes)
  const bollardPositions = [
    [-12.0, -1.5], [12.0, -1.5],
    [-12.0, 9.5], [12.0, 9.5]
  ]
  bollardPositions.forEach(([bx, bz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.35, 12), safetyYellow)
    post.position.set(bx, 0.68, bz)
    loadingRackGroup.add(post)

    for (const sy of [0.4, 0.8, 1.1]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 12), darkSteel)
      ring.position.set(bx, sy, bz)
      loadingRackGroup.add(ring)
    }
  })

  // 栈台下方停靠正在进行密闭定量装油作业的专业原油半挂油罐车 (Oil Tanker Semi-Trailer)
  // 精准停靠于鹤管装油车道 (Z = 4.2)，车头朝东 (X = +9.5) 面向开阔出场干道，双装油口分毫不差对准东西两组气动平衡鹤管
  // 车尾 (X = -6.8) 远离西侧防溢围堰堤整整 12m，杜绝任何穿墙穿模
  const tanker = createHeavyTankerTruck()
  tanker.scale.set(0.75, 0.75, 0.75)
  tanker.rotation.y = Math.PI / 2
  tanker.position.set(8.0, 0.1, 4.2)
  loadingRackGroup.add(tanker)

  infraGroup.add(loadingRackGroup)

  // 储运外输泵向发油栈桥供油地面管线 (Loading Rack Supply Line)
  const rackSupplyCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-34, 1.4, -42),
    new THREE.Vector3(-32, 1.4, -50),
    new THREE.Vector3(-32, 1.4, -60),
  ])
  const rackSupplyPipe = new THREE.Mesh(new THREE.TubeGeometry(rackSupplyCurve, 16, 0.25, 8, false), silverPipe)
  infraGroup.add(rackSupplyPipe)

  // 储运外输泵至长输 PIG 发球站连接跨线 (沿北侧规范管廊敷设，带专用落地 H 型钢支架支撑)
  const feederCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-34, 2.4, -42),
    new THREE.Vector3(-72, 2.4, -42),
    new THREE.Vector3(-98, 2.4, -42),
    new THREE.Vector3(-104, 2.4, -44),
    new THREE.Vector3(-108.8, 2.4, -44),
  ])
  const feederPipe = new THREE.Mesh(new THREE.TubeGeometry(feederCurve, 40, 0.42, 12, false), silverPipe)
  infraGroup.add(feederPipe)

  // 沿线标准落地式工字钢管廊立柱支架 (Pipe Rack Stanchions - 杜绝管道悬空与穿模插地)
  for (const rx of [-48, -68, -88]) {
    const rack = new THREE.Group()
    rack.position.set(rx, 0.2, -42)
    for (const zOff of [-0.75, 0.75]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.3, 0.24), darkSteel)
      leg.position.set(0, 1.15, zOff)
      rack.add(leg)
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), darkSteel)
      foot.position.set(0, 0.08, zOff)
      rack.add(foot)
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 1.8), darkSteel)
    crossBeam.position.set(0, 2.18, 0)
    rack.add(crossBeam)
    infraGroup.add(rack)
  }

  // 5. 荒漠架空长输保温输油管廊 (从 PIG 发球筒延伸至大漠远方沙丘)
  const desertPipePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-112, 2.2, -44),
    new THREE.Vector3(-140, 2.8, -65),
    new THREE.Vector3(-175, 4.5, -100),
    new THREE.Vector3(-225, 6.0, -150),
  ])
  const desertLongPipe = new THREE.Mesh(
    new THREE.TubeGeometry(desertPipePath, 36, 1.1, 12, false),
    new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 }),
  )
  infraGroup.add(desertLongPipe)

  // 管道沿线沙漠混凝土支撑管墩
  for (let s = 0.15; s <= 0.85; s += 0.22) {
    const pt = desertPipePath.getPointAt(s)
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, pt.y + 0.2, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }),
    )
    pier.position.set(pt.x, (pt.y + 0.2) / 2, pt.z)
    infraGroup.add(pier)
  }

  // 6. 安全放空火炬塔 (Truss-Supported Heavy Flare Stack with Molecular Seal & Pilots)
  const flareGroup = new THREE.Group()
  flareGroup.position.set(70, 0.2, -45)
  const stackH = 42

  // 三角形空间受力支撑桁架体系
  const fTowerW = 5.2
  const fTrussMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 })
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3
    const fx = Math.cos(angle) * (fTowerW / 2)
    const fz = Math.sin(angle) * (fTowerW / 2)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, stackH - 4, 8), fTrussMat)
    leg.position.set(fx, (stackH - 4) / 2, fz)
    flareGroup.add(leg)
  }

  // 桁架水平与交叉拉杆
  for (let fy = 6; fy < stackH - 4; fy += 6) {
    for (let i = 0; i < 3; i++) {
      const a1 = (i * Math.PI * 2) / 3
      const a2 = ((i + 1) * Math.PI * 2) / 3
      const p1 = new THREE.Vector3(Math.cos(a1) * (fTowerW / 2), fy, Math.sin(a1) * (fTowerW / 2))
      const p2 = new THREE.Vector3(Math.cos(a2) * (fTowerW / 2), fy, Math.sin(a2) * (fTowerW / 2))
      const strutGeo = new THREE.CylinderGeometry(0.12, 0.12, p1.distanceTo(p2), 6)
      const strut = new THREE.Mesh(strutGeo, fTrussMat)
      strut.position.copy(p1.clone().add(p2).multiplyScalar(0.5))
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize())
      flareGroup.add(strut)
    }
  }

  // 中心高压耐热合金排气火炬立管 (Central Flare Riser)
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, stackH, 16), darkSteel)
  stack.position.y = stackH / 2
  flareGroup.add(stack)

  // 顶部防爆分子密封器 (Molecular Seal)
  const molSeal = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.2, 16), valveRed)
  molSeal.position.y = stackH - 1.5
  flareGroup.add(molSeal)

  // 侧边连续电子引燃伴管 (Pilot Ignition Lines)
  for (const pa of [-Math.PI / 3, Math.PI / 3]) {
    const pilot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, stackH + 1.2, 6), silverPipe)
    pilot.position.set(Math.cos(pa) * 1.1, (stackH + 1.2) / 2, Math.sin(pa) * 1.1)
    flareGroup.add(pilot)
  }

  // 顶部夜间航空障碍红灯球
  const flareBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }))
  flareBeacon.position.set(0, stackH + 0.8, -1.2)
  flareGroup.add(flareBeacon)

  // 常亮平稳火炬火焰
  const count = 140
  const fPos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    fPos[i * 3] = (Math.random() - 0.5) * 2.2
    fPos[i * 3 + 1] = stackH + 3 + Math.random() * 8
    fPos[i * 3 + 2] = (Math.random() - 0.5) * 2.2
  }
  const fGeo = new THREE.BufferGeometry()
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3))
  flameParticles = new THREE.Points(fGeo, new THREE.PointsMaterial({ color: 0xff7700, size: 2.8, blending: THREE.AdditiveBlending, transparent: true }))
  flareGroup.add(flameParticles)

  const flareGlow = new THREE.PointLight(0xff6600, 3.5, 65)
  flareGlow.position.set(0, stackH + 4, 0)
  flareGroup.add(flareGlow)
  flareLight = flareGlow

  infraGroup.add(flareGroup)
  scene.add(infraGroup)
}

// -------------------------------------------------------------
// 14. 工业 5G IoT 物联网通信微塔
// -------------------------------------------------------------
function buildIoTMast() {
  if (!scene) return
  const iotGroup = new THREE.Group()
  iotGroup.position.set(-68, 0.2, 36)

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 26, 8), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 }))
  mast.position.y = 13
  iotGroup.add(mast)

  // 真实抛物面微波对流通信锅与馈源天线头 (Parabolic Microwave Dish with Feedhorn LNB)
  const dishGroup = new THREE.Group()
  dishGroup.position.set(0, 26, 0)
  dishGroup.rotation.x = Math.PI / 3.5

  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, side: THREE.DoubleSide })
  const parabolicBowl = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4),
    dishMat
  )
  dishGroup.add(parabolicBowl)

  // 抛物面中心馈源支架与高频头 (Feedhorn LNB)
  const feedPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }))
  feedPole.rotation.x = -Math.PI / 2
  feedPole.position.set(0, 0, 0.8)
  dishGroup.add(feedPole)

  const feedLnb = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }))
  feedLnb.rotation.x = -Math.PI / 2
  feedLnb.position.set(0, 0, 1.6)
  dishGroup.add(feedLnb)

  iotGroup.add(dishGroup)

  const pulseRing = new THREE.Mesh(new THREE.RingGeometry(2, 2.5, 32), new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }))
  pulseRing.rotation.x = -Math.PI / 2
  pulseRing.position.y = 26.5
  iotPulseRing = pulseRing
  iotGroup.add(pulseRing)

  scene.add(iotGroup)
}

// -------------------------------------------------------------
// 15. 3D 全息感知测点数据标签 (1024x276 视网膜超清抗锯齿采样，彻底告别像素块！)
// -------------------------------------------------------------
function buildTelemetryBadges() {
  if (!scene) return

  const badges: { text: string; value: string; pos: [number, number, number]; target: [number, number, number]; color: string; deviceKey?: string }[] = [
    { text: '泥浆循环固控中心', value: '流量: 48.5L/s · 泵压24MPa', pos: [-56, 18, 10], target: [-44, 4.0, 10], color: '#38bdf8' },
    { text: '固井混浆泵车总成', value: '水泥密度: 1.92g/cm³ · 正常', pos: [-44, 18, 80], target: [-44, 4.5, 70], color: '#f59e0b' },
    { text: '1# 游梁式抽油机', value: '功图: 游动阀漏失 · 载荷 72.4kN', pos: [42, 28, 38], target: [42, 18, 30], color: '#f59e0b', deviceKey: 'pump-jack-1' },
    { text: '2# 游梁式抽油机', value: '功图: 气锁供液不足 · 充满 51.8%', pos: [42, 28, -30], target: [42, 18, -22], color: '#f59e0b', deviceKey: 'pump-jack-2' },
    { text: '3# 游梁式抽油机', value: '功图: 正常饱满 · 载荷 86.4kN', pos: [42, 30, 4], target: [42, 19.5, 4], color: '#38bdf8', deviceKey: 'pumping-unit' },
    { text: '井口多参数智能采油树', value: '油压: 14.8MPa · 井温: 68.5℃', pos: [62, 16, 12], target: [60.2, 5.2, 4], color: '#10b981', deviceKey: 'xTree' },
    { text: '卧式三相生产分离器', value: '瞬时流量: 1,428.6t/d · 稳产', pos: [72, 16, -2], target: [66, 3.5, -9.5], color: '#38bdf8', deviceKey: 'separator' },
    { text: '原油高压水套加热炉', value: '水套浴温: 82.5℃ · 控温正常', pos: [56, 15, -16], target: [54, 3.2, -10], color: '#f59e0b', deviceKey: 'heater' },
    { text: '外输增压与装车栈桥', value: '多级泵扬程: 180m · 装车正常', pos: [-22, 17, -50], target: [-32, 4.0, -62], color: '#10b981', deviceKey: 'loading-rack' },
    { text: '荒漠长输 PIG 清管站', value: '智能超声测厚: 14.2mm · A级', pos: [-98, 17, -32], target: [-112, 3.5, -44], color: '#38bdf8', deviceKey: 'long-pipeline' },
    { text: 'MWD随钻测井探针', value: '井斜: 0.82° · 方位124°', pos: [-48, -36, 12], target: [-15, -42, 2], color: '#00f0ff' },
  ]

  clickableBadges = []

  badges.forEach(b => {
    // 提升为 1024x276 超高清分辨率 (4倍超采样)，消除一切模糊与像素块
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 276
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 科技感半透明深蓝玻璃圆角背景
      ctx.fillStyle = 'rgba(6, 18, 36, 0.94)'
      ctx.beginPath()
      ctx.roundRect(8, 8, 1008, 260, 24)
      ctx.fill()

      // 边框发光双色带
      ctx.strokeStyle = b.color
      ctx.lineWidth = 6
      ctx.stroke()

      // 边框内微光描边
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(16, 16, 992, 244, 18)
      ctx.stroke()

      // 左侧高亮色标条
      ctx.fillStyle = b.color
      ctx.beginPath()
      ctx.roundRect(24, 24, 18, 228, 9)
      ctx.fill()

      // 标题文本 (清晰无锯齿大字号)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillText(b.text, 68, 106)

      // 遥测数据文本 (等宽高清字体)
      ctx.fillStyle = b.color
      ctx.font = '600 38px "SF Mono", Monaco, "Cascadia Code", Consolas, monospace'
      ctx.fillText(b.value, 68, 196)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = true
    tex.anisotropy = 16

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
    sprite.position.set(b.pos[0], b.pos[1], b.pos[2])
    sprite.scale.set(13.6, 3.66, 1)
    if (b.deviceKey) {
      sprite.userData = { deviceKey: b.deviceKey }
      clickableBadges.push(sprite)
    }
    scene?.add(sprite)

    // 精致折线引线与落地点光环
    const endPos = b.target
    const midY = b.pos[1] - 3.5
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(b.pos[0], b.pos[1] - 1.8, b.pos[2]),
      new THREE.Vector3(b.pos[0], midY, b.pos[2]),
      new THREE.Vector3(endPos[0], endPos[1], endPos[2]),
    ])
    const guideLine = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: new THREE.Color(b.color), transparent: true, opacity: 0.65 })
    )
    scene?.add(guideLine)

    // 落地点精密小光圈
    const ringGeo = new THREE.RingGeometry(0.5, 0.8, 16)
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(b.color), side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.rotation.x = -Math.PI / 2
    ringMesh.position.set(endPos[0], endPos[1] + 0.05, endPos[2])
    scene?.add(ringMesh)
  })
}

// -------------------------------------------------------------
// 16. 防爆高杆泛光照明塔机组 (Zone 1 Explosion-Proof Floodlight Masts)
// -------------------------------------------------------------
function buildFloodlightTowers() {
  if (!scene) return
  const towerGroup = new THREE.Group()

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 })
  const yellowRail = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6 })
  const lightHousingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 })

  const towerPositions = [
    [-82, 75], // 井场西南侧入场大道拐角高杆灯塔 (外延至场区外缘，彻底避开车辆泊位与行车通道)
    [26, -48], // 储罐区与火炬塔前侧
  ]

  towerPositions.forEach(([tx, tz]) => {
    const singleTower = new THREE.Group()
    singleTower.position.set(tx, 0.2, tz)

    // 混凝土基座
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 3.6), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }))
    base.position.y = 0.4
    singleTower.add(base)

    // 高耸八棱钢杆灯塔 (Octagonal Tapered Mast)
    const mastH = 32
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.25, mastH, 8), poleMat)
    mast.position.y = mastH / 2 + 0.8
    singleTower.add(mast)

    // 顶部环形检修平台与护栏
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.35, 8), poleMat)
    platform.position.y = mastH + 0.8
    singleTower.add(platform)

    const pRail = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.08, 6, 8), yellowRail)
    pRail.rotation.x = Math.PI / 2
    pRail.position.y = mastH + 1.8
    singleTower.add(pRail)

    // 4 组大功率倾斜 LED 防爆泛光投光灯
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2
      const lx = Math.cos(angle) * 1.8
      const lz = Math.sin(angle) * 1.8

      const fixture = new THREE.Group()
      fixture.position.set(lx, mastH + 1.2, lz)
      fixture.rotation.y = angle

      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.4), lightHousingMat)
      housing.rotation.x = 0.45 // 向下俯照地面
      fixture.add(housing)

      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), lensMat)
      lens.position.z = 0.21
      lens.rotation.x = 0.45
      fixture.add(lens)

      singleTower.add(fixture)
    }

    // 局部暖白泛光点光源
    const floodlight = new THREE.PointLight(0xffedd5, 1.6, 85)
    floodlight.position.set(0, mastH + 2, 0)
    singleTower.add(floodlight)

    sceneFloodlights.push({
      light: floodlight,
      baseIntensity: 1.2,
      nightIntensity: 7.2,
      duskIntensity: 3.6,
      sandstormIntensity: 2.6,
      lensMat,
    })

    towerGroup.add(singleTower)
  })

  scene.add(towerGroup)
}


// -------------------------------------------------------------
// 22. 长输管线智能 PIG 清管作业与发球筒装置 (PIG Launcher & Receiver Station)
// -------------------------------------------------------------
function buildPigScraperStation() {
  if (!scene) return
  const pigGroup = new THREE.Group()
  // 位于长输管线出站独立专用场地 (X = -112, Z = -44)，位于储罐区防溢堤外侧，杜绝任何模型穿模
  pigGroup.position.set(-112, 0.2, -44)
  pigGroup.userData = { deviceKey: 'long-pipeline' }
  clickableEquipmentObjects.push(pigGroup)

  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.92, roughness: 0.25 })
  const silverPipe = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 })
  const valveRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.75, roughness: 0.25 })
  const safetyYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.35 })

  // 1. 检测站加固防渗混凝土基台 (Reinforced Concrete Foundation Pad)
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x273b52, roughness: 0.75, metalness: 0.35 })
  )
  pad.position.set(0, 0.2, 0)
  pigGroup.add(pad)

  const padKerb = new THREE.Mesh(new THREE.BoxGeometry(16.3, 0.2, 12.3), safetyYellow)
  padKerb.position.set(0, 0.3, 0)
  pigGroup.add(padKerb)

  // 2. 检测站全落地防风防雨工业钢结构立柱与顶棚 (Solid Grounded Canopy - 彻底杜绝顶部浮空)
  const colH = 5.2
  for (const cx of [-6.6, 6.6]) {
    for (const cz of [-4.8, 4.8]) {
      // 垂直落地 H 型钢支承立柱 (从地台延伸至顶棚，下接厚重地脚螺栓座)
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, colH, 0.55), darkSteel)
      col.position.set(cx, colH / 2 + 0.4, cz)
      pigGroup.add(col)

      const baseShoe = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.25, 0.95), darkSteel)
      baseShoe.position.set(cx, 0.5, cz)
      pigGroup.add(baseShoe)

      const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.85), darkSteel)
      topCap.position.set(cx, colH + 0.35, cz)
      pigGroup.add(topCap)
    }
  }

  // 后部防风防护背墙 (Corrugated Windbreak Cladding)
  const backCladding = new THREE.Mesh(
    new THREE.BoxGeometry(13.2, colH, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.7 })
  )
  backCladding.position.set(0, colH / 2 + 0.4, -4.8)
  pigGroup.add(backCladding)

  // 顶棚四周纵横型钢承重主梁 (Roof Framing Beams)
  for (const bz of [-4.8, 4.8]) {
    const beamX = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.4, 0.4), darkSteel)
    beamX.position.set(0, colH + 0.4, bz)
    pigGroup.add(beamX)
  }
  for (const bx of [-6.6, 6.6]) {
    const beamZ = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 10.0), darkSteel)
    beamZ.position.set(bx, colH + 0.4, 0)
    pigGroup.add(beamZ)
  }

  // 工业双坡防雨工棚顶板 (Realistic Gabled Industrial Canopy Roof - 彻底淘汰粗糙纯黄大平板)
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.8 })
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.35, 0.4), darkSteel)
  ridgeBeam.position.set(0, colH + 1.6, 0)
  pigGroup.add(ridgeBeam)

  // 北侧斜坡防雨板
  const roofNorth = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.18, 5.8), roofMat)
  roofNorth.rotation.x = -0.16
  roofNorth.position.set(0, colH + 1.15, -2.7)
  pigGroup.add(roofNorth)

  // 南侧斜坡防雨板
  const roofSouth = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.18, 5.8), roofMat)
  roofSouth.rotation.x = 0.16
  roofSouth.position.set(0, colH + 1.15, 2.7)
  pigGroup.add(roofSouth)

  // 屋檐四周精致黄色安全收边饰条 (精细饰边，不再是厚重纯黄死板方块)
  for (const ez of [-5.5, 5.5]) {
    const fasciaZ = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.28, 0.15), safetyYellow)
    fasciaZ.position.set(0, colH + 0.7, ez)
    pigGroup.add(fasciaZ)
  }
  for (const ex of [-7.7, 7.7]) {
    const fasciaX = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 11.2), safetyYellow)
    fasciaX.position.set(ex, colH + 0.9, 0)
    pigGroup.add(fasciaX)
  }

  // 顶棚中央下方工字钢起重单轨吊梁与 PIG 电动葫芦 (Overhead Monorail & Electric Hoist Trolley)
  const monoRail = new THREE.Mesh(new THREE.BoxGeometry(12.0, 0.35, 0.25), darkSteel)
  monoRail.position.set(0, colH + 0.1, 0)
  pigGroup.add(monoRail)

  const hoist = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), safetyYellow)
  hoist.position.set(-1.8, colH - 0.3, 0)
  pigGroup.add(hoist)

  const hoistHook = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), silverPipe)
  hoistHook.position.set(-1.8, colH - 1.2, 0)
  pigGroup.add(hoistHook)

  // 3. 快开盲板式 PIG 发球筒本体 (PIG Launcher Barrel)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6.5, 24), darkSteel)
  barrel.rotation.z = Math.PI / 2
  barrel.position.set(0, 2.2, 0)
  pigGroup.add(barrel)

  // 鞍式重载承重支座 (Saddle Supports)
  for (const sx of [-2.0, 2.0]) {
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 3.6), darkSteel)
    saddle.position.set(sx, 1.1, 0)
    pigGroup.add(saddle)
  }

  // 快开盲板门 (Quick-Opening Closure)
  const door = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.45, 24), safetyYellow)
  door.rotation.z = Math.PI / 2
  door.position.set(-3.4, 2.2, 0)
  pigGroup.add(door)

  // 旁通平衡流线与阀门组 (Bypass Kick-Off Line)
  const kickPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4.2, 16), silverPipe)
  kickPipe.rotation.x = Math.PI / 2
  kickPipe.position.set(1.2, 3.4, 1.2)
  pigGroup.add(kickPipe)

  const kickValve = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 12, 20), valveRed)
  kickValve.position.set(1.2, 3.4, 2.8)
  pigGroup.add(kickValve)

  // 智能清管器通过机械指示旗 (PIG Passage Signaler)
  const sigFlag = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.08), new THREE.MeshBasicMaterial({ color: 0x10b981 }))
  sigFlag.position.set(2.4, 4.0, 0)
  pigGroup.add(sigFlag)

  // 现场防爆电气控制柜与工业数据显示屏 (Ex-Proof Telemetry & Control Kiosk)
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.0), darkSteel)
  kiosk.position.set(5.2, 1.6, -3.2)
  pigGroup.add(kiosk)

  const kioskScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ color: 0x00f0ff }))
  kioskScreen.position.set(5.2, 2.0, -2.69)
  pigGroup.add(kioskScreen)

  const kioskLed = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }))
  kioskLed.position.set(5.2, 2.5, -2.69)
  pigGroup.add(kioskLed)

  // 4. 管线内部超声波测厚智能清管器实体 (Intelligent Ultrasonic PIG Scraper)
  const scraper = new THREE.Group()
  const pigBody = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.4, 20), safetyYellow)
  pigBody.rotation.z = Math.PI / 2
  scraper.add(pigBody)

  // 3 道聚氨酯高强度密封皮碗 (Polyurethane Sealing Cups)
  for (const cx of [-0.9, 0, 0.9]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.25, 24), darkSteel)
    cup.rotation.z = Math.PI / 2
    cup.position.x = cx
    scraper.add(cup)
  }

  // 超声波探头发光测厚扫描环 (Ultrasonic Wall-Thickness Laser Ring)
  const ringGeo = new THREE.TorusGeometry(1.15, 0.06, 8, 24)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
  pigLaserRing = new THREE.Mesh(ringGeo, ringMat)
  pigLaserRing.rotation.y = Math.PI / 2
  scraper.add(pigLaserRing)

  pigScraperMesh = scraper
  scene.add(scraper)

  // 5. 站内待装发智能超声清管器标定检修托架 (Standby Ultrasonic PIG on Service Cradle)
  const cradleGroup = new THREE.Group()
  cradleGroup.position.set(-2.8, 0.4, 2.5)

  // 双 V 型重载鞍座支架 (Double V-Saddles)
  for (const cx of [-0.9, 0.9]) {
    const vSaddle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.65, 1.8), darkSteel)
    vSaddle.position.set(cx, 0.32, 0)
    cradleGroup.add(vSaddle)

    // 橡胶减震保护垫
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 1.6), safetyYellow)
    pad.position.set(cx, 0.68, 0)
    cradleGroup.add(pad)
  }

  // 待装发备用超声清管器主体 (Standby Intelligent PIG Body)
  const sPigBody = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 2.6, 20), safetyYellow)
  sPigBody.rotation.z = Math.PI / 2
  sPigBody.position.y = 1.15
  cradleGroup.add(sPigBody)

  // 聚氨酯刮油皮碗与支撑盘 (Polyurethane Cups)
  for (const px of [-1.0, -0.1, 0.8, 1.2]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 24), darkSteel)
    cup.rotation.z = Math.PI / 2
    cup.position.set(px, 1.15, 0)
    cradleGroup.add(cup)
  }

  // 探伤传感器环与测距里程轮 (Ultrasonic Sensor Ring & Odometers)
  const sensorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.08, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 })
  )
  sensorRing.rotation.y = Math.PI / 2
  sensorRing.position.set(0.35, 1.15, 0)
  cradleGroup.add(sensorRing)

  // 便携式防爆检测数据下载终端手提箱 (Rugged Field Diagnostic Case)
  const toolCase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.6), safetyYellow)
  toolCase.position.set(1.8, 0.28, 0.8)
  cradleGroup.add(toolCase)

  pigGroup.add(cradleGroup)

  // 6. 大漠长输管网沿线标准里程桩与光缆保护桩 (Desert Pipeline Route Markers)
  const markerPositions = [
    [-126, 0.2, -52],
    [-156, 0.2, -78],
    [-188, 0.2, -114],
    [-222, 0.2, -148]
  ]
  markerPositions.forEach(([mx, my, mz], idx) => {
    const marker = new THREE.Group()
    marker.position.set(mx, my, mz)

    // 混凝土立桩主体 (Concrete Post)
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 })
    )
    post.position.y = 0.9
    marker.add(post)

    // 桩顶红色反光警示帽 (Red Safety Cap)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.45, 8), valveRed)
    cap.position.y = 1.6
    marker.add(cap)

    // 中部黄色中石油宝石花色带 (Yellow Warning Stripe)
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 8), safetyYellow)
    stripe.position.y = 1.25
    marker.add(stripe)

    // 管道铭牌金属标牌 (Marker Signboard)
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.06), safetyYellow)
    sign.position.set(0, 1.1, 0.3)
    marker.add(sign)

    scene.add(marker)
  })

  scene.add(pigGroup)
}

// -------------------------------------------------------------
// 工艺流程阶段切换
// -------------------------------------------------------------
function selectStage(index: number) {
  currentStageIndex.value = index
  const st = stages[index]
  if (!camera || !controls) return

  gsap.to(camera.position, {
    x: st.cameraPos[0],
    y: st.cameraPos[1],
    z: st.cameraPos[2],
    duration: 1.5,
    ease: 'power3.inOut',
  })

  gsap.to(controls.target, {
    x: st.targetPos[0],
    y: st.targetPos[1],
    z: st.targetPos[2],
    duration: 1.5,
    ease: 'power3.inOut',
  })
}

function toggleAutoRotate() {
  isAutoRotating.value = !isAutoRotating.value
  if (controls) {
    controls.autoRotate = isAutoRotating.value
    controls.autoRotateSpeed = 1.0
  }
}

function handleResize() {
  if (!containerRef.value || !renderer || !camera) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

// -------------------------------------------------------------
// 动画循环：平稳丝滑，彻底移除一切高频振荡与频闪
// -------------------------------------------------------------
function tick() {
  animFrameId = requestAnimationFrame(tick)
  const elapsedTime = clock.getElapsedTime()

  controls?.update()

  if (radarScanRing) {
    radarScanRing.rotation.z = -elapsedTime * 0.4
  }

  // 井架天车站国际标准双闪航空障碍警示灯 (ICAO Type B Strobe Beacon Dynamics)
  if (beaconMesh) {
    const cycle = 1.6
    const phase = (elapsedTime % cycle) / cycle
    // 双闪节奏：0.0~0.08 爆闪一，0.08~0.16 间隔，0.16~0.24 爆闪二，0.24~1.0 熄灭待机
    const isFlashing = (phase >= 0.0 && phase < 0.08) || (phase >= 0.16 && phase < 0.24)
    if (isFlashing) {
      beaconMesh.scale.set(1.4, 1.4, 1.4)
      if (beaconMatRef) beaconMatRef.color.setHex(0xff3b30)
      if (beaconLight) {
        const mult = weatherMode.value === 'night' ? 6.5 : (weatherMode.value === 'dusk' ? 3.8 : 1.8)
        beaconLight.intensity = mult
      }
    } else {
      beaconMesh.scale.set(1.0, 1.0, 1.0)
      if (beaconMatRef) beaconMatRef.color.setHex(0x7f1d1d)
      if (beaconLight) {
        beaconLight.intensity = weatherMode.value === 'night' ? 0.35 : 0.05
      }
    }
  }

  // IoT 5G 信号平滑扩散
  if (iotPulseRing) {
    const s = 1 + (elapsedTime % 2.5) * 2.0
    iotPulseRing.scale.set(s, s, s)
    ;(iotPulseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - (elapsedTime % 2.5) / 2.5)
  }

  // MWD 探测波扩散
  if (loggingProbeWave) {
    const ws = 1 + (elapsedTime % 1.8) * 1.5
    loggingProbeWave.scale.set(ws, 1, ws)
    ;(loggingProbeWave.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.65 - (elapsedTime % 1.8) / 1.8)
  }

  // 泥浆固控搅拌器平稳动态运转

  agitatorPaddles.forEach((p, idx) => {
    p.rotation.y += 0.08 * (idx % 2 === 0 ? 1 : -1)
  })

  // 固控双联振动筛高频椭圆微幅筛分振颤 (Hyperpool High-Frequency Shale Shaker Vibration)
  if (shakerScreenMesh) {
    shakerScreenMesh.position.y = 3.2 + Math.sin(elapsedTime * 48) * 0.04
    shakerScreenMesh.position.z = Math.cos(elapsedTime * 48) * 0.03
  }

  // 钻柱旋转与顶驱主轴高速同步钻削旋转
  if (drillString) {
    drillString.rotation.y += 0.06
  }
  if (topDriveQuill) {
    topDriveQuill.rotation.y += 0.08
  }

  // 游车大钩沿井架垂直导轨平滑起下钻
  if (travelingBlock) {
    travelingBlock.position.y = 8 + 56 * 0.55 + Math.sin(elapsedTime * 0.8) * 4.0
  }

  // 顶驱高压水龙带随动柔性重力自然下垂张弛 (Flexible Catenary Rotary Hose Dynamics)
  if (rotaryHoseMesh && travelingBlock) {
    const curTopY = travelingBlock.position.y - 2.6
    const standpipeTopY = 8.5 + 37
    const standpipeX = -18 / 2 + 1.2
    const standpipeZ = -18 / 2 + 1.2
    const midY = Math.min(standpipeTopY, curTopY) - 5.5 + Math.sin(elapsedTime * 1.6) * 0.2
    const midX = (standpipeX + 0) * 0.45 + Math.cos(elapsedTime * 0.8) * 0.25
    const midZ = (standpipeZ + 0.6) * 0.35 + 3.8
    const dynamicHoseCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(standpipeX, standpipeTopY, standpipeZ),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(0, curTopY, 0.6),
    )
    rotaryHoseMesh.geometry.dispose()
    rotaryHoseMesh.geometry = new THREE.TubeGeometry(dynamicHoseCurve, 20, 0.42, 8, false)
  }

  // 泥浆泵高压冲程微弱压力脉动表针
  if (mudPressureNeedle) {
    mudPressureNeedle.rotation.z = 0.5 + Math.sin(elapsedTime * 12) * 0.08
  }

  // 泥浆池液面光泽与透明度呼吸
  mudSurfaces.forEach((surf, sIdx) => {
    surf.material.opacity = 0.8 + Math.sin(elapsedTime * 2 + sIdx) * 0.08
  })

  // 抽油机四连杆闭环刚体动力学机械咬合传动 (支持故障注入测试)
  const pumpSpeed = activeFaultInjection.value === 'slip' ? 0.95 : 2.0
  const crankAngle = elapsedTime * pumpSpeed
  const beamAngle = -Math.cos(crankAngle) * 0.22

  if (crankGroup) {
    crankGroup.rotation.z = crankAngle
    if (activeFaultInjection.value === 'vib') {
      crankGroup.position.x = -9.5 + Math.sin(elapsedTime * 48) * 0.08
    } else {
      crankGroup.position.x = -9.5
    }
  }
  if (walkingBeam) walkingBeam.rotation.z = beamAngle

  // 精确解算四连杆铰接坐标：游梁尾横梁轴承销与曲柄臂旋转销
  const cosBeam = Math.cos(beamAngle)
  const sinBeam = Math.sin(beamAngle)
  const tailX = -12.5 * cosBeam
  const tailY = 22.8 - 12.5 * sinBeam

  const cosCrank = Math.cos(crankAngle)
  const sinCrank = Math.sin(crankAngle)
  const crankPinX = -9.5 - sinCrank * 4.2
  const crankPinY = 7.5 + cosCrank * 4.2

  const nominalPitmanLen = 15.59

  // 驱动左推拉连杆：上下轴承死死咬合尾横梁销与曲柄销
  if (pitmanArmLeft) {
    const tailPosLeft = new THREE.Vector3(tailX, tailY, -4.2)
    const crankPosLeft = new THREE.Vector3(crankPinX, crankPinY, -4.2)
    const midLeft = new THREE.Vector3().addVectors(tailPosLeft, crankPosLeft).multiplyScalar(0.5)
    const dirLeft = new THREE.Vector3().subVectors(tailPosLeft, crankPosLeft)
    const lenLeft = dirLeft.length()

    pitmanArmLeft.position.copy(midLeft)
    pitmanArmLeft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLeft.clone().normalize())
    pitmanArmLeft.scale.set(1, lenLeft / nominalPitmanLen, 1)
  }

  // 驱动右推拉连杆
  if (pitmanArmRight) {
    const tailPosRight = new THREE.Vector3(tailX, tailY, 4.2)
    const crankPosRight = new THREE.Vector3(crankPinX, crankPinY, 4.2)
    const midRight = new THREE.Vector3().addVectors(tailPosRight, crankPosRight).multiplyScalar(0.5)
    const dirRight = new THREE.Vector3().subVectors(tailPosRight, crankPosRight)
    const lenRight = dirRight.length()

    pitmanArmRight.position.copy(midRight)
    pitmanArmRight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirRight.clone().normalize())
    pitmanArmRight.scale.set(1, lenRight / nominalPitmanLen, 1)
  }

  // 前端悬绳器与光杆抽汲垂直直线运动
  if (polishedRod) {
    polishedRod.position.y = 10.5 + 18.2 * Math.sin(beamAngle)
  }

  // 井下深井有杆抽油泵柱塞与抽油杆柱同步垂直往复抽汲
  const pumpStroke = 3.6 * Math.sin(beamAngle)
  if (subsurfaceSuckerRod) {
    subsurfaceSuckerRod.position.y = pumpStroke
  }

  // 抽油泵柱塞游动球阀与泵筒吸入固定球阀动态物理启闭
  // 上冲程 (柱塞上提举升原油)：游动球阀受上部原油重压封闭密封，固定球阀被井底吸入负压吸开上浮吸入新油；
  // 下冲程 (柱塞下行浸入原油)：游动球阀被下部原油冲开浮起，固定球阀密封落座防止倒流！
  const isUpStroke = Math.sin(crankAngle) > 0
  if (travelingValveMesh) {
    travelingValveMesh.position.y = 3.6 + (isUpStroke ? -0.05 : 0.24)
  }
  if (standingValveMesh) {
    standingValveMesh.position.y = 0.2 + (isUpStroke ? 0.22 : -0.04)
  }

  // 1. 无线载荷示功仪状态灯随抽汲冲程微光脉动与工况动态响应
  if (dynamometerLed) {
    const pulse = 0.5 + 0.5 * Math.sin(crankAngle)
    dynamometerLed.scale.setScalar(0.85 + pulse * 0.35)
    ;(dynamometerLed.material as THREE.MeshBasicMaterial).color.setHex(isUpStroke ? 0x10b981 : 0x22c55e)
  }

  // 2. 井口 RTU 遥测高频无线通讯数据包 TX/RX 脉冲闪烁与微波波纹扩散
  if (rtuTxLed) {
    const tCycle = elapsedTime % 1.6
    const isTx = tCycle < 0.12 || (tCycle > 0.22 && tCycle < 0.34)
    ;(rtuTxLed.material as THREE.MeshBasicMaterial).color.setHex(isTx ? 0x00f0ff : 0x0284c7)
  }
  if (rtuWaveRing) {
    const rCycle = (elapsedTime % 1.6) / 1.6
    const rScale = 1.0 + rCycle * 3.5
    rtuWaveRing.scale.set(rScale, rScale, rScale)
    ;(rtuWaveRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 * (1 - rCycle))
  }

  // 水套加热炉烟囱微热气流平缓升腾与微风扩散
  if (heaterSmokeParticles) {
    const sPos = heaterSmokeParticles.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < sPos.length; i += 3) {
      sPos[i + 1] += 0.035
      sPos[i] += 0.008 + Math.sin(elapsedTime * 2.5 + i) * 0.003
      if (sPos[i + 1] > 13.5) {
        sPos[i + 1] = 8.3
        sPos[i] = 2.8 + (Math.random() - 0.5) * 0.35
        sPos[i + 2] = (Math.random() - 0.5) * 0.35
      }
    }
    heaterSmokeParticles.geometry.attributes.position.needsUpdate = true
  }

  // 卧式三相生产分离器内部油气水分界面多相流微波浮动 (Three-Phase Multiphase Fluid Dynamic Waves)
  if (sepOilLayerMesh && sepGasLayerMesh) {
    const wave = Math.sin(elapsedTime * 2.2) * 0.02
    sepOilLayerMesh.position.y = 2.75 + wave
    sepGasLayerMesh.position.y = 3.25 + wave * 0.6
  }

  // 原油高压水套加热炉炉膛燃烧微光呼吸 (Heater Burner Breathing Flame Glow)
  if (heaterBurnerGlow) {
    heaterBurnerGlow.intensity = 0.8 + Math.sin(elapsedTime * 7.5) * 0.16
  }

  // 3. 丛式井组 1#、2# 抽油机多机动力学驱动与四连杆真实铰接传动
  extraPumpUnits.forEach(unit => {
    const uCrankAngle = elapsedTime * unit.speed + unit.phaseOffset
    const uBeamAngle = -Math.cos(uCrankAngle) * 0.22
    unit.crank.rotation.z = uCrankAngle
    unit.beam.rotation.z = uBeamAngle
    if (unit.rod) {
      unit.rod.position.y = 10.5 + 18.2 * Math.sin(uBeamAngle)
    }

    if (unit.pitmanLeft && unit.pitmanRight) {
      const crankR = 4.2
      const crankPinX = -9.5 - Math.sin(uCrankAngle) * crankR
      const crankPinY = 7.5 + Math.cos(uCrankAngle) * crankR

      const tailR = 12.5
      const tailPinX = -Math.cos(uBeamAngle) * tailR
      const tailPinY = 22.8 - Math.sin(uBeamAngle) * tailR

      const dX = tailPinX - crankPinX
      const dY = tailPinY - crankPinY
      const curLen = Math.hypot(dX, dY)
      const midX = (crankPinX + tailPinX) / 2
      const midY = (crankPinY + tailPinY) / 2

      const dir = new THREE.Vector3(dX, dY, 0).normalize()
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)

      unit.pitmanLeft.position.set(midX, midY, -4.2)
      unit.pitmanLeft.quaternion.copy(quat)
      unit.pitmanLeft.scale.set(1, curLen / 15.59, 1)

      unit.pitmanRight.position.set(midX, midY, 4.2)
      unit.pitmanRight.quaternion.copy(quat)
      unit.pitmanRight.scale.set(1, curLen / 15.59, 1)
    }

    // 示功仪指示灯闪烁动态
    if (unit.led) {
      const isUp = Math.sin(uCrankAngle) > 0
      const pulse = 0.5 + 0.5 * Math.sin(uCrankAngle)
      unit.led.scale.setScalar(0.85 + pulse * 0.35)
    }
  })

  // 联动全息地面选中指示光环自转与微脉冲
  if (selectionHaloGroup && selectedEquipment.value) {
    if (selectionOuterRing) selectionOuterRing.rotation.z += 0.012
    if (selectionInnerRing) selectionInnerRing.rotation.z -= 0.018
  }

  // 4. 示功图光标质点与载荷实时计算 (多井多工况)
  if (selectedEquipment.value && ['pumping-unit', 'pump-jack-1', 'pump-jack-2'].includes(selectedEquipment.value)) {
    let curAngle = crankAngle
    let curUp = isUpStroke
    const curKey = selectedEquipment.value
    if (curKey === 'pump-jack-1') {
      curAngle = elapsedTime * 1.85 + 1.4
      curUp = Math.sin(curAngle) > 0
    } else if (curKey === 'pump-jack-2') {
      curAngle = elapsedTime * 2.15 + 2.8
      curUp = Math.sin(curAngle) > 0
    }
    const normDisp = (-Math.cos(curAngle) + 1) / 2

    if (curKey === 'pump-jack-1') {
      // 1# 游动阀漏失工况 (两端下倾弧线，慢速增载)
      if (curUp) {
        dynamometerPoint.value = {
          x: 45 + normDisp * 200,
          y: 110 - normDisp * 55 + Math.sin(normDisp * Math.PI) * 5,
          load: Number((34.8 + normDisp * 37.6).toFixed(1)),
          disp: Number((normDisp * 3.8).toFixed(2)),
        }
      } else {
        dynamometerPoint.value = {
          x: 45 + normDisp * 200,
          y: 55 + (1 - normDisp) * 58 - Math.sin(normDisp * Math.PI) * 4,
          load: Number((34.8 + normDisp * 25.0).toFixed(1)),
          disp: Number((normDisp * 3.8).toFixed(2)),
        }
      }
    } else if (curKey === 'pump-jack-2') {
      // 2# 供液不足/气锁工况 (阶梯断崖式落差)
      if (curUp) {
        dynamometerPoint.value = {
          x: 45 + normDisp * 200,
          y: 45 + Math.sin(normDisp * Math.PI) * 3,
          load: Number((62.0 + normDisp * 16.6).toFixed(1)),
          disp: Number((normDisp * 3.8).toFixed(2)),
        }
      } else {
        // 下冲程断崖台阶
        const stepY = normDisp > 0.45 ? 85 : 115
        dynamometerPoint.value = {
          x: 45 + normDisp * 200,
          y: stepY,
          load: Number((19.4 + (normDisp > 0.45 ? 28.0 : 0)).toFixed(1)),
          disp: Number((normDisp * 3.8).toFixed(2)),
        }
      }
    } else {
      // 3# 正常饱满工况
      if (curUp) {
        dynamometerPoint.value = {
          x: 45 + normDisp * 200,
          y: 45 + Math.sin(normDisp * Math.PI) * 4,
          load: Number((76.5 + normDisp * 9.9).toFixed(1)),
          disp: Number((normDisp * 3.8).toFixed(2)),
        }
      } else {
        dynamometerPoint.value = {
          x: 45 + normDisp * 200,
          y: 108 - Math.sin(normDisp * Math.PI) * 6,
          load: Number((28.2 + normDisp * 6.8).toFixed(1)),
          disp: Number((normDisp * 3.8).toFixed(2)),
        }
      }
    }
  }

  // 5. 井口 ESD 紧急超压声光报警灯爆闪
  if (wellheadAlarmLight) {
    if (isEsdTriggered.value) {
      const flash = (Math.sin(elapsedTime * 32) > 0) ? 6.0 : 0
      wellheadAlarmLight.intensity = flash
    } else {
      wellheadAlarmLight.intensity = 0
    }
  }

  // 火焰粒子平稳升腾
  if (flameParticles) {
    const fPos = flameParticles.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < fPos.length; i += 3) {
      fPos[i + 1] += 0.12
      fPos[i] += Math.sin(elapsedTime * 2 + i) * 0.01
      if (fPos[i + 1] > 54) {
        fPos[i + 1] = 43
        fPos[i] = (Math.random() - 0.5) * 1.6
      }
    }
    flameParticles.geometry.attributes.position.needsUpdate = true
  }

  // 火炬塔燃气火焰物理微抖动与夜间地面火光漫射 (Dynamic Flickering Flare Dynamics)
  if (flareLight) {
    const flicker = 1.0 + Math.sin(elapsedTime * 14.5) * 0.16 + Math.cos(elapsedTime * 28.2) * 0.11
    const mult = weatherMode.value === 'night' ? 2.8 : (weatherMode.value === 'dusk' ? 1.6 : 1.0)
    flareLight.intensity = 3.5 * mult * flicker
  }

  // 钻头火花
  if (drillSparksParticles) {
    const sPos = drillSparksParticles.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < sPos.length; i += 3) {
      sPos[i + 1] += 0.08
      if (sPos[i + 1] > -48) sPos[i + 1] = -52
    }
    drillSparksParticles.geometry.attributes.position.needsUpdate = true
  }

  // 泥浆环空上返粒子流
  if (mudCirculationParticles) {
    const mPos = mudCirculationParticles.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < mPos.length; i += 3) {
      mPos[i + 1] += 0.16
      if (mPos[i + 1] > 0) mPos[i + 1] = -50
    }
    mudCirculationParticles.geometry.attributes.position.needsUpdate = true
  }

  // 井筒管柱内采出原油液柱脉动与伴生气泡高速垂直举升动画 (Upward Produced Oil Flow Dynamics)
  if (producedOilColumnMesh) {
    const liftPulse = isUpStroke ? 0.88 + 0.12 * Math.sin(elapsedTime * 8) : 0.72
    ;(producedOilColumnMesh.material as THREE.MeshStandardMaterial).opacity = liftPulse
  }

  // 井下射孔高压原油射流束脉冲物理联动 (Perforation Jet Inflow Pulse Dynamics)
  // 上冲程：泵筒柱塞提升产生强负压抽吸，孔眼射流束呈高压强喷涌；下冲程：射流平稳回落
  if (perforationJets.length > 0) {
    const jetIntensity = isUpStroke ? 0.92 : 0.45
    perforationJets.forEach((jet, idx) => {
      const mat = jet.material as THREE.MeshBasicMaterial
      mat.opacity = jetIntensity + Math.sin(elapsedTime * 10 + idx) * 0.06
      const s = isUpStroke ? 1.08 : 0.94
      jet.scale.set(s, 1, s)
    })
  }

  // 射孔孔眼喷射高压原油微雾光晕粒子脉冲
  if (perforationMistPoints) {
    const mistMat = perforationMistPoints.material as THREE.PointsMaterial
    mistMat.opacity = isUpStroke ? 0.95 : 0.45
    mistMat.size = isUpStroke ? 3.6 : 2.2
  }

  // 地质剖面三叠系含油砂岩原生原油渗出细流微光呼吸
  if (oilWallTrickles.length > 0) {
    oilWallTrickles.forEach((trickle, idx) => {
      const mat = trickle.material as THREE.MeshStandardMaterial
      mat.roughness = 0.06 + Math.sin(elapsedTime * 2.5 + idx) * 0.02
    })
  }

  // 远景绿色风力发电机组叶轮缓慢平稳运转
  windTurbineRotors.forEach((rotor, idx) => {
    rotor.rotation.z += 0.012 * (1 + (idx % 2) * 0.18)
  })

  // 储层天然气顶 (Gas Cap) 微光界面伴生轻烃气相微扰呼吸
  if (gasCapPlane) {
    const gPulse = 0.14 + 0.04 * Math.sin(elapsedTime * 2.5)
    ;(gasCapPlane.material as THREE.MeshBasicMaterial).opacity = gPulse
  }

  if (producedOilBubbles) {
    const bArr = producedOilBubbles.geometry.attributes.position.array as Float32Array
    const bubbleSpeed = isUpStroke ? 0.38 : 0.12
    for (let i = 0; i < bArr.length; i += 3) {
      bArr[i + 1] += bubbleSpeed + (i % 5) * 0.02
      bArr[i] += Math.sin(elapsedTime * 6 + i) * 0.015
      bArr[i + 2] += Math.cos(elapsedTime * 6 + i) * 0.015
      if (bArr[i + 1] > -34) {
        bArr[i + 1] = -54
        const r = Math.random() * 0.72
        const theta = Math.random() * Math.PI * 2
        bArr[i] = Math.cos(theta) * r
        bArr[i + 2] = Math.sin(theta) * r
      }
    }
    producedOilBubbles.geometry.attributes.position.needsUpdate = true
  }

  // 储层原油孔隙向井筒射孔段持续收敛渗流汇聚 (符合达西定律向心加速度)
  if (oilSeepageParticles) {
    const pArr = oilSeepageParticles.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < pArr.length; i += 3) {
      const dx = pArr[i] - (-15)
      const dz = pArr[i + 2] - 0
      const dist = Math.sqrt(dx * dx + dz * dz)
      // 距离井筒越近，渗流压差梯度越大，流动速度呈对数加速
      const seepageSpeed = dist < 8 ? 0.12 : dist < 20 ? 0.07 : 0.035
      if (dist > 2.2) {
        pArr[i] -= (dx / dist) * seepageSpeed
        pArr[i + 2] -= (dz / dist) * seepageSpeed
        // 垂直方向向主力射孔中心 (-43m) 聚拢
        pArr[i + 1] += (-43 - pArr[i + 1]) * 0.008
      } else {
        const newR = 28 + Math.random() * 24
        const newTh = Math.random() * Math.PI * 2
        pArr[i] = -15 + Math.cos(newTh) * newR
        pArr[i + 1] = -33 - Math.random() * 19
        pArr[i + 2] = Math.sin(newTh) * (newR * 0.72)
      }
    }
    oilSeepageParticles.geometry.attributes.position.needsUpdate = true
  }

  // 原油储层高反光黑金流体实体呼吸涌动微波
  if (oilReservoirFluidMesh) {
    const fluidPulse = 1.0 + Math.sin(elapsedTime * 1.6) * 0.012
    oilReservoirFluidMesh.scale.set(1.2 * fluidPulse, 1.0, 0.75 * fluidPulse)
    ;(oilReservoirFluidMesh.material as THREE.MeshStandardMaterial).roughness = 0.16 + Math.sin(elapsedTime * 2.0) * 0.02
  }

  // 集输管线流体动态脉冲 (受生产翼阀与 ESD 联锁开闭控制)
  const isPipeFlowing = isWellValveOpen.value && !isEsdTriggered.value
  pipelinePulses.forEach(pulse => {
    if (isPipeFlowing) {
      pulse.userData.progress = (pulse.userData.progress + 0.003) % 1
      const pt = pulse.userData.path.getPointAt(pulse.userData.progress)
      const tangent = pulse.userData.path.getTangentAt(pulse.userData.progress)
      pulse.position.copy(pt)
      pulse.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent)
      pulse.visible = true
    } else {
      pulse.visible = (elapsedTime % 0.8) > 0.4
    }
  })

  // 大漠微风扬沙平缓贴地流动
  if (sandDustParticles) {
    const dPos = sandDustParticles.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < dPos.length; i += 3) {
      dPos[i] += 0.22
      if (dPos[i] > 180) {
        dPos[i] = -180
      }
    }
    sandDustParticles.geometry.attributes.position.needsUpdate = true
  }


  // 7. 荒漠长输保温输油管网智能 PIG 清管器动态穿梭
  if (pigScraperMesh) {
    const pigProgress = (elapsedTime * 0.025) % 1
    const px = -112 + (-225 - -112) * pigProgress
    const py = 2.2 + (6.0 - 2.2) * pigProgress
    const pz = -44 + (-150 - -44) * pigProgress
    pigScraperMesh.position.set(px, py, pz)

    if (pigLaserRing) {
      const ringScale = 1.0 + Math.sin(elapsedTime * 6) * 0.12
      pigLaserRing.scale.set(ringScale, ringScale, ringScale)
    }
  }

  renderer?.render(scene!, camera!)
}

onMounted(() => {
  initScene()
  if (containerRef.value) {
    containerRef.value.addEventListener('pointerdown', onCanvasPointerDown)
    containerRef.value.addEventListener('click', onCanvasClick)
    containerRef.value.addEventListener('pointermove', onCanvasPointerMove)
  }
})

onBeforeUnmount(() => {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
  }
  window.removeEventListener('resize', handleResize)
  containerRef.value?.removeEventListener('pointerdown', onCanvasPointerDown)
  containerRef.value?.removeEventListener('click', onCanvasClick)
  containerRef.value?.removeEventListener('pointermove', onCanvasPointerMove)
  controls?.dispose()
  renderer?.dispose()
  if (containerRef.value && renderer?.domElement) {
    containerRef.value.removeChild(renderer.domElement)
  }
})
</script>

<template>
  <div class="oil-scene-container">
    <div ref="containerRef" class="webgl-canvas-box"></div>


    <!-- 底部中央：大漠油田全流程全生命周期数字孪生协同联动舱 -->
    <div class="process-lifecycle-dock">
      <div class="process-steps-row">
        <button
          v-for="(st, idx) in stages"
          :key="st.id"
          class="stage-tab-btn"
          :class="{ 'stage-tab-btn--active': currentStageIndex === idx }"
          @click="selectStage(idx)"
        >
          <div class="tab-index">{{ idx + 1 }}</div>
          <div class="tab-content">
            <span class="tab-title">{{ st.name }}</span>
            <span class="tab-code">{{ st.shortCode }}</span>
          </div>
          <div class="tab-indicator"></div>
        </button>
      </div>

      <div class="process-dock-footer">
        <div class="footer-desc">
          <span class="desc-badge">工序规程</span>
          <span class="desc-content">{{ stages[currentStageIndex].desc }}</span>
        </div>

        <div class="footer-telemetry-group">
          <div
            v-for="item in stages[currentStageIndex].telemetry"
            :key="item.label"
            class="telemetry-chip"
          >
            <span class="chip-status-dot" :class="`dot--${item.status}`"></span>
            <span class="chip-label">{{ item.label }}:</span>
            <span class="chip-value">{{ item.value }}</span>
          </div>

          <!-- 大漠昼夜气象工况一键切换 -->
          <div class="dock-weather-group">
            <button
              class="dock-weather-btn"
              :class="{ 'dock-weather-btn--active': weatherMode === 'noon' }"
              @click="setWeatherMode('noon')"
              title="正午烈日白金强光照"
            >
              ☀️ 正午
            </button>
            <button
              class="dock-weather-btn"
              :class="{ 'dock-weather-btn--active': weatherMode === 'dusk' }"
              @click="setWeatherMode('dusk')"
              title="大漠戈壁暮色暖金晚霞"
            >
              🌅 晚霞
            </button>
            <button
              class="dock-weather-btn"
              :class="{ 'dock-weather-btn--active': weatherMode === 'sandstorm' }"
              @click="setWeatherMode('sandstorm')"
              title="特大扬沙沙尘暴能见度衰减"
            >
              🌪️ 扬沙
            </button>
            <button
              class="dock-weather-btn"
              :class="{ 'dock-weather-btn--active': weatherMode === 'night' }"
              @click="setWeatherMode('night')"
              title="极夜防爆泛光夜视照明"
            >
              🌌 极夜
            </button>
          </div>

          <button
            class="dock-rotate-btn"
            :class="{ 'dock-rotate-btn--active': isAutoRotating }"
            @click="toggleAutoRotate"
          >
            🔄 {{ isAutoRotating ? '暂停巡检' : '大漠全域巡检' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 顶部 ESD 紧急关断联锁告警横幅 -->
    <Transition name="hud-fade">
      <div v-if="isEsdTriggered" class="esd-alarm-banner">
        <div class="esd-banner-content">
          <span class="esd-pulse-icon">🚨</span>
          <div class="esd-banner-text">
            <span class="esd-title">【ESD 联锁保护系统已触发】采油树 PT-101 异常超压 (28.6 MPa > 21.0 MPa)</span>
            <span class="esd-sub">进站气动截断阀已关断 · 高压流线已切断隔离 · 上游井口安全泄压中</span>
          </div>
          <button class="esd-reset-btn" @click="triggerEsdSimulation">
            一键复位复产
          </button>
        </div>
      </div>
    </Transition>

    <!-- 交互提示轻量气泡 -->
    <Transition name="hud-fade">
      <div v-if="valveNotice" class="valve-notice-pill">
        <span class="notice-icon">🔔</span>
        <span>{{ valveNotice }}</span>
      </div>
    </Transition>

    <!-- 地下油藏剖面模式专属深度地质标尺 -->
    <Transition name="hud-fade">
      <div v-if="isUndergroundView" class="underground-depth-gauge">
        <div class="gauge-title">🌐 深井抽油与油藏地质剖面</div>
        <div class="depth-ticks">
          <div class="tick-item"><span class="tick-m">0m</span><span class="tick-n">地表井口</span></div>
          <div class="tick-line"></div>
          <div class="tick-item"><span class="tick-m">-15m</span><span class="tick-n">表层覆盖层</span></div>
          <div class="tick-line"></div>
          <div class="tick-item"><span class="tick-m">-30m</span><span class="tick-n">泥岩封隔盖层</span></div>
          <div class="tick-line"></div>
          <div class="tick-item tick--target"><span class="tick-m">-45m</span><span class="tick-n">目标砂岩油藏 (射孔段/抽油泵)</span></div>
        </div>
      </div>
    </Transition>

    <!-- 采集设备 3D 数据孪生特写快捷导航条 -->
    <div v-if="stages[currentStageIndex].id === 'completion' || selectedEquipment || isUndergroundView" class="equipment-quick-nav">
      <div class="nav-title">
        <span class="nav-icon">🎯</span>
        <span>采油区工业孪生:</span>
      </div>
      <div class="nav-buttons">
        <button
          v-for="(item, key) in equipmentPresets"
          :key="key"
          class="nav-btn"
          :class="{ 'nav-btn--active': selectedEquipment === key }"
          @click="focusEquipment(key as string)"
        >
          {{ item.shortLabel }}
        </button>

        <span class="nav-divider">|</span>

        <!-- 地下剖面模式切换 -->
        <button
          class="nav-btn nav-btn--mode"
          :class="{ 'nav-btn--mode-active': isUndergroundView }"
          @click="toggleUndergroundView"
        >
          {{ isUndergroundView ? '⛰️ 地表全景' : '🌐 地下油藏剖面' }}
        </button>

        <!-- 红外热力成像视角 -->
        <button
          class="nav-btn nav-btn--thermal"
          :class="{ 'nav-btn--thermal-active': isThermalMode }"
          @click="toggleThermalMode"
        >
          🔥 {{ isThermalMode ? '常规材质' : '红外热成像' }}
        </button>

        <!-- 采油树翼阀交互开关 -->
        <button
          class="nav-btn nav-btn--valve"
          :class="{ 'nav-btn--valve-closed': !isWellValveOpen }"
          @click="toggleWellValve"
        >
          🚰 {{ isWellValveOpen ? '翼阀: 开启' : '翼阀: 已关断' }}
        </button>


        <!-- 一键采油核心机组特写 -->
        <button
          class="nav-btn nav-btn--closeup"
          @click="focusOilHarvestingCloseup"
        >
          🎥 机组特写
        </button>

        <button
          v-if="selectedEquipment || isUndergroundView"
          class="nav-btn nav-btn--reset"
          @click="resetEquipmentFocus"
        >
          ✕ 全局视角
        </button>
      </div>
    </div>

    <!-- 采集设备数字孪生全息数据面板 & 示功图 HUD -->
    <Transition name="hud-fade">
      <div v-if="selectedEquipment && equipmentPresets[selectedEquipment]" class="equipment-hud-card">
        <div class="hud-header">
          <div class="hud-title-box">
            <span class="hud-status-pulse" :class="{ 'pulse--warn': equipmentPresets[selectedEquipment].dynType && equipmentPresets[selectedEquipment].dynType !== 'normal' }"></span>
            <span class="hud-title">{{ equipmentPresets[selectedEquipment].title }}</span>
          </div>
          <button class="hud-close-btn" @click="resetEquipmentFocus">✕</button>
        </div>

        <!-- 抽油机多机专属：实时示功图与五维健康雷达图双轮驱动 -->
        <div v-if="['pumping-unit', 'pump-jack-1', 'pump-jack-2'].includes(selectedEquipment)" class="pump-twins-analysis-row">
          <div class="dynamometer-section">
            <div class="dynamometer-header">
              <span class="section-label">实时光杆示功图 (载荷-位移)</span>
              <span v-if="equipmentPresets[selectedEquipment].dynType === 'leak'" class="dyn-status dyn--warn">
                🟠 游动阀漏失
              </span>
              <span v-else-if="equipmentPresets[selectedEquipment].dynType === 'gas-lock'" class="dyn-status dyn--warn">
                🔴 气锁/供液不足
              </span>
              <span v-else class="dyn-status">
                🟢 充满度 91.2%
              </span>
            </div>
            <div class="dynamometer-canvas-box">
              <svg viewBox="0 0 290 145" class="dynamometer-svg">
                <defs>
                  <linearGradient id="dynGradNormal" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0284c7" stop-opacity="0.55" />
                    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
                  </linearGradient>
                  <linearGradient id="dynGradLeak" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.55" />
                    <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.1" />
                  </linearGradient>
                  <linearGradient id="dynGradGas" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ef4444" stop-opacity="0.55" />
                    <stop offset="100%" stop-color="#f87171" stop-opacity="0.1" />
                  </linearGradient>
                </defs>
                <!-- 网格背景线 -->
                <line x1="45" y1="20" x2="45" y2="125" stroke="rgba(255,255,255,0.12)" stroke-dasharray="2 2" />
                <line x1="105" y1="20" x2="105" y2="125" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 2" />
                <line x1="165" y1="20" x2="165" y2="125" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 2" />
                <line x1="225" y1="20" x2="225" y2="125" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 2" />
                <line x1="265" y1="20" x2="265" y2="125" stroke="rgba(255,255,255,0.12)" stroke-dasharray="2 2" />

                <line x1="45" y1="35" x2="265" y2="35" stroke="rgba(255,255,255,0.12)" stroke-dasharray="2 2" />
                <line x1="45" y1="75" x2="265" y2="75" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 2" />
                <line x1="45" y1="115" x2="265" y2="115" stroke="rgba(255,255,255,0.12)" stroke-dasharray="2 2" />

                <!-- 1# 游动阀漏失工况畸变曲线 -->
                <path
                  v-if="equipmentPresets[selectedEquipment].dynType === 'leak'"
                  d="M 45,110 C 65,95 105,75 165,58 C 220,44 255,42 258,62 C 262,82 245,108 210,118 C 150,122 80,120 45,110 Z"
                  fill="url(#dynGradLeak)"
                  stroke="#f59e0b"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                />

                <!-- 2# 供液不足/气锁断崖阶梯曲线 -->
                <path
                  v-else-if="equipmentPresets[selectedEquipment].dynType === 'gas-lock'"
                  d="M 45,115 C 45,62 70,44 120,42 C 185,42 240,42 258,54 C 265,68 250,85 180,85 C 145,115 105,115 45,115 Z"
                  fill="url(#dynGradGas)"
                  stroke="#ef4444"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                />

                <!-- 3# 正常饱满标准平行多边形曲线 -->
                <path
                  v-else
                  d="M 45,115 C 45,65 65,48 115,44 C 185,40 235,42 258,54 C 265,62 262,88 248,102 C 220,114 165,116 110,115 C 75,115 48,118 45,115 Z"
                  fill="url(#dynGradNormal)"
                  stroke="#38bdf8"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                />

                <!-- 坐标轴刻度文字 -->
                <text x="40" y="38" fill="#94a3b8" font-size="9" text-anchor="end">86.4kN</text>
                <text x="40" y="78" fill="#64748b" font-size="9" text-anchor="end">50kN</text>
                <text x="40" y="118" fill="#94a3b8" font-size="9" text-anchor="end">28.2kN</text>
                <text x="45" y="137" fill="#94a3b8" font-size="9" text-anchor="middle">0m</text>
                <text x="155" y="137" fill="#64748b" font-size="9" text-anchor="middle">冲程 (S)</text>
                <text x="265" y="137" fill="#94a3b8" font-size="9" text-anchor="middle">3.8m</text>

                <!-- 随抽油机冲程实时运动的工作质点与光晕 -->
                <circle :cx="dynamometerPoint.x" :cy="dynamometerPoint.y" r="6" fill="rgba(0, 240, 255, 0.35)" />
                <circle
                  :cx="dynamometerPoint.x"
                  :cy="dynamometerPoint.y"
                  r="3.4"
                  :fill="equipmentPresets[selectedEquipment].dynType === 'leak' ? '#f59e0b' : (equipmentPresets[selectedEquipment].dynType === 'gas-lock' ? '#ef4444' : '#00f0ff')"
                  stroke="#ffffff"
                  stroke-width="1.5"
                />
              </svg>
              <div class="dyn-live-badge">
                <span>载荷: {{ dynamometerPoint.load }} kN</span>
                <span>位移: {{ dynamometerPoint.disp }} m</span>
              </div>
            </div>
          </div>

          <!-- 右侧：五维健康评估雷达图与故障模拟注入 -->
          <div class="radar-health-section">
            <div class="radar-header">
              <span class="section-label">五维机组健康评估</span>
              <span
                class="health-score-badge"
                :class="radarOverallScore >= 80 ? 'score--good' : 'score--warn'"
              >
                {{ radarOverallScore }}分 · {{ radarOverallScore >= 80 ? '优良' : '告警' }}
              </span>
            </div>

            <div class="radar-svg-container">
              <svg viewBox="0 0 150 130" class="radar-svg">
                <!-- 同心五边形参考底网 (25%, 50%, 75%, 100%) -->
                <polygon points="75,53.5 85.9,61.4 81.7,74.4 68.3,74.4 64.1,61.4" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
                <polygon points="75,42.0 96.9,57.9 88.5,83.7 61.5,83.7 53.1,57.9" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
                <polygon points="75,30.5 107.8,54.3 95.2,93.1 54.8,93.1 42.2,54.3" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                <polygon points="75,19.0 118.7,50.7 102.0,102.4 48.0,102.4 31.3,50.7" fill="none" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1.2" />

                <!-- 径向轴线 -->
                <line x1="75" y1="65" x2="75" y2="19" stroke="rgba(255,255,255,0.15)" />
                <line x1="75" y1="65" x2="118.7" y2="50.7" stroke="rgba(255,255,255,0.15)" />
                <line x1="75" y1="65" x2="102" y2="102.4" stroke="rgba(255,255,255,0.15)" />
                <line x1="75" y1="65" x2="48" y2="102.4" stroke="rgba(255,255,255,0.15)" />
                <line x1="75" y1="65" x2="31.3" y2="50.7" stroke="rgba(255,255,255,0.15)" />

                <!-- 动态健康区域多边形 (矢量抗锯齿) -->
                <polygon
                  :points="radarPolygonPoints"
                  :fill="activeFaultInjection ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 240, 255, 0.3)'"
                  :stroke="activeFaultInjection ? '#ef4444' : '#00f0ff'"
                  stroke-width="2"
                  stroke-linejoin="round"
                />

                <!-- 维度文字 -->
                <text
                  v-for="p in radarLabelPoints"
                  :key="p.name"
                  :x="p.x"
                  :y="p.y"
                  text-anchor="middle"
                  fill="#94a3b8"
                  font-size="8.5"
                >
                  {{ p.name }}
                </text>
              </svg>
            </div>

            <!-- 故障注入模拟演练 -->
            <div class="fault-inject-bar">
              <span class="inject-title">故障模拟:</span>
              <button
                class="fault-btn"
                :class="{ 'fault-btn--active': activeFaultInjection === 'slip' }"
                @click="injectFault('slip')"
              >
                皮带打滑
              </button>
              <button
                class="fault-btn"
                :class="{ 'fault-btn--active': activeFaultInjection === 'vib' }"
                @click="injectFault('vib')"
              >
                轴销振动
              </button>
              <button
                v-if="activeFaultInjection"
                class="fault-btn fault-btn--reset"
                @click="injectFault(activeFaultInjection)"
              >
                ✕ 恢复
              </button>
            </div>
          </div>
        </div>

        <!-- 采油树专属控制栏 (ESD 模拟与阀门) -->
        <div v-if="selectedEquipment === 'xTree'" class="xtree-actions-bar">
          <button
            class="action-btn action-btn--danger"
            :class="{ 'btn--active': isEsdTriggered }"
            @click="triggerEsdSimulation"
          >
            ⚠️ {{ isEsdTriggered ? '复位 ESD 紧急切断' : '模拟超压 / 触发 ESD' }}
          </button>
          <button
            class="action-btn action-btn--valve"
            :class="{ 'btn--active': !isWellValveOpen }"
            @click="toggleWellValve"
          >
            🚰 {{ isWellValveOpen ? '关断生产主翼阀' : '开启主翼阀' }}
          </button>
        </div>

        <!-- 设备专项遥测指标九宫格 -->
        <div class="hud-metrics-grid">
          <div
            v-for="m in equipmentPresets[selectedEquipment].metrics"
            :key="m.label"
            class="metric-box"
          >
            <span class="m-label">{{ m.label }}</span>
            <div class="m-val-wrap">
              <span class="m-val" :class="`val--${m.status || 'normal'}`">{{ m.value }}</span>
              <span v-if="m.unit" class="m-unit">{{ m.unit }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.oil-scene-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.webgl-canvas-box {
  width: 100%;
  height: 100%;
}

.equipment-quick-nav {
  position: absolute;
  bottom: 110px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: rgba(10, 25, 45, 0.88);
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  z-index: 15;
}

.nav-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #38bdf8;
  white-space: nowrap;
}

.nav-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-btn {
  padding: 3px 10px;
  font-size: 11px;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-btn:hover {
  color: #ffffff;
  background: rgba(0, 240, 255, 0.18);
  border-color: #00f0ff;
}

.nav-btn--active {
  color: #ffffff;
  background: linear-gradient(135deg, #0284c7 0%, #00f0ff 100%);
  border-color: #00f0ff;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
  font-weight: 600;
}

.nav-btn--reset {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.12);
}

.nav-btn--reset:hover {
  background: rgba(245, 158, 11, 0.25);
  border-color: #f59e0b;
}

.nav-divider {
  color: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

.nav-btn--mode {
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.1);
}

.nav-btn--mode-active {
  color: #ffffff;
  background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
  border-color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
  font-weight: 600;
}

.nav-btn--thermal {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.1);
}

.nav-btn--thermal-active {
  color: #ffffff;
  background: linear-gradient(135deg, #ea580c 0%, #f59e0b 100%);
  border-color: #f59e0b;
  box-shadow: 0 0 12px rgba(234, 88, 12, 0.6);
  font-weight: 600;
}

.nav-btn--valve {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.1);
}

.nav-btn--valve-closed {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.18);
}

.pulse--warn {
  background: #f59e0b !important;
  box-shadow: 0 0 8px #f59e0b !important;
}

.dyn--warn {
  color: #f59e0b !important;
  font-weight: 600;
}

.xtree-actions-bar {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.12);
}

.action-btn {
  flex: 1;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.action-btn--danger {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
}

.action-btn--danger:hover,
.action-btn--danger.btn--active {
  color: #ffffff;
  background: #dc2626;
  box-shadow: 0 0 12px rgba(220, 38, 38, 0.6);
}

.action-btn--valve {
  color: #38bdf8;
  background: rgba(2, 132, 199, 0.15);
  border-color: rgba(2, 132, 199, 0.4);
}

.action-btn--valve:hover,
.action-btn--valve.btn--active {
  color: #ffffff;
  background: #0284c7;
}

.esd-alarm-banner {
  position: absolute;
  top: 75px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(90deg, rgba(153, 27, 27, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%);
  border: 2px solid #ef4444;
  border-radius: 30px;
  padding: 8px 24px;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6), inset 0 0 16px rgba(255, 255, 255, 0.2);
  z-index: 50;
  backdrop-filter: blur(12px);
  animation: bannerPulse 1s infinite alternate;
}

@keyframes bannerPulse {
  from { box-shadow: 0 8px 32px rgba(239, 68, 68, 0.5); }
  to { box-shadow: 0 8px 48px rgba(239, 68, 68, 0.85); }
}

.esd-banner-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.esd-pulse-icon {
  font-size: 20px;
  animation: pulse 0.5s infinite alternate;
}

.esd-banner-text {
  display: flex;
  flex-direction: column;
}

.esd-title {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.esd-sub {
  font-size: 11px;
  color: #fecaca;
}

.esd-reset-btn {
  padding: 5px 14px;
  background: #ffffff;
  color: #b91c1c;
  font-size: 11px;
  font-weight: 700;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.esd-reset-btn:hover {
  background: #fecaca;
  transform: scale(1.04);
}

.valve-notice-pill {
  position: absolute;
  top: 135px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 18px;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid #38bdf8;
  border-radius: 20px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
  z-index: 45;
  backdrop-filter: blur(8px);
}

.underground-depth-gauge {
  position: absolute;
  top: 140px;
  left: 32px;
  background: rgba(8, 20, 36, 0.9);
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: 8px;
  padding: 12px 14px;
  backdrop-filter: blur(12px);
  z-index: 20;
  width: 230px;
}

.gauge-title {
  font-size: 11px;
  font-weight: 700;
  color: #00f0ff;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 4px;
}

.depth-ticks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tick-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 10px;
}

.tick-m {
  font-family: monospace;
  font-weight: 700;
  color: #38bdf8;
  width: 38px;
}

.tick-n {
  color: #94a3b8;
}

.tick--target .tick-m {
  color: #f59e0b;
}

.tick--target .tick-n {
  color: #facc15;
  font-weight: 600;
}

.tick-line {
  width: 2px;
  height: 10px;
  background: rgba(56, 189, 248, 0.35);
  margin-left: 14px;
}

/* 底部工序联动舱内置气象切换与机组特写 */
.dock-weather-group {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.15);
}

.dock-weather-btn {
  padding: 2px 7px;
  font-size: 10px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.dock-weather-btn:hover {
  color: #ffffff;
  border-color: #00f0ff;
  background: rgba(0, 240, 255, 0.15);
}

.dock-weather-btn--active {
  color: #ffffff;
  background: linear-gradient(135deg, #0284c7 0%, #00f0ff 100%);
  border-color: #00f0ff;
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
  font-weight: 600;
}

.nav-btn--closeup {
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(56, 189, 248, 0.12);
}

.nav-btn--closeup:hover {
  color: #ffffff;
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.25);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
}


.equipment-hud-card {
  position: absolute;
  bottom: 165px;
  left: 50%;
  transform: translateX(-50%);
  width: 590px;
  background: linear-gradient(180deg, rgba(10, 28, 50, 0.94) 0%, rgba(6, 18, 34, 0.96) 100%);
  border: 1px solid rgba(0, 240, 255, 0.45);
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8), inset 0 0 24px rgba(0, 240, 255, 0.12);
  backdrop-filter: blur(16px);
  z-index: 20;
}

.hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.hud-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-status-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: pulse 1.5s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.6; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1.2); }
}

.hud-title {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.hud-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.2s;
}

.hud-close-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.pump-twins-analysis-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.dynamometer-section {
  flex: 1.15;
  padding: 8px;
  background: rgba(2, 12, 24, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 6px;
}

.dynamometer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  margin-bottom: 4px;
}

.section-label {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
}

.dyn-status {
  color: #10b981;
  font-weight: 600;
  font-size: 9.5px;
}

.dynamometer-canvas-box {
  position: relative;
  width: 100%;
}

.dynamometer-svg {
  width: 100%;
  height: 120px;
  display: block;
}

.dyn-live-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  display: flex;
  gap: 6px;
  font-size: 9px;
  font-family: monospace;
  color: #00f0ff;
  background: rgba(15, 23, 42, 0.75);
  padding: 2px 5px;
  border-radius: 3px;
}

/* 五维机组健康评估与故障模拟演练 */
.radar-health-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: rgba(2, 12, 24, 0.6);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 6px;
}

.radar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  margin-bottom: 2px;
}

.health-score-badge {
  font-size: 9.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}

.score--good {
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.score--warn {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.radar-svg-container {
  width: 100%;
  height: 95px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-svg {
  width: 100%;
  height: 100%;
  max-width: 150px;
}

.fault-inject-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  padding-top: 4px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.inject-title {
  font-size: 9px;
  color: #94a3b8;
  white-space: nowrap;
}

.fault-btn {
  padding: 2px 6px;
  font-size: 9px;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.fault-btn:hover {
  color: #ffffff;
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.fault-btn--active {
  color: #ffffff;
  background: #dc2626;
  border-color: #ef4444;
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.6);
  font-weight: 600;
}

.fault-btn--reset {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.1);
}

.fault-btn--reset:hover {
  background: #10b981;
  color: #ffffff;
}

.hud-metrics-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.metric-box {
  padding: 5px 8px;
  background: rgba(15, 28, 48, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
}

.m-label {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  margin-bottom: 2px;
}

.m-val-wrap {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.m-val {
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
  color: #00f0ff;
}

.val--success {
  color: #10b981;
}

.val--warning {
  color: #f59e0b;
}

.m-unit {
  font-size: 9px;
  color: #64748b;
}

.hud-fade-enter-active,
.hud-fade-leave-active {
  transition: all 0.3s ease;
}

.hud-fade-enter-from,
.hud-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 15px);
}

.process-lifecycle-dock {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 980px;
  padding: 10px 16px;
  background: linear-gradient(180deg, rgba(14, 30, 52, 0.94) 0%, rgba(8, 20, 36, 0.96) 100%);
  border: 1px solid rgba(0, 240, 255, 0.4);
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.75), inset 0 0 20px rgba(0, 240, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(14px);
  z-index: 18;
  pointer-events: auto;
}

.process-steps-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.stage-tab-btn {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  position: relative;
  overflow: hidden;
  transition: all 0.25s ease;
}

.stage-tab-btn:hover {
  background: rgba(0, 240, 255, 0.14);
  border-color: rgba(0, 240, 255, 0.5);
}

.stage-tab-btn--active {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.28) 0%, rgba(2, 132, 199, 0.4) 100%);
  border-color: #00f0ff;
  box-shadow: 0 0 14px rgba(0, 240, 255, 0.4);
}

.tab-index {
  flex: 0 0 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 700;
}

.stage-tab-btn--active .tab-index {
  background: #00f0ff;
  color: #050c18;
  box-shadow: 0 0 8px #00f0ff;
}

.tab-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.tab-title {
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-tab-btn--active .tab-title {
  color: #00f0ff;
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
}

.tab-code {
  font-size: 9px;
  color: #94a3b8;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.stage-tab-btn--active .tab-code {
  color: #38bdf8;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: transparent;
}

.stage-tab-btn--active .tab-indicator {
  background: linear-gradient(90deg, #00f0ff, #f59e0b);
}

.process-dock-footer {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.footer-desc {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #cbd5e1;
  max-width: 440px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desc-badge {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #f59e0b;
  font-weight: 600;
  font-size: 10px;
}

.desc-content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-telemetry-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.telemetry-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: rgba(15, 28, 48, 0.75);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 4px;
  font-size: 11px;
}

.chip-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38bdf8;
}

.dot--active {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

.chip-label {
  color: #cbd5e1;
}

.chip-value {
  color: #00f0ff;
  font-weight: 600;
  font-family: monospace;
}

.dock-rotate-btn {
  padding: 3px 10px;
  font-size: 11px;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.dock-rotate-btn:hover,
.dock-rotate-btn--active {
  background: rgba(245, 158, 11, 0.32);
  border-color: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}
</style>
