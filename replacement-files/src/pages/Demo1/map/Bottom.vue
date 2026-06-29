<script setup lang="ts">
import { computed, ref } from 'vue'
import { AdditiveBlending, BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three'
import { useLoop } from '@tresjs/core'
import { useDemo1Store } from '../stores'

const store = useDemo1Store()
const ringARef = ref()
const ringBRef = ref()
const ringCRef = ref()
const diskRef = ref()
const time = ref(0)

const orbitTicks = computed(() =>
  Array.from({ length: 36 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 36
    const radius = index % 3 === 0 ? 106 : 80
    return {
      id: index,
      position: [Math.cos(angle) * radius, Math.sin(angle) * radius, 0.48] as [number, number, number],
      rotation: [0, 0, angle] as [number, number, number],
      scale: [index % 3 === 0 ? 3.8 : 2.1, 0.28, 1] as [number, number, number],
      opacity: index % 3 === 0 ? 0.34 : 0.18,
    }
  }),
)

// 自定义本地 XY 平面的网格线。Scene.vue 会把整个地图旋转到世界 XZ 水平面，
// 所以这里不能再使用默认位于 XZ 平面的 GridHelper，否则会形成一张竖向网格切过地图。
const gridGeometry = computed(() => {
  const size = 300
  const divisions = 80
  const half = size / 2
  const step = size / divisions
  const positions: number[] = []

  for (let i = 0; i <= divisions; i += 1) {
    const p = -half + i * step
    positions.push(-half, p, 0.08, half, p, 0.08)
    positions.push(p, -half, 0.08, p, half, 0.08)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geometry
})

const { onBeforeRender } = useLoop()

onBeforeRender(({ delta }) => {
  time.value += delta * Math.max(store.config.lightSpeed, 0.2)

  if (ringARef.value) ringARef.value.rotation.z += delta * 0.22 * store.config.lightSpeed
  if (ringBRef.value) ringBRef.value.rotation.z -= delta * 0.34 * store.config.lightSpeed
  if (ringCRef.value) {
    ringCRef.value.rotation.z += delta * 0.52 * store.config.lightSpeed
    ringCRef.value.scale.setScalar(1 + Math.sin(time.value * 1.6) * 0.025)
  }
  if (diskRef.value) diskRef.value.scale.setScalar(1 + Math.sin(time.value * 0.9) * 0.018)
})
</script>

<template>
  <!-- 与地图同处本地 XY 平面，避免底部网格斜插进地图主体造成遮挡。 -->
  <TresGroup v-if="store.rotation" :position="[0, 0, -8.5]">
    <TresMesh ref="diskRef" :render-order="-30">
      <TresCircleGeometry :args="[118, 160]" />
      <TresMeshBasicMaterial
        color="#fff1ca"
        transparent
        :opacity="0.026"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="true"
      />
    </TresMesh>

    <TresMesh :render-order="-30">
      <TresPlaneGeometry :args="[1000, 1000]" />
      <TresMeshBasicMaterial color="#f6aa3a" transparent :opacity="0.006" :side="DoubleSide" />
    </TresMesh>

    <TresMesh ref="ringARef" :position="[0, 0, 0.2]" :render-order="-24">
      <TresRingGeometry :args="[104, 106, 192]" />
      <TresMeshBasicMaterial
        color="#ffd782"
        transparent
        :opacity="0.16"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="true"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <TresMesh ref="ringBRef" :position="[0, 0, 0.28]" :render-order="-23">
      <TresRingGeometry :args="[78, 80, 160]" />
      <TresMeshBasicMaterial
        color="#ff7a1a"
        transparent
        :opacity="0.13"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="true"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <TresMesh ref="ringCRef" :position="[0, 0, 0.36]" :render-order="-22">
      <TresRingGeometry :args="[52, 53.2, 128]" />
      <TresMeshBasicMaterial
        color="#fff0a8"
        transparent
        :opacity="0.18"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="true"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <TresMesh
      v-for="tick in orbitTicks"
      :key="tick.id"
      :position="tick.position"
      :rotation="tick.rotation"
      :scale="tick.scale"
      :render-order="-21"
    >
      <TresPlaneGeometry :args="[1, 1]" />
      <TresMeshBasicMaterial
        color="#ff8a1e"
        transparent
        :opacity="tick.opacity"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="true"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <TresLineSegments :geometry="gridGeometry" :render-order="-32">
      <TresLineBasicMaterial color="#ffe0a4" transparent :opacity="0.34" />
    </TresLineSegments>
  </TresGroup>
</template>
