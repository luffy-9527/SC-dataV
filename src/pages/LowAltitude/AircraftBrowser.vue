<script setup lang="ts">
import { computed,ref,watch } from 'vue'
import InterfaceIcon from './InterfaceIcon.vue'
import { useLowAltitudeStore } from './store'
const emit=defineEmits<{select:[id:string];inspect:[id:string]}>()
const store=useLowAltitudeStore(),expanded=ref(true),query=ref('')
const running=computed(()=>store.aircraft.filter(a=>a.status==='flying'))
const filtered=computed(()=>running.value.filter(a=>(a.callsign+' '+a.id).toLowerCase().includes(query.value.trim().toLowerCase())))
const alerted=(id:string)=>store.alerts.some(a=>a.entityId===id&&a.status==='active')
watch(()=>store.districtId,()=>{query.value=''})
watch(()=>store.mode,mode=>{expanded.value=mode!=='airspace'})
</script>

<template>
  <section class="aircraft-browser" aria-label="运行中无人机">
    <button class="browser-heading" :aria-expanded="expanded" aria-controls="running-aircraft-list" @click="expanded=!expanded"><span><InterfaceIcon name="aircraft" :size="15" />无人机查看 <b>{{ running.length }}</b></span><span>{{ expanded?'收起 −':'展开 +' }}</span></button>
    <div v-if="expanded" id="running-aircraft-list">
      <input v-model="query" type="search" placeholder="搜索呼号 / 编号" aria-label="搜索运行中的无人机" />
      <div class="aircraft-list">
        <article v-for="aircraft in filtered" :key="aircraft.id" :class="{selected:store.selectedEntity?.type==='aircraft'&&store.selectedEntity.id===aircraft.id}">
          <button class="aircraft-pick" :aria-label="'定位 '+aircraft.callsign" :aria-pressed="store.selectedEntity?.type==='aircraft'&&store.selectedEntity.id===aircraft.id" @click="emit('select',aircraft.id)"><span class="aircraft-list-title"><b>{{ aircraft.callsign }}</b><em :class="{warning:alerted(aircraft.id)}">{{ alerted(aircraft.id)?'△ 告警':'● 在飞' }}</em></span><small>{{ aircraft.id }} · {{ aircraft.altitude }} m · {{ aircraft.battery }}%</small></button>
          <button class="aircraft-inspect-shortcut" :aria-label="'跟随查看 '+aircraft.callsign" title="跟随机体近景" @click="emit('inspect',aircraft.id)"><InterfaceIcon name="aircraft" :size="15" /><span>查看</span></button>
        </article>
        <p v-if="!filtered.length">{{ running.length?'没有匹配的在飞无人机':'当前区县暂无运行中的无人机' }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.aircraft-browser{margin-top:18px;padding-top:15px;border-top:1px solid #d8e3eb}.browser-heading{width:100%;display:flex;align-items:center;justify-content:space-between;background:none;border:0;color:#315a76;padding:0;font:12px 'Microsoft YaHei',sans-serif;cursor:pointer}.browser-heading>span:first-child{display:flex;gap:7px;align-items:center;font-weight:600}.browser-heading b{border-radius:4px;background:#e5f0f9;color:#2a77a8;padding:2px 5px;font-size:10px}.browser-heading>span:last-child{font-size:10px;color:#6c8a9d}.aircraft-browser input{width:100%;box-sizing:border-box;margin:10px 0 7px;padding:8px 10px;border:1px solid #d1e0ea;background:#f6f9fc;border-radius:5px;color:#345d77;font:11px 'Microsoft YaHei',sans-serif}.aircraft-list{max-height:186px;overflow:auto;scrollbar-width:thin;scrollbar-color:#bed5e4 transparent}.aircraft-list article{display:flex;align-items:stretch;margin-bottom:5px;border:1px solid transparent;border-radius:5px}.aircraft-list article.selected{background:#eaf4fc;border-color:#afd2ea}.aircraft-list article:hover{background:#f0f6fb}.aircraft-pick{flex:1;min-width:0;border:0;background:none;text-align:left;padding:9px 6px;color:#365f79;cursor:pointer}.aircraft-list-title{display:flex;align-items:center;justify-content:space-between;gap:4px}.aircraft-list-title b{font-size:11px;font-weight:600}.aircraft-list-title em{font-size:9px;color:#29896e;font-style:normal}.aircraft-list-title em.warning{color:#a47824}.aircraft-pick small{display:block;margin-top:6px;font-size:9px;color:#6b8597}.aircraft-inspect-shortcut{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;flex-shrink:0;border:0;border-left:1px solid #deebf3;background:transparent;color:#337eab;padding:5px 7px;cursor:pointer;font-size:9px}.aircraft-list p{padding:12px 5px;color:#748b9b;font-size:11px}button:focus-visible,input:focus-visible{outline:2px solid #2881bb;outline-offset:1px}
@media(max-height:820px){.aircraft-browser{margin-top:12px;padding-top:12px}.aircraft-list{max-height:138px}}
</style>
