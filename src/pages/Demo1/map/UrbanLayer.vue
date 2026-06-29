<script setup lang="ts">
import { computed } from 'vue'
import {
  AdditiveBlending,
  DoubleSide,
} from 'three'
import { useDemo1Store } from '../stores'
import type { MapRegion } from './geo'

const props = withDefaults(
  defineProps<{
    regions: MapRegion[]
    depth: number
  }>(),
  {
    regions: () => [],
    depth: 8,
  },
)

const store = useDemo1Store()

function hashText(text: string) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function pseudo(seed: number) {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646
  return () => {
    value = (value * 48271) % 2147483647
    return (value - 1) / 2147483646
  }
}

const mainRegions = computed(() =>
  [...props.regions]
    .filter(region => Number.isFinite(region.cityId[0]) && Number.isFinite(region.cityId[1]))
    .sort((a, b) => {
      const av = hashText(a.city) % 10000
      const bv = hashText(b.city) % 10000
      return bv - av
    })
    .slice(0, Math.min(22, props.regions.length)),
)

const buildings = computed(() => {
  const items: Array<{
    id: string
    x: number
    y: number
    z: number
    width: number
    deep: number
    height: number
    rotation: number
    color: string
    opacity: number
  }> = []

  mainRegions.value.forEach((region, regionIndex) => {
    const rand = pseudo(hashText(region.city) + regionIndex * 91)
    const [cx, cy] = region.cityId
    const count = regionIndex < 6 ? 7 : 4
    const clusterRadius = regionIndex < 6 ? 3.8 : 2.6

    for (let i = 0; i < count; i += 1) {
      const angle = rand() * Math.PI * 2
      const radius = 0.55 + rand() * clusterRadius
      const width = 0.52 + rand() * 1.2
      const deep = 0.52 + rand() * 1.2
      const height = 0.75 + rand() * (regionIndex < 5 ? 2.2 : 1.5)
      items.push({
        id: `${region.city}-${i}`,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        z: props.depth + 0.5 + height / 2,
        width,
        deep,
        height,
        rotation: rand() * Math.PI,
        color: rand() > 0.56 ? '#ffe8bd' : '#fff8df',
        opacity: 0.2 + rand() * 0.18,
      })
    }
  })

  return items
})

const glowNodes = computed(() =>
  mainRegions.value.map((region, index) => ({
    id: region.city,
    x: region.cityId[0],
    y: region.cityId[1],
    z: props.depth + 0.72,
    radius: index < 5 ? 3.4 : 2.4,
  })),
)
</script>

<template>
  <!-- 第三十六阶段：二级地图改为“城市路网模式”。这里不再绘制区县之间的发散连线，路网改由贴图层完成。 -->
  <TresGroup v-if="store.drillLevel > 0" :position="[0, 0, 0]">
    <!-- 区县核心城市节点：只保留轻量光圈和楼宇，不再有区域连接线。 -->
    <TresGroup v-for="node in glowNodes" :key="`urban-node-${node.id}`" :position="[node.x, node.y, node.z]">
      <TresMesh :render-order="156">
        <TresCircleGeometry :args="[node.radius, 56]" />
        <TresMeshBasicMaterial
          color="#fff6b8"
          transparent
          :opacity="0.18"
          :side="DoubleSide"
          :depth-test="true"
          :depth-write="false"
          :blending="AdditiveBlending"
          :tone-mapped="false"
        />
      </TresMesh>
      <TresMesh :position="[0, 0, 0.08]" :render-order="157">
        <TresRingGeometry :args="[node.radius * 0.24, node.radius * 0.43, 56]" />
        <TresMeshBasicMaterial
          color="#ffb84e"
          transparent
          :opacity="0.38"
          :side="DoubleSide"
          :depth-test="true"
          :depth-write="false"
          :blending="AdditiveBlending"
          :tone-mapped="false"
        />
      </TresMesh>
      <TresMesh :position="[0, 0, 0.16]" :render-order="158">
        <TresCircleGeometry :args="[0.55, 32]" />
        <TresMeshBasicMaterial
          color="#fff2a8"
          transparent
          :opacity="0.72"
          :side="DoubleSide"
          :depth-test="true"
          :depth-write="false"
          :blending="AdditiveBlending"
          :tone-mapped="false"
        />
      </TresMesh>
    </TresGroup>

    <!-- 低矮楼宇群，只作为城市肌理点缀，透明度降低，避免遮住道路底图。 -->
    <TresMesh
      v-for="building in buildings"
      :key="building.id"
      :position="[building.x, building.y, building.z]"
      :rotation="[0, 0, building.rotation]"
      :render-order="160"
    >
      <TresBoxGeometry :args="[building.width, building.deep, building.height]" />
      <TresMeshStandardMaterial
        :color="building.color"
        transparent
        :opacity="building.opacity"
        :depth-test="true"
        :depth-write="true"
        :metalness="0.04"
        :roughness="0.66"
        emissive="#ffb65b"
        :emissive-intensity="0.04"
      />
    </TresMesh>
  </TresGroup>
</template>
