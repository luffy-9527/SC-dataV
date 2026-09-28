<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AdditiveBlending, DoubleSide } from 'three'
import { useLoop } from '@tresjs/core'
import { useDemo1Store } from '../stores'

const props = withDefaults(
  defineProps<{
    position?: [number, number, number]
    value?: number
    factor?: number
    max?: number
    color1?: string
    color2?: string
    active?: boolean
  }>(),
  {
    position: () => [0, 0, 0],
    value: 0,
    factor: 5,
    max: 1000,
    color1: '#ffe48a',
    color2: '#ff6b16',
    active: false,
  },
)

const store = useDemo1Store()
const barGroupRef = ref()
const ringRef = ref()
const ringOuterRef = ref()
const capRef = ref()
const beamRef = ref()
const coreRef = ref()
const time = ref(0)

const barHeight = computed(() => {
  const raw = Math.sqrt(Math.max(props.value, 1) / 80) * props.factor
  return Math.min(42, Math.max(4.8, raw)) * (props.active ? 1.22 : 1)
})

const radius = computed(() => Math.max(0.24, props.factor * 0.052) * (props.active ? 1.18 : 1))
const { onBeforeRender } = useLoop()

onBeforeRender(({ delta }) => {
  time.value += delta * Math.max(store.config.lightSpeed, 0.2)
  const pulse = 1 + Math.sin(time.value * 3.2) * 0.14
  const slowPulse = 1 + Math.sin(time.value * 1.8) * 0.2
  const beamPulse = 1 + Math.sin(time.value * 5.2) * 0.08

  if (ringRef.value) {
    ringRef.value.rotation.z += delta * 1.55 * store.config.lightSpeed
    ringRef.value.scale.setScalar(pulse)
  }

  if (ringOuterRef.value) {
    ringOuterRef.value.rotation.z -= delta * 0.92 * store.config.lightSpeed
    ringOuterRef.value.scale.setScalar(slowPulse)
  }

  if (capRef.value) capRef.value.position.z = barHeight.value + Math.sin(time.value * 4.4) * 0.26

  if (beamRef.value) {
    beamRef.value.scale.x = beamPulse
    beamRef.value.scale.y = beamPulse
  }

  if (coreRef.value) {
    coreRef.value.scale.x = 1 + Math.sin(time.value * 6.4) * 0.12
    coreRef.value.scale.y = 1 + Math.sin(time.value * 6.4) * 0.12
  }
})

function disableRaycast(obj: any) {
  if (obj) obj.raycast = () => undefined
}

watch(
  () => [barGroupRef.value, ringOuterRef.value, ringRef.value, beamRef.value, coreRef.value, capRef.value],
  ([group, m1, m2, m3, m4, m5]) => {
    if (group) {
      group.raycast = () => undefined
      group.traverse?.((child: any) => {
        child.raycast = () => undefined
      })
    }
    disableRaycast(m1)
    disableRaycast(m2)
    disableRaycast(m3)
    disableRaycast(m4)
    disableRaycast(m5)
  },
  { immediate: true },
)
</script>

<template>
  <TresGroup v-if="store.bar" ref="barGroupRef" :position="props.position">
    <!-- 底部能量环保持在地图表面，跟随城市点位呼吸扩散。 -->
    <TresMesh ref="ringOuterRef" :position="[0, 0, 0.28]" :render-order="118">
      <TresRingGeometry :args="[1.25, 2.85, 120]" />
      <TresMeshBasicMaterial
        :color="props.color1"
        transparent
        :opacity="props.active ? 0.54 : 0.34"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="false"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <TresMesh ref="ringRef" :position="[0, 0, 0.36]" :render-order="122">
      <TresRingGeometry :args="[0.48, 0.9, 96]" />
      <TresMeshBasicMaterial
        :color="props.color2"
        transparent
        :opacity="props.active ? 1 : 0.78"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="false"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <!-- Three.js 的 CylinderGeometry / ConeGeometry 默认沿 Y 轴拉伸。
         这里统一旋转 90 度，让柱体沿地图本地 Z 轴竖直向上，避免在场景倾斜后横着显示。 -->
    <TresMesh ref="beamRef" :position="[0, 0, barHeight / 2]" :rotation="[Math.PI / 2, 0, 0]" :render-order="126">
      <TresCylinderGeometry :args="[radius, radius * 0.62, barHeight, 24, 1, true]" />
      <TresMeshBasicMaterial
        :color="props.color2"
        transparent
        :opacity="props.active ? 0.96 : 0.84"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="false"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <TresMesh ref="coreRef" :position="[0, 0, barHeight / 2]" :rotation="[Math.PI / 2, 0, 0]" :render-order="127">
      <TresCylinderGeometry :args="[radius * 0.34, radius * 0.22, barHeight * 1.08, 18, 1, true]" />
      <TresMeshBasicMaterial
        :color="props.color1"
        transparent
        :opacity="props.active ? 0.96 : 0.74"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="false"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <TresMesh ref="capRef" :position="[0, 0, barHeight]" :render-order="130">
      <TresSphereGeometry :args="[props.active ? 0.58 : 0.46, 28, 18]" />
      <TresMeshBasicMaterial
        :color="props.color1"
        transparent
        :opacity="props.active ? 1 : 0.96"
        :depth-write="false"
        :depth-test="false"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <TresMesh :position="[0, 0, barHeight * 0.5]" :rotation="[Math.PI / 2, 0, 0]" :render-order="125">
      <TresConeGeometry :args="[props.active ? 1.36 : 0.96, barHeight * 1.12, 36, 1, true]" />
      <TresMeshBasicMaterial
        :color="props.color1"
        transparent
        :opacity="props.active ? 0.22 : 0.13"
        :side="DoubleSide"
        :depth-write="false"
        :depth-test="false"
        :blending="AdditiveBlending"
        :tone-mapped="false"
      />
    </TresMesh>

    <slot :barHeight="barHeight" />
  </TresGroup>
</template>
