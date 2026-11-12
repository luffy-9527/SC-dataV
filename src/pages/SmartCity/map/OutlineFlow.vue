<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  ShaderMaterial,
  Shape,
  Vector2,
  Vector3,
  type Box2,
} from 'three'
import { useLoop } from '@tresjs/core'
import type { GeoProjection } from 'd3-geo'
import type { CityGeoJSON } from '@/types/map'

const props = defineProps<{
  data: CityGeoJSON
  projection: GeoProjection
  bbox: Box2
  depth: number
}>()

const sideSweepTime = ref(0)

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

const outlineRings = computed(() => {
  const rings: Vector2[][] = []

  props.data.features.forEach(feature => {
    collectRings(feature.geometry.coordinates).forEach(ring => {
      const points = ring
        .map(coord => {
          const projected = props.projection(coord as [number, number])
          if (!projected) return null
          const [x, y] = projected
          return new Vector2(x, -y)
        })
        .filter(Boolean) as Vector2[]

      if (points.length >= 3) rings.push(points)
    })
  })

  return rings
})

const outlineGeometry = computed(() => {
  const positions: number[] = []

  outlineRings.value.forEach(ring => {
    ring.forEach((point, index) => {
      const next = ring[(index + 1) % ring.length]
      positions.push(point.x, point.y, props.depth + 0.72)
      positions.push(next.x, next.y, props.depth + 0.72)
    })
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geometry
})

const sweepGeometry = computed(() => {
  const shapes = outlineRings.value.map(ring => new Shape(ring))
  const positions: number[] = []
  const alphas: number[] = []

  shapes.forEach(shape => {
    const points = new CatmullRomCurve3(
      shape.getPoints(420).map(point => new Vector3(point.x, point.y, props.depth + 0.82)),
      true,
      'catmullrom',
      0.22,
    ).getSpacedPoints(360)

    const count = points.length
    points.forEach((point, index) => {
      const next = points[(index + 1) % count]
      const p = index / Math.max(count - 1, 1)
      positions.push(point.x, point.y, point.z)
      positions.push(next.x, next.y, next.z)
      alphas.push(p, p)
    })
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aPercent', new Float32BufferAttribute(alphas, 1))
  return geometry
})

const baseLineMaterial = new LineBasicMaterial({
  color: '#fff1c4',
  transparent: true,
  opacity: 0.52,
  depthTest: true,
  depthWrite: false,
})

const sweepMaterial = new ShaderMaterial({
  transparent: true,
  depthTest: true,
  depthWrite: false,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new Color('#ff6b16') },
  },
  vertexShader: `
    attribute float aPercent;
    varying float vPercent;
    void main() {
      vPercent = aPercent;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying float vPercent;
    void main() {
      float head = fract(uTime);
      float d = abs(vPercent - head);
      d = min(d, 1.0 - d);
      float alpha = smoothstep(0.18, 0.0, d);
      alpha = pow(alpha, 1.8);
      gl_FragColor = vec4(uColor, alpha * 0.92);
    }
  `,
})

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  sideSweepTime.value = (sideSweepTime.value + delta * 0.16) % 1
  sweepMaterial.uniforms.uTime.value = sideSweepTime.value
})

onBeforeUnmount(() => {
  outlineGeometry.value.dispose()
  sweepGeometry.value.dispose()
  baseLineMaterial.dispose()
  sweepMaterial.dispose()
})
</script>

<template>
  <!-- 地图顶面静态轮廓线。 -->
  <TresLineSegments :geometry="outlineGeometry" :material="baseLineMaterial" :render-order="120" />

  <!-- 轮廓流光扫线，补回原 React 版边缘流光视觉。 -->
  <TresLineSegments :geometry="sweepGeometry" :material="sweepMaterial" :render-order="125" />
</template>
