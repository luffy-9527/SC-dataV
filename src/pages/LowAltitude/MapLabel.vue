<script setup lang="ts">
import { onBeforeUnmount, onMounted, useSlots, watch, watchEffect, h, render } from 'vue'
import { useLoop, useTres } from '@tresjs/core'
import { Vector3 } from 'three'

const props = withDefaults(defineProps<{ position: [number,number,number]; positionSource?:()=>Vector3|undefined; center?:boolean; pointerEvents?:string; collisionGroup?:string }>(), { center:true, pointerEvents:'auto' })
const slots = useSlots()
const { camera, renderer, sizes, invalidate } = useTres()
const element = document.createElement('div')
element.style.cssText = 'position:absolute;left:0;top:0;z-index:3;will-change:transform;'
const point = new Vector3()
let previous = ''
// Project labels into DOM without changing reactive state on every frame.
watchEffect(() => {
  element.style.pointerEvents=props.pointerEvents
  if(props.collisionGroup)element.dataset.mapCollision=props.collisionGroup
  else delete element.dataset.mapCollision
  render(h('div', {style:{transform:props.center?'translate(-50%,-50%)':undefined,pointerEvents:props.pointerEvents}},slots.default?.()),element)
}, { flush:'post' })
// A watch callback does not subscribe to the renderer's internal frame counter.
// Calling invalidate inside watchEffect would keep scheduling another render.
watch(() => props.position, () => invalidate(), { deep:true, immediate:true })
useLoop().onBeforeRender(() => {
  const cam=camera.value
  if(!cam)return
  cam.updateMatrixWorld()
  const live=props.positionSource?.()
  if(live){point.copy(live);point.y+=1.15}else point.set(...props.position)
  point.project(cam)
  const visible=point.z>-1&&point.z<1&&Math.abs(point.x)<1.1&&Math.abs(point.y)<1.1
  element.style.display=visible?'block':'none'
  if(!visible)return
  const x=(point.x+1)*sizes.width.value/2
  let y=(1-point.y)*sizes.height.value/2
  // Resolve only within the same label family, in DOM order. Earlier labels
  // already have this frame's position, so placement does not drift over time.
  if(props.collisionGroup){
    const content=element.firstElementChild?.firstElementChild??element.firstElementChild
    const width=content?.getBoundingClientRect().width??0
    const height=content?.getBoundingClientRect().height??0
    const parent=element.parentElement?.getBoundingClientRect()
    const left=x-(props.center?width/2:0)+(parent?.left??0)
    const previousLabels:DOMRect[]=[]
    for(let sibling=element.previousElementSibling;sibling;sibling=sibling.previousElementSibling){
      if(sibling instanceof HTMLElement&&sibling.dataset.mapCollision===props.collisionGroup&&sibling.style.display!=='none'){
        const content=sibling.firstElementChild?.firstElementChild??sibling.firstElementChild
        const rect=content?.getBoundingClientRect();if(rect)previousLabels.push(rect)
      }
    }
    for(let attempt=0;attempt<previousLabels.length;attempt++){
      const top=y-(props.center?height/2:0)+(parent?.top??0)
      const overlap=previousLabels.find(r=>left<r.right+6&&left+width>r.left-6&&top<r.bottom+6&&top+height>r.top-6)
      if(!overlap)break
      y=overlap.top-(parent?.top??0)-height+(props.center?height/2:0)-7
    }
  }
  const transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)'
  if(transform!==previous){element.style.transform=transform;previous=transform}
})
onMounted(()=>{renderer.domElement.parentElement?.appendChild(element)})
onBeforeUnmount(()=>{render(null,element);element.remove()})
</script>

<template><TresGroup /></template>
