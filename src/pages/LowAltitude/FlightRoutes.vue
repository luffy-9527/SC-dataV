<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount } from 'vue'
import { DoubleSide } from 'three'
import MapLabel from './MapLabel.vue'
import { createRouteVisual } from './operationGeometry'
import type { FlightMotion } from './flightMotion'
import type { FlightRoute } from './types'
import { useLowAltitudeStore } from './store'

const props=defineProps<{motion:FlightMotion;activeRoute:string}>()
const emit=defineEmits<{select:[id:string]}>()
const store=useLowAltitudeStore(),meters=props.motion.metersPerUnit
const visuals=new Map(store.routes.map(r=>[r.id,markRaw(createRouteVisual(props.motion.paths.get(r.id)!,meters))]))
const visible=computed(()=>store.routes.filter(route=>route.id===props.activeRoute||route.status==='exception'||
  (store.mode==='airspace'?true:store.mode==='emergency'?route.category==='emergency'||route.id==='RT-01':store.mode==='inspection'?route.category==='inspection':['RT-01','RT-03','RT-05'].includes(route.id))))
// A shared horizontal route can have aircraft in different altitude lanes.
// Show every assigned lane rather than drawing all aircraft against one height.
const lanes=computed(()=>visible.value.flatMap(route=>{
  const planes=store.aircraft.filter(a=>a.status==='flying'&&a.routeId===route.id)
  return (planes.length?planes.map(a=>({id:a.id,aircraftId:a.id,y:props.motion.poses.get(a.id)!.lane})): [{id:route.id,aircraftId:'',y:props.motion.floor}])
    .map(lane=>({...lane,route,visual:visuals.get(route.id)!,y:lane.y-props.motion.modelScale*.15}))
}))
function selected(id:string,aircraftId:string){return id===props.activeRoute&&(store.selectedEntity?.type!=='aircraft'||store.selectedEntity.id===aircraftId)}
function color(route:FlightRoute){return route.status==='exception'?'#c18a26':route.category==='emergency'?'#13896c':route.category==='inspection'?'#167d92':route.category==='training'?'#7975aa':'#287ac3'}
const focused=computed(()=>lanes.value.find(l=>selected(l.route.id,l.aircraftId)))
const routePosition=computed(()=>{
  if(!focused.value)return [0,0,0] as [number,number,number]
  const p=props.motion.paths.get(focused.value.route.id)!.curve.getPointAt(.22)
  return [p.x,focused.value.y+25/meters,p.z] as [number,number,number]
})
onBeforeUnmount(()=>visuals.forEach(v=>v.dispose()))
</script>

<template>
  <TresGroup name="flight-route-layer">
    <TresGroup v-for="lane in lanes" :key="lane.id" :position-y="lane.y" @click.stop="emit('select',lane.route.id)">
      <TresMesh v-if="selected(lane.route.id,lane.aircraftId)" :geometry="lane.visual.corridor"><TresMeshBasicMaterial :color="color(lane.route)" transparent :opacity=".16" :side="DoubleSide" :depth-write="false" /></TresMesh>
      <TresLine v-if="lane.route.status==='planned'" :geometry="lane.visual.dashed"><TresLineDashedMaterial :color="color(lane.route)" :dash-size="14/meters" :gap-size="10/meters" transparent :opacity="activeRoute&&lane.route.id!==activeRoute?.22:.75" :depth-write="false" /></TresLine>
      <TresMesh v-else :geometry="lane.visual.tube" :name="'route-lane-'+lane.id"><TresMeshBasicMaterial :color="color(lane.route)" transparent :opacity="selected(lane.route.id,lane.aircraftId)?1:activeRoute?.2:store.mode==='airspace'?.4:.72" :depth-write="false" /></TresMesh>
      <TresMesh v-if="lane.route.status!=='planned'" :geometry="lane.visual.direction"><TresMeshBasicMaterial :color="color(lane.route)" :side="DoubleSide" transparent :opacity="activeRoute&&!selected(lane.route.id,lane.aircraftId)?.16:.95" :depth-write="false" /></TresMesh>
    </TresGroup>
    <MapLabel v-if="focused" :position="routePosition" pointer-events="none"><span v-if="focused" class="route-map-label"><b>{{ focused.route.name.split(' · ').pop() }}</b><small>{{ focused.route.status==='exception'?'⚠ 航线异常':focused.route.status==='planned'?'┄ 规划航线':'→ 执行航线' }} · 箭头指示方向</small></span></MapLabel>
  </TresGroup>
</template>

<style>
.route-map-label{display:grid;gap:5px;padding:8px 11px;background:#fffffff0;border:1px solid #9fc4d8;border-left:3px solid #2c8eaf;border-radius:5px;color:#285b75;white-space:nowrap;font:11px 'Microsoft YaHei',sans-serif;box-shadow:0 4px 14px #254c6714}.route-map-label b{font-weight:600}.route-map-label small{color:#668298;font-size:10px}
</style>
