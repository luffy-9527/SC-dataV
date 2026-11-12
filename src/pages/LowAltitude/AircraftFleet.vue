<script setup lang="ts">
import { markRaw, onBeforeUnmount, onMounted } from 'vue'
import { useLoop, useTres } from '@tresjs/core'
import { BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, RingGeometry, Sphere, SphereGeometry, Vector3 } from 'three'
import type { Intersection, Raycaster } from 'three'
import { createDroneAssets } from './droneAssets'
import { useLowAltitudeStore } from './store'
import { FlightMotion } from './flightMotion'

const emit = defineEmits<{ select: [id: string]; performance: [fps:number] }>()
const props=defineProps<{motion:FlightMotion;paused?:boolean;follow:(position:Vector3)=>void;supportHeight:(x:number,z:number)=>number}>()
const store = useLowAltitudeStore()
const { advance, camera, renderer } = useTres()
const { onBeforeRender } = useLoop()
const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
let reducedMotion = motion.matches
const assets=createDroneAssets()
const geometry=assets.body
const material = new MeshStandardMaterial({ vertexColors:true,roughness:.43,metalness:.16 })
const fleet = markRaw(new InstancedMesh(geometry, material, store.aircraft.length))
fleet.name='district-aircraft'
fleet.instanceMatrix.setUsage(DynamicDrawUsage)
// Moving instances use a stable broad bound; raycasting still resolves instanceId.
fleet.frustumCulled = false
fleet.boundingSphere = new Sphere(new Vector3(), 200)
// A CPU-only hit volume keeps the smaller airframe easy to select from above.
// It shares the instance transforms but never enters the render scene.
const hitGeometry=new SphereGeometry(1.5,8,6),hitMaterial=new MeshBasicMaterial()
const hitFleet=new InstancedMesh(hitGeometry,hitMaterial,store.aircraft.length)
hitFleet.instanceMatrix=fleet.instanceMatrix
hitFleet.boundingSphere=new Sphere(new Vector3(),200)
fleet.raycast=(raycaster:Raycaster,intersections:Intersection[])=>{
  hitFleet.matrixWorld.copy(fleet.matrixWorld)
  const hits:Intersection[]=[];hitFleet.raycast(raycaster,hits)
  for(const hit of hits){hit.object=fleet;intersections.push(hit)}
}
const rotorMaterial=new MeshStandardMaterial({color:'#273942',roughness:.66,metalness:.12})
const rotors=markRaw(new InstancedMesh(assets.rotor,rotorMaterial,store.aircraft.length*4))
rotors.name='aircraft-propellers';rotors.instanceMatrix.setUsage(DynamicDrawUsage)
rotors.frustumCulled=false;rotors.boundingSphere=new Sphere(new Vector3(),200)
const stemsGeometry = new BufferGeometry()
const stemsArray = new Float32Array(store.aircraft.length * 6)
stemsGeometry.setAttribute('position', new Float32BufferAttribute(stemsArray, 3).setUsage(DynamicDrawUsage))
const stemsMaterial = new LineBasicMaterial({ color:'#6ac9da',transparent:true,opacity:.27,depthWrite:false })
const stems = markRaw(new LineSegments(stemsGeometry, stemsMaterial))
stems.frustumCulled = false
const dummy = new Object3D()
const rotorTransform = new Object3D()
const colors = { flying:new Color('#ffffff'),standby:new Color('#c2d2d8'),offline:new Color('#70818e') }
const selectionGeometry=new RingGeometry(1.2,1.27,40).rotateX(-Math.PI/2)
const selectionMaterial=new MeshBasicMaterial({color:'#b4eff2',transparent:true,opacity:.8,depthWrite:false})
const selection=markRaw(new Mesh(selectionGeometry,selectionMaterial))
selection.visible=false
let dirty = true
let rotorPhase=0
function update(delta = 0) {
  // Deliberately slow visual blade rotation avoids strobing at low frame rates.
  if(!reducedMotion)rotorPhase=(rotorPhase+delta*9)%(Math.PI*2)
  const positions = stemsGeometry.getAttribute('position')
  selection.visible=false
  store.aircraft.forEach((a,i) => {
    const pose=props.motion.poses.get(a.id)!,p=pose.position
    dummy.position.copy(p);dummy.rotation.set(pose.bank,-pose.heading,a.status==='flying'?-.025:0,'YXZ');dummy.scale.setScalar(props.motion.modelScale);dummy.updateMatrix()
    fleet.setMatrixAt(i,dummy.matrix)
    fleet.setColorAt(i, colors[a.status])
    assets.motors.forEach((motor,j)=>{
      rotorTransform.position.set(...motor)
      rotorTransform.rotation.set(0,a.status==='flying'&&!reducedMotion?rotorPhase*(j%2?1:-1)+j:.45+j*.7,0)
      rotorTransform.updateMatrix();rotorTransform.matrix.premultiply(dummy.matrix)
      rotors.setMatrixAt(i*4+j,rotorTransform.matrix)
    })
    const selected=store.selectedEntity?.type==='aircraft'&&store.selectedEntity.id===a.id
    const surface=selected?props.supportHeight(p.x,p.z)+.015:0
    positions.setXYZ(i*2,p.x,surface,p.z);positions.setXYZ(i*2+1,p.x,selected&&a.status==='flying'?p.y-props.motion.modelScale*.8:surface,p.z)
    if(selected){selection.visible=true;selection.position.set(p.x,surface+.005,p.z);selection.scale.setScalar(props.motion.modelScale*2);props.follow(p)}
  })
  fleet.instanceMatrix.needsUpdate = true
  rotors.instanceMatrix.needsUpdate = true
  if(fleet.instanceColor) fleet.instanceColor.needsUpdate=true
  positions.needsUpdate=true
  dirty=false
}
update()
const unsubscribe = store.$subscribe(() => { dirty=true }, { flush:'sync' })
let previousView = ''
let sampleStarted=performance.now(),sampleFrames=0
let previousTime=performance.now(),telemetryElapsed=0,motionElapsed=0
// Explicit frame scheduling avoids a reactive invalidation loop in the custom
// renderer. Static/reduced-motion views render only when state or camera changes.
onBeforeRender(() => {
  const now=performance.now(),delta=(now-previousTime)/1000
  previousTime=now
  if (document.hidden) return
  motionElapsed+=delta
  if(props.paused)motionElapsed=0
  else if(!reducedMotion||motionElapsed>=1){props.motion.step(motionElapsed,store.aircraft);motionElapsed=0}
  telemetryElapsed+=delta
  if(telemetryElapsed>=(reducedMotion?1:.25)){
    // Panels receive a modest telemetry rate; geometry never chases those samples.
    store.$patch(state=>props.motion.publish(state.aircraft));telemetryElapsed=0
  }
  const cam=camera.value
  const view=cam ? [...cam.position.toArray(),...cam.quaternion.toArray(),...cam.projectionMatrix.elements,renderer.domElement.width,renderer.domElement.height].join(',') : ''
  const moving=!reducedMotion && store.layerVisibility.aircraft
  if(moving){
    sampleFrames++
    const now=performance.now(),duration=now-sampleStarted
    if(duration>2400){emit('performance',sampleFrames*1000/duration);sampleStarted=now;sampleFrames=0}
  }else{sampleStarted=performance.now();sampleFrames=0}
  if(moving || dirty || view!==previousView) {
    update(delta)
    previousView=view
    advance()
  }
})
// Keep Tres' shared timer intact; hidden pages submit no frames or transforms.
function visibility() { sampleStarted=performance.now();previousTime=sampleStarted;sampleFrames=0;motionElapsed=0;telemetryElapsed=0;if(!document.hidden)dirty=true }
function motionChanged() { reducedMotion=motion.matches;dirty=true }
function pick(event: { instanceId?: number; stopPropagation: () => void }) {
  event.stopPropagation()
  if(event.instanceId !== undefined) emit('select',store.aircraft[event.instanceId].id)
}
onMounted(() => { document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',motionChanged);visibility() })
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',motionChanged)
  unsubscribe()
  geometry.dispose();material.dispose();stemsGeometry.dispose();stemsMaterial.dispose();fleet.dispose()
  assets.rotor.dispose();rotorMaterial.dispose();rotors.dispose()
  selectionGeometry.dispose();selectionMaterial.dispose()
  hitGeometry.dispose();hitMaterial.dispose();hitFleet.dispose()
})
</script>

<template>
  <TresGroup :visible="store.layerVisibility.aircraft">
    <primitive :object="fleet" @click="pick" />
    <primitive :object="rotors" />
    <primitive :object="stems" />
    <primitive :object="selection" />
  </TresGroup>
</template>
