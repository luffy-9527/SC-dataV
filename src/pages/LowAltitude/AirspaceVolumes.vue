<script setup lang="ts">
import { computed,markRaw,onBeforeUnmount } from 'vue'
import { DoubleSide } from 'three'
import MapLabel from './MapLabel.vue'
import { createAirspaceVisual } from './operationGeometry'
import { useLowAltitudeStore } from './store'
import type { AirspaceZone } from './types'
const props=defineProps<{meters:number;ground:(x:number,z:number)=>number;filter:'all'|AirspaceZone['type']}>()
const emit=defineEmits<{select:[id:string]}>()
const store=useLowAltitudeStore()
const palette={open:{color:'#288d79',symbol:'✓',label:'适飞'},temporary:{color:'#377fba',symbol:'◷',label:'临时'},restricted:{color:'#b58220',symbol:'△',label:'限飞'},prohibited:{color:'#c45462',symbol:'⊘',label:'禁飞'}}
const visuals=new Map(store.zones.map(z=>[z.id,markRaw(createAirspaceVisual(z,props.meters,props.ground))]))
const zones=computed(()=>store.zones.filter(z=>(store.mode!=='airspace'||props.filter==='all'||z.type===props.filter)&&(store.mode==='airspace'||z.type==='prohibited'||store.selectedEntity?.id===z.id)))
const isSelected=(id:string)=>store.selectedEntity?.type==='zone'&&store.selectedEntity.id===id
onBeforeUnmount(()=>visuals.forEach(v=>v.dispose()))
</script>

<template>
  <TresGroup name="airspace-volume-layer">
    <TresGroup v-for="zone in zones" :key="zone.id" :name="'airspace-'+zone.id" @click.stop="emit('select',zone.id)">
      <TresMesh :geometry="visuals.get(zone.id)!.side"><TresMeshBasicMaterial :color="palette[zone.type].color" :side="DoubleSide" transparent :opacity="isSelected(zone.id)?.23:store.mode==='airspace'?.12:.045" :depth-write="false" /></TresMesh>
      <TresMesh :geometry="visuals.get(zone.id)!.roof"><TresMeshBasicMaterial :color="palette[zone.type].color" :side="DoubleSide" transparent :opacity="isSelected(zone.id)?.12:.035" :depth-write="false" /></TresMesh>
      <TresLineSegments :geometry="visuals.get(zone.id)!.outline"><TresLineBasicMaterial :color="palette[zone.type].color" transparent :opacity="isSelected(zone.id)?1:.7" :depth-write="false" /></TresLineSegments>
      <TresLineSegments :geometry="visuals.get(zone.id)!.pillars"><TresLineBasicMaterial :color="palette[zone.type].color" transparent :opacity="isSelected(zone.id)?.9:.35" :depth-write="false" /></TresLineSegments>
      <MapLabel v-if="store.mode==='airspace'||isSelected(zone.id)" :position="visuals.get(zone.id)!.label.toArray() as [number,number,number]" collision-group="airspace">
        <button class="airspace-map-tag" :class="{selected:isSelected(zone.id)}" :style="{'--zone-color':palette[zone.type].color}" @click.stop="emit('select',zone.id)"><span>{{ palette[zone.type].symbol }}</span><div><b>{{ palette[zone.type].label }} · {{ zone.id }}</b><small>{{ zone.floor }}–{{ zone.ceiling }} m AGL</small></div></button>
      </MapLabel>
    </TresGroup>
  </TresGroup>
</template>

<style>
.airspace-map-tag{display:flex;gap:8px;align-items:center;background:#fffffff0;border:1px solid #d0dfe7;border-left:3px solid var(--zone-color);border-radius:5px;padding:7px 10px;color:#385d73;font:11px 'Microsoft YaHei',sans-serif;cursor:pointer;box-shadow:0 3px 12px #2b526812;white-space:nowrap}.airspace-map-tag>span{color:var(--zone-color);font-size:19px}.airspace-map-tag div{display:grid;gap:4px;text-align:left}.airspace-map-tag b{font-weight:600}.airspace-map-tag small{color:#698394;font-size:10px}.airspace-map-tag.selected{border-color:var(--zone-color);box-shadow:0 0 0 3px #ffffff90}.airspace-map-tag:focus-visible{outline:2px solid #287cc2;outline-offset:3px}
</style>
