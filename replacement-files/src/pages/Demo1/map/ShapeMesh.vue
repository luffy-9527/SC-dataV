<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DoubleSide, Float32BufferAttribute, ShapeGeometry, type Box2, type Shape } from 'three'

const props = withDefaults(
  defineProps<{
    shapes: Shape[]
    bbox: Box2
    positionZ?: number
    map?: import('three').Texture
    normalMap?: import('three').Texture
    color?: string
    opacity?: number
    renderOrder?: number
    depthTest?: boolean
    raycastable?: boolean
  }>(),
  {
    positionZ: 0,
    opacity: 1,
    renderOrder: 80,
    depthTest: true,
    raycastable: true,
  },
)

const meshRef = ref<any>()
const originalRaycast = ref<((raycaster: any, intersects: any[]) => void) | null>(null)
const disabledRaycast = (_raycaster?: any, _intersects?: any[]) => {}

const geometry = computed(() => {
  const shapeGeometry = new ShapeGeometry(props.shapes)
  const pos = shapeGeometry.attributes.position
  const width = Math.max(props.bbox.max.x - props.bbox.min.x, 1)
  const height = Math.max(props.bbox.max.y - props.bbox.min.y, 1)
  const uv: number[] = []

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    uv.push((x - props.bbox.min.x) / width, (y - props.bbox.min.y) / height)
  }

  shapeGeometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return shapeGeometry
})

function syncRaycast() {
  if (!meshRef.value) return
  if (!originalRaycast.value && typeof meshRef.value.raycast === 'function') {
    originalRaycast.value = meshRef.value.raycast.bind(meshRef.value)
  }

  meshRef.value.raycast = props.raycastable
    ? originalRaycast.value || meshRef.value.raycast
    : disabledRaycast
}

onMounted(syncRaycast)
watch(() => props.raycastable, syncRaycast)

onBeforeUnmount(() => {
  geometry.value.dispose()
})
</script>

<template>
  <TresMesh
    ref="meshRef"
    :geometry="geometry"
    :position="[0, 0, props.positionZ]"
    :render-order="props.renderOrder"
    receive-shadow
  >
    <TresMeshBasicMaterial
      v-if="props.map"
      :key="props.map.uuid"
      :map="props.map"
      :side="DoubleSide"
      :transparent="props.opacity < 0.999"
      :opacity="props.opacity"
      :depth-write="true"
      :depth-test="props.depthTest"
      :polygon-offset="true"
      :polygon-offset-factor="-1"
      :polygon-offset-units="-1"
      :tone-mapped="false"
    />

    <TresMeshBasicMaterial
      v-else
      :color="props.color || '#86a77d'"
      :side="DoubleSide"
      :transparent="props.opacity < 0.999"
      :opacity="props.opacity"
      :depth-write="true"
      :depth-test="props.depthTest"
      :polygon-offset="true"
      :polygon-offset-factor="-1"
      :polygon-offset-units="-1"
      :tone-mapped="false"
    />
  </TresMesh>
</template>
