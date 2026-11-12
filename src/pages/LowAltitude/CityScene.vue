<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import MapLabel from './MapLabel.vue'
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh, MeshBasicMaterial, Object3D, RingGeometry, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createGeographicAssets } from './geographicAssets'
import { createUrbanModel, facadeTexture, loadBuildings } from './urbanModel'
import { createVectorContext, loadVectorContext } from './vectorContext'
import { FlightMotion } from './flightMotion'
import AircraftFleet from './AircraftFleet.vue'
import FlightRoutes from './FlightRoutes.vue'
import AirspaceVolumes from './AirspaceVolumes.vue'
import { useLowAltitudeStore } from './store'
import type { AirspaceZone, EntityKind } from './types'

const props=withDefaults(defineProps<{ quality?: 'balanced' | 'detail'; zoneFilter?: 'all' | AirspaceZone['type'] }>(), { quality: 'balanced', zoneFilter:'all' })
const emit = defineEmits<{ select: [type: 'aircraft' | 'zone' | 'route' | 'vertiport', id: string] }>()
const store = useLowAltitudeStore()
const camera = ref<PerspectiveCamera>()
const controlsTarget = shallowRef(new Vector3(0, 0, 0))
const controls = ref<InstanceType<typeof OrbitControls>>()
const assets = createGeographicAssets(store.districtId)
const meters=assets.geography.metersPerUnit
const terrain=assets.terrain
let routeRoof=0
for(const route of store.routes)for(const [x,z] of route.points)routeRoof=Math.max(routeRoof,terrain.height(x,z))
const motion=markRaw(new FlightMotion(store.routes,store.aircraft,routeRoof,{metersPerUnit:meters,ground:terrain.height}))
motion.publish(store.aircraft)
const mapSurface=markRaw(assets.surface),mapSlab=markRaw(assets.slab),mapEdge=markRaw(assets.edge)
const urban=shallowRef<ReturnType<typeof createUrbanModel>>()
const contextModel=shallowRef<ReturnType<typeof createVectorContext>>()
const contextStatus=ref<'loading'|'ready'|'error'>('loading')
const wallsTexture=markRaw(facadeTexture())
const buildingStatus=ref<'loading'|'ready'|'error'>('loading')
const districtCoverage=ref(false)
const viewMode=ref<'urban'|'district'>('urban')
const showBuildings=ref(true)
const flightReady=ref(false)
let disposed=false
const assetRequest=new AbortController()
const inspectingAircraft = ref(false)
const balancedDpr=ref(1)
const detailedEdges=ref(true)
// Keep a native-resolution model. On slow GPUs drop optional outlines instead
// of scaling the entire canvas down and blurring every building and road.
function adaptResolution(fps:number) {
  if(props.quality!=='balanced')return
  if(fps<26)detailedEdges.value=false
  else if(fps>54)detailedEdges.value=true
}

// Six pads share a single geometry, material and instanced draw call.
const padParts: BufferGeometry[] = []
function padPart(geometry: BufferGeometry, color: string) {
  const g = geometry.toNonIndexed(), c = new Color(color), colors: number[] = []
  for(let i=0;i<g.attributes.position.count;i++)colors.push(c.r,c.g,c.b)
  g.setAttribute('color',new Float32BufferAttribute(colors,3));padParts.push(g);geometry.dispose()
}
padPart(new CylinderGeometry(1.6,1.6,.12,24),'#183947')
padPart(new RingGeometry(1.4,1.6,24).rotateX(-Math.PI/2).translate(0,.08,0),'#73b7c4')
for(const x of [-.4,.4])padPart(new BoxGeometry(.14,.06,1).translate(x,.1,0),'#c6e6e9')
padPart(new BoxGeometry(.8,.06,.14).translate(0,.1,0),'#c6e6e9')
const padGeometry = mergeGeometries(padParts)!;padParts.forEach(p=>p.dispose())
const padMaterial = new MeshBasicMaterial({vertexColors:true})
const pads = markRaw(new InstancedMesh(padGeometry,padMaterial,store.vertiports.length))
const transform = new Object3D()
function updatePads(){store.vertiports.forEach((p,i)=>{transform.position.set(p.x,supportHeight(p.x,p.z)+.025,p.z);transform.scale.setScalar(10/meters);transform.updateMatrix();pads.setMatrixAt(i,transform.matrix)});pads.instanceMatrix.needsUpdate=true}
updatePads()
function selectPad(event:{instanceId?:number;stopPropagation:()=>void}) { event.stopPropagation();if(event.instanceId!==undefined)emit('select','vertiport',store.vertiports[event.instanceId].id) }

const activeRoute = computed(()=>{
  const selected=store.selectedEntity
  if(!selected)return ''
  if(selected.type==='route')return selected.id
  if(selected.type==='aircraft')return store.aircraft.find(a=>a.id===selected.id)?.routeId??''
  if(selected.type==='mission')return store.missions.find(m=>m.id===selected.id)?.routeId??''
  return ''
})
const labelAircraft = computed(()=>store.aircraft.filter(a=>a.id===store.selectedEntity?.id||(store.mode!=='airspace'&&(a.id==='UAV-03'||a.id==='UAV-07'))))
const selectedPort = computed(()=>store.vertiports.find(p=>p.id===store.selectedEntity?.id))
const selectedAircraft = computed(()=>store.aircraft.find(a=>a.id===store.selectedEntity?.id))
function supportHeight(x:number,z:number) { return urban.value?.supportHeight(x,z)??terrain.height(x,z) }
const labels = [{name:store.district.name,position:[assets.geography.anchors[0].point[0],terrain.height(...assets.geography.anchors[0].point)+.5,assets.geography.anchors[0].point[1]+5]}]
function resolvePosition(type:EntityKind,id:string):Vector3|null {
  if(type==='alert'){const a=store.alerts.find(a=>a.id===id);return a?resolvePosition(a.entityKind,a.entityId):null}
  if(type==='mission'){const m=store.missions.find(m=>m.id===id);return m?resolvePosition('route',m.routeId):null}
  if(type==='route'){const path=motion.paths.get(id);if(!path)return null;const p=path.curve.getPointAt(.25);p.y=motion.floor;return p}
  const item=type==='aircraft'?store.aircraft.find(a=>a.id===id):type==='zone'?store.zones.find(z=>z.id===id):store.vertiports.find(p=>p.id===id)
  return item?new Vector3(item.x,type==='aircraft'?motion.poses.get(id)?.position.y??0:supportHeight(item.x,item.z),item.z):null
}
watch(()=>store.selectedEntity,selected=>{
  if(inspectingAircraft.value)resetView()
  if(!selected||!camera.value)return
  const target=resolvePosition(selected.type,selected.id)
  if(target){const offset=camera.value.position.clone().sub(controlsTarget.value);controlsTarget.value=target;camera.value.position.copy(target.clone().add(offset))}
})
function fitDistrictView() {
  viewMode.value='district'
  inspectingAircraft.value=false
  controlsTarget.value = new Vector3(0,2,0)
  if(!camera.value)return
  const cam=camera.value
  const width=window.innerWidth,height=Math.max(window.innerHeight,1)
  const left=(document.querySelector('.left-panel')?.getBoundingClientRect().right??width*.16)+22
  const right=(document.querySelector('.right-panel')?.getBoundingClientRect().left??width*.84)-22
  const top=(document.querySelector('.kpi-ribbon')?.getBoundingClientRect().bottom??height*.17)+18
  const bottom=(document.querySelector('.layer-dock')?.getBoundingClientRect().top??height*.84)-24
  // Fit the actual boundary into the unobstructed viewport, including tall/narrow
  // districts. Keep map orientation north-up and preserve the geographic shape.
  const corners=assets.geography.polygons.flatMap(rings=>rings[0].map(([x,z])=>new Vector3(x,terrain.height(x,z),z)))
  const direction=new Vector3(.035,1,.55).normalize()
  let distance=140
  cam.aspect=width/height;cam.updateProjectionMatrix()
  for(let i=0;i<3;i++){
    cam.position.copy(controlsTarget.value).addScaledVector(direction,distance);cam.lookAt(controlsTarget.value);cam.updateMatrixWorld()
    const projected=corners.map(p=>p.clone().project(cam))
    const xs=projected.map(p=>p.x),ys=projected.map(p=>p.y)
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
    distance*=Math.max((maxX-minX)*width/2/(right-left),(maxY-minY)*height/2/(bottom-top))*1.04
  }
  cam.position.copy(controlsTarget.value).addScaledVector(direction,distance);cam.lookAt(controlsTarget.value);cam.updateMatrixWorld()
  const projected=corners.map(p=>p.clone().project(cam))
  const centerX=(Math.min(...projected.map(p=>p.x))+Math.max(...projected.map(p=>p.x)))/2
  const centerY=(Math.min(...projected.map(p=>p.y))+Math.max(...projected.map(p=>p.y)))/2
  const desiredX=(left+right)/width-1,desiredY=1-(top+bottom)/height
  const halfHeight=Math.tan(cam.fov*Math.PI/360)*distance
  const offset=new Vector3((centerX-desiredX)*halfHeight*cam.aspect,(centerY-desiredY)*halfHeight,0).applyQuaternion(cam.quaternion)
  cam.position.add(offset);controlsTarget.value.add(offset);cam.lookAt(controlsTarget.value)
}
function resetView() {
  viewMode.value='urban';inspectingAircraft.value=false
  const cam=camera.value;if(!cam)return
  const [x,z]=assets.geography.project(assets.geography.feature.properties.center as [number,number])
  const y=terrain.height(x,z)
  controlsTarget.value=new Vector3(x,y+25/meters,z)
  // Approximately a three-kilometre urban neighborhood, with oblique facades.
  const scale=Math.max(1,1080/Math.max(window.innerHeight,650))
  cam.position.copy(controlsTarget.value).add(new Vector3(700,1050,1300).multiplyScalar(scale/meters))
  cam.lookAt(controlsTarget.value);controls.value?.instance?.target.copy(controlsTarget.value)
}
function fitAirspaceView() {
  if(!camera.value||store.selectedEntity)return
  inspectingAircraft.value=false;viewMode.value='urban'
  const zones=store.zones
  const minX=Math.min(...zones.map(z=>z.x-z.radius)),maxX=Math.max(...zones.map(z=>z.x+z.radius))
  const minZ=Math.min(...zones.map(z=>z.z-z.radius)),maxZ=Math.max(...zones.map(z=>z.z+z.radius))
  const x=(minX+maxX)/2,z=(minZ+maxZ)/2
  controlsTarget.value=new Vector3(x,terrain.height(x,z)+80/meters,z)
  const distance=Math.max(maxX-minX,maxZ-minZ)*2.05
  camera.value.position.copy(controlsTarget.value).add(new Vector3(.2,1,.75).normalize().multiplyScalar(distance))
  camera.value.lookAt(controlsTarget.value);controls.value?.instance?.target.copy(controlsTarget.value)
}
watch(()=>store.mode,mode=>{if(mode==='airspace')fitAirspaceView()})
function inspectAircraft() {
  const aircraft=selectedAircraft.value
  if(!aircraft||!camera.value)return
  inspectingAircraft.value=true
  const pose=motion.poses.get(aircraft.id)!
  controlsTarget.value=pose.position.clone()
  const offset=new Vector3(2.8,3.2,3).multiplyScalar(motion.modelScale/.52).applyAxisAngle(new Vector3(0,1,0),-pose.heading)
  camera.value.position.copy(controlsTarget.value.clone().add(offset))
  camera.value.lookAt(controlsTarget.value);controls.value?.instance?.target.copy(controlsTarget.value)
}
function focusAircraft() {
  const aircraft=selectedAircraft.value,cam=camera.value
  if(!aircraft||!cam)return
  const pose=motion.poses.get(aircraft.id)
  if(!pose)return
  inspectingAircraft.value=false;viewMode.value='urban'
  controlsTarget.value=pose.position.clone()
  cam.position.copy(controlsTarget.value).add(new Vector3(420,560,700).multiplyScalar(1/meters))
  cam.lookAt(controlsTarget.value);controls.value?.instance?.target.copy(controlsTarget.value)
}
const followDelta=new Vector3()
function followAircraft(position:Vector3) {
  if(!inspectingAircraft.value||!camera.value)return
  followDelta.copy(position).sub(controlsTarget.value)
  camera.value.position.add(followDelta)
  controlsTarget.value.copy(position)
  controls.value?.instance?.target.copy(position)
}
function zoom(direction:number) {
  if(!camera.value)return
  const offset=camera.value.position.clone().sub(controlsTarget.value).multiplyScalar(direction>0?.85:1.18).clampLength(inspectingAircraft.value?motion.modelScale*6:180/meters,260)
  camera.value.position.copy(controlsTarget.value.clone().add(offset))
}
watch(camera,()=>resetView())
function resizeView(){if(!inspectingAircraft.value){if(viewMode.value==='district')fitDistrictView();else resetView()}}
onMounted(async()=>{
  resetView();window.addEventListener('resize',resizeView)
  loadVectorContext(store.districtId,assetRequest.signal).then(data=>{if(disposed)return;contextModel.value=markRaw(createVectorContext(assets.geography,terrain,data));contextStatus.value='ready'}).catch(()=>{if(!disposed)contextStatus.value='error'})
  try{
    const data=await loadBuildings(store.districtId,assetRequest.signal);if(disposed)return
    urban.value=markRaw(createUrbanModel(assets.geography,terrain,data))
    districtCoverage.value=data.extent==='district'
    // Local facade and roof geometry share a geographic datum with the DEM.
    // Raise the full demonstration corridor above the tallest local obstacle.
    // The district can include distant mountains. Only obstacles around the
    // operational corridors determine flight altitude, not the entire district.
    routeRoof=Math.max(routeRoof,urban.value.corridorObstacleHeight(motion.paths.values()))
    motion.setSurface(routeRoof,terrain.height)
    for(const port of store.vertiports){
      const roof=supportHeight(port.x,port.z)
      for(const a of store.aircraft)if(a.status!=='flying'&&a.x===port.x&&a.z===port.z){const pose=motion.poses.get(a.id);if(pose)pose.position.y=roof+motion.modelScale*1.125}
    }
    motion.setSurface(routeRoof,supportHeight)
    motion.publish(store.aircraft);updatePads();buildingStatus.value='ready'
  }catch(error){if(!disposed){console.warn('Local building model unavailable',error);buildingStatus.value='error'}}
  if(!disposed){flightReady.value=true;if(store.mode==='airspace')fitAirspaceView()}
})
defineExpose({resetView,zoom,inspectAircraft,focusAircraft})
onBeforeUnmount(()=>{
  disposed=true;assetRequest.abort();urban.value?.dispose();contextModel.value?.dispose();wallsTexture.dispose()
  window.removeEventListener('resize',resizeView)
  assets.dispose();padGeometry.dispose();padMaterial.dispose();pads.dispose()
})
</script>

<template>
  <div class="scene-shell">
    <TresCanvas clear-color="#e7eef3" :dpr="quality === 'detail' ? 1.25 : balancedDpr" :antialias="true" :shadows="false" render-mode="manual" :fps-limit="60">
      <TresPerspectiveCamera ref="camera" :args="[45, 2, .015, 550]" :position="[6,139,79]" />
      <TresAmbientLight :intensity="1.1" color="#d7e5ee" />
      <TresDirectionalLight :position="[-40,80,35]" :intensity="1.7" color="#fff5dd" />
      <TresDirectionalLight :position="[35,25,-40]" :intensity=".45" color="#93c9f1" />
      <TresMesh :rotation-x="-Math.PI/2" :position="[0,assets.floor-.05,0]"><TresPlaneGeometry :args="[1500,1500]" /><TresMeshBasicMaterial color="#e7eef3" :tone-mapped="false" /></TresMesh>
      <TresMesh name="district-model-terrain" :geometry="mapSurface"><TresMeshStandardMaterial color="#a8b5b8" :roughness="1" :metalness="0" /></TresMesh>
      <TresGroup v-if="contextModel">
        <TresMesh name="model-green" :geometry="contextModel.green"><TresMeshBasicMaterial color="#bed5bc" :side="DoubleSide" /></TresMesh>
        <TresMesh name="model-water" :geometry="contextModel.water"><TresMeshBasicMaterial color="#75adc3" :side="DoubleSide" /></TresMesh>
        <TresLineSegments :geometry="contextModel.waterEdges"><TresLineBasicMaterial color="#5895af" /></TresLineSegments>
        <TresMesh name="model-road-edges" :geometry="contextModel.curbs"><TresMeshBasicMaterial color="#f1f2ee" :side="DoubleSide" /></TresMesh>
        <TresMesh name="model-roads" :geometry="contextModel.roads"><TresMeshBasicMaterial color="#a3b2bd" :side="DoubleSide" /></TresMesh>
        <TresMesh :geometry="contextModel.markings"><TresMeshBasicMaterial color="#f6f8f5" :side="DoubleSide" /></TresMesh>
      </TresGroup>
      <TresMesh :geometry="mapSlab"><TresMeshStandardMaterial color="#9cbbc9" :roughness=".95" :side="DoubleSide" /></TresMesh>
      <TresGroup v-if="urban&&showBuildings">
        <TresMesh name="city-building-walls" :geometry="urban.walls"><TresMeshBasicMaterial :map="wallsTexture" vertex-colors :side="DoubleSide" /></TresMesh>
        <TresMesh name="city-building-roofs" :geometry="urban.roofs"><TresMeshBasicMaterial color="#e1e9ed" /></TresMesh>
        <TresLineSegments v-if="quality==='detail'||detailedEdges" :geometry="urban.roofEdges"><TresLineBasicMaterial color="#7695a6" transparent :opacity=".42" /></TresLineSegments>
      </TresGroup>
      <TresLineSegments :geometry="mapEdge"><TresLineBasicMaterial color="#4e96ba" transparent :opacity=".85" /></TresLineSegments>
      <TresGroup v-if="store.layerVisibility.districts&&!inspectingAircraft&&viewMode==='district'">
        <MapLabel v-for="label in labels" :key="label.name" :position="label.position as [number,number,number]" center pointer-events="none"><span class="district-map-label">{{ label.name }}</span></MapLabel>
      </TresGroup>
      <FlightRoutes v-if="flightReady&&store.layerVisibility.routes&&!inspectingAircraft" :motion="motion" :active-route="activeRoute" @select="emit('select','route',$event)" />
      <AirspaceVolumes v-if="store.layerVisibility.zones&&!inspectingAircraft" :meters="meters" :ground="terrain.height" :filter="zoneFilter" @select="emit('select','zone',$event)" />
      <TresGroup v-if="store.layerVisibility.inspectionAreas&&!inspectingAircraft">
        <TresMesh v-for="mission in store.missions.filter(m=>m.category!=='logistics')" :key="mission.id" :position="[store.routes.find(r=>r.id===mission.routeId)?.points[2]?.[0]??0,.15,store.routes.find(r=>r.id===mission.routeId)?.points[2]?.[1]??0]" :rotation-x="-Math.PI/2">
          <TresRingGeometry :args="[6.85,7,6]" /><TresMeshBasicMaterial color="#6bd4bd" transparent :opacity=".5" :depth-write="false" />
        </TresMesh>
      </TresGroup>
      <primitive :object="pads" :visible="store.layerVisibility.vertiports&&!inspectingAircraft" @click="selectPad" />
      <MapLabel v-if="selectedPort&&store.layerVisibility.vertiports&&!inspectingAircraft" :position="[selectedPort.x,supportHeight(selectedPort.x,selectedPort.z)+20/meters,selectedPort.z]" center pointer-events="none"><span class="scene-tag">H {{ selectedPort?.name }}</span></MapLabel>
      <AircraftFleet :motion="motion" :paused="!flightReady" :follow="followAircraft" :support-height="supportHeight" @select="emit('select','aircraft',$event)" @performance="adaptResolution" />
      <TresGroup v-if="store.layerVisibility.aircraft">
        <MapLabel v-for="aircraft in inspectingAircraft?[]:labelAircraft" :key="aircraft.id" :position="[0,0,0]" :position-source="()=>motion.poses.get(aircraft.id)?.position" center>
          <button type="button" class="scene-tag" :class="{'scene-tag--warning':aircraft.id==='UAV-07'}" @click.stop="emit('select','aircraft',aircraft.id)"><span class="aircraft-dot" />{{ aircraft.callsign }}<small>{{ aircraft.altitude }} m</small></button>
        </MapLabel>
      </TresGroup>
      <TresGroup v-if="store.layerVisibility.weather">
        <TresMesh v-for="i in 5" :key="i" :position="[-50+i*18,17,-24+i%3*22]" :rotation-z="-Math.PI/2" :rotation-y=".4"><TresConeGeometry :args="[.22,2.2,4]" /><TresMeshBasicMaterial color="#91c7d8" /></TresMesh>
      </TresGroup>
      <OrbitControls ref="controls" :target="controlsTarget" :enable-damping="true" :damping-factor=".12" :zoom-speed=".7" :rotate-speed=".4" :min-distance="inspectingAircraft?motion.modelScale*5:180/meters" :max-distance="260" :min-polar-angle=".2" :max-polar-angle="1.28" />
    </TresCanvas>
    <div class="scene-vignette" aria-hidden="true" />
    <div class="city-view-switch" aria-label="地图视角"><button :class="{active:viewMode==='urban'}" @click="resetView">城区近景</button><button :class="{active:viewMode==='district'}" @click="fitDistrictView">区县总览</button><button :class="{active:showBuildings}" :aria-pressed="showBuildings" @click="showBuildings=!showBuildings">3D 建筑</button><span>{{ buildingStatus==='loading'?'正在加载楼体…':buildingStatus==='error'?'建筑数据暂不可用':urban?.sites.length+' 栋 / '+(districtCoverage?'区县范围':'城区局部') }}</span></div>
    <div v-if="!inspectingAircraft" class="operation-legend"><template v-if="store.mode==='airspace'"><span>✓ 适飞</span><span>◷ 临时</span><span>△ 限飞</span><span>⊘ 禁飞</span><small>上下边界表示离地高度</small></template><template v-else><span>→ 执行航线</span><span>┄ 规划航线</span><span>△ 异常航线</span><small>选择无人机可高亮所属航线</small></template></div>
    <div class="geographic-map-credit"><span class="map-source-dot" />三维矢量模型 · Mapzen 地形<small>© OpenStreetMap contributors · ODbL<br>{{ urban?.tagged??0 }} 栋有楼高标签 / {{ urban?.estimated??0 }} 栋估算<br>{{ contextStatus==='ready'?'道路 / 水系 / 绿地 · 矢量建模':contextStatus==='loading'?'正在载入地表模型…':'地表细节暂不可用' }}<br>{{ districtCoverage?'全区县检索 · 开源数据仍有缺失':'城区局部覆盖' }}<br>飞行及起降设施为模拟</small></div>
    <div v-if="inspectingAircraft" class="aircraft-closeup"><span>机体近景 · {{ selectedAircraft?.callsign }}<small>拖动旋转 · 滚轮缩放</small></span><button type="button" @click="resetView">返回区域总览 ↗</button></div>
  </div>
</template>

<style>
.scene-shell { position:absolute;inset:0;overflow:hidden;background:#e7eef3; }
.scene-shell canvas { width:100%;height:100%;touch-action:none; }
.city-view-switch{position:absolute;top:282px;left:var(--content-left,330px);display:flex;align-items:center;gap:4px;z-index:5;padding:5px;border:1px solid #cadce7;border-radius:5px;background:#fffffff2}.city-view-switch button{padding:7px 11px;border:0;color:#5f7b8f;background:transparent;border-radius:3px;font:11px Inter,"Microsoft YaHei",sans-serif;cursor:pointer}.city-view-switch button.active{background:#e4f1fb;color:#216fa6}.city-view-switch span{padding:0 9px;color:#607e91;font-size:10px}@media(max-height:820px){.city-view-switch{top:248px}}
.geographic-map-credit{position:absolute;left:24px;bottom:71px;color:#476b83;font:11px Inter,"Microsoft YaHei",sans-serif;line-height:1.8;pointer-events:none}.geographic-map-credit small{display:block;color:#648094;font-size:10px}.map-source-dot{display:inline-block;width:5px;height:5px;background:#7bcabb;border-radius:50%;margin-right:7px}
.scene-vignette { position:absolute;inset:0;background:linear-gradient(180deg,#e7eef329,transparent 27%,transparent 85%,#e7eef347);pointer-events:none; }
.district-map-label { color:#517994;font:12px "Microsoft YaHei",sans-serif;letter-spacing:4px;text-shadow:0 1px 4px #fff;white-space:nowrap; }
.zone-map-label { padding:4px 7px;background:#ffffffdb;border-radius:3px;font:10px "Microsoft YaHei",sans-serif;letter-spacing:1px;white-space:nowrap; }
.scene-tag { display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #afcddd;border-radius:4px;background:#fffffff2;color:#2c6182;font:12px Inter,"Microsoft YaHei",sans-serif;white-space:nowrap;box-shadow:0 4px 12px #36546e14;cursor:pointer; }
.scene-tag small { margin-left:4px;color:#67869a;font-size:10px; }
.aircraft-dot { width:5px;height:5px;border-radius:50%;background:#288bb8; }
.scene-tag--warning { border-color:#d1aa65; }.scene-tag--warning .aircraft-dot { background:#b98629; }
.aircraft-closeup{position:absolute;left:50%;bottom:170px;transform:translateX(-50%);display:flex;align-items:center;gap:32px;padding:12px 18px;border:1px solid #c2d9e8;border-radius:8px;background:#fffffff2;color:#315e7d;font-size:14px;z-index:3}.aircraft-closeup small{display:block;font-size:11px;color:#6a879b;margin-top:5px}.aircraft-closeup button{border:1px solid #bcd7e7;border-radius:4px;color:#2378a8;background:#e9f4fc;padding:8px 12px;cursor:pointer}
.geographic-map-credit { padding:8px 10px;background:#f8fbfdee;border:1px solid #d5e2eb;border-radius:6px; }
.operation-legend{position:absolute;z-index:4;top:330px;left:var(--content-left,330px);display:flex;flex-wrap:wrap;gap:12px;padding:7px 10px;background:#ffffffe6;border:1px solid #d6e3eb;border-radius:4px;color:#4e748d;font:10px 'Microsoft YaHei',sans-serif;pointer-events:none}.operation-legend small{font-size:9px;color:#7690a2}@media(max-height:820px){.operation-legend{top:295px}}
</style>
