<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  LinearFilter,
  LinearMipmapLinearFilter,
  NormalBlending,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Texture,
  type Material,
  type Object3D,
} from 'three'
import { useLoop } from '@tresjs/core'
import cloudImage from '@/assets/cloud.png'
import loadTexture from '../helpers/loadTexture'
import { useDemo1Store, type WeatherMode } from '../stores'

interface CloudFormation {
  group: Group
  shadow?: Sprite
  currentX: number
  currentY: number
  baseY: number
  baseZ: number
  speed: number
  phase: number
  baseOpacity: number
  puffs: { sprite: Sprite; relX: number; relY: number; baseScaleX: number; baseScaleY: number; phase: number }[]
}

const store = useDemo1Store()
const weatherGroup = shallowRef<Group>()
const time = { value: 0 }
const formations: CloudFormation[] = []
const objects: Object3D[] = []
const textures: Texture[] = []

function disableRaycast(object: Object3D) {
  object.raycast = () => undefined
}

function makeTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)
  draw(ctx, width, height)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  textures.push(texture)
  return texture
}

function createSoftShadowTexture() {
  return makeTexture(256, 256, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.filter = 'blur(12px)'
    const cx = width / 2
    const cy = height / 2
    const r = cx * 0.75
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.6)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    g.addColorStop(0, 'rgba(15, 25, 38, 0.40)')
    g.addColorStop(0.55, 'rgba(25, 35, 50, 0.18)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.restore()
  })
}

function createMistTexture() {
  return makeTexture(512, 512, (ctx, width, height) => {
    const cx = width / 2
    const cy = height / 2
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.45)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.65)')
    gradient.addColorStop(0.42, 'rgba(255, 252, 242, 0.32)')
    gradient.addColorStop(0.75, 'rgba(235, 238, 235, 0.10)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  })
}

function createLightningTexture() {
  return makeTexture(512, 512, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.shadowColor = 'rgba(255, 255, 255, 0.95)'
    ctx.shadowBlur = 18
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    let x = width * 0.52
    let y = 20
    ctx.moveTo(x, y)
    for (let i = 0; i < 9; i += 1) {
      x += (Math.random() - 0.5) * 76
      y += 44 + Math.random() * 18
      ctx.lineTo(x, y)
      if (i === 3 || i === 5) {
        ctx.moveTo(x, y)
        ctx.lineTo(x + (Math.random() - 0.5) * 120, y + 70)
        ctx.moveTo(x, y)
      }
    }
    ctx.stroke()
    ctx.restore()
  })
}

function createSprite(
  texture: Texture,
  opts: {
    name: string
    position: [number, number, number]
    scale: [number, number, number]
    opacity: number
    rotation?: number
    color?: string
    blending?: typeof AdditiveBlending | typeof NormalBlending
    renderOrder?: number
  },
) {
  const material = new SpriteMaterial({
    map: texture,
    color: new Color(opts.color ?? '#ffffff'),
    transparent: true,
    opacity: opts.opacity,
    rotation: opts.rotation ?? 0,
    depthTest: false,
    depthWrite: false,
    blending: opts.blending ?? NormalBlending,
    sizeAttenuation: true,
  })
  const sprite = new Sprite(material)
  sprite.name = opts.name
  sprite.position.set(...opts.position)
  sprite.scale.set(...opts.scale)
  sprite.renderOrder = opts.renderOrder ?? 980
  sprite.userData.baseOpacity = opts.opacity
  sprite.userData.kind = opts.name
  disableRaycast(sprite)
  objects.push(sprite)
  return sprite
}

async function createWeatherLayer() {
  const group = new Group()
  group.name = 'Demo1WeatherSystem'
  disableRaycast(group)

  // 1. 加载摄影级真实 3D 积云纹理资产 cloud.png
  const cloudTexture = await loadTexture(cloudImage, tex => {
    tex.colorSpace = SRGBColorSpace
    tex.minFilter = LinearMipmapLinearFilter
    tex.magFilter = LinearFilter
    tex.generateMipmaps = true
    tex.needsUpdate = true
  })
  textures.push(cloudTexture)

  const shadowTexture = createSoftShadowTexture()
  const mistTexture = createMistTexture()
  const lightningTexture = createLightningTexture()

  formations.length = 0

  /**
   * 采用多重真实云团簇（Cloud Clusters）结构：
   * 每个主要云系由 2~3 个以不同旋转角度、微偏位移、不同尺度交叠的摄影级云片融合而成。
   * 彻底告别单一扁平贴纸形态，形成边缘细腻飞絮、内部翻涌饱满的真实气象流云。
   */
  const clusterConfigs = [
    // 1. 川西阿坝高原群
    {
      x: -125, y: 68, z: 32, speed: 15.5,
      puffs: [
        { dx: 0, dy: 0, sx: 64, sy: 56, rot: 0.1, o: 0.94 },
        { dx: 22, dy: -6, sx: 48, sy: 42, rot: -0.8, o: 0.86 },
        { dx: -18, dy: 6, sx: 42, sy: 36, rot: 1.6, o: 0.82 },
      ],
      shadowScale: [95, 60],
    },
    // 2. 川东北（广元、巴中）
    {
      x: 35, y: 66, z: 29, speed: 14.0,
      puffs: [
        { dx: 0, dy: 0, sx: 70, sy: 60, rot: -0.4, o: 0.95 },
        { dx: -24, dy: -5, sx: 50, sy: 44, rot: 1.1, o: 0.88 },
        { dx: 20, dy: 7, sx: 44, sy: 38, rot: 2.3, o: 0.82 },
      ],
      shadowScale: [100, 65],
    },
    // 3. 绵阳、德阳交界上空
    {
      x: -35, y: 52, z: 30, speed: 16.5,
      puffs: [
        { dx: 0, dy: 0, sx: 56, sy: 48, rot: 0.7, o: 0.93 },
        { dx: 18, dy: -4, sx: 40, sy: 35, rot: -1.2, o: 0.85 },
      ],
      shadowScale: [75, 50],
    },
    // 4. 成都平原腹地（核心主云团）
    {
      x: -8, y: 22, z: 33, speed: 15.0,
      puffs: [
        { dx: 0, dy: 0, sx: 75, sy: 64, rot: 0.3, o: 0.96 },
        { dx: 26, dy: -7, sx: 58, sy: 50, rot: -0.6, o: 0.90 },
        { dx: -22, dy: 8, sx: 50, sy: 44, rot: 1.8, o: 0.86 },
      ],
      shadowScale: [115, 75],
    },
    // 5. 川西甘孜高原上空
    {
      x: -110, y: 15, z: 34, speed: 14.2,
      puffs: [
        { dx: 0, dy: 0, sx: 72, sy: 62, rot: -0.9, o: 0.95 },
        { dx: -20, dy: 9, sx: 52, sy: 45, rot: 0.5, o: 0.88 },
        { dx: 24, dy: -6, sx: 46, sy: 40, rot: 2.7, o: 0.84 },
      ],
      shadowScale: [105, 70],
    },
    // 6. 川东（遂宁、南充、达州）
    {
      x: 65, y: 16, z: 28, speed: 17.0,
      puffs: [
        { dx: 0, dy: 0, sx: 58, sy: 50, rot: 1.4, o: 0.94 },
        { dx: -18, dy: -5, sx: 42, sy: 36, rot: -0.3, o: 0.85 },
      ],
      shadowScale: [80, 52],
    },
    // 7. 川中南（雅安、乐山、眉山）
    {
      x: -52, y: -16, z: 30, speed: 14.8,
      puffs: [
        { dx: 0, dy: 0, sx: 68, sy: 58, rot: -0.2, o: 0.95 },
        { dx: 22, dy: 7, sx: 50, sy: 43, rot: 1.9, o: 0.89 },
        { dx: -19, dy: -6, sx: 44, sy: 38, rot: -1.4, o: 0.84 },
      ],
      shadowScale: [100, 68],
    },
    // 8. 资阳、内江、自贡
    {
      x: 28, y: -22, z: 31, speed: 16.0,
      puffs: [
        { dx: 0, dy: 0, sx: 62, sy: 52, rot: 0.5, o: 0.93 },
        { dx: -18, dy: 6, sx: 45, sy: 38, rot: -0.7, o: 0.85 },
      ],
      shadowScale: [85, 55],
    },
    // 9. 宜宾、泸州
    {
      x: 48, y: -54, z: 29, speed: 14.5,
      puffs: [
        { dx: 0, dy: 0, sx: 66, sy: 56, rot: 1.2, o: 0.94 },
        { dx: -20, dy: -5, sx: 48, sy: 42, rot: -0.5, o: 0.88 },
        { dx: 20, dy: 8, sx: 42, sy: 36, rot: 2.1, o: 0.82 },
      ],
      shadowScale: [95, 62],
    },
    // 10. 凉山、攀枝花
    {
      x: -58, y: -66, z: 32, speed: 15.2,
      puffs: [
        { dx: 0, dy: 0, sx: 70, sy: 60, rot: -0.7, o: 0.95 },
        { dx: 22, dy: -6, sx: 52, sy: 44, rot: 0.8, o: 0.88 },
        { dx: -21, dy: 7, sx: 44, sy: 38, rot: -2.0, o: 0.83 },
      ],
      shadowScale: [102, 68],
    },
    // 11. 川西南部边境高原
    {
      x: -128, y: -42, z: 35, speed: 13.8,
      puffs: [
        { dx: 0, dy: 0, sx: 58, sy: 50, rot: 0.9, o: 0.92 },
        { dx: -16, dy: 6, sx: 42, sy: 36, rot: -1.1, o: 0.85 },
      ],
      shadowScale: [80, 52],
    },
  ]

  for (let i = 0; i < clusterConfigs.length; i += 1) {
    const config = clusterConfigs[i]

    const clusterGroup = new Group()
    clusterGroup.name = `CloudCluster_${i}`
    clusterGroup.position.set(config.x, config.y, config.z)
    disableRaycast(clusterGroup)

    // 1. 地面柔和阴影（紧贴地形 8.6 高度，跟随云团漂浮移动）
    const shadowSprite = createSprite(shadowTexture, {
      name: 'cloudShadow',
      position: [config.x + 5, config.y - 5, 8.6],
      scale: [config.shadowScale[0], config.shadowScale[1], 1],
      opacity: 0.20,
      blending: NormalBlending,
      renderOrder: 975,
    })
    shadowSprite.userData.baseScaleX = config.shadowScale[0]
    shadowSprite.userData.baseScaleY = config.shadowScale[1]
    group.add(shadowSprite)

    // 2. 簇内交叠微片
    const puffItems: CloudFormation['puffs'] = []
    for (let p = 0; p < config.puffs.length; p += 1) {
      const puff = config.puffs[p]
      const sprite = createSprite(cloudTexture, {
        name: 'orbitCloud',
        position: [puff.dx, puff.dy, p * 0.4],
        scale: [puff.sx, puff.sy, 1],
        opacity: puff.o,
        rotation: puff.rot,
        color: '#ffffff',
        blending: NormalBlending,
        renderOrder: 990 + p * 2,
      })
      clusterGroup.add(sprite)
      puffItems.push({
        sprite,
        relX: puff.dx,
        relY: puff.dy,
        baseScaleX: puff.sx,
        baseScaleY: puff.sy,
        phase: i * 0.6 + p * 1.2,
      })
    }

    group.add(clusterGroup)

    formations.push({
      group: clusterGroup,
      shadow: shadowSprite,
      currentX: config.x,
      currentY: config.y,
      baseY: config.y,
      baseZ: config.z,
      speed: config.speed,
      phase: i * 0.75,
      baseOpacity: 0.95,
      puffs: puffItems,
    })
  }

  // 低空柔和轻雾
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6
    const radius = 35 + (i % 3) * 14
    const posX = Math.cos(angle) * radius
    const posY = Math.sin(angle) * radius
    const sprite = createSprite(mistTexture, {
      name: 'fog',
      position: [posX, posY, 11 + (i % 3) * 1.5],
      scale: [56 + (i % 3) * 16, 32 + (i % 3) * 8, 1],
      opacity: 0.28 + (i % 3) * 0.04,
      color: '#fffbf0',
      blending: NormalBlending,
      renderOrder: 920,
    })
    sprite.userData.angle = angle
    sprite.userData.radius = radius
    sprite.userData.baseX = posX
    sprite.userData.baseY = posY
    sprite.userData.baseZ = 11 + (i % 3) * 1.5
    sprite.userData.baseScaleX = sprite.scale.x
    sprite.userData.baseScaleY = sprite.scale.y
    sprite.userData.speed = 0.06 + i * 0.005
    sprite.userData.phase = i * 0.8
    group.add(sprite)
  }

  // 雨丝层：降雨/雷暴模式显示
  const rainGroup = new Group()
  rainGroup.name = 'rain'
  rainGroup.userData.kind = 'rain'
  disableRaycast(rainGroup)
  for (let layer = 0; layer < 3; layer += 1) {
    const count = 160
    const positions = new Float32Array(count * 2 * 3)
    for (let i = 0; i < count; i += 1) {
      const x = -140 + Math.random() * 280
      const y = -110 + Math.random() * 220
      const z = 28 + Math.random() * 58
      const idx = i * 6
      positions[idx] = x
      positions[idx + 1] = y
      positions[idx + 2] = z
      positions[idx + 3] = x + 4 + layer * 2
      positions[idx + 4] = y - 7 - layer * 3
      positions[idx + 5] = z - 20 - layer * 4
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    const material = new LineBasicMaterial({
      color: layer === 0 ? '#ffffff' : '#fff0b8',
      transparent: true,
      opacity: 0.22 - layer * 0.04,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const lines = new LineSegments(geometry, material)
    lines.name = 'rain'
    lines.renderOrder = 960
    lines.userData.kind = 'rain'
    lines.userData.baseOpacity = material.opacity
    lines.userData.speed = 16 + layer * 9
    disableRaycast(lines)
    rainGroup.add(lines)
    objects.push(lines)
  }
  group.add(rainGroup)
  objects.push(rainGroup)

  // 雷暴闪电层
  for (let i = 0; i < 4; i += 1) {
    const angle = (Math.PI * 2 * i) / 4 + 0.4
    const sprite = createSprite(lightningTexture, {
      name: 'lightning',
      position: [Math.cos(angle) * (46 + i * 18), Math.sin(angle) * (34 + i * 14), 56 + i * 8],
      scale: [36 + i * 8, 56 + i * 10, 1],
      opacity: 0,
      color: '#ffffff',
      blending: AdditiveBlending,
      renderOrder: 980,
    })
    sprite.userData.flashSeed = Math.random() * 10
    group.add(sprite)
  }

  weatherGroup.value = group
  applyWeatherMode()
}

function getMaterial(object: Object3D): Material | Material[] | undefined {
  return (object as any).material
}

function setOpacity(object: Object3D, opacity: number) {
  const material = getMaterial(object)
  if (!material) return
  if (Array.isArray(material)) {
    material.forEach(item => {
      ;(item as any).opacity = opacity
      ;(item as any).transparent = true
      item.needsUpdate = true
    })
  } else {
    ;(material as any).opacity = opacity
    ;(material as any).transparent = true
    material.needsUpdate = true
  }
}

function factorFor(kind: string, mode: WeatherMode) {
  if (!store.cloud || mode === 'clear') return 0
  const map: Record<WeatherMode, Record<string, number>> = {
    clear: {},
    cloudy: { orbitCloud: 1, cloudShadow: 1, fog: 0.25, rain: 0, lightning: 0 },
    fog: { orbitCloud: 0.4, cloudShadow: 0.2, fog: 1.3, rain: 0, lightning: 0 },
    rain: { orbitCloud: 0.75, cloudShadow: 0.5, fog: 0.6, rain: 1, lightning: 0 },
    storm: { orbitCloud: 0.9, cloudShadow: 0.7, fog: 0.75, rain: 1.18, lightning: 1 },
  }
  return map[mode][kind] ?? 0
}

function applyWeatherMode() {
  const mode = store.weatherMode
  const drillFactor = store.drillLevel > 0 ? 0.85 : 1
  for (const object of objects) {
    const kind = object.userData.kind ?? object.name
    const factor = factorFor(kind, mode) * drillFactor
    object.visible = factor > 0.01
    const baseOpacity = object.userData.baseOpacity ?? 1
    setOpacity(object, baseOpacity * factor)
  }
}

watch(
  () => [store.cloud, store.weatherMode, store.drillLevel],
  () => applyWeatherMode(),
)

onMounted(() => {
  createWeatherLayer()
})

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  if (!weatherGroup.value || !store.cloud || store.weatherMode === 'clear') return
  const speed = Math.max(store.config.lightSpeed, 0.2)
  time.value += delta * speed

  // 天气层微幅整体漂浮动势
  weatherGroup.value.position.x = Math.sin(time.value * 0.08) * 1.5
  weatherGroup.value.position.y = Math.cos(time.value * 0.07) * 1.2

  const mode = store.weatherMode
  const isDrill = store.drillLevel > 0
  const cloudScaleMul = isDrill ? 0.46 : 1.0
  const cloudOpacityMul = isDrill ? 0.68 : 1.0
  const shadowOpacityMul = isDrill ? 0.45 : 1.0

  const cloudFactor = factorFor('orbitCloud', mode)
  const shadowFactor = factorFor('cloudShadow', mode)

  // 1. 云团动态流动与循环
  const minDriftX = -185
  const maxDriftX = 125
  const driftSpan = maxDriftX - minDriftX // 310

  for (const item of formations) {
    // 持续向东偏东南方向平滑飘移（速度 14~17 单位/秒，流动效果清晰可感）
    item.currentX += delta * item.speed * speed
    item.currentY -= delta * item.speed * 0.07 * speed

    // 超出地图右边界后无缝循环回左侧
    if (item.currentX > maxDriftX) {
      item.currentX -= driftSpan
      item.currentY = item.baseY + Math.sin(item.phase * 2) * 8
    }

    // 边缘平滑淡入淡出
    let edgeAlpha = 1
    if (item.currentX < -145) {
      edgeAlpha = Math.max(0, (item.currentX - minDriftX) / 40)
    } else if (item.currentX > 85) {
      edgeAlpha = Math.max(0, (maxDriftX - item.currentX) / 40)
    }

    // 悬浮高度微调
    const hoverZ = item.baseZ + Math.sin(time.value * 0.72 + item.phase) * 1.8
    item.group.position.x = item.currentX
    item.group.position.y = item.currentY
    item.group.position.z = hoverZ

    // 簇内微片随气流轻微呼吸胀缩与微移
    for (const puff of item.puffs) {
      const breathe = 1 + Math.sin(time.value * 0.45 + puff.phase) * 0.04
      puff.sprite.scale.x = puff.baseScaleX * breathe * cloudScaleMul
      puff.sprite.scale.y = puff.baseScaleY * breathe * cloudScaleMul
      setOpacity(puff.sprite, (puff.sprite.userData.baseOpacity ?? 0.9) * edgeAlpha * cloudFactor * cloudOpacityMul)
    }

    // 投影阴影跟随云体在地面移动
    if (item.shadow) {
      item.shadow.position.x = item.currentX + 4 * cloudScaleMul
      item.shadow.position.y = item.currentY - 4 * cloudScaleMul
      item.shadow.position.z = 8.6
      const shadowBreathe = 1 + Math.sin(time.value * 0.45 + item.phase) * 0.03
      item.shadow.scale.x = (item.shadow.userData.baseScaleX ?? 90) * shadowBreathe * cloudScaleMul
      item.shadow.scale.y = (item.shadow.userData.baseScaleY ?? 60) * shadowBreathe * cloudScaleMul
      setOpacity(item.shadow, 0.20 * edgeAlpha * shadowFactor * shadowOpacityMul)
    }
  }

  // 2. 其它天气要素动效（雾气、降雨、闪电）
  for (const object of objects) {
    const kind = object.userData.kind ?? object.name
    if (!object.visible) continue

    if (kind === 'fog') {
      const angle = (object.userData.angle ?? 0) - time.value * (object.userData.speed ?? 0.06) * speed
      const radius = object.userData.radius ?? 35
      const phase = object.userData.phase ?? 0
      object.position.x = Math.cos(angle) * radius
      object.position.y = Math.sin(angle) * radius
      object.position.z = (object.userData.baseZ ?? 11) + Math.sin(time.value * 0.38 + phase) * 1.5
    }

    if (kind === 'rain') {
      object.position.x += delta * 8 * speed
      object.position.y -= delta * 18 * speed
      object.position.z -= delta * 25 * speed
      if (object.position.z < -20) {
        object.position.x = 0
        object.position.y = 0
        object.position.z = 0
      }
    }

    if (kind === 'lightning') {
      const phase = Math.sin(time.value * 3.8 + object.userData.flashSeed)
      const randomFlash = store.weatherMode === 'storm' && phase > 0.985 ? 1 : 0
      const pulse = randomFlash ? 0.92 : Math.max(0, phase - 0.96) * 3
      setOpacity(object, pulse)
    }
  }
})

onBeforeUnmount(() => {
  for (const object of objects) {
    const material = getMaterial(object)
    if (Array.isArray(material)) material.forEach(item => item.dispose())
    else material?.dispose()
    ;(object as any).geometry?.dispose?.()
  }
  textures.forEach(texture => texture.dispose())
  formations.length = 0
  objects.length = 0
  textures.length = 0
})
</script>

<template>
  <primitive v-if="weatherGroup && store.cloud && store.weatherMode !== 'clear'" :object="weatherGroup" />
</template>
