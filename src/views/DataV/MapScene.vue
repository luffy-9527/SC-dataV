<template>
  <div ref="canvasContainer" class="canvas-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { geoMercator } from 'd3-geo'
import { useConfigStore } from '@/stores/config'
import scGeoJson from '@/assets/geo/sc.json'

const canvasContainer = ref<HTMLDivElement>()
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let mapGroup: THREE.Group
let sweepLight: THREE.Mesh | null = null // 扫光平面

// 城市经纬度和数据 - 根据实际地理位置校准
const cityData: Record<string, { lng: number; lat: number; value: number }> = {
  '成都': { lng: 104.0658, lat: 30.6595, value: 320 }, // 四川省会，中心位置
  '绵阳': { lng: 104.7417, lat: 31.4640, value: 180 },
  '德阳': { lng: 104.3986, lat: 31.1270, value: 160 },
  '宜宾': { lng: 104.6308, lat: 28.7601, value: 200 },
  '泸州': { lng: 105.4433, lat: 28.8718, value: 150 },
  '自贡': { lng: 104.7784, lat: 29.3528, value: 130 },
  '广元': { lng: 105.8298, lat: 32.4353, value: 110 },
  '达州': { lng: 107.4679, lat: 31.2096, value: 140 },
  '乐山': { lng: 103.7613, lat: 29.5820, value: 155 },
  '南充': { lng: 106.1107, lat: 30.8378, value: 170 },
  '凉山': { lng: 102.2587, lat: 27.8867, value: 120 },
  '甘孜': { lng: 101.9638, lat: 30.0505, value: 90 },
  '阿坝': { lng: 102.2213, lat: 31.8997, value: 80 },
  '攀枝花': { lng: 101.7186, lat: 26.5804, value: 100 },
  '广安': { lng: 106.6334, lat: 30.4564, value: 135 },
  '巴中': { lng: 106.7537, lat: 31.8679, value: 105 },
  '雅安': { lng: 103.0134, lat: 29.9912, value: 95 },
  '眉山': { lng: 103.8484, lat: 30.0775, value: 125 },
  '资阳': { lng: 104.6419, lat: 30.1222, value: 115 },
  '内江': { lng: 105.0661, lat: 29.5804, value: 145 },
  '遂宁': { lng: 105.5933, lat: 30.5133, value: 110 },
}

onMounted(() => {
  if (!canvasContainer.value) return

  const configStore = useConfigStore()
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight

  // 初始化场景 - 浅色主题
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#f5f0e8') // 米黄色背景

  // 初始化相机
  camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000)
  camera.position.set(0, 150, 220)
  camera.lookAt(0, 0, 0)

  // 初始化渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  canvasContainer.value.appendChild(renderer.domElement)

  // 轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = true
  controls.enableZoom = true
  controls.enableRotate = true
  controls.zoomSpeed = 0.3
  controls.minDistance = 80
  controls.maxDistance = 500
  controls.maxPolarAngle = 1.5

  // 灯光 - 适配浅色主题
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight.position.set(100, 150, 50)
  dirLight.castShadow = true
  scene.add(dirLight)
  const pointLight = new THREE.PointLight(0xffd700, 0.8, 400) // 金色点光源
  pointLight.position.set(0, 80, 0)
  scene.add(pointLight)

  // 地图投影 - 根据实际地理范围精确校准
  const projection = geoMercator()
    .center([102.95, 30.18]) // 四川实际中心点 (经度: 97.35-108.55, 纬度: 26.05-34.31)
    .scale(3400) // 增大缩放比例使地图更大
    .translate([0, 0])

  // 地图组
  mapGroup = new THREE.Group()
  scene.add(mapGroup)

  // 渲染地图区域
  renderMap(projection)

  // 创建扫光效果
  createSweepLight()

  // 渲染城市标记和飞线
  renderCities(projection)

  // 动画循环
  let time = 0
  const animate = () => {
    animationId = requestAnimationFrame(animate)
    time += 0.01
    controls.update()

    // 城市光球浮动
    mapGroup.children.forEach((child) => {
      if (child.userData.type === 'citySphere') {
        child.position.y = child.userData.baseY + Math.sin(time * 2 + child.position.x) * 1.5
      }
      // 飞线流动效果
      if (child.userData.type === 'flyLine') {
        const mat = (child as THREE.Line).material as THREE.LineBasicMaterial
        mat.opacity = 0.3 + Math.sin(time * 3 + child.userData.offset) * 0.3
      }
      // 飞线头部光点动画
      if (child.userData.type === 'flyDot') {
        child.userData.t += child.userData.speed
        if (child.userData.t > 1) child.userData.t = 0
        const pos = child.userData.curve.getPoint(child.userData.t)
        child.position.copy(pos)
      }
    })

    // 扫光动画 - 从左到右移动
    if (sweepLight) {
      sweepLight.position.x = -200 + (time * 50) % 400 // 周期性从左到右
      const mat = sweepLight.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 1 - Math.abs(sweepLight.position.x) / 200) * 0.8 // 提高透明度
    }

    renderer.render(scene, camera)
  }
  animate()

  // 触发地图完成
  setTimeout(() => {
    configStore.$patch({ mapPlayComplete: true })
  }, 800)

  window.addEventListener('resize', onWindowResize)
})

/**
 * 渲染四川省地图区域
 */
function renderMap(projection: any) {
  const features = (scGeoJson as any).features as any[]

  features.forEach((feature: any, idx: number) => {
    const geo = feature.geometry
    // const name = feature.properties?.name || `区域${idx}`

    if (geo.type === 'Polygon') {
      // Polygon: coordinates 是 [ring1, ring2, ...]
      geo.coordinates.forEach((ring: number[][]) => {
        drawRing(ring, projection, idx)
      })
    } else if (geo.type === 'MultiPolygon') {
      // MultiPolygon: coordinates 是 [[ring1, ring2], [ring3, ...]]
      geo.coordinates.forEach((polygon: number[][][]) => {
        polygon.forEach((ring: number[][]) => {
          drawRing(ring, projection, idx)
        })
      })
    }
  })

  // 添加底部发光平面 - 浅色主题
  const planeGeo = new THREE.PlaneGeometry(400, 300)
  const planeMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e8, // 与背景同色
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  })
  const plane = new THREE.Mesh(planeGeo, planeMat)
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -2
  mapGroup.add(plane)
}

/**
 * 绘制单个环（多边形边界）
 */
function drawRing(ring: number[][], projection: any, idx: number) {
  const shape = new THREE.Shape()
  let hasPoints = false

  ring.forEach((coord: number[], i: number) => {
    // GeoJSON 坐标格式: [经度, 纬度]
    const projected = projection([coord[0], coord[1]])
    if (!projected) return
    
    const x = projected[0]
    const y = -projected[1] // d3-geo Y轴向下，需要翻转

    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
    hasPoints = true
  })

  if (!hasPoints) return

  // 挤出几何体 - 统一高度为2，作为地图底座
  const extrudeSettings = {
    depth: 2,
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.2,
    bevelSegments: 1
  }
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  const material = new THREE.MeshStandardMaterial({
    color: getRegionColor('', idx),
    metalness: 0.1,
    roughness: 0.8,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.castShadow = true
  mesh.receiveShadow = true
  mapGroup.add(mesh)

  // 边界线 - 深色边框
  const edgesGeo = new THREE.EdgesGeometry(geometry, 30)
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0x8b7355, // 深棕色
    transparent: true,
    opacity: 0.8
  })
  const edges = new THREE.LineSegments(edgesGeo, edgesMat)
  edges.rotation.x = -Math.PI / 2
  mapGroup.add(edges)
}

/**
 * 根据区域名称返回颜色 - 浅色主题
 */
function getRegionColor(_name: string, idx: number): number {
  const colors = [
    0xe8dcc8, 0xf0e4d4, 0xe5d9c5, 0xdcd0bc,
    0xebdfcb, 0xe3d7c3, 0xe0d4bf, 0xe9ddca,
    0xddcfb8, 0xe6dac6, 0xefebde, 0xe2d6c0
  ]
  return colors[idx % colors.length]
}

/**
 * 创建热力图纹理 - 模拟城市数据热度
 */
function createHeatmapTexture(value: number, maxValue: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  canvas.width = 128
  canvas.height = 128
  
  // 计算热度比例 (0-1)
  const ratio = Math.min(value / maxValue, 1)
  
  // 创建径向渐变：中心红色 -> 黄色 -> 透明
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, `rgba(255, 50, 50, ${0.8 * ratio})`) // 红色核心
  gradient.addColorStop(0.3, `rgba(255, 150, 50, ${0.6 * ratio})`) // 橙色过渡
  gradient.addColorStop(0.6, `rgba(255, 220, 100, ${0.4 * ratio})`) // 黄色外圈
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)') // 透明边缘
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * 创建扫光效果平面
 */
function createSweepLight() {
  // 创建一个垂直的渐变平面作为扫光
  const geometry = new THREE.PlaneGeometry(20, 300)
  
  // 创建渐变纹理
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 1
  const ctx = canvas.getContext('2d')!
  
  // 从左到右的渐变：透明 -> 金色 -> 透明
  const gradient = ctx.createLinearGradient(0, 0, 256, 0)
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0)')
  gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.9)') // 金色
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 1)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending // 叠加混合模式，增强发光效果
  })
  
  sweepLight = new THREE.Mesh(geometry, material)
  sweepLight.rotation.y = Math.PI / 2 // 垂直放置
  sweepLight.position.set(-200, 50, 0) // 初始位置在左侧
  sweepLight.userData = { type: 'sweepLight' }
  mapGroup.add(sweepLight)
}

/**
 * 创建文字纹理
 */
function createTextTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  canvas.width = 256
  canvas.height = 64
  
  // 背景透明
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // 文字样式 - 深色适配浅色背景
  ctx.font = 'bold 32px Microsoft YaHei, Arial, sans-serif'
  ctx.fillStyle = '#5a4a3a' // 深棕色
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * 创建城市名称标签
 */
function createCityLabel(name: string, x: number, y: number, z: number) {
  const texture = createTextTexture(name)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: true
  })
  const sprite = new THREE.Sprite(material)
  // 标签放在地图对应坐标的固定偏移位置，不与柱体重叠
  sprite.position.set(x, y, z)
  sprite.scale.set(20, 5, 1)
  sprite.renderOrder = 999
  sprite.userData = { type: 'cityLabel', name }
  mapGroup.add(sprite)
}

/**
 * 渲染城市标记和飞线
 */
function renderCities(projection: any) {
  const cities = Object.entries(cityData)

  cities.forEach(([name, data]) => {
    const projected = projection([data.lng, data.lat])
    if (!projected) return
    const x = projected[0]
    const y = -projected[1] // 翻转Y轴
    const barHeight = Math.max(data.value / 6, 3)

    // 城市光柱 - 垂直向上发光效果
    const pillarHeight = barHeight * 1.5 // 增加高度
    const pillarGeo = new THREE.CylinderGeometry(0.8, 0.8, pillarHeight, 8)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xffff00, // 亮黄色
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.85,
      emissive: 0xffd700, // 金色自发光
      emissiveIntensity: 0.6
    })
    const pillar = new THREE.Mesh(pillarGeo, pillarMat)
    pillar.position.set(x, 2 + pillarHeight / 2, y)
    pillar.castShadow = true
    pillar.userData = { type: 'pillar', name }
    mapGroup.add(pillar)

    // 顶部光球 - 强发光效果
    const sphereGeo = new THREE.SphereGeometry(2.8, 16, 16)
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // 白色核心
      emissive: 0xffff00, // 亮黄色自发光
      emissiveIntensity: 1.5
    })
    const sphere = new THREE.Mesh(sphereGeo, sphereMat)
    sphere.position.set(x, 2 + pillarHeight + 1.5, y) // 在光柱顶部上方
    sphere.userData = { type: 'citySphere', baseY: 2 + pillarHeight + 1.5, name }
    mapGroup.add(sphere)

    // 底部光圈 - 金色
    const ringGeo = new THREE.RingGeometry(3, 5, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700, // 金色
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(x, 2.5, y)
    mapGroup.add(ring)

    // 添加热力图效果 - 在城市上方显示半透明渐变
    const heatmapTexture = createHeatmapTexture(data.value, 320) // 最大值320（成都）
    const heatmapGeo = new THREE.PlaneGeometry(40 + data.value / 10, 40 + data.value / 10)
    const heatmapMat = new THREE.MeshBasicMaterial({
      map: heatmapTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const heatmap = new THREE.Mesh(heatmapGeo, heatmapMat)
    heatmap.rotation.x = -Math.PI / 2
    heatmap.position.set(x, 3, y) // 在地图表面上方
    mapGroup.add(heatmap)

    // 城市名称标签 - 显示在光柱顶部附近
    createCityLabel(name, x, 2 + pillarHeight + 4, y)

    // 飞线 - 从成都出发
    if (name !== '成都') {
      const chengduProjected = projection([cityData['成都'].lng, cityData['成都'].lat]) || [0, 0]
      const chengduX = chengduProjected[0]
      const chengduY = -chengduProjected[1]
      
      const start = new THREE.Vector3(chengduX, 2 + cityData['成都'].value / 4 + 2, chengduY) // 从成都光柱顶部
      const end = new THREE.Vector3(x, 2 + pillarHeight + 1.5, y) // 到目标城市光柱顶部
      const mid = new THREE.Vector3(
        (start.x + end.x) / 2,
        Math.max(40, barHeight + 20),
        (start.z + end.z) / 2
      )
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
      const points = curve.getPoints(60)
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xffd700, // 金色
        transparent: true,
        opacity: 0.6
      })
      const line = new THREE.Line(lineGeo, lineMat)
      line.userData = { type: 'flyLine', offset: Math.random() * Math.PI * 2 }
      mapGroup.add(line)

      // 添加多个流动光点
      for (let i = 0; i < 3; i++) {
        const dotGeo = new THREE.SphereGeometry(1, 8, 8)
        const dotMat = new THREE.MeshBasicMaterial({ 
          color: 0xffff00, // 亮黄色
          transparent: true,
          opacity: 0.9
        })
        const dot = new THREE.Mesh(dotGeo, dotMat)
        dot.userData = { 
          type: 'flyDot', 
          curve, 
          speed: 0.003 + Math.random() * 0.004, 
          t: (i / 3) + Math.random() * 0.1 
        }
        mapGroup.add(dot)
      }
    }
  })
}

const onWindowResize = () => {
  if (!canvasContainer.value) return
  camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
}

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onWindowResize)
  if (renderer) {
    renderer.dispose()
    canvasContainer.value?.removeChild(renderer.domElement)
  }
})

defineExpose({
  getScene: () => scene,
  getCamera: () => camera,
  getRenderer: () => renderer
})
</script>

<style scoped>
.canvas-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>



