<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import CityScene from './CityScene.vue'
import InterfaceIcon from './InterfaceIcon.vue'
import AircraftBrowser from './AircraftBrowser.vue'
import AirspaceBrowser from './AirspaceBrowser.vue'
import { districts } from './districts'
import { useLowAltitudeStore } from './store'
import type { AirspaceZone, AlertEvent, EntityKind, EntitySelection, LowAltitudeMode } from './types'

const router = useRouter()
const store = useLowAltitudeStore()
const scene = ref<InstanceType<typeof CityScene>>()
const quality = ref<'balanced' | 'detail'>('balanced')
const activeMobilePanel = ref<'none' | 'left' | 'right' | 'layers'>('none')
const zoneFilter=ref<'all'|AirspaceZone['type']>('all')
watch(()=>store.districtId,()=>{zoneFilter.value='all'})
watch(zoneFilter,()=>{store.layerVisibility.zones=true;if(store.selectedEntity?.type==='zone')store.selectedEntity=null},{flush:'sync'})
async function chooseAircraft(id:string,inspect=false) {
  store.layerVisibility.aircraft=true;store.layerVisibility.routes=true
  store.selectEntity('aircraft',id)
  if (typeof window !== 'undefined' && window.innerWidth <= 860) {
    activeMobilePanel.value = 'right'
  }
  await nextTick()
  if(inspect)scene.value?.inspectAircraft()
  else scene.value?.focusAircraft()
}
const clock = ref(new Date())
let clockTimer = 0
let telemetryTimer = 0
let scenarioTimer = 0
const modes: { id: LowAltitudeMode; label: string }[] = [
  { id: 'overview', label: '综合态势' }, { id: 'airspace', label: '空域管控' },
  { id: 'inspection', label: '巡检作业' }, { id: 'emergency', label: '应急联动' },
]
const modeContent: Record<LowAltitudeMode, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'CITY OVERVIEW', title: '成都市 · 中心城区', description: '低空运行态势' },
  airspace: { eyebrow: 'AIRSPACE CONTROL', title: '空域分层管控', description: '空域容量与飞行秩序' },
  inspection: { eyebrow: 'FLIGHT OPERATIONS', title: '巡检任务运行图', description: '巡检覆盖与任务进度' },
  emergency: { eyebrow: 'EMERGENCY RESPONSE', title: '低空应急力量', description: '联动响应与现场核查' },
}
const headline = computed(() => ({...modeContent[store.mode],title:store.district.name+' · '+modeContent[store.mode].description,description:'三维城区 / 建筑轮廓与地形 / 模拟业务'}))
const timeLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(clock.value))
const dateLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).format(clock.value))
const selected = computed(() => store.selectedEntity as EntitySelection | null)
const selectedTitle = computed(() => {
  if (!selected.value) return ''
  const { type, id } = selected.value
  if (type === 'aircraft') return store.aircraft.find(item => item.id === id)?.callsign ?? '无人机'
  if (type === 'zone') return store.zones.find(item => item.id === id)?.name ?? '空域'
  if (type === 'route') return store.routes.find(item => item.id === id)?.name ?? '航线'
  if (type === 'vertiport') return store.vertiports.find(item => item.id === id)?.name ?? '起降点'
  if (type === 'mission') return store.missions.find(item => item.id === id)?.name ?? '运行任务'
  return store.alerts.find(item => item.id === id)?.title ?? '运行告警'
})
const displayedAlerts = computed(() => [...store.alerts].sort((a, b) => {
  const rank = { active: 0, acknowledged: 1, resolved: 2 }
  const severity = { critical: 0, warning: 1, info: 2 }
  return rank[a.status] - rank[b.status] || severity[a.severity] - severity[b.severity]
}))
const selectedAircraft = computed(() => selected.value?.type === 'aircraft' ? store.aircraft.find(item => item.id === selected.value?.id) : undefined)
const selectedZone = computed(() => selected.value?.type === 'zone' ? store.zones.find(item => item.id === selected.value?.id) : undefined)
const selectedRoute = computed(() => selected.value?.type === 'route' ? store.routes.find(item => item.id === selected.value?.id) : undefined)
const selectedPort = computed(() => selected.value?.type === 'vertiport' ? store.vertiports.find(item => item.id === selected.value?.id) : undefined)
const selectedMission = computed(() => selected.value?.type === 'mission' ? store.missions.find(item => item.id === selected.value?.id) : undefined)
const selectedAlert = computed(() => selected.value?.type === 'alert' ? store.alerts.find(item => item.id === selected.value?.id) : undefined)
const entityAlert = computed(() => selected.value && store.alerts.find(item => item.entityId === selected.value?.id && item.status === 'active'))
const selectedSubtitle = computed(() => {
  if (selectedAircraft.value) return `${selectedAircraft.value.model} · ${selectedAircraft.value.id}`
  if (selectedZone.value) return `${zoneLabel(selectedZone.value.type)} · ${selectedZone.value.id}`
  if (selectedRoute.value) return `${routeLabel(selectedRoute.value.category)} · ${selectedRoute.value.id}`
  if (selectedPort.value) return `${portLabel(selectedPort.value.kind)} · ${selectedPort.value.id}`
  if (selectedMission.value) return `${missionStatus(selectedMission.value.status)} · ${selectedMission.value.id}`
  if (selectedAlert.value) return `${severityLabel(selectedAlert.value.severity)} · ${selectedAlert.value.time}`
  return '低空运行对象'
})
const kpis = computed(() => {
  if (store.mode === 'airspace') return [
    { icon: 'airspace', label: '空域单元', value: store.zones.length, unit: '处' },
    { icon: 'activity', label: '容量利用率', value: store.airspaceUsage, unit: '%' },
    { icon: 'aircraft', label: '空域内飞行', value: store.zones.reduce((sum, zone) => sum + zone.activeFlights, 0), unit: '架' },
    { icon: 'airspace', label: '临时空域', value: store.zones.filter(zone => zone.type === 'temporary').length, unit: '处' },
    { icon: 'alert', label: '重点管控', value: store.zones.filter(zone => zone.type === 'prohibited').length, unit: '处' },
  ]
  if (store.mode === 'inspection') {
    const progress = Math.round(store.missions.reduce((sum, mission) => sum + mission.progress, 0) / store.missions.length)
    return [
      { icon: 'mission', label: '今日计划', value: store.missions.length, unit: '项' },
      { icon: 'activity', label: '执行中', value: store.activeMissionCount, unit: '项' },
      { icon: 'flight', label: '平均进度', value: progress, unit: '%' },
      { icon: 'flight', label: '巡检航线', value: store.routes.filter(route => route.category === 'inspection').length, unit: '条' },
      { icon: 'alert', label: '任务异常', value: store.routes.filter(route => route.status === 'exception').length, unit: '条' },
    ]
  }
  if (store.mode === 'emergency') return [
    { icon: 'aircraft', label: '待命无人机', value: store.aircraft.filter(item => item.status === 'standby').length, unit: '架' },
    { icon: 'airspace', label: '应急起降点', value: store.vertiports.filter(port => port.kind !== 'dock').length, unit: '处' },
    { icon: 'alert', label: '模拟事件', value: '01', unit: '起' },
    { icon: 'flight', label: '已派出力量', value: store.missions.filter(item => item.status === 'dispatched').length, unit: '架' },
    { icon: 'activity', label: '待处置告警', value: store.unacknowledgedAlerts, unit: '条' },
  ]
  return [
    { icon: 'aircraft', label: '当前在飞', value: store.airborneCount, unit: '架' },
    { icon: 'flight', label: '今日飞行架次', value: store.flightsToday.toLocaleString(), unit: '架次' },
    { icon: 'airspace', label: '空域利用率', value: store.airspaceUsage, unit: '%' },
    { icon: 'mission', label: '执行中任务', value: store.activeMissionCount, unit: '项' },
    { icon: 'alert', label: '未处置告警', value: store.unacknowledgedAlerts, unit: '条' },
  ]
})
const layerItems = computed(() => [
  { key: 'aircraft' as const, label: '飞行器', icon: 'aircraft', count: store.airborneCount },
  { key: 'routes' as const, label: '航线', icon: 'flight', count: store.routes.length },
  { key: 'zones' as const, label: '空域', icon: 'airspace', count: store.zones.length },
  { key: 'vertiports' as const, label: '起降点', icon: 'mission', count: store.vertiports.length },
  { key: 'districts' as const, label: '区域标注', icon: 'compass', count: 1 },
])
const leadingMission = computed(() => store.missions.find(item => item.status === 'in-progress' || item.status === 'dispatched'))

function zoneLabel(type: 'open' | 'temporary' | 'restricted' | 'prohibited') {
  return { open: '适飞空域', temporary: '临时空域', restricted: '限飞区', prohibited: '禁飞区' }[type]
}
function routeLabel(type: 'inspection' | 'logistics' | 'training' | 'emergency') {
  return { inspection: '巡检航线', logistics: '物流航线', training: '训练航线', emergency: '应急航线' }[type]
}
function portLabel(type: 'hub' | 'dock' | 'emergency') {
  return { hub: '综合起降点', dock: '无人机机巢', emergency: '应急备降点' }[type]
}
function severityLabel(type: AlertEvent['severity']) {
  return { critical: '高危', warning: '预警', info: '提示' }[type]
}
function missionStatus(status: string) {
  return ({ 'in-progress': '执行中', queued: '待执行', complete: '已完成', dispatched: '已派出' } as Record<string, string>)[status] ?? status
}
function selectedEntity(type: EntityKind, id: string) {
  if(type==='zone'){
    const zone=store.zones.find(z=>z.id===id)
    if(zone&&zoneFilter.value!=='all'&&zoneFilter.value!==zone.type)zoneFilter.value='all'
    store.layerVisibility.zones=true
  }
  store.selectEntity(type, id)
  if (typeof window !== 'undefined' && window.innerWidth <= 860) {
    activeMobilePanel.value = 'right'
  }
}
function changeDistrict(event:Event) {
  window.clearInterval(scenarioTimer)
  store.selectDistrict((event.target as HTMLSelectElement).value)
}
function focusEvent(id: string) {
  const prefix = id.split('-')[0]
  const kind: Record<string, EntityKind> = { UAV: 'aircraft', RT: 'route', MS: 'mission', AZ: 'zone', VP: 'vertiport', AL: 'alert' }
  if (kind[prefix]) store.focusEntity(kind[prefix], id)
}
function focusAlert(alert: AlertEvent) {
  store.acknowledgeAlert(alert.id)
  store.focusEntity(alert.entityKind, alert.entityId)
}
function playScenario() {
  store.playScenario()
  if (scenarioTimer) window.clearInterval(scenarioTimer)
  if (store.scenarioRunning) scenarioTimer = window.setInterval(() => {
    store.advanceScenario()
    if (!store.scenarioRunning) window.clearInterval(scenarioTimer)
  }, 4800)
}

onMounted(() => {
  clockTimer = window.setInterval(() => { if (!document.hidden) clock.value = new Date() }, 1000)
  telemetryTimer = window.setInterval(() => { if (!document.hidden) store.tick() }, 1000)
})
onBeforeUnmount(() => {
  window.clearInterval(clockTimer)
  window.clearInterval(telemetryTimer)
  window.clearInterval(scenarioTimer)
  store.$reset()
})
</script>

<template>
  <main class="low-altitude-page" :class="`mode-${store.mode}`">
    <CityScene :key="store.districtId" ref="scene" :quality="quality" :zone-filter="zoneFilter" @select="selectedEntity" />

    <header class="topbar">
      <div class="brand-block">
        <button class="home-link" type="button" title="返回场景广场" aria-label="返回场景广场" @click="router.push('/')"><InterfaceIcon name="home" :size="19" /></button>
        <div class="brand-mark" aria-hidden="true"><span>U</span></div>
        <div class="brand-copy"><p>CHENGDU · LOW ALTITUDE</p><h1>低空经济综合监管平台</h1></div>
        <span class="brand-divider" />
        <label class="district-selector"><span>监管区域</span><select :value="store.districtId" aria-label="选择监管区县" @change="changeDistrict"><option v-for="district in districts" :key="district.id" :value="district.id">{{ district.name }}</option></select></label>
      </div>
      <nav class="mode-nav" aria-label="业务模式">
        <button v-for="mode in modes" :key="mode.id" type="button" :class="{ active: store.mode === mode.id }" :aria-pressed="store.mode === mode.id" @click="store.selectMode(mode.id)">{{ mode.label }}</button>
      </nav>
      <div class="system-status"><span class="online-label"><i />平台在线</span><span class="header-divider" /><div class="clock-block"><strong>{{ timeLabel }}</strong><span>{{ dateLabel }}</span></div></div>
    </header>

    <section class="kpi-ribbon" aria-label="实时运行指标">
      <article v-for="(metric, index) in kpis" :key="metric.label" :class="{ 'kpi-critical': index === 4 && store.unacknowledgedAlerts > 0 }">
        <span class="kpi-icon"><InterfaceIcon :name="metric.icon" :size="17" /></span><span class="kpi-copy"><small>{{ metric.label }}</small><strong>{{ metric.value }}<i>{{ metric.unit }}</i></strong></span>
      </article>
    </section>

    <div class="map-heading" aria-live="polite"><span>{{ headline.eyebrow }}</span><strong>{{ headline.title }}</strong><small>{{ headline.description }}</small></div>

    <!-- 移动端抽屉遮罩 -->
    <div
      v-if="activeMobilePanel !== 'none'"
      class="mobile-panel-backdrop"
      @click="activeMobilePanel = 'none'"
    />

    <aside class="side-panel left-panel" :class="{ 'mobile-active': activeMobilePanel === 'left' }" aria-label="飞行态势与空域资源">
      <button type="button" class="mobile-panel-close-btn" title="关闭面板" @click="activeMobilePanel = 'none'">✕</button>
      <div class="section-heading"><div><small>LIVE OPERATIONS</small><h2>飞行态势</h2></div><span class="live-counter"><i />实时</span></div>
      <button class="aircraft-summary" type="button" @click="store.toggleLayer('aircraft')">
        <span class="summary-icon"><InterfaceIcon name="aircraft" :size="19" /></span><span><strong>{{ store.airborneCount }}<small> / {{ store.aircraft.length }} 架</small></strong><small>当前区域飞行器</small></span><span class="summary-toggle" :class="{ on: store.layerVisibility.aircraft }" />
      </button>
      <div class="state-list">
        <div><span><i class="state-dot state-flying" />在飞</span><b>{{ store.aircraft.filter(item => item.status === 'flying').length }}<small>架</small></b></div>
        <div><span><i class="state-dot state-standby" />待命</span><b>{{ store.aircraft.filter(item => item.status === 'standby').length }}<small>架</small></b></div>
        <div><span><i class="state-dot state-offline" />离线</span><b>{{ store.aircraft.filter(item => item.status === 'offline').length }}<small>架</small></b></div>
      </div>
      <AircraftBrowser @select="chooseAircraft($event)" @inspect="chooseAircraft($event,true)" />
      <div class="panel-rule" />
      <div class="section-heading airspace-heading"><div><small>AIRSPACE CAPACITY</small><h2>{{ store.mode==='airspace'?'空域管理':'空域资源' }}</h2></div><strong class="utilization">{{ store.airspaceUsage }}<i>%</i></strong></div>
      <div class="capacity-track"><span :style="{ width: `${store.airspaceUsage}%` }" /></div>
      <div class="capacity-caption"><span>当前区域占用</span><span>总容量 {{ store.airspaceCapacity }} 架</span></div>
      <AirspaceBrowser v-if="store.mode==='airspace'" v-model="zoneFilter" @select="selectedEntity('zone',$event)" />
      <div v-else class="zone-list">
        <button v-for="type in (['open', 'temporary', 'restricted', 'prohibited'] as const)" :key="type" :class="`zone-row zone-${type}`" type="button" @click="selectedEntity('zone', store.zones.find(zone => zone.type === type)?.id ?? '')"><i /><span>{{ zoneLabel(type) }}</span><b>{{ store.zones.filter(zone => zone.type === type).length }}<small>处</small></b></button>
      </div>
    </aside>

    <aside class="side-panel right-panel" :class="{ 'mobile-active': activeMobilePanel === 'right' }" aria-label="告警与运行对象">
      <button type="button" class="mobile-panel-close-btn" title="关闭面板" @click="activeMobilePanel = 'none'">✕</button>
      <template v-if="selected">
        <div class="section-heading"><div><small>OBJECT DETAILS</small><h2>对象详情</h2></div><button class="icon-button" type="button" title="返回告警队列" aria-label="返回告警队列" @click="store.selectedEntity = null">×</button></div>
        <div class="selected-title"><span class="object-icon"><InterfaceIcon :name="selected.type === 'aircraft' ? 'aircraft' : selected.type === 'zone' ? 'airspace' : selected.type === 'alert' ? 'alert' : 'flight'" :size="18" /></span><span><strong>{{ selectedTitle }}</strong><small>{{ selectedSubtitle }}</small></span></div>
        <div v-if="selectedAircraft" class="detail-grid"><div><small>飞行状态</small><strong>{{ selectedAircraft.status === 'flying' ? '空中运行' : selectedAircraft.status === 'standby' ? '地面待命' : '离线' }}</strong></div><div><small>运营单位</small><strong>{{ selectedAircraft.operator }}</strong></div><div><small>飞行高度</small><strong>{{ selectedAircraft.altitude }} <i>m</i></strong></div><div><small>地面速度</small><strong>{{ selectedAircraft.speed.toFixed(1) }} <i>m/s</i></strong></div><div><small>剩余电量</small><strong>{{ selectedAircraft.battery }} <i>%</i></strong></div><div><small>C2 链路</small><strong>{{ selectedAircraft.signal ? `${selectedAircraft.signal}%` : '离线' }}</strong></div></div>
        <div v-else-if="selectedZone" class="detail-grid"><div><small>空域类型</small><strong>{{ zoneLabel(selectedZone.type) }}</strong></div><div><small>当前占用</small><strong>{{ selectedZone.activeFlights }} / {{ selectedZone.capacity || '封闭' }}</strong></div><div><small>垂直下限</small><strong>{{ selectedZone.floor }} <i>m</i></strong></div><div><small>垂直上限</small><strong>{{ selectedZone.ceiling }} <i>m</i></strong></div><div class="detail-wide"><small>有效时间</small><strong>{{ selectedZone.validUntil }}</strong></div></div>
        <div v-else-if="selectedRoute" class="detail-grid"><div><small>航线类别</small><strong>{{ routeLabel(selectedRoute.category) }}</strong></div><div><small>运行状态</small><strong>{{ selectedRoute.status === 'exception' ? '偏离预警' : selectedRoute.status === 'active' ? '运行中' : '已计划' }}</strong></div><div><small>预计时长</small><strong>{{ selectedRoute.duration }}</strong></div><div><small>航点数量</small><strong>{{ selectedRoute.points.length }} <i>个</i></strong></div></div>
        <div v-else-if="selectedPort" class="detail-grid"><div><small>设施类别</small><strong>{{ portLabel(selectedPort.kind) }}</strong></div><div><small>起降容量</small><strong>{{ selectedPort.capacity }} <i>架</i></strong></div><div><small>可用机位</small><strong>{{ selectedPort.availability }} <i>个</i></strong></div><div><small>设备状态</small><strong>在线</strong></div></div>
        <div v-else-if="selectedMission" class="detail-grid"><div><small>任务状态</small><strong>{{ missionStatus(selectedMission.status) }}</strong></div><div><small>执行无人机</small><strong>{{ selectedMission.aircraftId }}</strong></div><div class="detail-wide"><small>责任单位</small><strong>{{ selectedMission.owner }}</strong></div><div class="detail-wide progress-line"><small>任务进度 <b>{{ selectedMission.progress }}%</b></small><span><i :style="{ width: `${selectedMission.progress}%` }" /></span></div></div>
        <div v-else-if="selectedAlert" class="alert-detail"><strong>{{ severityLabel(selectedAlert.severity) }} · {{ selectedAlert.status === 'active' ? '待处置' : '已确认' }}</strong><p>{{ selectedAlert.detail }}</p><button v-if="selectedAlert.status === 'active'" type="button" @click="focusAlert(selectedAlert)">确认并定位 <span>↗</span></button></div>
        <div v-if="entityAlert && selected?.type !== 'alert'" class="linked-alert"><span>关联告警</span><strong>{{ entityAlert.title }}</strong><button type="button" @click="focusAlert(entityAlert)">确认并定位 ↗</button></div>
        <button v-if="selectedAircraft" type="button" class="focus-button aircraft-inspect" @click="scene?.inspectAircraft()">查看机体近景 <span>↗</span></button>
        <button v-if="selected?.type !== 'alert'" type="button" class="focus-button" @click="scene?.resetView()">查看当前区域</button>
      </template>
      <template v-else>
        <div class="section-heading"><div><small>ALERT MANAGEMENT</small><h2>告警与事件</h2></div><span class="alert-count" :class="{ active: store.unacknowledgedAlerts > 0 }">{{ store.unacknowledgedAlerts }} <i>待处置</i></span></div>
        <div class="alert-list">
          <button v-for="alert in displayedAlerts" :key="alert.id" type="button" class="alert-row" :class="[`severity-${alert.severity}`, `alert-state-${alert.status}`]" @click="store.selectEntity('alert', alert.id)">
            <span class="alert-symbol">{{ alert.severity === 'critical' ? '!' : alert.severity === 'warning' ? '△' : 'i' }}</span><span class="alert-copy"><strong>{{ alert.title }}</strong><small>{{ alert.detail }}</small></span><span class="alert-meta"><b>{{ alert.time }}</b><em>{{ severityLabel(alert.severity) }}</em><i>{{ alert.status === 'active' ? '待处置' : '已确认' }}</i></span>
          </button>
          <div v-if="!displayedAlerts.length" class="empty-alerts"><span>✓</span><strong>当前无待处置告警</strong></div>
        </div>
        <div class="panel-rule" />
        <div class="section-heading ports-heading"><div><small>VERTIPORT NETWORK</small><h2>起降设施</h2></div><button type="button" class="panel-link" @click="store.toggleLayer('vertiports')">{{ store.layerVisibility.vertiports ? '隐藏' : '显示' }}<span> ◉</span></button></div>
        <button v-for="port in store.vertiports.slice(0, 3)" :key="port.id" class="port-row" type="button" @click="selectedEntity('vertiport', port.id)"><span class="port-symbol">H</span><span><strong>{{ port.name }}</strong><small>{{ port.availability }} / {{ port.capacity }} 个机位可用</small></span><i>›</i></button>
      </template>
    </aside>

    <div class="map-controls" aria-label="地图操作">
      <button class="quality-button" type="button" :title="quality === 'balanced' ? '当前流畅模式，点击切换精细画质' : '当前精细模式，点击切换流畅画质'" @click="quality = quality === 'balanced' ? 'detail' : 'balanced'">{{ quality === 'balanced' ? '流畅' : '精细' }}</button>
      <button type="button" title="放大地图" aria-label="放大地图" @click="scene?.zoom(1)"><InterfaceIcon name="plus" :size="17" /></button>
      <button type="button" title="缩小地图" aria-label="缩小地图" @click="scene?.zoom(-1)"><InterfaceIcon name="minus" :size="17" /></button>
      <button type="button" title="重置地图视角" aria-label="重置地图视角" @click="scene?.resetView()"><InterfaceIcon name="reset" :size="17" /></button>
    </div>

    <section v-if="store.mode === 'emergency'" class="emergency-banner"><span class="event-marker">!</span><span class="event-copy"><small>SIMULATION EVENT · {{ store.emergency.id }}</small><strong>{{ store.emergency.title }}</strong></span><span class="event-location">{{ store.emergency.location }}</span><span class="event-status" :class="`event-${store.emergency.status}`">{{ store.emergency.status === 'monitoring' ? '核查中' : store.emergency.status === 'dispatched' ? '力量已派出' : '已闭环' }}</span></section>

    <div class="layer-dock" :class="{ 'mobile-active': activeMobilePanel === 'layers' }" aria-label="地图图层">
      <span class="dock-label"><InterfaceIcon name="layers" :size="16" />图层</span>
      <button v-for="layer in layerItems" :key="layer.key" type="button" :class="{ enabled: store.layerVisibility[layer.key] }" :aria-pressed="store.layerVisibility[layer.key]" @click="store.toggleLayer(layer.key)"><i /><InterfaceIcon :name="layer.icon" :size="14" /><span>{{ layer.label }}</span><small>{{ layer.count }}</small></button>
      <button type="button" :class="{ enabled: store.layerVisibility.inspectionAreas }" @click="store.toggleLayer('inspectionAreas')"><i /><InterfaceIcon name="mission" :size="14" /><span>巡检覆盖</span></button>
      <button type="button" :class="{ enabled: store.layerVisibility.weather }" @click="store.toggleLayer('weather')"><i /><InterfaceIcon name="weather" :size="14" /><span>风向</span></button>
      <span class="dock-divider" />
      <button class="scenario-button" :class="{ running: store.scenarioRunning }" type="button" @click="playScenario"><span>{{ store.scenarioRunning ? 'Ⅱ' : '▶' }}</span>{{ store.scenarioRunning ? '暂停演示' : '自动演示' }}</button>
    </div>

    <footer class="bottom-dock">
      <div class="timeline-heading"><span class="timeline-status"><i />{{ store.scenarioStep >= 0 ? store.currentScenario : '实时运行' }}</span><span><small>{{ leadingMission ? '当前任务' : '运行日志' }}</small><strong>{{ leadingMission?.name ?? '低空运行记录' }}</strong></span><span class="timeline-meter"><i :style="{ width: `${leadingMission?.progress ?? 0}%` }" /></span><b>{{ leadingMission?.progress ?? 0 }}%</b><button type="button" title="查看当前任务" aria-label="查看当前任务" @click="leadingMission && selectedEntity('mission', leadingMission.id)"><InterfaceIcon name="flight" :size="17" /></button></div>
      <div class="mission-track"><span class="track-line" /><button v-for="(mission, index) in store.missions.slice(0, 4)" :key="mission.id" type="button" class="mission-marker" :class="`mission-${mission.status}`" @click="selectedEntity('mission', mission.id)"><i>{{ String(index + 1).padStart(2, '0') }}</i><span><strong>{{ mission.name }}</strong><small>{{ missionStatus(mission.status) }}<template v-if="mission.progress"> · {{ mission.progress }}%</template></small></span></button></div>
      <div class="event-strip"><small>最近事件</small><button v-for="event in store.eventLog.slice(0, 2)" :key="`${event.timestamp}-${event.entityId}`" type="button" @click="focusEvent(event.entityId)"><span>{{ new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(event.timestamp) }}</span><strong>{{ typeof event.payload.label === 'string' ? event.payload.label : event.type }}</strong></button></div>
    </footer>

    <div class="map-caption"><span>CHENGDU / DIGITAL AIRSPACE</span><small>三维模型 · 地形轮廓 · 模拟飞行</small></div>
    <div class="simulation-watermark"><i />仿真演示 · 非真实飞行数据</div>

    <!-- 移动端底栏快捷操控 Dock -->
    <nav class="mobile-action-dock" aria-label="移动端快捷操作">
      <button
        type="button"
        class="mobile-dock-btn"
        :class="{ active: activeMobilePanel === 'left' }"
        @click="activeMobilePanel = activeMobilePanel === 'left' ? 'none' : 'left'"
      >
        <InterfaceIcon name="aircraft" :size="16" />
        <span>态势({{ store.airborneCount }})</span>
      </button>
      <button
        type="button"
        class="mobile-dock-btn"
        :class="{ active: activeMobilePanel === 'right', 'has-alerts': store.unacknowledgedAlerts > 0 }"
        @click="activeMobilePanel = activeMobilePanel === 'right' ? 'none' : 'right'"
      >
        <InterfaceIcon name="alert" :size="16" />
        <span>告警({{ store.unacknowledgedAlerts }})</span>
      </button>
      <button
        type="button"
        class="mobile-dock-btn"
        :class="{ active: activeMobilePanel === 'layers' }"
        @click="activeMobilePanel = activeMobilePanel === 'layers' ? 'none' : 'layers'"
      >
        <InterfaceIcon name="layers" :size="16" />
        <span>图层</span>
      </button>
      <button
        type="button"
        class="mobile-dock-btn scenario-btn"
        :class="{ running: store.scenarioRunning }"
        @click="playScenario"
      >
        <span>{{ store.scenarioRunning ? 'Ⅱ' : '▶' }}</span>
        <span>{{ store.scenarioRunning ? '暂停' : '演示' }}</span>
      </button>
    </nav>
  </main>
</template>

<style scoped src="./dashboard.css"></style>
