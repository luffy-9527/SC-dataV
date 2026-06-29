<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { CityGeoJSON } from '@/types/map'
import scMapData from '@/assets/sc.json'
import scOutlineData from '@/assets/sc_outline.json'
import { useDemo1Store } from '../stores'
import Base from './Base.vue'
import Bottom from './Bottom.vue'
import Cloud from './Cloud.vue'
import { canDrillRegion, loadDrillMap } from './drill'

interface DrillStackItem {
  title: string
  data: CityGeoJSON
  outlineData: CityGeoJSON
}

const rootMapData = scMapData as CityGeoJSON
const rootOutlineData = scOutlineData as CityGeoJSON
const store = useDemo1Store()

const currentMapData = shallowRef<CityGeoJSON>(rootMapData)
const currentOutlineData = shallowRef<CityGeoJSON>(rootOutlineData)
const drillStack = shallowRef<DrillStackItem[]>([])

/**
 * 地图初始方向。
 * 可选值：0 / 90 / 180 / 270。
 * 也可以临时通过地址测试：#/demo1?yaw=180
 */
const initialMapYawDeg = 0

function getYawFromUrl() {
  const matched = window.location.href.match(/[?&]yaw=(-?\d+(?:\.\d+)?)/)
  return matched ? Number(matched[1]) : initialMapYawDeg
}

const initialMapYaw = computed(() => (getYawFromUrl() * Math.PI) / 180)

async function handleRegionClick(name: string) {
  // 第二十八阶段：只在省级地图时下钻。进入成都市区县图后，点击区县默认不再继续下钻。
  if (store.drillLevel > 0 || !canDrillRegion(name) || store.drillLoading) return

  try {
    store.setDrillLoading(true)
    const result = await loadDrillMap(name)
    if (!result) return

    drillStack.value = [
      ...drillStack.value,
      {
        title: store.drillTitle,
        data: currentMapData.value,
        outlineData: currentOutlineData.value,
      },
    ]

    currentMapData.value = result.data
    // 下钻地图本身已包含区县边界，轮廓流光直接使用当前数据。
    currentOutlineData.value = result.data
    store.setDrillInfo({
      level: drillStack.value.length,
      title: result.title,
      canBack: true,
      error: '',
    })
  } catch (error) {
    console.error(error)
    store.setDrillInfo({
      error: error instanceof Error ? error.message : '地图下钻失败',
    })
  } finally {
    store.setDrillLoading(false)
  }
}

function backToPreviousMap() {
  const prev = drillStack.value[drillStack.value.length - 1]
  if (!prev) return

  drillStack.value = drillStack.value.slice(0, -1)
  currentMapData.value = prev.data
  currentOutlineData.value = prev.outlineData
  store.setDrillInfo({
    level: drillStack.value.length,
    title: prev.title,
    canBack: drillStack.value.length > 0,
    error: '',
  })
}

watch(
  () => store.drillBackSeq,
  () => {
    backToPreviousMap()
  },
)
</script>

<template>
  <TresGroup :position="[0, -7, 6]" :scale="[1.08, 1.08, 1.08]">
    <!-- 把 GeoJSON 的 XY 顶面旋到 Three.js 的 XZ 水平面。 -->
    <TresGroup :rotation="[-Math.PI / 2, 0, 0]">
      <!-- 在地图自身平面内调整初始方向。 -->
      <TresGroup :rotation="[0, 0, initialMapYaw]">
        <Cloud />
        <Base :data="currentMapData" :outline-data="currentOutlineData" @region-click="handleRegionClick" />
        <Bottom />
      </TresGroup>
    </TresGroup>
  </TresGroup>
</template>
