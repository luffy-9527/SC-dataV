<script setup lang="ts">
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { MOUSE, Vector3 } from 'three'
import { useDemo1Store } from '../stores'
import Lights from './lights.vue'
import Scene from './Scene.vue'
import DebugPanel from './DebugPanel.vue'

const store = useDemo1Store()
const showDebugPanel = computed(() => import.meta.env.DEV && window.location.href.includes('debug=1'))
// 第三十一阶段：地图初始化视角改为正上方俯视，后续仍可通过 OrbitControls 自由旋转查看立体侧壁。
const controlsTarget = new Vector3(0, 0, 0)
const weatherLabelMap = {
  cloudy: '多云流云',
  fog: '低空雾气',
  rain: '动态降雨',
  storm: '雷暴云团',
  clear: '晴空',
} as const
const weatherLabel = computed(() => weatherLabelMap[store.weatherMode])
// 第三十六阶段：左键拖拽平移地图，右键旋转，滚轮缩放，更接近二维城市地图查看习惯。
const mouseButtons = {
  LEFT: MOUSE.PAN,
  MIDDLE: MOUSE.DOLLY,
  RIGHT: MOUSE.ROTATE,
}
</script>

<template>
  <div class="map-canvas">
    <TresCanvas clear-color="#fff0d8" :dpr="[1, 2]">
      <!-- 第三十一阶段：初始相机正上方俯视，避免打开页面时就是斜视角。 -->
      <TresPerspectiveCamera
        :args="[38, 1, 1, 2600]"
        :position="[0, 360, 0.01]"
      />

      <Lights />

      <Suspense>
        <Scene />
      </Suspense>

      <!-- 轻量地面柔影，替代 ContactShadows，避免版本兼容问题。 -->
      <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, -20, 0]" receive-shadow>
        <TresCircleGeometry :args="[150, 96]" />
        <TresMeshBasicMaterial color="#000000" transparent :opacity="0.042" />
      </TresMesh>

      <OrbitControls
        :target="controlsTarget"
        :enable-pan="true"
        :enable-zoom="true"
        :enable-rotate="true"
        :enable-damping="true"
        :screen-space-panning="true"
        :damping-factor="0.08"
        :zoom-speed="0.24"
        :rotate-speed="0.46"
        :pan-speed="1.18"
        :key-pan-speed="18"
        :min-distance="96"
        :max-distance="520"
        :min-polar-angle="0.01"
        :max-polar-angle="1.5"
        :mouse-buttons="mouseButtons"
      />
    </TresCanvas>


    <div v-if="store.cloud && store.weatherMode !== 'clear'" class="weather-badge">
      <span class="weather-badge__dot"></span>
      <strong>{{ weatherLabel }}</strong>
      <em>点击底部天气按钮切换</em>
    </div>

    <div class="drill-toolbar">
      <div class="drill-title">
        <span class="drill-dot"></span>
        <span>{{ store.drillTitle }}</span>
        <em v-if="store.drillLevel > 0">区县级地图</em>
        <em v-else>点击地市下钻</em>
      </div>
      <button v-if="store.drillCanBack" class="drill-back" type="button" @click="store.requestDrillBack()">
        返回四川省
      </button>
      <span v-if="store.drillLoading" class="drill-loading">地图加载中...</span>
      <span v-if="store.drillError" class="drill-error">{{ store.drillError }}</span>
    </div>

    <!-- 默认隐藏调试面板，避免遮挡大屏；需要时在地址后加 ?debug=1 或 #/demo1?debug=1。 -->
    <DebugPanel v-if="showDebugPanel" />
  </div>
</template>

<style scoped>
.map-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.weather-badge {
  position: absolute;
  left: 50%;
  top: 106px;
  z-index: 9;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transform: translateX(-50%);
  padding: 5px 12px;
  border: 1px solid rgba(255, 151, 47, 0.45);
  border-radius: 999px;
  background: rgba(255, 246, 226, 0.68);
  box-shadow: 0 8px 24px rgba(255, 127, 26, 0.13);
  color: #f16718;
  font-size: 12px;
  pointer-events: none;
  backdrop-filter: blur(8px);
}

.weather-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff7a1c;
  box-shadow: 0 0 12px rgba(255, 122, 28, 0.85);
}

.weather-badge strong {
  font-weight: 800;
}

.weather-badge em {
  color: rgba(177, 124, 73, 0.75);
  font-style: normal;
}

.drill-toolbar {
  position: absolute;
  left: 50%;
  top: 72px;
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 10px;
  transform: translateX(-50%);
  padding: 7px 12px;
  border: 1px solid rgba(255, 108, 22, 0.48);
  border-radius: 999px;
  background: rgba(255, 246, 230, 0.72);
  box-shadow: 0 10px 28px rgba(255, 117, 22, 0.14);
  backdrop-filter: blur(8px);
  color: #f06418;
  font-size: 13px;
  pointer-events: auto;
}

.drill-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  white-space: nowrap;
}

.drill-title em {
  color: rgba(166, 119, 72, 0.72);
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
}

.drill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff6b16;
  box-shadow: 0 0 10px #ffb258;
}

.drill-back {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #ff8f27, #ff6514);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(255, 101, 20, 0.2);
}

.drill-loading,
.drill-error {
  white-space: nowrap;
  font-size: 12px;
}

.drill-error {
  color: #d33b16;
}
</style>
