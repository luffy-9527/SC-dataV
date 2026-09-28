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
  adcode?: string
  data: CityGeoJSON
  outlineData: CityGeoJSON
}

const rootMapData = scMapData as CityGeoJSON
const rootOutlineData = scOutlineData as CityGeoJSON
const store = useDemo1Store()

const currentMapData = shallowRef<CityGeoJSON>(rootMapData)
const currentOutlineData = shallowRef<CityGeoJSON>(rootOutlineData)
const currentAdcode = shallowRef<string>('')
const drillStack = shallowRef<DrillStackItem[]>([])

const parentStackItem = computed(() => drillStack.value[drillStack.value.length - 1])
const parentData = computed(() => parentStackItem.value?.data)
const parentAdcode = computed(() => parentStackItem.value?.adcode)
const parentTitle = computed(() => parentStackItem.value?.title)

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
  // 支持三级下钻：0级(省) -> 1级(市) -> 2级(区县)。进入区县后不再继续下钻。
  if (store.drillLevel >= 2 || !canDrillRegion(name, store.drillLevel, currentMapData.value) || store.drillLoading) return

  try {
    store.setDrillLoading(true)
    const currentLevel = store.drillLevel
    const prevTitle = store.drillTitle
    const result = await loadDrillMap(name, currentLevel, currentMapData.value, prevTitle)
    if (!result) return

    drillStack.value = [
      ...drillStack.value,
      {
        title: store.drillTitle,
        adcode: currentAdcode.value,
        data: currentMapData.value,
        outlineData: currentOutlineData.value,
      },
    ]

    currentMapData.value = result.data
    // 下钻地图本身已包含边界，轮廓流光使用当前数据
    currentOutlineData.value = result.data
    currentAdcode.value = result.adcode

    const nextTitle = currentLevel === 0 ? result.title : `${prevTitle} / ${result.title}`
    store.setDrillInfo({
      level: drillStack.value.length,
      title: nextTitle,
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

if (typeof window !== 'undefined') {
  ;(window as any).__TRIGGER_DRILL__ = handleRegionClick
}

function backToPreviousMap() {
  const prev = drillStack.value[drillStack.value.length - 1]
  if (!prev) return

  drillStack.value = drillStack.value.slice(0, -1)
  currentMapData.value = prev.data
  currentOutlineData.value = prev.outlineData
  currentAdcode.value = prev.adcode || ''
  store.setDrillInfo({
    level: drillStack.value.length,
    title: prev.title,
    canBack: drillStack.value.length > 0,
    error: '',
  })
}

function backToRootMap() {
  if (!drillStack.value.length) return
  const root = drillStack.value[0]
  drillStack.value = []
  currentMapData.value = root.data
  currentOutlineData.value = root.outlineData
  currentAdcode.value = ''
  store.setDrillInfo({
    level: 0,
    title: '四川省',
    canBack: false,
    error: '',
  })
}

watch(
  () => store.drillBackSeq,
  () => {
    backToPreviousMap()
  },
)

watch(
  () => store.drillResetSeq,
  () => {
    backToRootMap()
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
        <Base
          :data="currentMapData"
          :outline-data="currentOutlineData"
          :parent-data="parentData"
          :parent-adcode="parentAdcode"
          :parent-title="parentTitle"
          @region-click="handleRegionClick"
        />
        <Bottom />
      </TresGroup>
    </TresGroup>
  </TresGroup>
</template>
