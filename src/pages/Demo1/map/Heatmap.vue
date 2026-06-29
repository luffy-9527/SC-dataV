<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watchEffect } from 'vue'
import {
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  LinearFilter,
  NormalBlending,
  Shape,
  ShapeGeometry,
  type Box2,
  type Texture,
} from 'three'
import { useLoop } from '@tresjs/core'
import { useDemo1Store } from '../stores'
import type { MapRegion } from './geo'

const props = defineProps<{
  regions: MapRegion[]
  bbox: Box2
  depth: number
}>()

const store = useDemo1Store()
const heatTexture = shallowRef<Texture>()
const heatMeshRef = ref<any>()
const heatMaterialRef = ref<any>()
const heatTime = ref(0)
const heatBaseOpacity = computed(() => (store.drillLevel > 0 ? 0.34 : 0.48))

const heatShapes = computed(() =>
  props.regions.flatMap(region => region.points.map(points => new Shape(points))),
)

const heatGeometry = computed(() => {
  const geometry = new ShapeGeometry(heatShapes.value)
  const pos = geometry.attributes.position
  const width = Math.max(props.bbox.max.x - props.bbox.min.x, 1)
  const height = Math.max(props.bbox.max.y - props.bbox.min.y, 1)
  const uv: number[] = []

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    uv.push((x - props.bbox.min.x) / width, (y - props.bbox.min.y) / height)
  }

  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return geometry
})

function drawHeatPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  power = 1,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, `rgba(255, 0, 0, ${0.86 * power})`)
  gradient.addColorStop(0.18, `rgba(255, 76, 0, ${0.78 * power})`)
  gradient.addColorStop(0.36, `rgba(255, 232, 0, ${0.62 * power})`)
  gradient.addColorStop(0.58, `rgba(35, 218, 112, ${0.42 * power})`)
  gradient.addColorStop(0.78, `rgba(34, 199, 228, ${0.28 * power})`)
  gradient.addColorStop(1, 'rgba(34, 199, 228, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function createHeatTexture() {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'source-over'

  const width = Math.max(props.bbox.max.x - props.bbox.min.x, 1)
  const height = Math.max(props.bbox.max.y - props.bbox.min.y, 1)
  const preferred = new Set([
    '成都市',
    '绵阳市',
    '德阳市',
    '乐山市',
    '宜宾市',
    '南充市',
    '达州市',
    '泸州市',
    '凉山彝族自治州',
    '甘孜藏族自治州',
    '阿坝藏族羌族自治州',
    '广安市',
    '眉山市',
  ])

  const points = props.regions
    .filter((region, index) => preferred.has(region.city) || index % 2 === 0)
    .slice(0, 32)

  points.forEach((region, index) => {
    const [x, y] = region.cityId
    const cx = ((x - props.bbox.min.x) / width) * size
    const cy = (1 - (y - props.bbox.min.y) / height) * size
    const radius = 48 + (index % 5) * 15
    const power = preferred.has(region.city) ? 1 : 0.6
    drawHeatPoint(ctx, cx, cy, radius, power)
  })

  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.flipY = false
  return texture
}

watchEffect(() => {
  if (!props.regions.length) return
  heatTexture.value?.dispose()
  heatTexture.value = createHeatTexture()
})

const disabledRaycast = (_raycaster?: any, _intersects?: any[]) => {}

onMounted(() => {
  if (heatMeshRef.value) heatMeshRef.value.raycast = disabledRaycast
})

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  heatTime.value += delta * Math.max(store.config.lightSpeed, 0.2)
  if (heatMaterialRef.value) {
    heatMaterialRef.value.opacity = heatBaseOpacity.value + Math.sin(heatTime.value * 1.65) * 0.045
  }
})

onBeforeUnmount(() => {
  heatTexture.value?.dispose()
  heatGeometry.value.dispose()
})
</script>

<template>
  <!-- 热力层也使用同一套四川省 ShapeGeometry，避免整张矩形平面压在地图上。 -->
  <TresMesh
    v-if="store.heat && heatTexture"
    ref="heatMeshRef"
    :geometry="heatGeometry"
    :position="[0, 0, props.depth + 0.2]"
    :render-order="90"
  >
    <TresMeshBasicMaterial
      ref="heatMaterialRef"
      :key="heatTexture.uuid"
      :map="heatTexture"
      transparent
      :opacity="heatBaseOpacity"
      :side="DoubleSide"
      :depth-write="false"
      :depth-test="true"
      :blending="NormalBlending"
      :tone-mapped="false"
    />
  </TresMesh>
</template>
