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
  NormalBlending,
  Sprite,
  SpriteMaterial,
  Texture,
  type Material,
  type Object3D,
} from 'three'
import { useLoop } from '@tresjs/core'
import { useDemo1Store, type WeatherMode } from '../stores'

const store = useDemo1Store()
const weatherGroup = shallowRef<Group>()
const time = { value: 0 }
const objects: Object3D[] = []
const textures: Texture[] = []

function disableRaycast(object: Object3D) {
  object.raycast = () => undefined
}

function makeTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void) {
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

function createPuffyCloudTexture(seed = 0) {
  return makeTexture(1024, 512, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height)

    const random = (i: number) => {
      const x = Math.sin(i * 91.37 + seed * 17.13) * 10000
      return x - Math.floor(x)
    }

    // 灰色云影：先做底层阴影，保证浅色背景上能看见云团体积。
    ctx.save()
    ctx.filter = 'blur(18px)'
    for (let i = 0; i < 12; i += 1) {
      const x = 135 + random(i + 1) * 760
      const y = 220 + random(i + 8) * 120
      const rx = 110 + random(i + 3) * 150
      const ry = 44 + random(i + 5) * 55
      const r = Math.max(rx, ry)
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(112,118,112,${0.18 + random(i + 12) * 0.1})`)
      g.addColorStop(0.58, 'rgba(156,158,148,0.08)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(rx / r, ry / r)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()

    // 多个云泡组成一团真实云，不再是矩形雾片。
    ctx.save()
    ctx.filter = 'blur(8px)'
    const puffs = [
      [110, 280, 88, 64, 0.76],
      [185, 242, 130, 88, 0.9],
      [300, 218, 160, 106, 0.96],
      [435, 212, 186, 116, 0.94],
      [575, 226, 170, 102, 0.86],
      [705, 248, 142, 86, 0.78],
      [820, 286, 112, 68, 0.66],
      [330, 316, 220, 82, 0.78],
      [520, 328, 254, 88, 0.72],
      [675, 330, 210, 74, 0.58],
    ]
    for (const [x, y, rx, ry, alpha] of puffs) {
      const jitterX = x + (random(x + seed) - 0.5) * 28
      const jitterY = y + (random(y + seed) - 0.5) * 22
      const r = Math.max(rx, ry)
      const g = ctx.createRadialGradient(jitterX, jitterY, 0, jitterX, jitterY, r)
      g.addColorStop(0, `rgba(255,255,255,${alpha})`)
      g.addColorStop(0.38, `rgba(255,253,245,${alpha * 0.82})`)
      g.addColorStop(0.68, `rgba(224,226,218,${alpha * 0.28})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.save()
      ctx.translate(jitterX, jitterY)
      ctx.scale(rx / r, ry / r)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()

    // 少量暗灰纹理，增强云团层次，避免纯白看不见。
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.18
    for (let i = 0; i < 1400; i += 1) {
      const x = 80 + random(i + 21) * (width - 160)
      const y = 150 + random(i + 39) * 230
      const a = random(i + 55) * 0.1
      ctx.fillStyle = `rgba(88,92,88,${a})`
      ctx.fillRect(x, y, 1.2, 1.2)
    }
    ctx.restore()
  })
}

function createMistTexture() {
  return makeTexture(768, 768, (ctx, width, height) => {
    const cx = width / 2
    const cy = height / 2
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.5)
    gradient.addColorStop(0, 'rgba(255,255,255,0.7)')
    gradient.addColorStop(0.36, 'rgba(255,249,225,0.36)')
    gradient.addColorStop(0.72, 'rgba(218,218,205,0.12)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  })
}

function createLightningTexture() {
  return makeTexture(512, 512, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.shadowColor = 'rgba(255,255,255,0.95)'
    ctx.shadowBlur = 18
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
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

function createSprite(texture: Texture, opts: {
  name: string
  position: [number, number, number]
  scale: [number, number, number]
  opacity: number
  color?: string
  blending?: typeof AdditiveBlending | typeof NormalBlending
  renderOrder?: number
}) {
  const material = new SpriteMaterial({
    map: texture,
    color: new Color(opts.color ?? '#ffffff'),
    transparent: true,
    opacity: opts.opacity,
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

function createWeatherLayer() {
  const group = new Group()
  group.name = 'Demo1WeatherSystem'
  disableRaycast(group)

  const cloudTextures = [0, 1, 2, 3, 4, 5, 6].map(seed => createPuffyCloudTexture(seed))
  const mistTexture = createMistTexture()
  const lightningTexture = createLightningTexture()

  // 第四十七阶段：使用 Sprite 云团，不再用 Plane + lookAt。
  // Sprite 会天然朝向相机，低角度、俯视、旋转地图时都能看见，不会被压成一条线。
  const orbitCloudConfigs = [
    { angle: -0.28, rx: 138, ry: 92, z: 46, sx: 94, sy: 36, o: 0.88, speed: 0.16, bob: 8, phase: 0.2, tex: 0 },
    { angle: 0.48, rx: 158, ry: 104, z: 52, sx: 122, sy: 46, o: 0.84, speed: 0.13, bob: 9, phase: 1.2, tex: 1 },
    { angle: 1.2, rx: 150, ry: 94, z: 50, sx: 104, sy: 40, o: 0.88, speed: 0.15, bob: 7, phase: 2.1, tex: 2 },
    { angle: 2.04, rx: 164, ry: 110, z: 56, sx: 132, sy: 52, o: 0.76, speed: 0.11, bob: 10, phase: 3.3, tex: 3 },
    { angle: 2.92, rx: 142, ry: 96, z: 48, sx: 98, sy: 38, o: 0.82, speed: 0.17, bob: 8, phase: 4.5, tex: 4 },
    { angle: 3.82, rx: 172, ry: 116, z: 58, sx: 136, sy: 54, o: 0.74, speed: 0.12, bob: 10, phase: 5.8, tex: 5 },
    { angle: 4.82, rx: 152, ry: 102, z: 50, sx: 112, sy: 44, o: 0.84, speed: 0.14, bob: 9, phase: 6.7, tex: 6 },
    { angle: 5.6, rx: 168, ry: 112, z: 54, sx: 128, sy: 50, o: 0.78, speed: 0.12, bob: 8, phase: 7.6, tex: 1 },
  ]

  for (const config of orbitCloudConfigs) {
    const sprite = createSprite(cloudTextures[config.tex], {
      name: 'orbitCloud',
      position: [Math.cos(config.angle) * config.rx, Math.sin(config.angle) * config.ry, config.z],
      scale: [config.sx, config.sy, 1],
      opacity: config.o,
      color: '#fffdf5',
      blending: NormalBlending,
      renderOrder: 995,
    })
    sprite.userData.angle = config.angle
    sprite.userData.rx = config.rx
    sprite.userData.ry = config.ry
    sprite.userData.baseZ = config.z
    sprite.userData.baseScaleX = config.sx
    sprite.userData.baseScaleY = config.sy
    sprite.userData.speed = config.speed
    sprite.userData.bob = config.bob
    sprite.userData.phase = config.phase
    group.add(sprite)
  }

  // 低空雾气：小范围、柔和，不再铺成矩形块。
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10
    const radius = 42 + (i % 4) * 18
    const sprite = createSprite(mistTexture, {
      name: 'fog',
      position: [Math.cos(angle) * radius, Math.sin(angle) * radius, 10 + (i % 3) * 1.5],
      scale: [76 + (i % 4) * 20, 38 + (i % 5) * 10, 1],
      opacity: 0.18 + (i % 3) * 0.035,
      color: '#fff5dd',
      blending: NormalBlending,
      renderOrder: 910,
    })
    sprite.userData.angle = angle
    sprite.userData.radius = radius
    sprite.userData.baseZ = 10 + (i % 3) * 1.5
    sprite.userData.baseScaleX = sprite.scale.x
    sprite.userData.baseScaleY = sprite.scale.y
    sprite.userData.speed = 0.08 + i * 0.006
    sprite.userData.phase = i * 0.8
    group.add(sprite)
  }

  // 雨丝层：用线段模拟雨幕，降雨/雷暴模式显示。
  const rainGroup = new Group()
  rainGroup.name = 'rain'
  rainGroup.userData.kind = 'rain'
  disableRaycast(rainGroup)
  for (let layer = 0; layer < 3; layer += 1) {
    const count = 150
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

  // 雷暴闪电层。
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
    cloudy: { orbitCloud: 1, fog: 0.12, rain: 0, lightning: 0 },
    fog: { orbitCloud: 0.35, fog: 1.3, rain: 0, lightning: 0 },
    rain: { orbitCloud: 0.56, fog: 0.55, rain: 1, lightning: 0 },
    storm: { orbitCloud: 0.7, fog: 0.72, rain: 1.18, lightning: 1 },
  }
  return map[mode][kind] ?? 0
}

function applyWeatherMode() {
  const mode = store.weatherMode
  const drillFactor = store.drillLevel > 0 ? 0.82 : 1
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

  weatherGroup.value.position.x = Math.sin(time.value * 0.08) * 1.4
  weatherGroup.value.position.y = Math.cos(time.value * 0.07) * 1.1

  for (const object of objects) {
    const kind = object.userData.kind ?? object.name
    if (!object.visible) continue

    if (kind === 'orbitCloud') {
      const angle = (object.userData.angle ?? 0) + time.value * (object.userData.speed ?? 0.14) * speed
      const rx = object.userData.rx ?? 150
      const ry = object.userData.ry ?? 100
      const phase = object.userData.phase ?? 0
      object.position.x = Math.cos(angle) * rx
      object.position.y = Math.sin(angle) * ry
      object.position.z = (object.userData.baseZ ?? 48) + Math.sin(time.value * 0.82 + phase) * (object.userData.bob ?? 7)
      const pulse = 1 + Math.sin(time.value * 0.6 + phase) * 0.06
      object.scale.x = (object.userData.baseScaleX ?? object.scale.x) * pulse
      object.scale.y = (object.userData.baseScaleY ?? object.scale.y) * (1 + Math.cos(time.value * 0.5 + phase) * 0.04)
    }

    if (kind === 'fog') {
      const angle = (object.userData.angle ?? 0) - time.value * (object.userData.speed ?? 0.07) * speed
      const radius = object.userData.radius ?? 60
      const phase = object.userData.phase ?? 0
      object.position.x = Math.cos(angle) * radius
      object.position.y = Math.sin(angle) * radius
      object.position.z = (object.userData.baseZ ?? 10) + Math.sin(time.value * 0.38 + phase) * 1.8
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
  objects.length = 0
  textures.length = 0
})
</script>

<template>
  <primitive v-if="weatherGroup && store.cloud && store.weatherMode !== 'clear'" :object="weatherGroup" />
</template>
