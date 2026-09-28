<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import {
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
  type Box2,
  type Texture,
} from 'three'
import { useLoop } from '@tresjs/core'
import { useDemo1Store } from '../stores'
import Tooltip from './Tooltip.vue'
import Bar from './Bar.vue'
import Label from './Label.vue'
import ShapeMesh from './ShapeMesh.vue'
import cityData from '../cityData'
import type { MapRegion } from './geo'

const props = defineProps<{
  bbox: Box2
  depth: number
  data: MapRegion
  map?: Texture
  normalMap?: Texture
}>()

const emit = defineEmits<{
  (event: 'region-click', name: string): void
}>()

const store = useDemo1Store()
const groupRef = ref()
const tooltipRef = ref<InstanceType<typeof Tooltip> | null>(null)
const hovered = ref(false)
const targetScale = shallowRef(new Vector3(1, 1, 1))
const targetPosition = shallowRef(new Vector3(0, 0, 0))

const shapes = computed(() => props.data.points.map(points => new Shape(points)))
const topGeometry = computed(() => new ShapeGeometry(shapes.value))
const extrudeGeometry = computed(
  () => new ExtrudeGeometry(shapes.value, { depth: props.depth, steps: 1, bevelEnabled: false }),
)
const edgesGeometry = computed(() => new EdgesGeometry(topGeometry.value))
// 侧壁纵向棱线：增强地图切片的立体厚度，接近原版白色地形侧壁效果。
const extrudeEdgesGeometry = computed(() => new EdgesGeometry(extrudeGeometry.value, 12))

const capMaterial = new MeshBasicMaterial({
  visible: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  depthTest: false,
  side: DoubleSide,
})

const sideMaterial = new MeshStandardMaterial({
  color: store.config.sideColor,
  // 侧壁必须完全不透明：hover 时只做整体上浮，不再用透明材质制造高亮，避免出现“透底/重影”。
  transparent: false,
  opacity: 1,
  depthWrite: true,
  depthTest: true,
  metalness: 0.0,
  roughness: 0.9,
  side: DoubleSide,
  emissive: '#ffffff',
  emissiveIntensity: 0.012,
})

const interactionMaterial = new MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0,
  depthTest: false,
  depthWrite: false,
  side: DoubleSide,
})

const topBackingMaterial = new MeshBasicMaterial({
  // 顶面背板必须是不透明的：hover 上浮后负责遮挡下方相邻行政区的边线、热力和标签，避免看起来像透明。
  color: '#f4efe0',
  transparent: false,
  opacity: 1,
  depthTest: true,
  depthWrite: true,
  side: DoubleSide,
})

watch(
  () => store.config.sideColor,
  color => {
    sideMaterial.color.set(color)
  },
  { immediate: true },
)

const extrudeMaterials = [capMaterial, sideMaterial]

function hashString(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}

const cityInfo = computed(() => {
  const info = cityData[props.data.city as keyof typeof cityData]
  if (info) {
    return {
      city: props.data.city,
      population: info.population,
      gdp: info.gdp,
      area: info.area,
    }
  }
  const hash = Math.abs(hashString(props.data.city))
  const pop = 35 + (hash % 65)
  const gdp = (pop * 0.75 + (hash % 20)).toFixed(1)
  const area = 80 + (hash % 600)
  return {
    city: props.data.city,
    population: pop,
    gdp: `${gdp}亿`,
    area: `${area}平方公里`,
  }
})

const cityTopOpacity = computed(() => 1)
// 悬浮时只提升当前行政区本体；不再保留全局地形贴图副本，避免 hover 出现重影。
const cityRenderOrder = computed(() => (hovered.value ? 178 : 88))

const { onBeforeRender } = useLoop()
onBeforeRender(() => {
  const group = groupRef.value
  if (!group?.scale || !group?.position) return
  group.scale.lerp(targetScale.value, 0.13)
  group.position.lerp(targetPosition.value, 0.16)
})

let leaveTimer: ReturnType<typeof setTimeout> | null = null

function handlePointerOver(event?: { stopPropagation?: () => void }) {
  event?.stopPropagation?.()
  if (leaveTimer) {
    clearTimeout(leaveTimer)
    leaveTimer = null
  }
  // 三级区县展示：纯净卫星遥感展示模式，禁止弹窗遮挡，不改变手型指针，不进行单体晃动浮起
  if (store.drillLevel >= 2) return

  if (hovered.value) return
  hovered.value = true
  targetScale.value.set(1.018, 1.018, 1.025)
  targetPosition.value.set(0, 0, 2.85)
  if (store.config.showTooltip) {
    tooltipRef.value?.open(2600)
  }
  document.body.style.cursor = 'pointer'
}

function handleClick(event?: { stopPropagation?: () => void }) {
  event?.stopPropagation?.()
  if (store.drillLevel >= 2) return
  tooltipRef.value?.close()
  emit('region-click', props.data.city)
}

function handlePointerOut(event?: { stopPropagation?: () => void }) {
  event?.stopPropagation?.()
  if (store.drillLevel >= 2) {
    hovered.value = false
    document.body.style.cursor = 'auto'
    return
  }
  if (leaveTimer) clearTimeout(leaveTimer)
  leaveTimer = setTimeout(() => {
    hovered.value = false
    targetScale.value.set(1, 1, 1)
    targetPosition.value.set(0, 0, 0)
    tooltipRef.value?.close()
    document.body.style.cursor = 'auto'
    leaveTimer = null
  }, 100)
}

onBeforeUnmount(() => {
  topGeometry.value.dispose()
  extrudeGeometry.value.dispose()
  edgesGeometry.value.dispose()
  extrudeEdgesGeometry.value.dispose()
  capMaterial.dispose()
  sideMaterial.dispose()
  interactionMaterial.dispose()
  topBackingMaterial.dispose()
})
</script>

<template>
  <TresGroup ref="groupRef">
    <!-- 行政区侧壁：鼠标悬浮时跟随该行政区整体上浮，恢复原版“浮起”反馈。 -->
    <TresMesh cast-shadow receive-shadow :geometry="extrudeGeometry" :material="extrudeMaterials" :render-order="3" />

    <!-- 侧壁切片线：低位视角下会出现原版那种竖向白色岩层/墙体条纹。 -->
    <TresLineSegments :geometry="extrudeEdgesGeometry" :render-order="18">
      <TresLineBasicMaterial
        :color="hovered ? '#fff4c9' : '#fffaf0'"
        transparent
        :opacity="hovered ? 0.94 : 0.64"
        :depth-test="true"
        :depth-write="false"
      />
    </TresLineSegments>

    <!-- 不透明顶面背板：让 hover 上浮的行政区成为真正的实心切片，遮住下方其它行政区，不再出现“透明看穿”的视觉。 -->
    <TresMesh
      :geometry="topGeometry"
      :position="[0, 0, props.depth + 0.12]"
      :material="topBackingMaterial"
      :render-order="hovered ? 170 : 70"
    />

    <!-- 每个行政区单独承载一份地形纹理。hover 时保持 100% 不透明，不再叠加半透明色块。 -->
    <ShapeMesh
      :key="`${props.data.city}-${props.map?.uuid || 'map'}`"
      :position-z="props.depth + 0.18"
      :bbox="props.bbox"
      :shapes="shapes"
      :map="props.map"
      :normal-map="props.normalMap"
      color="#6f9568"
      :opacity="cityTopOpacity"
      :render-order="cityRenderOrder"
      :depth-test="true"
      :raycastable="false"
    />

    <!-- 专用交互面：只让这个透明行政区顶面参与 TresJS hover，避免云层、热力层、线段、柱状等装饰对象参与射线检测导致 origin 异常。 -->
    <TresMesh
      :geometry="topGeometry"
      :position="[0, 0, props.depth + 0.42]"
      :material="interactionMaterial"
      :render-order="260"
      @pointerover="handlePointerOver"
      @pointerout="handlePointerOut"
      @click="handleClick"
    />

    <TresLineSegments :position="[0, 0, props.depth + 0.24]" :geometry="edgesGeometry" :render-order="hovered ? 196 : 72">
      <TresLineBasicMaterial
        transparent
        :opacity="hovered ? 1 : 0.72"
        :color="hovered ? '#ff5a1c' : '#fff1c6'"
        :depth-test="hovered ? false : true"
        :depth-write="false"
      />
    </TresLineSegments>

    <Bar :position="props.data.cityId" :value="cityInfo.population" :active="hovered">
      <template #default="{ barHeight }">
        <Label :position="[0, 0, barHeight + 1.2]" :active="hovered">{{ props.data.city }}</Label>
        <Tooltip
          v-if="store.drillLevel < 2 && store.config.showTooltip"
          ref="tooltipRef"
          :data="cityInfo"
          :position="[0, 0, barHeight + 7]"
        />
      </template>
    </Bar>
  </TresGroup>
</template>
