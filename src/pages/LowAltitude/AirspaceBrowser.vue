<script setup lang="ts">
import {computed} from 'vue'
import {useLowAltitudeStore} from './store'
import type {AirspaceZone} from './types'
const props=defineProps<{modelValue:'all'|AirspaceZone['type']}>()
const emit=defineEmits<{'update:modelValue':[value:'all'|AirspaceZone['type']];select:[id:string]}>()
const store=useLowAltitudeStore()
const types=[{id:'all',name:'全部',symbol:'◉'},{id:'open',name:'适飞',symbol:'✓'},{id:'temporary',name:'临时',symbol:'◷'},{id:'restricted',name:'限飞',symbol:'△'},{id:'prohibited',name:'禁飞',symbol:'⊘'}] as const
const zones=computed(()=>store.zones.filter(z=>props.modelValue==='all'||z.type===props.modelValue))
</script>
<template>
  <div class="airspace-browser">
    <div class="airspace-filters" aria-label="筛选空域类型"><button v-for="type in types" :key="type.id" :class="[type.id,{active:modelValue===type.id}]" :aria-pressed="modelValue===type.id" @click="emit('update:modelValue',type.id)">{{ type.symbol }} {{ type.name }}</button></div>
    <div class="airspace-unit-list" aria-label="空域管理列表">
      <button v-for="zone in zones" :key="zone.id" :class="[zone.type,{active:store.selectedEntity?.id===zone.id}]" @click="emit('select',zone.id)"><span><b>{{ zone.name.split(' · ').pop() }}</b><small>{{ zone.id }} · {{ zone.floor }}–{{ zone.ceiling }} m AGL</small></span><em>{{ zone.type==='prohibited'?'⊘ 禁入':zone.activeFlights+' / '+zone.capacity+' 架' }}</em></button>
    </div>
    <p>高度为离地范围 · 点击空域定位查看</p>
  </div>
</template>
<style scoped>
.airspace-filters{display:flex;flex-wrap:wrap;gap:5px;margin:14px 0 9px}.airspace-filters button{border:1px solid #d8e4ed;border-radius:4px;padding:5px 6px;background:#fff;color:#627f93;font:10px 'Microsoft YaHei',sans-serif;cursor:pointer}.airspace-filters button.active{background:#e7f2fb;color:#236f9c;border-color:#a6cde5}.airspace-unit-list{max-height:210px;overflow:auto;scrollbar-width:thin;scrollbar-color:#bed5e4 transparent}.airspace-unit-list button{display:flex;align-items:center;justify-content:space-between;width:100%;gap:5px;margin:5px 0;padding:9px 7px;border:1px solid #dfE8ee;border-left:3px solid #377fba;border-radius:4px;background:#fff;text-align:left;cursor:pointer;color:#3c637a}.airspace-unit-list .open{border-left-color:#288d79}.airspace-unit-list .restricted{border-left-color:#b58220}.airspace-unit-list .prohibited{border-left-color:#c45462}.airspace-unit-list button.active{background:#edf6fc;border-top-color:#a6cde5;border-right-color:#a6cde5;border-bottom-color:#a6cde5}.airspace-unit-list span{display:grid;gap:5px;min-width:0}.airspace-unit-list b{font-size:10px;font-weight:500}.airspace-unit-list small{font-size:9px;color:#6d8899}.airspace-unit-list em{font-style:normal;font-size:9px;white-space:nowrap;color:#537f93}.airspace-unit-list .prohibited em{color:#b45964}.airspace-browser p{margin:9px 0 0;font-size:9px;color:#738b9c}button:focus-visible{outline:2px solid #2881bb;outline-offset:1px}
</style>
