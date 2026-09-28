<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { gsap } from 'gsap'
import type { CityGeoJSON } from '@/types/map'
import mapImage from '@/assets/sc_map.png'
import normalMapImage from '@/assets/sc_normal_map.png'
import loadTexture from '../helpers/loadTexture'
import createDrillTerrainTexture from '../helpers/createDrillTerrainTexture'
import { useDemo1Store } from '../stores'
import { buildMapRegions } from './geo'
import City from './City.vue'
import Heatmap from './Heatmap.vue'
import OutlineFlow from './OutlineFlow.vue'
import FlyLine from './FlyLine.vue'

const props = withDefaults(
  defineProps<{
    depth?: number
    data: CityGeoJSON
    outlineData?: CityGeoJSON
    parentData?: CityGeoJSON
    parentAdcode?: string
    parentTitle?: string
  }>(),
  {
    depth: 8,
  },
)

const emit = defineEmits<{
  (event: 'region-click', name: string): void
}>()

const store = useDemo1Store()
const groupRef = ref()
const mapTexture = shallowRef<Texture>()
const normalTexture = shallowRef<Texture>()
const drillTerrainTexture = shallowRef<Texture>()
const currentMapTexture = computed(() => (store.drillLevel > 0 ? drillTerrainTexture.value : mapTexture.value))
const texturesReady = computed(() => Boolean(currentMapTexture.value && normalTexture.value))

const depth = computed(() => store.config.mapDepth || props.depth)
function getMapFitTarget() {
  if (store.drillLevel <= 0) {
    return getUrlNumberParam('mapTarget') || 255
  }

  // 二级市级与三级区县级下钻默认目标尺寸
  return getUrlNumberParam('drillTarget') || 180
}

const mapFitTarget = computed(() => getMapFitTarget())
const mapResult = computed(() => buildMapRegions(props.data, depth.value, mapFitTarget.value))

function getUrlNumberParam(name: string) {
  const matched = window.location.href.match(new RegExp(`[?&]${name}=(-?\\d+(?:\\.\\d+)?)`))
  return matched ? Number(matched[1]) : undefined
}

const drillExtraScale = computed(() => {
  if (store.drillLevel <= 0) return 1

  // 兼容上一版的 drillScale 参数，但这里作为“额外倍率”使用。
  // 常用范围：1 ~ 1.6。更推荐用 drillTarget 控制最终地图尺寸。
  const manualScale = getUrlNumberParam('drillScale')
  return manualScale && Number.isFinite(manualScale) && manualScale > 0 ? manualScale : 1
})


watch(
  () => [store.drillLevel, store.drillTitle, props.data] as const,
  ([level, title, data]) => {
    if (level <= 0) return
    drillTerrainTexture.value?.dispose()
    const isDistrict = level >= 2
    drillTerrainTexture.value = createDrillTerrainTexture(
      title,
      data,
      mapTexture.value?.image as HTMLImageElement | undefined,
      {
        parentTitle: props.parentTitle,
        parentAdcode: props.parentAdcode,
        parentData: props.parentData,
      },
      isDistrict,
    )
  },
)

watch(depth, () => {
  store.mapPlayComplete = false
  requestAnimationFrame(() => {
    store.mapPlayComplete = true
  })
})

watch(
  () => props.data,
  async () => {
    // 下钻切图时做一次轻量缩放入场，避免地图硬切。
    await nextTick()
    const group = groupRef.value
    if (!group?.scale) return
    group.scale.set(0.86, 0.86, 0.86)
    gsap.to(group.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.72,
      ease: 'circ.out',
    })
  },
)

onMounted(async () => {
  const [texture1, texture2] = await Promise.all([
    loadTexture(mapImage, tex => {
      tex.wrapS = tex.wrapT = RepeatWrapping
      tex.colorSpace = SRGBColorSpace
      tex.minFilter = LinearMipmapLinearFilter
      tex.magFilter = LinearFilter
      tex.anisotropy = 16
      tex.needsUpdate = true
    }),
    loadTexture(normalMapImage, tex => {
      tex.wrapS = tex.wrapT = RepeatWrapping
      tex.minFilter = LinearMipmapLinearFilter
      tex.magFilter = LinearFilter
      tex.anisotropy = 16
      tex.needsUpdate = true
    }),
  ])

  mapTexture.value = texture1
  normalTexture.value = texture2
  drillTerrainTexture.value = createDrillTerrainTexture(
    store.drillTitle,
    props.data,
    texture1.image as HTMLImageElement | undefined,
    {
      parentTitle: props.parentTitle,
      parentAdcode: props.parentAdcode,
      parentData: props.parentData,
    },
  )

  await nextTick()
  if (groupRef.value?.scale) {
    groupRef.value.scale.set(0.78, 0.78, 0.78)
    gsap.to(groupRef.value.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.1,
      ease: 'circ.out',
      onComplete: () => {
        store.mapPlayComplete = true
      },
    })
  } else {
    store.mapPlayComplete = true
  }
})

onBeforeUnmount(() => {
  mapTexture.value?.dispose()
  normalTexture.value?.dispose()
  drillTerrainTexture.value?.dispose()
})
</script>

<template>
  <TresGroup :key="`${store.drillLevel}-${mapFitTarget}-${drillExtraScale}`" :scale="[drillExtraScale, drillExtraScale, 1]">
    <TresGroup ref="groupRef">
      <!-- 等 sc_map.png / sc_normal_map.png 都加载完再创建地图，避免初始化灰白材质被缓存。 -->
      <template v-if="texturesReady">
      <City
        v-for="region in mapResult.regions"
        :key="`${store.drillLevel}-${region.city}`"
        :data="region"
        :bbox="mapResult.bbox"
        :depth="depth"
        :map="currentMapTexture"
        :normal-map="normalTexture"
        @region-click="emit('region-click', $event)"
      />
      <!-- 第三十七阶段：二级地图改回真实地形纹理，不再叠加城市路网/区域连接线。 -->
      <Heatmap v-if="store.drillLevel === 0" :regions="mapResult.regions" :bbox="mapResult.bbox" :depth="depth + 0.62" />

      <!-- 轮廓流光与边缘飞线：补回原版地图动态细节。 -->
      <template v-if="store.drillLevel === 0">
        <OutlineFlow
          :data="props.outlineData || props.data"
          :projection="mapResult.projection"
          :bbox="mapResult.bbox"
          :depth="depth"
        />
        <FlyLine
          :data="props.outlineData || props.data"
          :projection="mapResult.projection"
          :bbox="mapResult.bbox"
          :depth="depth"
        />
      </template>
      </template>
    </TresGroup>
  </TresGroup>
</template>
