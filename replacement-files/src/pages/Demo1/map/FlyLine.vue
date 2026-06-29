<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  PointsMaterial,
  Vector3,
  type Box2,
} from 'three'
import { useLoop } from '@tresjs/core'
import type { GeoProjection } from 'd3-geo'
import type { CityGeoJSON } from '@/types/map'
import { useDemo1Store } from '../stores'

const props = defineProps<{
  data: CityGeoJSON
  projection: GeoProjection
  bbox: Box2
  depth: number
}>()

const store = useDemo1Store()
const geometry = shallowRef(new BufferGeometry())
const routePoints = shallowRef<Vector3[]>([])
const index = ref(0)
const pointCount = 56

function isLngLat(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number'
}

function collectRings(input: unknown): number[][][] {
  const rings: number[][][] = []

  const walk = (node: unknown) => {
    if (!Array.isArray(node) || node.length === 0) return
    if (isLngLat(node[0])) {
      rings.push(node as number[][])
      return
    }
    node.forEach(walk)
  }

  walk(input)
  return rings
}

const pointsMaterial = new PointsMaterial({
  color: store.config.flyLineColor,
  size: 1.45,
  transparent: true,
  opacity: 0.96,
  depthTest: false,
  depthWrite: false,
  blending: AdditiveBlending,
  sizeAttenuation: true,
})

watch(
  () => store.config.flyLineColor,
  color => {
    pointsMaterial.color.set(color)
    pointsMaterial.needsUpdate = true
  },
  { immediate: true },
)

function rebuildRoute() {
  const outline: Vector3[] = []

  props.data.features.forEach(feature => {
    collectRings(feature.geometry.coordinates).forEach(ring => {
      ring.forEach(coord => {
        const projected = props.projection(coord as [number, number])
        if (!projected) return
        const [x, y] = projected
        outline.push(new Vector3(x, -y, props.depth + 1.05))
      })
    })
  })

  if (outline.length < 4) return

  routePoints.value = new CatmullRomCurve3(outline, true, 'catmullrom', 0.18).getSpacedPoints(1200)
  index.value = Math.floor(routePoints.value.length * 0.36)
}

function updateGeometry() {
  const points = routePoints.value
  if (!points.length) return

  const total = points.length
  const start = Math.floor(index.value) % total
  const segment: Vector3[] = []

  for (let i = 0; i < pointCount; i += 1) {
    segment.push(points[(start + i) % total])
  }

  const positions: number[] = []
  const alphas: number[] = []
  segment.forEach((point, i) => {
    positions.push(point.x, point.y, point.z)
    const center = Math.abs(i - pointCount * 0.5) / (pointCount * 0.5)
    alphas.push(1 - center)
  })

  geometry.value.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.value.setAttribute('alpha', new Float32BufferAttribute(alphas, 1))
  geometry.value.computeBoundingSphere()
}

onMounted(() => {
  rebuildRoute()
  updateGeometry()
})

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  if (!store.mapPlayComplete || !routePoints.value.length) return
  index.value = (index.value + delta * 92 * Math.max(store.config.lightSpeed, 0.2)) % routePoints.value.length
  updateGeometry()
})

onBeforeUnmount(() => {
  geometry.value.dispose()
  pointsMaterial.dispose()
})
</script>

<template>
  <TresPoints v-if="routePoints.length" :geometry="geometry" :material="pointsMaterial" :render-order="130" />
</template>
