import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export type WeatherMode = 'cloudy' | 'fog' | 'rain' | 'storm' | 'clear'

export interface Demo1Config {
  mapDepth: number
  mapColor: string
  sideColor: string
  flyLineColor: string
  lightSpeed: number
  showTooltip: boolean
}

const defaultConfig: Demo1Config = {
  mapDepth: 8,
  // 第二十三阶段：厚度从上一版减半，保留立体侧壁但避免过高遮挡面板。
  // 地图顶面默认保持纹理原色，避免把地形贴图整体染成橙色。
  mapColor: '#ffffff',
  // 侧壁使用浅岩层色，更接近原版地形立体厚度。
  sideColor: '#d7d2c8',
  flyLineColor: '#ff6b16',
  lightSpeed: 1,
  showTooltip: true,
}

export const useDemo1Store = defineStore('demo1', () => {
  const mapPlayComplete = ref(false)
  const cloud = ref(true)
  const weatherMode = ref<WeatherMode>('cloudy')
  const bar = ref(true)
  const rotation = ref(true)
  const heat = ref(true)
  const mode = ref(true)
  const config = reactive<Demo1Config>({ ...defaultConfig })

  // 第二十八阶段：地图下钻状态。
  const drillLevel = ref(0)
  const drillTitle = ref('四川省')
  const drillLoading = ref(false)
  const drillCanBack = ref(false)
  const drillError = ref('')
  const drillBackSeq = ref(0)

  function toggle(key: 'cloud' | 'bar' | 'rotation' | 'heat' | 'mode') {
    const map = { cloud, bar, rotation, heat, mode }
    map[key].value = !map[key].value
    if (key === 'cloud' && map[key].value && weatherMode.value === 'clear') {
      weatherMode.value = 'cloudy'
    }
  }

  function setWeatherMode(mode: WeatherMode) {
    weatherMode.value = mode
    cloud.value = mode !== 'clear'
  }

  function cycleWeather() {
    const modes: WeatherMode[] = ['cloudy', 'fog', 'rain', 'storm', 'clear']
    if (!cloud.value || weatherMode.value === 'clear') {
      setWeatherMode('cloudy')
      return
    }
    const index = modes.indexOf(weatherMode.value)
    setWeatherMode(modes[(index + 1) % modes.length])
  }

  function setConfig(payload: Partial<Demo1Config>) {
    Object.assign(config, payload)
  }

  function setDrillLoading(value: boolean) {
    drillLoading.value = value
  }

  function setDrillInfo(payload: Partial<{ level: number; title: string; canBack: boolean; error: string }>) {
    if (typeof payload.level === 'number') drillLevel.value = payload.level
    if (typeof payload.title === 'string') drillTitle.value = payload.title
    if (typeof payload.canBack === 'boolean') drillCanBack.value = payload.canBack
    if (typeof payload.error === 'string') drillError.value = payload.error
  }

  function requestDrillBack() {
    drillBackSeq.value += 1
  }

  function resetDrill() {
    drillLevel.value = 0
    drillTitle.value = '四川省'
    drillLoading.value = false
    drillCanBack.value = false
    drillError.value = ''
  }

  function reset() {
    mapPlayComplete.value = false
    cloud.value = true
    weatherMode.value = 'cloudy'
    bar.value = true
    rotation.value = true
    heat.value = true
    mode.value = true
    Object.assign(config, defaultConfig)
    resetDrill()
  }

  return {
    mapPlayComplete,
    cloud,
    weatherMode,
    bar,
    rotation,
    heat,
    mode,
    config,
    drillLevel,
    drillTitle,
    drillLoading,
    drillCanBack,
    drillError,
    drillBackSeq,
    toggle,
    setWeatherMode,
    cycleWeather,
    setConfig,
    setDrillLoading,
    setDrillInfo,
    requestDrillBack,
    resetDrill,
    reset,
  }
})
