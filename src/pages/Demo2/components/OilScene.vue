<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
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
    cameraPos: [-20, 52, 75],
    targetPos: [-15, 32, 0],
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
    cameraPos: [42, -16, 88],
    targetPos: [-10, -35, 25],
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
    cameraPos: [88, 42, 115],
    targetPos: [35, 12, 10],
  },
]

const currentStageIndex = ref(3)
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
let dynamometerLed: THREE.Mesh | null = null
let rtuTxLed: THREE.Mesh | null = null
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

  window.addEventListener('resize', handleResize)
  tick()
}

// -------------------------------------------------------------
// 沙漠油田全景光照：强泛光 + 大漠夕照金光 + 科技清冷轮廓光
// -------------------------------------------------------------
function setupDesertLighting() {
  if (!scene) return

  // 1. 半球天光 (天际清朗浅灰蓝 + 沙漠大地暖金暖沙)
  const hemi = new THREE.HemisphereLight(0xa5c4e2, 0xd4a068, 4.5)
  hemi.position.set(0, 240, 0)
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
  scene.add(mainSun)

  // 3. 沙漠大地金黄漫射辅光 (雕刻沙丘迎光背光立体感)
  const desertGold = new THREE.DirectionalLight(0xe8be88, 3.6)
  desertGold.position.set(-140, 120, -100)
  scene.add(desertGold)

  // 4. 清透天光侧逆光 (呈现机械轮廓锐度)
  const skyRim = new THREE.DirectionalLight(0xcde1f5, 2.8)
  skyRim.position.set(-100, 160, 140)
  scene.add(skyRim)

  // 5. 钻井作业平台平稳强聚光工矿灯
  const spotLight = new THREE.SpotLight(0xffffff, 9.0, 220, Math.PI / 3.8, 0.35, 1.2)
  spotLight.position.set(-15, 95, 0)
  spotLight.target.position.set(-15, 12, 0)
  scene.add(spotLight)
  scene.add(spotLight.target)

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

  // 7. 4座井场高杆夜间工矿 LED 泛光灯塔
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

    const lampBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }))
    lampBox.position.set(fx, fy + 0.5, fz)
    scene?.add(lampBox)

    const floodLight = new THREE.PointLight(0xffffff, 4.5, 110)
    floodLight.position.set(fx, fy + 1, fz)
    scene?.add(floodLight)
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
    // 洁白烤漆金属板底
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 1024, 360)

    // 红色外边框与内嵌双层金线
    ctx.strokeStyle = '#dc2626'
    ctx.lineWidth = 18
    ctx.strokeRect(9, 9, 1006, 342)

    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 5
    ctx.strokeRect(22, 22, 980, 316)

    // 左侧中石油宝石花标志 (CNPC Emblem)
    const cx = 118
    const cy = 180
    // 金黄色外花瓣
    ctx.fillStyle = '#eab308'
    ctx.beginPath()
    ctx.arc(cx, cy, 64, 0, Math.PI * 2)
    ctx.fill()
    // 红色内花瓣花朵
    ctx.fillStyle = '#dc2626'
    for (let p = 0; p < 8; p++) {
      const ang = (p * Math.PI) / 4
      ctx.beginPath()
      ctx.arc(cx + Math.cos(ang) * 36, cy + Math.sin(ang) * 36, 25, 0, Math.PI * 2)
      ctx.fill()
    }
    // 中心黄色五角星
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(cx, cy, 20, 0, Math.PI * 2)
    ctx.fill()

    // 顶部红旗标识与单位小标
    ctx.fillStyle = '#dc2626'
    ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('中国石油 TARIM OILFIELD · 深地科学探索工程', 580, 58)

    // 主标题：“深 地 工 程” (大国重器醒目超大红字)
    ctx.shadowColor = 'rgba(220, 38, 38, 0.25)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4
    ctx.fillStyle = '#dc2626'
    ctx.font = '900 128px "PingFang SC", "Microsoft YaHei", "SimHei", sans-serif'
    ctx.fillText('深 地 工 程', 580, 165)
    ctx.shadowColor = 'transparent'

    // 英文与工程编号副标
    ctx.fillStyle = '#0284c7'
    ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText('万米特深井自动化钻机  DEEP EARTH DRILLING 12,000m', 580, 260)

    // 技术规格标注行
    ctx.fillStyle = '#475569'
    ctx.font = 'bold 20px "SF Mono", monospace, sans-serif'
    ctx.fillText('DESIGN DRILLING DEPTH: 12,000m | MAX HOOK LOAD: 1,000t | TORQUE: 100,000 N·m', 580, 310)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
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

    // 核心标语大字 (洁白粗体加微阴影，极度庄重震撼)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 3
    ctx.shadowOffsetY = 4

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 102px "PingFang SC", "Microsoft YaHei", "SimHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(slogan, 1024, 115)

    // 消除阴影绘制副标题
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#fde047' // 金黄字副标
    ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(subtext, 1024, 205)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
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

  // 前大灯与雾灯 (Headlights)
  for (const lx of [-0.95, 0.95]) {
    const headlight = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), new THREE.MeshBasicMaterial({ color: 0xffedd5 }))
    headlight.position.set(lx, 0.9, 4.32)
    tractor.add(headlight)
  }

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

  // 罐顶3个人孔密封盖 (Inspection Manholes)
  for (const mz of [-11, -6.8, -2.6]) {
    const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16), chassisMat)
    manhole.position.set(0, 4.55, mz)
    trailer.add(manhole)
  }

  // 挂车侧向管箱 (Hose Tubes)
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

  // 挂车后三轴重载轮胎组 (12条轮胎)
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
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i)
    const z = posAttr.getZ(i)
    const dist = Math.sqrt(x * x + z * z)

    let y = 0
    if (dist > 70) {
      const blend = Math.min(1, (dist - 70) / 45)
      if (z > 35) {
        // 前景平缓金色沙坡 (保证大屏正面视觉开阔通透，绝不遮挡井场)
        y = (Math.sin(x * 0.012) * 1.0 + Math.cos(z * 0.015) * 1.2) * blend
      } else {
        // 中后方浩瀚连绵起伏新月形沙垄海 (精确拟合图二图三塔克拉玛干沙漠连绵起伏流动沙海)
        const dWave1 = Math.sin(x * 0.007 + z * 0.004) * 24.0
        const dWave2 = Math.cos(x * 0.013 - z * 0.008) * 16.0
        const dWave3 = Math.sin(x * 0.022 + z * 0.014) * 7.5
        // 真实新月形沙丘迎风缓坡背风陡峭滑落坡特征峰
        const dSharpCrest = Math.pow((Math.sin(x * 0.008 + z * 0.005) + 1) * 0.5, 2.2) * 18.0
        const outerFade = dist > 650 ? Math.max(0, 1 - (dist - 650) / 200) : 1
        y = (dWave1 + dWave2 + dWave3 + dSharpCrest) * blend * outerFade
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

  // 5. 荒漠戈壁进场柏油公路与重型运输便道 (Desert Heavy-Haul Highway)
  const roadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(140, 0.25, -420),
    new THREE.Vector3(110, 0.25, -280),
    new THREE.Vector3(75, 0.25, -140),
    new THREE.Vector3(50, 0.25, -20),
    new THREE.Vector3(30, 0.25, 45),
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

  // 荒漠重型 6x6 油罐半挂运输卡车 (Desert Heavy-Haul Tanker Truck)
  const truckGroup = createHeavyTankerTruck()
  truckGroup.position.set(68, 0.28, -95)
  truckGroup.rotation.y = 2.45 // 沿公路走向停靠
  envGroup.add(truckGroup)

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

  // 6. 大漠野战作业生活营区活动方舱群 (Desert Camp Modular Cabins)
  const campGroup = new THREE.Group()
  campGroup.position.set(65, 0.1, -60)
  campGroup.rotation.y = -Math.PI / 4.5

  const cabinWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 })
  const cabinBlue = new THREE.MeshBasicMaterial({ color: 0x0284c7 })
  const cabinDoor = new THREE.MeshBasicMaterial({ color: 0x334155 })

  for (let i = 0; i < 3; i++) {
    const cabin = new THREE.Group()
    cabin.position.set(0, 0, i * 11)

    // 箱体 (Container Body)
    const box = new THREE.Mesh(new THREE.BoxGeometry(16, 4.2, 6.5), cabinWhite)
    box.position.y = 2.2
    cabin.add(box)

    // 箱体腰线科技蓝条纹
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(16.05, 0.6, 6.55), cabinBlue)
    stripe.position.y = 2.4
    cabin.add(stripe)

    // 箱门与窗户
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.0, 0.1), cabinDoor)
    door.position.set(-4, 1.6, 3.3)
    cabin.add(door)

    // 空调室外机
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.0), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }))
    ac.position.set(5, 3.2, 3.5)
    cabin.add(ac)

    // 营地卫星通信锅盖天线 (第1栋房顶)
    if (i === 0) {
      const dishPole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0x64748b }))
      dishPole.position.set(0, 5.5, 0)
      cabin.add(dishPole)

      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.2),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, side: THREE.DoubleSide }),
      )
      dish.rotation.x = Math.PI / 3
      dish.position.set(0, 7.0, 0)
      cabin.add(dish)
    }

    campGroup.add(cabin)
  }
  envGroup.add(campGroup)

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

  // 1. 贯穿沙漠通向井场的双向沥青公路 (Access Road: Y = 0.08，平整铺设在沙漠之上)
  const roadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-180, 0.08, 95),
    new THREE.Vector3(-110, 0.08, 60),
    new THREE.Vector3(-45, 0.08, 25),
  ])
  const roadGeo = new THREE.TubeGeometry(roadCurve, 36, 4.6, 2, false)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.25 })
  const road = new THREE.Mesh(roadGeo, roadMat)
  road.scale.set(1, 0.08, 1) // 压成平整沥青路面
  road.receiveShadow = true
  group.add(road)

  // 公路路边反光防撞立杆
  for (let t = 0; t <= 1; t += 0.15) {
    const pt = roadCurve.getPointAt(t)
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b }),
    )
    bollard.position.set(pt.x + 2.8, 0.7, pt.z + 2.8)
    group.add(bollard)
  }

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

  // C. 钻台端液压铰接举升坡道 (Elevating V-Door Ramp: 延伸至钻台 Y = 8.5)
  const rampLen = 16
  const rampArm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, rampLen), catBlue)
  rampArm.position.set(0, 4.4, -4.5)
  rampArm.rotation.x = -Math.PI / 6.2
  catwalkGroup.add(rampArm)

  // 坡道两侧黄色安全护手导轨
  for (const rx of [-1.7, 1.7]) {
    const rampRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, rampLen), catYellow)
    rampRail.position.set(rx, 5.1, -4.5)
    rampRail.rotation.x = -Math.PI / 6.2
    catwalkGroup.add(rampRail)
  }

  // 双液压变幅举升大油缸 (Twin Heavy Hydraulic Lift Cylinders)
  for (const cx of [-1.2, 1.2]) {
    const cylBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 5.5, 16), catSteel)
    cylBody.position.set(cx, 2.4, -2.5)
    cylBody.rotation.x = Math.PI / 5
    catwalkGroup.add(cylBody)

    const cylRod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.0, 16), chromeCyl)
    cylRod.position.set(cx, 4.2, -4.5)
    cylRod.rotation.x = Math.PI / 5
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

    // A. 北背壁 (North Back Wall) - 位于 Z = strataBackZ，厚度仅 4m，绝不遮挡前方的井筒与粒子！
    const backGeo = new THREE.BoxGeometry(cutawayW, layer.thickness, 4)
    const backMat = new THREE.MeshStandardMaterial({
      color: layer.color,
      map: layerTexture || undefined,
      roughness: 0.78,
      metalness: 0.22,
    })
    const backWall = new THREE.Mesh(backGeo, backMat)
    backWall.position.set(strataCenterX, layer.top - layer.thickness / 2, strataBackZ)
    backWall.receiveShadow = true
    layerGroup.add(backWall)

    // 仅在背壁下表面前缘保留一条优雅的层位底界面科技激光线 (Stratum Bottom Interface Line)
    const backLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(strataCenterX - cutawayW / 2, layer.top - layer.thickness, strataBackZ + 2.05),
      new THREE.Vector3(strataCenterX + cutawayW / 2, layer.top - layer.thickness, strataBackZ + 2.05),
    ])
    const backBoundaryLine = new THREE.Line(
      backLineGeo,
      new THREE.LineBasicMaterial({ color: layer.glow, transparent: true, opacity: 0.55 })
    )
    layerGroup.add(backBoundaryLine)

    // B. 西侧壁 (West Side Wall) - 位于 X = strataWestX，进深 cutawayD，展示西向交错层理
    const westGeo = new THREE.BoxGeometry(4, layer.thickness, cutawayD)
    const westMat = new THREE.MeshStandardMaterial({
      color: layer.color,
      map: layerTexture || undefined,
      roughness: 0.8,
      metalness: 0.2,
    })
    const westWall = new THREE.Mesh(westGeo, westMat)
    westWall.position.set(strataWestX, layer.top - layer.thickness / 2, strataBackZ + cutawayD / 2)
    westWall.receiveShadow = true
    layerGroup.add(westWall)

    // 西侧壁底界面分割线
    const westLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(strataWestX + 2.05, layer.top - layer.thickness, strataBackZ),
      new THREE.Vector3(strataWestX + 2.05, layer.top - layer.thickness, strataBackZ + cutawayD),
    ])
    const westBoundaryLine = new THREE.Line(
      westLineGeo,
      new THREE.LineBasicMaterial({ color: layer.glow, transparent: true, opacity: 0.55 })
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

  // 底部基岩承托基座 (Bedrock Basement Tray)
  const floorGeo = new THREE.BoxGeometry(cutawayW + 4, 3, cutawayD + 4)
  const floorMesh = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.3 })
  )
  floorMesh.position.set(strataCenterX, -71.5, strataBackZ + cutawayD / 2)
  group.add(floorMesh)

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

  // 视窗剖切口厚度高光边框线 (Machined Cutaway Bevel Highlight Edge)
  const cutawayEdgeGeo = new THREE.EdgesGeometry(cutawayCasingGeo)
  const cutawayEdgeLine = new THREE.LineSegments(
    cutawayEdgeGeo,
    new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6 })
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

  // 6. 三维有机起伏高反光原油储层实体 (Organic Viscous Crude Oil Reservoir Body)
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
    color: 0x1a0c03, // 深邃黑金重质原油基底
    emissive: 0x451a03, // 内部深沉原油地温温润微光
    emissiveIntensity: 0.5,
    roughness: 0.12, // 极致湿润镜面反射高光
    metalness: 0.94,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
  })
  oilReservoirFluidMesh = new THREE.Mesh(reservoirGeo, oilFluidMat)
  oilReservoirFluidMesh.position.set(-15, -42, 2)
  oilReservoirFluidMesh.scale.set(1.2, 1.0, 0.75) // 沿地质走向延展
  group.add(oilReservoirFluidMesh)

  // 内部高饱和富油琥珀流光核心 (High-Saturation Amber Oil Core)
  const coreGeo = new THREE.CylinderGeometry(25, 29, 9, 36)
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xb45309, // 琥珀原油流金微相
    emissive: 0x92400e, // 琥珀原油高亮自发光核心
    emissiveIntensity: 0.75,
    roughness: 0.18,
    metalness: 0.85,
    transparent: true,
    opacity: 0.52,
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

  // 油气顶界面微光盘 (Gas-Oil Contact GOC Level at -30m)
  const gocGeo = new THREE.PlaneGeometry(cutawayW * 0.72, cutawayD * 0.75)
  const gocMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  gasCapPlane = new THREE.Mesh(gocGeo, gocMat)
  gasCapPlane.rotation.x = -Math.PI / 2
  gasCapPlane.position.set(-15, -30.2, strataBackZ + cutawayD * 0.42)
  group.add(gasCapPlane)

  // 油水界面微光底盘 (Oil-Water Contact OWC Level at -49m)
  const owcGeo = new THREE.PlaneGeometry(cutawayW * 0.72, cutawayD * 0.75)
  const owcMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.2,
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
    opacity: 0.55,
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

  // 天然地质微裂缝与导流裂隙网络 (Reservoir Micro-Fracture Network)
  const fracturePoints: THREE.Vector3[] = []
  for (let f = 0; f < 36; f++) {
    const fx1 = -15 + (Math.random() - 0.5) * 60
    const fy1 = -32 - Math.random() * 18
    const fz1 = strataBackZ + Math.random() * 32
    const fx2 = fx1 + (Math.random() - 0.5) * 14
    const fy2 = fy1 + (Math.random() - 0.5) * 4
    const fz2 = fz1 + (Math.random() - 0.5) * 14
    fracturePoints.push(new THREE.Vector3(fx1, fy1, fz1), new THREE.Vector3(fx2, fy2, fz2))
  }
  const fracGeo = new THREE.BufferGeometry().setFromPoints(fracturePoints)
  const fracMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.45 })
  const fractureLines = new THREE.LineSegments(fracGeo, fracMat)
  group.add(fractureLines)

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

  // 北背壁渗流 (North Cutaway Wall Trickles, Z = strataBackZ + 2.05)
  const northXCoords = [-58, -48, -36, -26, -6, 8, 20, 32, 44]
  northXCoords.forEach((tx, idx) => {
    const topY = -31 - (idx % 3) * 1.5
    const btmY = -48 - (idx % 2) * 2.0
    const midY = (topY + btmY) * 0.5
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tx, topY, strataBackZ + 2.08),
      new THREE.Vector3(tx + (idx % 2 === 0 ? 0.6 : -0.6), midY, strataBackZ + 2.12),
      new THREE.Vector3(tx + (idx % 3 === 0 ? -0.4 : 0.4), btmY + 2, strataBackZ + 2.1),
      new THREE.Vector3(tx, btmY, strataBackZ + 2.08),
    ])
    const tMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.16 + (idx % 3) * 0.05, 8, false), trickleMat)
    group.add(tMesh)
    oilWallTrickles.push(tMesh)

    // 渗流末端悬垂油滴 (Viscous Teardrop Bead)
    const droplet = new THREE.Mesh(trickleDropletGeo, trickleMat)
    droplet.scale.set(1.0, 1.4, 1.0)
    droplet.position.set(tx, btmY - 0.25, strataBackZ + 2.1)
    group.add(droplet)
  })

  // 西侧壁渗流 (West Cutaway Wall Trickles, X = strataWestX + 2.05)
  const westZCoords = [-12, -4, 4, 12, 18, 26, 34]
  westZCoords.forEach((tz, idx) => {
    const topY = -31.5 - (idx % 3) * 1.2
    const btmY = -48.5 - (idx % 2) * 2.2
    const midY = (topY + btmY) * 0.5
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(strataWestX + 2.08, topY, tz),
      new THREE.Vector3(strataWestX + 2.12, midY, tz + (idx % 2 === 0 ? 0.5 : -0.5)),
      new THREE.Vector3(strataWestX + 2.1, btmY + 2, tz + (idx % 3 === 0 ? -0.4 : 0.4)),
      new THREE.Vector3(strataWestX + 2.08, btmY, tz),
    ])
    const tMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.16 + (idx % 3) * 0.05, 8, false), trickleMat)
    group.add(tMesh)
    oilWallTrickles.push(tMesh)

    const droplet = new THREE.Mesh(trickleDropletGeo, trickleMat)
    droplet.scale.set(1.0, 1.4, 1.0)
    droplet.position.set(strataWestX + 2.1, btmY - 0.25, tz)
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

  // 从地面通向钻台的 45° 钢爬梯 (Rig Floor Stairway with Handrails)
  const stairGroup = new THREE.Group()
  stairGroup.position.set(floorW / 2 + 1, 0, 5)
  const stairLen = 12
  const stairRamp = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, stairLen), darkMetal)
  stairRamp.position.set(stairLen * 0.35, floorH * 0.5, 0)
  stairRamp.rotation.z = -Math.PI / 4.2
  stairGroup.add(stairRamp)

  const stairRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, stairLen), yellowSafety)
  stairRail.position.set(stairLen * 0.35, floorH * 0.5 + 0.9, 1.3)
  stairRail.rotation.z = -Math.PI / 4.2
  stairGroup.add(stairRail)
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

  // 左右伸出的高压压井与节流阀门手轮
  for (const s of [-1, 1]) {
    const valvePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5.0, 8), darkMetal)
    valvePipe.rotation.z = Math.PI / 2
    valvePipe.position.set(s * 3.5, 2.2, 0)
    bopGroup.add(valvePipe)

    const valveHandwheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 6, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }))
    valveHandwheel.rotation.y = Math.PI / 2
    valveHandwheel.position.set(s * 6.0, 2.2, 0)
    bopGroup.add(valveHandwheel)
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

  // 倾斜高架泥浆返出管线 (Flowline from Bell Nipple to Shale Shakers)
  // 钻台位于 (-15, 2.75, 0)，固控振动筛位于 (-41, 4.2, 12)
  const flowlineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 7.6, 0),
    new THREE.Vector3(-8, 6.8, 4),
    new THREE.Vector3(-18, 5.2, 8),
    new THREE.Vector3(-26, 3.8, 12),
  ])
  const flowlineMesh = new THREE.Mesh(
    new THREE.TubeGeometry(flowlineCurve, 24, 0.55, 12, false),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 })
  )
  bopGroup.add(flowlineMesh)
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

  // 司钻房内部数字化工控多联屏操作台 (Driller's Cyber Chair Console)
  const drillerDesk = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.4, 2.0), darkMetal)
  drillerDesk.position.set(0, 1.4, -1.8)
  cabin.add(drillerDesk)

  for (const sx of [-1.5, 0, 1.5]) {
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.75, 0.08),
      new THREE.MeshBasicMaterial({ color: sx === 0 ? 0x00f0ff : 0x38bdf8 })
    )
    screen.position.set(sx, 2.3, -2.4)
    screen.rotation.x = -0.15
    cabin.add(screen)
  }

  // 司钻房顶置防爆空调与警示灯
  const cabinAC = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.6), darkMetal)
  cabinAC.position.set(0, 5.4, 1.0)
  cabin.add(cabinAC)
  rigGroup.add(cabin)

  // 4. 机械化铁钻工总成 (Mechanized Iron Roughneck)
  const roughneck = new THREE.Group()
  roughneck.position.set(-6, floorH, 5)

  // 回转底座与立柱导轨
  const rnTurret = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.2, 12), darkMetal)
  rnTurret.position.y = 0.6
  roughneck.add(rnTurret)

  const rnMast = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.5, 1.4), trussMat)
  rnMast.position.set(0, 3.2, 0)
  roughneck.add(rnMast)

  // 折叠液压冲扣卡瓦臂 (Hydraulic Arm & Spinner Wrench)
  const rnArm = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 1.8), yellowSafety)
  rnArm.position.set(2.4, 3.8, 0)
  roughneck.add(rnArm)

  const rnJaw = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.4, 8), darkMetal)
  rnJaw.position.set(4.2, 3.8, 0)
  roughneck.add(rnJaw)
  rigGroup.add(roughneck)

  // 钻台小鼠洞与接单根备用钻杆 (Mousehole with Standby Drill Pipe)
  const mousehole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 6.0, 12), darkMetal)
  mousehole.rotation.z = -0.12
  mousehole.position.set(4.8, floorH - 1.5, 2.5)
  rigGroup.add(mousehole)

  const standbyPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 8.5, 12), silverChrome)
  standbyPipe.rotation.z = -0.12
  standbyPipe.position.set(4.8, floorH + 2.5, 2.5)
  rigGroup.add(standbyPipe)

  const pipeJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 12), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85 }))
  pipeJoint.rotation.z = -0.12
  pipeJoint.position.set(4.8, floorH + 6.2, 2.5)
  rigGroup.add(pipeJoint)

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
    }

    // 正面开口侧顶部层加设高空横梁加强整体抗扭刚度
    if (t >= tiers - 2) {
      const frontBar = new THREE.Mesh(new THREE.BoxGeometry(w1, 0.85, 0.85), tMat)
      frontBar.position.set(0, y1, w1 / 2)
      tower.add(frontBar)
    }

    // 在 Tier 2 正面悬挂醒目的超大“深地工程”大国重器铭牌！(复刻图三：高 5.4m，气势恢宏)
    if (t === 2) {
      const plaqueW = wMid * 0.96
      const plaqueH = 5.4
      const plaqueTex = createDeepEarthPlaqueTexture()
      const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex, side: THREE.DoubleSide })
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(plaqueW, plaqueH), plaqueMat)
      plaque.position.set(0, yMid, wMid / 2 + 0.18)
      tower.add(plaque)

      const plaqueBacking = new THREE.Mesh(new THREE.BoxGeometry(plaqueW + 0.25, plaqueH + 0.25, 0.2), darkMetal)
      plaqueBacking.position.set(0, yMid, wMid / 2 + 0.06)
      tower.add(plaqueBacking)
    }
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

  // 顶部夜间航空障碍红灯球 (Aviation Obstruction Beacon)
  const beaconGeo = new THREE.SphereGeometry(0.75, 12, 12)
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 })
  beaconMesh = new THREE.Mesh(beaconGeo, beaconMat)
  beaconMesh.position.set(0, 5.8, 0)
  crownGroup.add(beaconMesh)

  tower.add(crownGroup)
  rigGroup.add(tower)

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

  // 弯曲自然下垂的高压泥浆水龙带 (Catenary Rotary Kelly Hose)
  const hoseCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-bottomW / 2 + 1.2, floorH + 37, -bottomW / 2 + 1.2),
    new THREE.Vector3(-4, floorH + 42, 2),
    new THREE.Vector3(0, floorH + 32, 0),
  )
  const rotaryHose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 24, 0.45, 12, false), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }))
  rigGroup.add(rotaryHose)

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

  // 游车滑轮箱体 (Streamlined Traveling Block)
  const blockBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.8, 3.0), new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.85, roughness: 0.25 }))
  travelingBlock.add(blockBody)

  // 重型旋转吊钩 (Drilling Hook)
  const hookCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2.0, 12), darkMetal)
  hookCyl.position.y = -3.2
  travelingBlock.add(hookCyl)

  // 顶驱本体 (Top Drive Assembly)
  const topDriveGroup = new THREE.Group()
  topDriveGroup.position.set(0, -4.5, 0)

  // 顶驱交流变频钻井电机圆筒
  const tdsMotor = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.8, 16), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 }))
  tdsMotor.position.set(0, -1.9, 0)
  topDriveGroup.add(tdsMotor)

  // 鹅颈水龙头弯管 (Gooseneck Swivel)
  const swivel = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.35, 8, 16, Math.PI), darkMetal)
  swivel.position.set(0, 0.4, 0)
  topDriveGroup.add(swivel)

  // 顶驱旋转主轴 (Quill)
  topDriveQuill = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.2, 16), silverChrome)
  topDriveQuill.position.set(0, -4.5, 0)
  topDriveGroup.add(topDriveQuill)

  // 提引吊环 (Links & Elevator)
  for (const ls of [-1.5, 1.5]) {
    const linkArm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.5, 8), darkMetal)
    linkArm.position.set(ls, -4.0, 0)
    topDriveGroup.add(linkArm)
  }
  const elevator = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 1.8), yellowSafety)
  elevator.position.set(0, -6.2, 0)
  topDriveGroup.add(elevator)

  // 顶驱防扭防晃导向滑车 (Top Drive Torque Guide Dolly & Rollers)
  const dollyBeam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 0.8), darkMetal)
  dollyBeam.position.set(0, -1.9, -2.5)
  topDriveGroup.add(dollyBeam)

  for (const rs of [-1.2, 1.2]) {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 12), yellowSafety)
    roller.rotation.x = Math.PI / 2
    roller.position.set(rs, -1.9, -2.5)
    topDriveGroup.add(roller)
  }

  // 游车滑轮上方的游动多股大绳 (Traveling Block Reeved Drilling Lines - 连通天车滑轮)
  for (const sx of [-1.0, 1.0]) {
    for (const sz of [-0.6, 0.6]) {
      const lineMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 32, 6), silverChrome)
      lineMesh.position.set(sx, 16 + 2.4, sz)
      travelingBlock.add(lineMesh)
    }
  }

  travelingBlock.add(topDriveGroup)
  rigGroup.add(travelingBlock)

  // 钻柱与钻头
  drillString = new THREE.Group()
  drillString.position.y = floorH
  const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 65, 16), silverChrome)
  pipeMesh.position.y = -65 / 2 + 5
  drillString.add(pipeMesh)

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
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dist, 8), mat)
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
  strut.position.copy(mid)
  strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize())
  parent.add(strut)
}

function createCornerLeg(parent: THREE.Group, p1: THREE.Vector3, p2: THREE.Vector3, mat: THREE.Material) {
  const dist = p1.distanceTo(p2)
  const leg = new THREE.Mesh(new THREE.BoxGeometry(1.35, dist, 1.35), mat)
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
  leg.position.copy(mid)
  leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize())
  parent.add(leg)
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

  // 2. 贯穿 5 座立罐顶部的联动巡检走道桥与安全护栏 (Gangway Walkway)
  const walkwayW = tankCount * spacing + 1.2
  const walkwayFloor = new THREE.Mesh(new THREE.BoxGeometry(walkwayW, 0.18, 1.4), baseMat)
  walkwayFloor.position.set(0, 0.7 + tankH + 0.1, 0)
  tanksGroup.add(walkwayFloor)

  for (const rz of [-0.7, 0.7]) {
    const wRail = new THREE.Mesh(new THREE.BoxGeometry(walkwayW, 1.2, 0.08), yellowSafety)
    wRail.position.set(0, 0.7 + tankH + 0.7, rz)
    tanksGroup.add(wRail)
  }

  // 3. 罐间相互联通的高压泥浆汇流大管与气平衡管
  const mudPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, walkwayW, 16), chromeMat)
  mudPipe.rotation.z = Math.PI / 2
  mudPipe.position.set(0, 2.2, 0)
  tanksGroup.add(mudPipe)

  const gasPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, walkwayW, 16), chromeMat)
  gasPipe.rotation.z = Math.PI / 2
  gasPipe.position.set(0, 0.7 + tankH - 0.5, 0)
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
    color: 0xf8fafc, // 洁白彩钢防晒岩棉板
    metalness: 0.25,
    roughness: 0.45,
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
  // 位于井场西侧平整碎石场地: X = -64, Z = 0
  const westPad = new THREE.Mesh(new THREE.BoxGeometry(32, 0.3, 62), padGravel)
  westPad.position.set(-64, 0.15, 0)
  campGroup.add(westPad)

  const westRows = [-71, -57]
  const westZs = [-21, -7, 7, 21]
  westRows.forEach((rx) => {
    westZs.forEach((rz) => {
      const c = createCabin()
      c.position.set(rx, 0.3, rz)
      c.rotation.y = rx === -71 ? Math.PI : 0 // 门窗朝向中间营区主道
      campGroup.add(c)
    })
  })

  // 2. 东翼地质录井与综合指挥营区 (Mud-Logging & Command Center)
  // 位于井场东侧平整碎石场地: X = 46, Z = 0
  const eastPad = new THREE.Mesh(new THREE.BoxGeometry(32, 0.3, 62), padGravel)
  eastPad.position.set(46, 0.15, 0)
  campGroup.add(eastPad)

  const eastRows = [39, 53]
  const eastZs = [-21, -7, 7, 21]
  eastRows.forEach((rx) => {
    eastZs.forEach((rz) => {
      const isChief = rx === 39 && rz === 7
      const c = createCabin(isChief)
      c.position.set(rx, 0.3, rz)
      c.rotation.y = rx === 39 ? 0 : Math.PI // 门窗朝向中间内道
      campGroup.add(c)
    })
  })

  // 3. 营区照明路灯 (Street Lamps)
  for (const lz of [-18, 0, 18]) {
    for (const lx of [-64, 46]) {
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
    }
  }

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

    const colSpan = 22.0
    const colH = 9.8
    const boardW = 25.0
    const boardH = 3.6
    const boardDepth = 0.45

    // 左右两根白色重型无缝钢管承重立柱
    for (const sx of [-colSpan / 2, colSpan / 2]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, colH, 18), whiteSteel)
      col.position.set(sx, colH / 2, 0)
      bb.add(col)

      // 立柱根部重型混凝土黄黑警示护墩
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 1.4, 16), bollardYellow)
      plinth.position.set(sx, 0.7, 0)
      bb.add(plinth)
    }

    // 后部白色空间双层刚架横桁梁 (Space Truss Support: 前后两道横梁 + X型斜撑)
    for (const by of [colH - boardH / 2, colH + boardH / 2]) {
      const beamFront = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.8, 0.38, 0.38), whiteSteel)
      beamFront.position.set(0, by, -0.3)
      bb.add(beamFront)

      const beamBack = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.8, 0.38, 0.38), whiteSteel)
      beamBack.position.set(0, by, -1.35)
      bb.add(beamBack)
    }

    // 刚架 X 型受力斜撑
    for (let x = -colSpan / 2; x < colSpan / 2; x += 3.5) {
      createStrut(bb, new THREE.Vector3(x, colH - boardH / 2, -0.8), new THREE.Vector3(x + 3.5, colH + boardH / 2, -0.8), whiteSteel)
      createStrut(bb, new THREE.Vector3(x + 3.5, colH - boardH / 2, -0.8), new THREE.Vector3(x, colH + boardH / 2, -0.8), whiteSteel)
    }

    // 彻底根除闪烁的核心关键：采用一体化多材质 BoxGeometry！
    // 0: 右侧, 1: 左侧, 2: 顶面, 3: 底面, 4: 正面 (贴标语贴图), 5: 背面
    const boxMaterials = [
      darkSteel, // +X
      darkSteel, // -X
      darkSteel, // +Y
      darkSteel, // -Y
      sloganMat, // +Z (正面大红标语，绝对无任何共面第二层，永不闪烁！)
      darkSteel, // -Z
    ]
    const mainBoardGeo = new THREE.BoxGeometry(boardW, boardH, boardDepth)
    const mainBoardMesh = new THREE.Mesh(mainBoardGeo, boxMaterials)
    mainBoardMesh.position.set(0, colH, 0)
    bb.add(mainBoardMesh)

    // 顶部防雨挑檐雨棚与下照式照明射灯支架 (Protective Canopy with Downward Floodlights)
    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.8, 0.18, 1.2), darkSteel)
    canopyRoof.position.set(0, colH + boardH / 2 + 0.1, 0.35)
    bb.add(canopyRoof)

    // 4 组挑檐下照式 LED 射灯
    for (let fx = -boardW * 0.38; fx <= boardW * 0.38; fx += boardW * 0.25) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), darkSteel)
      arm.position.set(fx, colH + boardH / 2 + 0.2, 0.8)
      bb.add(arm)

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.4), darkSteel)
      lampHead.position.set(fx, colH + boardH / 2 + 0.05, 1.1)
      lampHead.rotation.x = 0.45 // 角度朝向标语牌正面照射
      bb.add(lampHead)

      const spotLens = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.25), new THREE.MeshBasicMaterial({ color: 0xfffaed }))
      spotLens.position.set(fx, colH + boardH / 2, 1.12)
      spotLens.rotation.x = 0.45
      bb.add(spotLens)
    }

    // 地面仰角强光投光射灯 (Ground Upward Floodlights) - 修复原 lens.add 循环错误
    for (let fx = -boardW * 0.38; fx <= boardW * 0.38; fx += boardW * 0.25) {
      const lampHousing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), darkSteel)
      lampHousing.position.set(fx, 0.35, 2.5)
      lampHousing.rotation.x = -Math.PI / 5
      bb.add(lampHousing)

      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), new THREE.MeshBasicMaterial({ color: 0xfffaed }))
      lens.position.set(fx, 0.45, 2.3)
      lens.rotation.x = -Math.PI / 5
      bb.add(lens) // 正确添加至 bb 容器
    }

    return bb
  }

  // 左牌楼：面向主干道入场大道西侧 (微向内倾，开阔大气、不遮挡钻井与猫道)
  const b1 = createBillboardRig(mat1, 0.12, new THREE.Vector3(-46, 0.2, 78))
  sloganGroup.add(b1)

  // 右牌楼：对称矗立于大道东侧 (微向内倾，与左牌楼形成庄重迎宾大门)
  const b2 = createBillboardRig(mat2, -0.12, new THREE.Vector3(20, 0.2, 80))
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

  // 泥浆高压排出主管路与剪切安全阀
  const dischargeManifold = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 8.0, 12), heavyMetal)
  dischargeManifold.position.set(3.5, 4.6, 0)
  pumpSkid.add(dischargeManifold)
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
  shakerGroup.position.set(11, 0, 4)

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

  // 前端岩屑排渣溜槽 (Sand Discharge Chute with Stiffened Lip)
  const chute = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 3.2), heavyMetal)
  chute.rotation.x = -Math.PI / 3.8
  chute.position.set(0, 2.1, 3.8)
  shakerGroup.add(chute)
  mudGroup.add(shakerGroup)

  // 4. 水力除砂与除泥旋流器机组 (Engineering Hydrocyclones with Tangential Inlets & Overflow Elbows)
  // 彻底告别简单圆锥：包含切向进料管、渐缩旋流锥、底流排砂咀与顶部弯管集管
  const cycloneSkid = new THREE.Group()
  cycloneSkid.position.set(11, 0, 11)

  // 支撑立柱与横担
  for (const cx of [-3.2, 3.2]) {
    const cCol = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8.5, 8), darkSteel)
    cCol.position.set(cx, 4.25, 0)
    cycloneSkid.add(cCol)
  }

  // 下层进料汇管与上层溢流汇管 (Inlet & Overflow Manifolds)
  const inletHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 7.8, 14), heavyMetal)
  inletHeader.rotation.z = Math.PI / 2
  inletHeader.position.set(0, 7.2, -0.6)
  cycloneSkid.add(inletHeader)

  const overflowHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 8.0, 14), heavyMetal)
  overflowHeader.rotation.z = Math.PI / 2
  overflowHeader.position.set(0, 8.8, 0)
  cycloneSkid.add(overflowHeader)

  // 4 组大锥度除砂旋流器与 6 组小锥度除泥旋流器
  for (let c = -2.6; c <= 2.6; c += 1.3) {
    const cycUnit = new THREE.Group()
    cycUnit.position.set(c, 7.2, 0)

    // A. 顶部切向进料圆柱腔 (Cylindrical Feed Chamber)
    const feedChamber = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 14), safetyYellow)
    feedChamber.position.y = 0
    cycUnit.add(feedChamber)

    // 切向进料短节与法兰
    const feedPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 8), heavyMetal)
    feedPipe.rotation.x = Math.PI / 2
    feedPipe.position.set(0.35, 0, -0.35)
    cycUnit.add(feedPipe)

    // B. 中下部聚氨酯渐缩旋流锥 (Polyurethane Cone Section)
    const coneBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.18, 2.2, 14), safetyYellow)
    coneBody.position.y = -1.55
    cycUnit.add(coneBody)

    // C. 底部可调排砂底流咀 (Apex Underflow Drop Nozzle)
    const apexNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.6, 12), darkSteel)
    apexNozzle.position.y = -2.95
    cycUnit.add(apexNozzle)

    // D. 顶部溢流导向弯管 (Vortex Finder 90° Overflow Elbow)
    const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.15, 6, 12, Math.PI / 2), silverChrome)
    elbow.position.set(0, 0.8, 0)
    elbow.rotation.z = Math.PI / 2
    cycUnit.add(elbow)

    cycloneSkid.add(cycUnit)
  }

  // 旋流进料高压充油抗震泥浆压力表
  const cGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.18, 16), silverChrome)
  cGauge.rotation.x = Math.PI / 2
  cGauge.position.set(4.1, 7.2, -0.6)
  cycloneSkid.add(cGauge)

  const cDial = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }))
  cDial.position.set(4.1, 7.2, -0.5)
  cycloneSkid.add(cDial)
  mudGroup.add(cycloneSkid)

  // 5. 负压真空除气器机组 (Vacuum Degasser with Vent Stack & Discharge Valve)
  const degasserGroup = new THREE.Group()
  degasserGroup.position.set(11, 0, -5)

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
  powerGroup.position.set(12, 0.2, 35)

  const genBox = new THREE.Mesh(new THREE.BoxGeometry(14, 5.5, 8), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 }))
  genBox.position.y = 2.75
  powerGroup.add(genBox)

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 4, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }))
  exhaust.position.set(4, 7, 0)
  powerGroup.add(exhaust)

  const koomeyBox = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 6), new THREE.MeshStandardMaterial({ color: 0x0284c7 }))
  koomeyBox.position.set(-14, 1.75, 0)
  powerGroup.add(koomeyBox)

  for (let b = 0; b < 4; b++) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.6, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }))
    bottle.position.set(-16.5 + b * 1.5, 4.2, 0)
    powerGroup.add(bottle)
  }

  scene.add(powerGroup)
}

// -------------------------------------------------------------
// 11. 特种工程车组 (带液压外伸支腿起重机、压裂车、测井车与巡检皮卡)
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

  // 1. 重型越野起重机吊车 (Heavy Mobile Crane with 3-Stage Telescopic Boom & Double Sheave Block)
  const craneGroup = new THREE.Group()
  craneGroup.position.set(-44, 0.2, 38) // 位于西排管堆场外侧设备通道，起吊姿态开阔无遮挡
  craneGroup.rotation.y = Math.PI / 4.2

  // 车架重型箱形工字大梁底盘与保险杠
  const craneChassis = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.2, 19), truckYellow)
  craneChassis.position.y = 2.1
  craneGroup.add(craneChassis)

  // 车头重型防撞钢制保险杠 (Front Steel Bumper with Hazard Striping)
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.2, 1.0), steelDark)
  bumper.position.set(0, 1.6, 9.8)
  craneGroup.add(bumper)

  // 4 只真实的 H 型液压外伸支腿与万向摆动承重垫板 (Hydraulic Outriggers & Swivel Pads)
  for (const ox of [-5.6, 5.6]) {
    for (const oz of [-6.5, 6.5]) {
      // 横向伸出液压方箱梁
      const hBeam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 1.1), steelDark)
      hBeam.position.set(ox > 0 ? 4.5 : -4.5, 1.8, oz)
      craneGroup.add(hBeam)

      // 垂直下顶镀铬双作用液压油缸
      const vJack = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.0, 12), chromeMat)
      vJack.position.set(ox, 1.0, oz)
      craneGroup.add(vJack)

      // 铰接万向重载接地钢垫板 (Swivel Ground Pad)
      const padPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.25, 16), steelDark)
      padPlate.position.set(ox, 0.12, oz)
      craneGroup.add(padPlate)
    }
  }

  // 4 轴 8 只重型越野承载大轮胎
  for (let wx = -4.3; wx <= 4.3; wx += 8.6) {
    for (let wz = -6.5; wz <= 6.5; wz += 4.3) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.4, 16), darkTire)
      tire.rotation.z = Math.PI / 2
      tire.position.set(wx, 1.7, wz)
      craneGroup.add(tire)

      // 轮毂法兰与螺栓
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.45, 12), steelDark)
      hub.rotation.z = Math.PI / 2
      hub.position.set(wx, 1.7, wz)
      craneGroup.add(hub)
    }
  }

  // 360° 回转转台与尾部平衡配重块 (Slewing Turret with Counterweight Blocks)
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 1.6, 18), steelDark)
  turret.position.set(0, 3.9, -1.0)
  craneGroup.add(turret)

  // 尾部可拆卸铸铁平衡重 (Counterweight Slabs)
  const counterweight = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.2, 3.0), steelDark)
  counterweight.position.set(0, 5.2, -4.5)
  craneGroup.add(counterweight)

  // 起重司机操纵舱 (Operator Cab with Panoramic Curved Glass)
  const opCab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.0, 4.2), truckYellow)
  opCab.position.set(-2.6, 5.1, 0.5)
  craneGroup.add(opCab)

  const opGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.2), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 }))
  opGlass.position.set(-2.6, 5.4, 2.65)
  craneGroup.add(opGlass)

  // 吊臂根部双镀铬变幅液压油缸 (Twin Luffing Cylinders with Pivot Brackets)
  for (const lx of [-1.1, 1.1]) {
    const luffingCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 8.8, 12), chromeMat)
    luffingCyl.position.set(lx, 6.2, 0.8)
    luffingCyl.rotation.x = -Math.PI / 4.4
    craneGroup.add(luffingCyl)
  }

  // 三节嵌套式重型箱型伸缩主吊臂 (Three-Stage Telescopic Boom)
  const boomGroup = new THREE.Group()
  boomGroup.position.set(0, 5.6, -1.5)
  boomGroup.rotation.x = -Math.PI / 4.4

  // A. 基臂 (Base Section: 最粗最强)
  const baseBoom = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.3, 16), truckYellow)
  baseBoom.position.set(0, 0, 8.0)
  boomGroup.add(baseBoom)

  // 伸缩油缸引出孔与加强箍 (Wear Collar Guides)
  const collar1 = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.55, 0.8), steelDark)
  collar1.position.set(0, 0, 15.6)
  boomGroup.add(collar1)

  // B. 二节伸缩臂 (Mid Telescopic Section)
  const midBoom = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.85, 16), truckYellow)
  midBoom.position.set(0, 0, 15.0)
  boomGroup.add(midBoom)

  const collar2 = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.05, 0.7), steelDark)
  collar2.position.set(0, 0, 22.6)
  boomGroup.add(collar2)

  // C. 顶节臂 (Fly Section)
  const topBoom = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.45, 16), truckYellow)
  topBoom.position.set(0, 0, 22.0)
  boomGroup.add(topBoom)

  // 臂头双联铸钢起重天轮滑轮组 (Boom Nose Sheaves)
  for (const bx of [-0.45, 0.45]) {
    const headSheave = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.22, 16), steelDark)
    headSheave.rotation.z = Math.PI / 2
    headSheave.position.set(bx, 0, 30.2)
    boomGroup.add(headSheave)
  }

  // 防过卷安全限位开关重锤 (Anti-Two-Block Limit Switch Weight)
  const a2bWeight = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8), valveRed)
  a2bWeight.position.set(0, -1.2, 29.5)
  boomGroup.add(a2bWeight)

  craneGroup.add(boomGroup)

  // 双股垂直起吊钢丝绳 (Twin Hoist Wire Ropes)
  for (const rx of [-0.35, 0.35]) {
    const wireRope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 12, 6), chromeMat)
    wireRope.position.set(rx, 14.5, 17.5)
    craneGroup.add(wireRope)
  }

  // 重型铸钢吊钩滑轮组 (Heavy Crane Hook Block with Swivel Hook)
  const hookBlock = new THREE.Group()
  hookBlock.position.set(0, 8.5, 17.5)

  const blockBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 1.4), truckYellow)
  hookBlock.add(blockBody)

  const hookPin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 12), steelDark)
  hookPin.position.y = -1.2
  hookBlock.add(hookPin)

  const heavyHook = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.3, 8, 16, Math.PI * 1.4), steelDark)
  heavyHook.position.set(0, -2.4, 0)
  heavyHook.rotation.y = Math.PI / 2
  hookBlock.add(heavyHook)

  craneGroup.add(hookBlock)
  fleetGroup.add(craneGroup)

  // 2. 固井注水泥双泵混浆车 (Dual-Pump Cementing Truck with Swivel Manifold)
  const cTruck = new THREE.Group()
  cTruck.position.set(-42, 0.2, -28)
  cTruck.rotation.y = Math.PI / 4

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 18), steelDark)
  chassis.position.y = 1.6
  cTruck.add(chassis)

  // 6 只重型越野承载轮胎
  for (let wx = -3.7; wx <= 3.7; wx += 7.4) {
    for (let wz = -6.0; wz <= 6.0; wz += 4.5) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.1, 14), darkTire)
      tire.rotation.z = Math.PI / 2
      tire.position.set(wx, 1.4, wz)
      cTruck.add(tire)
    }
  }

  // 驾驶室与风挡玻璃
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.0, 5.0), truckYellow)
  cabin.position.set(0, 4.2, 6.2)
  cTruck.add(cabin)

  const cGlass = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 }))
  cGlass.position.set(0, 4.8, 8.75)
  cTruck.add(cGlass)

  // 固井双混浆泵机组与液压动力单元
  const cementPump = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.4, 7.5), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 }))
  cementPump.position.set(0, 3.8, -1.8)
  cTruck.add(cementPump)

  // 双干水泥漏斗料仓与气力输送管 (Cement Mixing Silo Hoppers - 彻底消除尖锐圆锥体！)
  for (const hx of [-1.8, 1.8]) {
    const siloGroup = new THREE.Group()
    siloGroup.position.set(hx, 5.2, -2.5)

    // 上部圆柱形储料受压仓身 (Cylindrical Storage Body)
    const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.4, 16), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85 }))
    siloBody.position.y = 1.3
    siloGroup.add(siloBody)

    // 下部缓倾角出灰斗 (Lower Tapered Funnel)
    const siloFunnel = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.45, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.88 }))
    siloFunnel.position.y = 0.0
    siloGroup.add(siloFunnel)

    // 仓底粉料下料蝶阀与气力流化喷嘴
    const sValve = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12), steelDark)
    sValve.position.y = -0.7
    siloGroup.add(sValve)

    cTruck.add(siloGroup)
  }

  // 尾部高压注排水泥管汇与活动弯头 (Chicksan Swivel Manifold)
  const cManifold = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 6.2, 8), chromeMat)
  cManifold.rotation.z = Math.PI / 2
  cManifold.position.set(0, 2.8, -7.5)
  cTruck.add(cManifold)

  for (const mx of [-2.4, 2.4]) {
    const valve = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), valveRed)
    valve.position.set(mx, 2.8, -7.5)
    cTruck.add(valve)

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.2), safetyYellow)
    handle.position.set(mx, 3.4, -7.5)
    cTruck.add(handle)
  }
  fleetGroup.add(cTruck)

  // 3. 测井电缆电测车 (Wireline Logging Winch Truck with Level-Wind Guide)
  const lTruck = new THREE.Group()
  lTruck.position.set(18, 0.2, -32)
  lTruck.rotation.y = -Math.PI / 3

  const lChassis = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 16), steelDark)
  lChassis.position.y = 1.6
  lTruck.add(lChassis)

  // 6 只越野轮胎
  for (let wx = -3.5; wx <= 3.5; wx += 7.0) {
    for (let wz = -5.0; wz <= 5.0; wz += 4.2) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.0, 14), darkTire)
      tire.rotation.z = Math.PI / 2
      tire.position.set(wx, 1.3, wz)
      lTruck.add(tire)
    }
  }

  // 仪表测井工作舱
  const lCabin = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.8, 4.5), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 }))
  lCabin.position.set(0, 4.1, 5.5)
  lTruck.add(lCabin)

  const lGlass = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1 }))
  lGlass.position.set(0, 4.6, 7.8)
  lTruck.add(lGlass)

  // 液压绞车大滚筒与钢制挡板 (Hydraulic Cable Drum with Side Flanges)
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 4.2, 16), chromeMat)
  drum.rotation.z = Math.PI / 2
  drum.position.set(0, 4.2, -1.8)
  lTruck.add(drum)

  for (const ds of [-2.3, 2.3]) {
    const dFlange = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.25, 16), steelDark)
    dFlange.rotation.z = Math.PI / 2
    dFlange.position.set(ds, 4.2, -1.8)
    lTruck.add(dFlange)
  }

  // 滚筒顶部排绳丝杠导轮 (Level-Wind Guide Bar & Carriage)
  const guideBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 8), chromeMat)
  guideBar.rotation.z = Math.PI / 2
  guideBar.position.set(0, 6.2, -1.8)
  lTruck.add(guideBar)

  const guideCarriage = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), safetyYellow)
  guideCarriage.position.set(0.6, 6.2, -1.8)
  lTruck.add(guideCarriage)

  // 测井天滑轮支架 (Sheave Wheel Mast)
  const sheaveMast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 8), truckYellow)
  sheaveMast.position.set(0, 6.2, -5.2)
  sheaveMast.rotation.x = -0.3
  lTruck.add(sheaveMast)

  const sheave = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.18, 8, 16), chromeMat)
  sheave.position.set(0, 7.8, -5.8)
  lTruck.add(sheave)
  fleetGroup.add(lTruck)

  // 4. 换钻头检修台
  const bitBench = new THREE.Group()
  bitBench.position.set(-24, 2.75, 20)

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

  // 5. 野外勘探巡检越野皮卡 (Field Inspection Pickup Truck)
  const pickup = new THREE.Group()
  pickup.position.set(-68, 0.15, 42)
  pickup.rotation.y = -Math.PI / 3.2

  const pBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 7.8), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }))
  pBody.position.y = 1.4
  pickup.add(pBody)

  const pCabin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 3.8), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 }))
  pCabin.position.set(0, 2.8, -0.6)
  pickup.add(pCabin)

  for (let px = -1.9; px <= 1.9; px += 3.8) {
    for (let pz = -2.2; pz <= 2.2; pz += 4.4) {
      const ptire = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 12), darkTire)
      ptire.rotation.z = Math.PI / 2
      ptire.position.set(px, 0.85, pz)
      pickup.add(ptire)
    }
  }

  const pMast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6), new THREE.MeshBasicMaterial({ color: 0xf59e0b }))
  pMast.position.set(1.4, 4.0, 3.2)
  pickup.add(pMast)
  fleetGroup.add(pickup)

  // 6. 沙漠超重型多轴压裂混砂车 (Fracturing Truck)
  const fracTruck = new THREE.Group()
  fracTruck.position.set(-65, 0.15, -15)
  fracTruck.rotation.y = Math.PI / 5

  const fracChassis = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.4, 20), darkTire)
  fracChassis.position.y = 1.5
  fracTruck.add(fracChassis)

  const fracCab = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.8, 5), new THREE.MeshStandardMaterial({ color: 0xef4444 }))
  fracCab.position.set(0, 3.8, 7.5)
  fracTruck.add(fracCab)

  for (let tc = -1.6; tc <= 1.6; tc += 3.2) {
    const fTank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 12, 16), chromeMat)
    fTank.rotation.x = Math.PI / 2
    fTank.position.set(tc, 3.6, -2)
    fracTruck.add(fTank)
  }
  fleetGroup.add(fracTruck)

  scene.add(fleetGroup)
}

// -------------------------------------------------------------
// 12. 游梁式抽油机 (立体四柱空间桁架与四连杆真实机械传动)
// -------------------------------------------------------------
function buildPumpingUnit() {
  if (!scene) return
  const pumpGroup = new THREE.Group()
  pumpGroup.position.set(34, 0.2, 10) // 移动到井场右前方黄金构图位，视觉更聚焦、避免分散
  pumpGroup.rotation.y = -Math.PI / 3.6

  const industrialBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.78, roughness: 0.32 })
  const heavySteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.28 })
  const hazardYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.65, roughness: 0.35 })
  const chromeRod = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.96, roughness: 0.08 })
  const castIron = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.92, roughness: 0.22 })
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 })
  const valveRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.7, roughness: 0.3 })

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
  pumpGroup.add(skidGroup)

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

  pumpGroup.add(samsonPostGroup)

  // 3. 重型箱形加强游梁总成 (Heavy Box-Girder Walking Beam Assembly)
  walkingBeam = new THREE.Group()
  walkingBeam.position.set(0, postH + 0.6, 0)

  // 箱形主梁上翼板 (带有吊装耳板与防雨倒角)
  const topFlange = new THREE.Mesh(new THREE.BoxGeometry(32, 0.45, 2.6), industrialBlue)
  topFlange.position.set(0.5, 1.35, 0)
  walkingBeam.add(topFlange)

  // 游梁吊装重型耳板 (Lifting Lugs)
  for (const lx of [-4.5, 6.5]) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.25), heavySteel)
    lug.position.set(lx, 1.9, 0)
    walkingBeam.add(lug)

    const lugHole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), chromeRod)
    lugHole.rotation.x = Math.PI / 2
    lugHole.position.set(lx, 1.9, 0)
    walkingBeam.add(lugHole)
  }

  // 箱形主梁下翼板
  const btmFlange = new THREE.Mesh(new THREE.BoxGeometry(32, 0.45, 2.6), industrialBlue)
  btmFlange.position.set(0.5, -1.35, 0)
  walkingBeam.add(btmFlange)

  // 双侧垂直主腹板 (形成密闭高抗扭箱梁)
  for (const bz of [-1.15, 1.15]) {
    const webPlate = new THREE.Mesh(new THREE.BoxGeometry(32, 2.3, 0.3), industrialBlue)
    webPlate.position.set(0.5, 0, bz)
    walkingBeam.add(webPlate)

    // 腹板外侧横向与垂直加强筋条带 (Stiffener Ribs with Bolt Arrays)
    for (let rx = -12; rx <= 13; rx += 3.4) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.4), industrialBlue)
      rib.position.set(rx, 0, bz + (bz > 0 ? 0.25 : -0.25))
      walkingBeam.add(rib)

      // 六角螺栓紧固节点
      for (const by of [-0.6, 0.6]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), chromeRod)
        bolt.rotation.x = Math.PI / 2
        bolt.position.set(rx, by, bz + (bz > 0 ? 0.35 : -0.35))
        walkingBeam.add(bolt)
      }
    }
  }

  // 中央分体对开式重型鞍子轴承箱 (Split Pillow Block Saddle Housing)
  const clampBase = new THREE.Group()
  clampBase.position.set(0, 0, 0)

  const housingLower = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.8, 3.8), castIron)
  housingLower.position.y = -0.8
  clampBase.add(housingLower)

  const housingCap = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.6, 3.8), castIron)
  housingCap.position.y = 0.8
  clampBase.add(housingCap)

  // 4 根垂直大双头锁紧螺栓
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

  // 鞍子轴承顶部高压黄铜注油杯 (Brass Grease Lubricator)
  const greaseCup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 12), hazardYellow)
  greaseCup.position.set(0, 1.85, 0)
  clampBase.add(greaseCup)

  walkingBeam.add(clampBase)

  // 4. 前端弧面导轨驴头 (Heavy Horsehead with Truss & Grease Zerk)
  const horsehead = new THREE.Group()
  horsehead.position.set(15.2, -1.2, 0)

  // 双层外弧形精密钢丝绳导向轮缘槽 (Dual Curved Arc Tracks with Grooves)
  for (const hz of [-0.95, 0.95]) {
    const arcMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(7.5, 7.5, 0.45, 32, 1, false, 0, Math.PI / 2.2),
      hazardYellow
    )
    arcMesh.rotation.z = Math.PI / 1.15
    arcMesh.position.set(-0.6, -1.2, hz)
    horsehead.add(arcMesh)

    // 导轨边缘绳槽挡铁 (Retaining Flanges)
    const arcRim = new THREE.Mesh(
      new THREE.CylinderGeometry(7.65, 7.65, 0.12, 32, 1, false, 0, Math.PI / 2.2),
      heavySteel
    )
    arcRim.rotation.z = Math.PI / 1.15
    arcRim.position.set(-0.6, -1.2, hz + (hz > 0 ? 0.22 : -0.22))
    horsehead.add(arcRim)
  }

  // 驴头重载焊接仿生弧线型腹板 (Organic Curved Horsehead Web with Lightening Holes)
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

  // 驴头斜撑后桁架 (Rear Angled Truss Brace)
  const trussBrace = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.8, 1.8), industrialBlue)
  trussBrace.rotation.z = 0.55
  trussBrace.position.set(-1.8, -1.8, 0)
  horsehead.add(trussBrace)

  // 弧顶毛辫子固定卡压板与销轴 (Bridle Anchor Clamp & Grease Zerk)
  const bridleClamp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 2.8), castIron)
  bridleClamp.position.set(2.8, 2.8, 0)
  horsehead.add(bridleClamp)

  // 高压黄油注脂咀 (Grease Zerk)
  const zerk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8), chromeRod)
  zerk.position.set(2.8, 3.3, 0)
  horsehead.add(zerk)

  walkingBeam.add(horsehead)

  // 5. 游梁尾端尾轴承箱与横梁销轴 (Equalizer Beam & Tail Bearing)
  const tailBearingBox = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.4, 3.0), castIron)
  tailBearingBox.position.set(-12.5, 0, 0)
  walkingBeam.add(tailBearingBox)

  // 等梁横轴 (Equalizer Cross Shaft with Retaining Collars)
  const tailPin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 10.2, 16), chromeRod)
  tailPin.rotation.x = Math.PI / 2
  tailPin.position.set(-12.5, 0, 0)
  walkingBeam.add(tailPin)

  // 横轴两端轴用弹性挡圈与端盖
  for (const es of [-5.0, 5.0]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.4, 12), castIron)
    cap.rotation.x = Math.PI / 2
    cap.position.set(-12.5, 0, es)
    walkingBeam.add(cap)
  }

  pumpGroup.add(walkingBeam)

  // 6. 左右重型推拉连杆 (Left & Right Pitman Arms with Spherical Bearings)
  const nominalLen = 15.59
  function createPitmanArm() {
    const armGroup = new THREE.Group()
    // 连杆主杆身 (带加厚外圈防屈曲加强管)
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, nominalLen, 16), industrialBlue)
    armGroup.add(tube)

    // 杆身中部加粗加强套套筒
    const midSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 4.5, 16), heavySteel)
    armGroup.add(midSleeve)

    // 顶端铰接耳环 (Upper Wrist Pin Eye)
    const topLug = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.35, 10, 16), castIron)
    topLug.rotation.x = Math.PI / 2
    topLug.position.y = nominalLen / 2
    armGroup.add(topLug)

    // 底端曲柄销对开式瓦盒轴承箱 (Lower Crankpin Bearing Box)
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

  pitmanArmLeft = createPitmanArm()
  pitmanArmLeft.position.set(-11.0, 15.0, -4.2)
  pumpGroup.add(pitmanArmLeft)

  pitmanArmRight = createPitmanArm()
  pitmanArmRight.position.set(-11.0, 15.0, 4.2)
  pumpGroup.add(pitmanArmRight)

  // 7. 重型双级人字齿轮减速器与机械抱闸制动器 (Gearbox & Mechanical Brake System)
  const gearBox = new THREE.Group()
  gearBox.position.set(-9.5, 4.2, 0)

  // A. 下箱体铸造座 (Lower Housing with Mounting Flanges & Stiffeners)
  const lowerHousing = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.4, 6.4), castIron)
  lowerHousing.position.y = -1.6
  gearBox.add(lowerHousing)

  // 底部地脚安装槽钢悬伸支座与地脚螺栓
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

  // B. 上箱盖拱顶壳体 (Upper Cover with Cambered Arch & Split Parting Flange)
  const upperCover = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 6.4, 20, 1, false, 0, Math.PI), castIron)
  upperCover.rotation.z = Math.PI / 2
  upperCover.position.set(0, 0.1, 0)
  gearBox.add(upperCover)

  // 箱体中分面水平结合法兰带与对开连接螺栓群 (Parting Line Bolted Flanges)
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

  // C. 低速曲柄轴与高速输入轴重型轴承压盖 (Bearing Retainer Flanges)
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

  // 减速箱外壳铸造人字斜交受力加强筋
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

  // 减速箱侧面透明油位视镜 (Oil Level Sight Glass)
  const sightGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff }))
  sightGlass.rotation.x = Math.PI / 2
  sightGlass.position.set(2.0, -1.2, 3.25)
  gearBox.add(sightGlass)

  // 顶部防尘透气滤清呼吸帽 (Breather Filter)
  const breather = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.4, 12), chromeRod)
  breather.position.set(1.5, 3.8, 0)
  gearBox.add(breather)

  const hatch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.6), heavySteel)
  hatch.position.set(-1.0, 3.3, 0)
  gearBox.add(hatch)

  // 重型低速输出轴 (Low Speed Crankshaft)
  const outShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 9.2, 20), chromeRod)
  outShaft.rotation.x = Math.PI / 2
  outShaft.position.y = 3.3
  gearBox.add(outShaft)

  // 减速器高速输入轴机械制动鼓 (Brake Drum)
  const brakeDrum = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.9, 20), castIron)
  brakeDrum.rotation.z = Math.PI / 2
  brakeDrum.position.set(-3.5, 0.8, -2.4)
  gearBox.add(brakeDrum)

  pumpGroup.add(gearBox)

  // 8. 旋转曲柄、调冲程销孔与平衡重丝杠微调机构 (Cranks with Stroke Adjustment & Lead Screws)
  crankGroup = new THREE.Group()
  crankGroup.position.set(-9.5, 7.5, 0)

  for (const side of [-4.2, 4.2]) {
    const singleCrank = new THREE.Group()
    singleCrank.position.z = side

    // 重型合金钢曲柄臂 (Crank Arm with 4 Stroke Adjustment Holes)
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11.2, 1.1), heavySteel)
    armMesh.position.y = 2.6
    singleCrank.add(armMesh)

    // 4个精密调冲程销孔 (Stroke Holes 1, 2, 3, 4)
    for (let h = 0.8; h <= 5.2; h += 1.4) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.3, 12), castIron)
      hole.rotation.x = Math.PI / 2
      hole.position.y = h
      singleCrank.add(hole)

      // 销孔倒角法兰圈
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 6, 12), chromeRod)
      ring.position.set(0, h, side > 0 ? 0.6 : -0.6)
      singleCrank.add(ring)
    }

    // 梯形精密微调调节丝杠 (Lead Screw) - 贯穿曲柄与平衡重
    const leadScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 8.5, 12), chromeRod)
    leadScrew.position.set(0, 4.2, side > 0 ? 1.6 : -1.6)
    singleCrank.add(leadScrew)

    // 丝杠手摇转盘手轮 (Adjustment Handwheel)
    const hWheel = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.1, 6, 16), valveRed)
    hWheel.position.set(0, 8.4, side > 0 ? 1.6 : -1.6)
    singleCrank.add(hWheel)

    // 真实 API Spec 11E 扇形曲面铸铁重载曲柄平衡重 (Crescent Sector Counterweight - 彻底告别方盒子！)
    const cweightShape = new THREE.Shape()
    const rOuter = 4.8
    const rInner = 1.3
    const aSpan = Math.PI * 0.46 // 扇形展开角约 83°
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

    // 平衡重铸铁横向加强肋条与防滑沉槽
    for (let wy = 3.6; wy <= 6.6; wy += 1.4) {
      const wRib = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 0.22), heavySteel)
      wRib.position.set(0, wy, side > 0 ? 1.75 : -1.75)
      singleCrank.add(wRib)
    }

    // 重型 U 型平衡重紧固拉杆 (U-Bolt Tie Rods)
    for (const wx of [-1.8, 1.8]) {
      const tieRod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7.2, 8), chromeRod)
      tieRod.position.set(wx, 4.6, side > 0 ? 0.7 : -0.7)
      singleCrank.add(tieRod)

      // 双螺母防松锁紧
      for (const ny of [1.1, 8.1]) {
        const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 6), heavySteel)
        nut.position.set(wx, ny, side > 0 ? 0.7 : -0.7)
        singleCrank.add(nut)
      }
    }

    // 旋转曲柄销 (Crank Pin - 与连杆下瓦盒紧密咬合)
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.8, 16), chromeRod)
    pin.rotation.x = Math.PI / 2
    pin.position.set(0, 4.2, 0)
    singleCrank.add(pin)

    crankGroup.add(singleCrank)
  }
  pumpGroup.add(crankGroup)

  // 9. 机械手动抱闸刹车操纵系统 (Manual Lever Brake Assembly)
  const brakeGroup = new THREE.Group()
  brakeGroup.position.set(-14.5, 1.25, -2.6)

  // 刹车操纵立式长手柄杆 (Brake Hand Lever)
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.2, 8), hazardYellow)
  lever.rotation.z = -0.35
  lever.position.set(0, 2.5, 0)
  brakeGroup.add(lever)

  // 刹车手柄圆球握把
  const grip = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), castIron)
  grip.position.set(-0.85, 4.8, 0)
  brakeGroup.add(grip)

  // 扇形棘轮锁止定位齿板 (Ratchet Quadrant Plate)
  const ratchet = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 0.25, 16, 1, false, 0, Math.PI / 1.5),
    heavySteel
  )
  ratchet.rotation.z = Math.PI / 3.5
  ratchet.position.set(0, 1.0, 0)
  brakeGroup.add(ratchet)

  // 连接至减速机高速轴制动鼓的钢丝绳拉索
  const brakeCable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.5, 8), cableMat)
  brakeCable.rotation.z = Math.PI / 2.2
  brakeCable.position.set(2.8, 1.5, 0)
  brakeGroup.add(brakeCable)

  pumpGroup.add(brakeGroup)

  // 10. 动力电机与皮带传动组 (Prime Mover & Belt Transmission)
  const motorGroup = new THREE.Group()
  motorGroup.position.set(-17.5, 1.25, 0)

  const rails = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 4.2), heavySteel)
  rails.position.y = 0.2
  motorGroup.add(rails)

  const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 4.5, 20), industrialBlue)
  motorBody.rotation.z = Math.PI / 2
  motorBody.position.y = 2.0
  motorGroup.add(motorBody)

  // 12 道外壳轴向铸造散热肋条 (Longitudinal Cooling Fins)
  for (let f = 0; f < 12; f++) {
    const fAng = (f * Math.PI * 2) / 12
    const fin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 0.08), heavySteel)
    fin.position.set(0, 2.0 + Math.sin(fAng) * 1.72, Math.cos(fAng) * 1.72)
    fin.rotation.x = fAng
    motorGroup.add(fin)
  }

  // 电机吊装铸钢吊环 (Lifting Eye Bolt)
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

  // 减速机高速轴铸铁皮带大飞轮 (V-Belt Driven Sheave / Pulley with Rim & Spokes)
  const sheaveGroup = new THREE.Group()
  sheaveGroup.position.set(4.6, 2.4, -2.4)
  sheaveGroup.rotation.x = Math.PI / 2

  // 铸铁外圈轮缘 (带 4 道 V 型皮带梯形轮槽)
  const sheaveRim = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.45, 24), castIron)
  sheaveGroup.add(sheaveRim)

  // 中心带键槽轮毂
  const sheaveHub = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.65, 16), heavySteel)
  sheaveGroup.add(sheaveHub)

  // 6 根重载铸造轮辐 (Spokes)
  for (let sp = 0; sp < 6; sp++) {
    const sAng = (sp * Math.PI) / 3
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 1.6), castIron)
    spoke.position.set(Math.cos(sAng) * 1.25, 0, Math.sin(sAng) * 1.25)
    spoke.rotation.y = -sAng
    sheaveGroup.add(spoke)
  }
  motorGroup.add(sheaveGroup)

  // 电机端小驱动皮带轮 (Motor Drive Pulley)
  const motorPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 16), heavySteel)
  motorPulley.rotation.x = Math.PI / 2
  motorPulley.position.set(0, 2.0, -2.4)
  motorGroup.add(motorPulley)

  // 机械皮带传动安全防护罩 (Louvered Heavy V-Belt Guard with Ventilation Slots)
  const beltGuard = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.6, 1.2), hazardYellow)
  beltGuard.position.set(3.8, 2.6, -2.4)
  beltGuard.rotation.z = 0.22
  motorGroup.add(beltGuard)

  // 百叶窗散热透气槽孔
  for (let l = -1.4; l <= 1.4; l += 0.55) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.18), heavySteel)
    louver.position.set(3.8, 2.6 + l, -1.78)
    louver.rotation.z = 0.22
    motorGroup.add(louver)
  }

  pumpGroup.add(motorGroup)

  // 10. 悬绳器、镜面光杆总成与核心感知设备：无线示功仪载荷-位移传感器 (Dynamometer Load Sensor)
  const rodAssembly = new THREE.Group()
  rodAssembly.position.set(18.2, 10.5, 0)

  // 镜面高光防腐合金光杆 (Polished Rod)
  const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 26, 20), chromeRod)
  rodMesh.position.y = 0
  rodAssembly.add(rodMesh)

  // 铸钢重型悬绳器下横梁 (Equalizer Carrier Bar)
  const carrierBar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 3.2), castIron)
  carrierBar.position.y = 8.5
  rodAssembly.add(carrierBar)

  // 光杆上卡瓦夹板 (Polished Rod Clamp)
  const rodClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.9, 16), hazardYellow)
  rodClamp.position.y = 9.8
  rodAssembly.add(rodClamp)

  // 核心感知传感器：无线载荷示功仪 (Wireless Dynamometer Sensor)
  // 直接同轴卡装在下横梁与光杆上卡瓦之间，实时监测光杆微应变与示功图载荷曲线！
  const dynaSensor = new THREE.Group()
  dynaSensor.position.set(0, 9.15, 0)

  // 传感器耐压高强度圆柱合金承载体
  const sensorBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 0.7, 16),
    new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.85, roughness: 0.25 }) // 工业防爆翠绿金属涂装
  )
  dynaSensor.add(sensorBody)

  // 传感器无线短距通信天线 (ZigBee/Bluetooth Antenna)
  const sensorAntenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8),
    new THREE.MeshBasicMaterial({ color: 0x1e293b })
  )
  sensorAntenna.position.set(0.45, 0.6, 0)
  dynaSensor.add(sensorAntenna)

  // 传感器运行状态指示 LED (闪烁绿灯，实时呼应大屏示功图)
  const ledGeo = new THREE.SphereGeometry(0.09, 8, 8)
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e })
  dynamometerLed = new THREE.Mesh(ledGeo, ledMat)
  dynamometerLed.position.set(0.48, 0.1, 0.3)
  dynaSensor.add(dynamometerLed)

  rodAssembly.add(dynaSensor)

  // 双股镀锌高强度重载毛辫子钢丝绳 (Twin Bridle Cables - 粗度升级为 0.22 镜面高反光钢缆)
  const bridleSteel = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.96, roughness: 0.12 })
  for (const bz of [-1.15, 1.15]) {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 8.5, 12), bridleSteel)
    cable.position.set(0, 12.8, bz)
    rodAssembly.add(cable)

    // 钢丝绳端部铸钢索节与张紧螺母 (Cable Thimbles & Sockets)
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.25, 0.8, 12), castIron)
    socket.position.set(0, 8.8, bz)
    rodAssembly.add(socket)
  }

  polishedRod = rodAssembly
  pumpGroup.add(rodAssembly)

  // 11. 井口高压智能采油树 (Multi-Gauge Flanged Smart Christmas Tree)
  const xTree = new THREE.Group()
  xTree.position.set(18.2, 1.25, 0)

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

  // 黄铜自动注脂咀与渗油引流回收软管 (Brass Zerk & Drain Hose)
  const boxZerk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.45, 8), hazardYellow)
  boxZerk.rotation.z = Math.PI / 2
  boxZerk.position.set(0.9, 0.2, 0)
  boxGroup.add(boxZerk)

  // 盘根微渗原油引流耐油橡胶软管 (Braided Effluent Drain Hose)
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.1, 0.2, 0),
    new THREE.Vector3(1.5, -0.4, 0.3),
    new THREE.Vector3(1.3, -1.0, 0.35),
    new THREE.Vector3(0.9, -1.15, 0.15),
  ])
  const drainHose = new THREE.Mesh(
    new THREE.TubeGeometry(hoseCurve, 16, 0.05, 8, false),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
  )
  boxGroup.add(drainHose)

  xTree.add(boxGroup)

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

  // 炉前全自动防爆燃气燃烧器 (Automated Gas Burner Assembly)
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.65, 1.8, 14), castIron)
  burner.rotation.z = Math.PI / 2
  burner.position.set(-5.0, 2.0, 0)
  heaterGroup.add(burner)

  // 顶部不锈钢高空烟囱与防雨风帽 (Exhaust Stack & Flared Weather Cap)
  const stackPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.2, 12), chromeRod)
  stackPipe.position.set(2.8, 5.4, 0)
  heaterGroup.add(stackPipe)

  const rainCap = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.35, 0.35, 16), castIron)
  rainCap.position.set(2.8, 8.1, 0)
  heaterGroup.add(rainCap)

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
  }
  pumpGroup.add(manifoldGroup)

  // 19. 卧式三相生产分离器撬块 (Horizontal Three-Phase Production Separator Skid)
  // 荒漠集输站关键油气水分离设备：实现高压原油脱气、脱水与精准计量
  const separatorGroup = new THREE.Group()
  separatorGroup.position.set(24.0, 0.2, -13.5)

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

  // 容器顶部安全弹簧式泄压放空阀 (Safety Relief Valve - SRV)
  const srvGroup = new THREE.Group()
  srvGroup.position.set(-2.2, 4.4, 0)
  const srvStem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8), chromeRod)
  srvStem.position.y = 0.6
  srvGroup.add(srvStem)
  const srvBonnet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 12), valveRed)
  srvBonnet.position.y = 1.6
  srvGroup.add(srvBonnet)
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

  pumpGroup.add(flowlineGroup)

  // 21. 抽油机钢筋混凝土加固基台与地脚螺栓压板 (Rigid Reinforced Concrete Foundation Pad)
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.2 })
  const mainPad = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 10.5), foundationMat)
  mainPad.position.set(-2, 0.25, 0)
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

  // 1. 储罐区防溢二次围堰混凝土防火堤 (Secondary Containment Bund Dike Wall)
  const dikeW = 68
  const dikeD = 44
  const dikeH = 2.0
  const dikeWall = new THREE.Mesh(
    new THREE.BoxGeometry(dikeW, dikeH, dikeD),
    new THREE.MeshStandardMaterial({ color: 0x273b52, roughness: 0.8, metalness: 0.35 })
  )
  dikeWall.position.set(-70, dikeH / 2 + 0.2, -42)
  infraGroup.add(dikeWall)

  const dikeFloor = new THREE.Mesh(
    new THREE.BoxGeometry(dikeW - 2.8, 0.4, dikeD - 2.8),
    new THREE.MeshStandardMaterial({ color: 0x1a2636, roughness: 0.9 })
  )
  dikeFloor.position.set(-70, 0.4, -42)
  infraGroup.add(dikeFloor)

  // 2. 现代大型立式拱顶原油储罐群 (API 650 Heavy Storage Tanks with Spiral Staircase & Breather Valves)
  const tanks = [
    { pos: [-55, -42], r: 14, h: 22, color: 0x00f0ff },
    { pos: [-85, -42], r: 12, h: 20, color: 0xf59e0b },
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

    // 球面拱顶 (Dome Roof)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(t.r, 36, 16, 0, Math.PI * 2, 0, Math.PI / 4.2), tankMat)
    dome.position.y = t.h - 0.2
    singleTank.add(dome)

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

    // 罐顶中央环形操作平台与护栏 (Roof Platform & Circular Guardrails)
    const platformR = t.r * 0.42
    const roofPlatform = new THREE.Mesh(
      new THREE.RingGeometry(platformR - 1.2, platformR + 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.DoubleSide })
    )
    roofPlatform.rotation.x = -Math.PI / 2
    roofPlatform.position.y = t.h + 2.4
    singleTank.add(roofPlatform)

    const roofRail = new THREE.Mesh(
      new THREE.TorusGeometry(platformR + 1.2, 0.08, 6, 24),
      safetyYellow
    )
    roofRail.rotation.x = Math.PI / 2
    roofRail.position.y = t.h + 3.6
    singleTank.add(roofRail)

    // 罐顶防爆阻火呼吸阀组 (Breather Valve & Flame Arrester)
    const breatherGroup = new THREE.Group()
    breatherGroup.position.set(0, t.h + 3.0, 0)

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

  // 原油主输送主管线与发光流动脉冲
  const pipePath1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(34, 2.7, 10),
    new THREE.Vector3(12, 2.0, 4),
    new THREE.Vector3(-15, 2.0, -12),
    new THREE.Vector3(-55, 2.7, -42),
  ])
  const tube = new THREE.Mesh(new THREE.TubeGeometry(pipePath1, 48, 0.9, 12, false), silverPipe)
  infraGroup.add(tube)

  for (let p = 0; p < 3; p++) {
    const pulseMesh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.3, 8, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff }))
    pulseMesh.userData = { path: pipePath1, progress: (p / 3) * 0.8 }
    pipelinePulses.push(pulseMesh)
    infraGroup.add(pulseMesh)
  }

  // 3. 三相生产分离计量撬块 (Three-Phase Production Separator Skid with Saddles & Level Gauge)
  const sepGroup = new THREE.Group()
  sepGroup.position.set(-18, 0.2, -18)

  // 撬装工字钢底座
  const sepSkid = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 6.5), darkSteel)
  sepSkid.position.y = 0.4
  sepGroup.add(sepSkid)

  // 卧式分离器筒体 (Horizontal Separator Vessel)
  const sepVessel = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 8.8, 24), blueMat)
  sepVessel.rotation.z = Math.PI / 2
  sepVessel.position.y = 3.2
  sepGroup.add(sepVessel)

  // 两侧标准椭圆封头 (Elliptical Heads)
  for (const es of [-4.4, 4.4]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), blueMat)
    head.rotation.z = es > 0 ? -Math.PI / 2 : Math.PI / 2
    head.position.set(es, 3.2, 0)
    sepGroup.add(head)
  }

  // 双鞍式重载铸钢支座 (Twin Saddle Supports)
  for (const ss of [-2.8, 2.8]) {
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 4.2), darkSteel)
    saddle.position.set(ss, 1.7, 0)
    sepGroup.add(saddle)

    const sPlate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 4.6), darkSteel)
    sPlate.position.set(ss, 0.7, 0)
    sepGroup.add(sPlate)
  }

  // 筒体侧面高精度磁翻板液位计 (Magnetic Level Gauge with Sight Tube)
  const levelGaugeGroup = new THREE.Group()
  levelGaugeGroup.position.set(0, 3.2, 2.3)

  const lgPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.8, 8), silverPipe)
  levelGaugeGroup.add(lgPipe)

  const lgScale = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 0.12), safetyYellow)
  lgScale.position.z = 0.08
  levelGaugeGroup.add(lgScale)

  // 上下法兰引出截止阀手轮
  for (const vy of [-1.3, 1.3]) {
    const vValve = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 10), valveRed)
    vValve.position.set(0, vy, 0.12)
    levelGaugeGroup.add(vValve)
  }
  sepGroup.add(levelGaugeGroup)

  // 顶部双联弹簧式安全泄压阀组 (Twin Safety Relief Valves)
  for (const rx of [-1.2, 1.2]) {
    const reliefStem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 8), silverPipe)
    reliefStem.position.set(rx, 5.8, 0)
    sepGroup.add(reliefStem)

    const reliefBonnet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 12), valveRed)
    reliefBonnet.position.set(rx, 6.6, 0)
    sepGroup.add(reliefBonnet)
  }

  // 进出油管线与涡轮流量计 (Turbine Flowmeter & Flanged Control Valve)
  const outPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 3.4, 8), silverPipe)
  outPipe.rotation.x = Math.PI / 2
  outPipe.position.set(-3.2, 1.4, 1.8)
  sepGroup.add(outPipe)

  const flowmeter = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.8, 12), safetyYellow)
  flowmeter.rotation.x = Math.PI / 2
  flowmeter.position.set(-3.2, 1.4, 2.4)
  sepGroup.add(flowmeter)

  infraGroup.add(sepGroup)

  // 4. 原油外输增压多级离心泵组 (Dual Oil Export Booster Pumps with Manifold Valves)
  const pumpSkidGroup = new THREE.Group()
  pumpSkidGroup.position.set(-45, 0.2, -26)

  for (const py of [-3.5, 3.5]) {
    const pMotor = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 16), blueMat)
    pMotor.rotation.x = Math.PI / 2
    pMotor.position.set(py, 1.6, -1.8)
    pumpSkidGroup.add(pMotor)

    const pCasing = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.4, 16), darkSteel)
    pCasing.rotation.x = Math.PI / 2
    pCasing.position.set(py, 1.6, 1.2)
    pumpSkidGroup.add(pCasing)

    const pWheel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 6, 12), valveRed)
    pWheel.position.set(py, 3.0, 1.2)
    pumpSkidGroup.add(pWheel)
  }
  infraGroup.add(pumpSkidGroup)

  // 5. 荒漠架空长输保温输油管廊 (向大漠远方沙丘延伸)
  const desertPipePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-85, 2.5, -42),
    new THREE.Vector3(-120, 2.8, -60),
    new THREE.Vector3(-160, 4.5, -95),
    new THREE.Vector3(-210, 6.0, -145),
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

  const flareGlow = new THREE.PointLight(0xff6600, 3.5, 45)
  flareGlow.position.set(0, stackH + 4, 0)
  flareGroup.add(flareGlow)

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
// 15. 3D 全息感知测点数据标签
// -------------------------------------------------------------
function buildTelemetryBadges() {
  if (!scene) return

  const badges = [
    { text: '泥浆循环固控中心', value: '流量: 48.5L/s · 泵压24MPa', pos: [-56, 18, 10], target: [-44, 4.0, 10], color: '#38bdf8' },
    { text: '固井混浆泵车总成', value: '水泥密度: 1.92g/cm³ · 正常', pos: [-46, 17, -32], target: [-38, 3.8, -26], color: '#f59e0b' },
    { text: '测井绞车电测站', value: '深度: 3,852m · 电测联调', pos: [24, 18, -34], target: [18, 3.8, -28], color: '#10b981' },
    { text: '3# 游梁式抽油机', value: '示功图正常 · 稳产中', pos: [48, 30, 14], target: [34, 21.0, 10], color: '#38bdf8' },
    { text: 'MWD随钻测井探针', value: '井斜: 0.82° · 方位124°', pos: [-48, -36, 12], target: [-15, -42, 2], color: '#00f0ff' },
  ]

  badges.forEach(b => {
    const canvas = document.createElement('canvas')
    canvas.width = 340
    canvas.height = 92
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // 科技感半透明深蓝玻璃背景
      ctx.fillStyle = 'rgba(8, 24, 42, 0.92)'
      ctx.fillRect(0, 0, 340, 92)

      // 边框发光倒角
      ctx.strokeStyle = b.color
      ctx.lineWidth = 3
      ctx.strokeRect(3, 3, 334, 86)

      // 左侧高亮色标条
      ctx.fillStyle = b.color
      ctx.fillRect(6, 6, 6, 80)

      // 标题文本
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(b.text, 24, 38)

      // 遥测数据文本
      ctx.fillStyle = b.color
      ctx.font = '16px monospace'
      ctx.fillText(b.value, 24, 72)
    }

    const tex = new THREE.CanvasTexture(canvas)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
    sprite.position.set(b.pos[0], b.pos[1], b.pos[2])
    sprite.scale.set(12.8, 3.5, 1) // 适度缩紧尺寸，杜绝拥挤遮挡
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
    [-52, 54], // 泥浆区与固控区前侧
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
    const floodlight = new THREE.PointLight(0xffedd5, 1.6, 75)
    floodlight.position.set(0, mastH + 2, 0)
    singleTower.add(floodlight)

    towerGroup.add(singleTower)
  })

  scene.add(towerGroup)
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

  // 航标红灯球呼吸微调
  if (beaconMesh) {
    const scale = 1 + Math.sin(elapsedTime * 2.5) * 0.15
    beaconMesh.scale.set(scale, scale, scale)
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

  // 泥浆固控振动筛高频激振与搅拌器动态运转
  if (shakerScreenMesh) {
    shakerScreenMesh.position.y = 4.2 + Math.sin(elapsedTime * 45) * 0.06
    shakerScreenMesh.position.z = Math.cos(elapsedTime * 45) * 0.04
  }

  agitatorPaddles.forEach((p, idx) => {
    p.rotation.y += 0.08 * (idx % 2 === 0 ? 1 : -1)
  })

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

  // 抽油机四连杆闭环刚体动力学机械咬合传动
  const pumpSpeed = 2.0
  const crankAngle = elapsedTime * pumpSpeed
  const beamAngle = -Math.cos(crankAngle) * 0.22

  if (crankGroup) crankGroup.rotation.z = crankAngle
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

  // 1. 无线载荷示功仪状态灯随抽汲冲程微光脉动
  if (dynamometerLed) {
    const pulse = 0.5 + 0.5 * Math.sin(crankAngle)
    dynamometerLed.scale.setScalar(0.85 + pulse * 0.35)
  }

  // 2. 井口 RTU 遥测高频无线通讯数据包 TX/RX 脉冲闪烁
  if (rtuTxLed) {
    const tCycle = elapsedTime % 1.6
    const isTx = tCycle < 0.12 || (tCycle > 0.22 && tCycle < 0.34)
    ;(rtuTxLed.material as THREE.MeshBasicMaterial).color.setHex(isTx ? 0x00f0ff : 0x0284c7)
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

  pipelinePulses.forEach(pulse => {
    pulse.userData.progress = (pulse.userData.progress + 0.003) % 1
    const pt = pulse.userData.path.getPointAt(pulse.userData.progress)
    const tangent = pulse.userData.path.getTangentAt(pulse.userData.progress)
    pulse.position.copy(pt)
    pulse.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent)
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

  renderer?.render(scene!, camera!)
}

onMounted(() => {
  initScene()
})

onBeforeUnmount(() => {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
  }
  window.removeEventListener('resize', handleResize)
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
