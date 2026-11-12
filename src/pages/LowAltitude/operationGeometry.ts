import { BufferGeometry, Float32BufferAttribute, TubeGeometry, Vector3 } from 'three'
import type { FlightPath } from './flightMotion'
import type { AirspaceZone } from './types'

function geometry(points:number[]) {
  const result=new BufferGeometry()
  result.setAttribute('position',new Float32BufferAttribute(points,3))
  return result
}

/** Draw the same arc-length path used by the aircraft, including return turns. */
export function createRouteVisual(path:FlightPath,meters:number) {
  const tube=new TubeGeometry(path.curve,192,1.6/meters,4,true)
  const positions:number[]=[],arrows:number[]=[],linePoints:number[]=[],distances:number[]=[]
  const points=path.curve.getSpacedPoints(192)
  let distance=0
  points.forEach((p,i)=>{
    if(i)distance+=p.distanceTo(points[i-1])
    linePoints.push(p.x,p.y,p.z);distances.push(distance)
    if(i===points.length-1)return
    const q=points[i+1],side=new Vector3(-(q.z-p.z),0,q.x-p.x).normalize().multiplyScalar(9/meters)
    for(const v of [p.clone().add(side),q.clone().add(side),p.clone().sub(side),p.clone().sub(side),q.clone().add(side),q.clone().sub(side)])positions.push(v.x,v.y,v.z)
  })
  const arrowCount=Math.max(4,Math.min(24,Math.round(path.length*meters/110)))
  for(let i=0;i<arrowCount;i++){
    const p=path.curve.getPointAt((i+.4)/arrowCount),t=path.curve.getTangentAt((i+.4)/arrowCount).multiplyScalar(10/meters)
    const side=new Vector3(-t.z,0,t.x).multiplyScalar(.55)
    for(const v of [p.clone().add(t),p.clone().sub(t).add(side),p.clone().addScaledVector(t,-.3),p.clone().add(t),p.clone().addScaledVector(t,-.3),p.clone().sub(t).sub(side)])arrows.push(v.x,v.y+.004,v.z)
  }
  const dashed=geometry(linePoints)
  dashed.setAttribute('lineDistance',new Float32BufferAttribute(distances,1))
  const corridor=geometry(positions),direction=geometry(arrows)
  return {tube,dashed,corridor,direction,dispose(){tube.dispose();dashed.dispose();corridor.dispose();direction.dispose()}}
}

/** AGL limits follow the unchanged terrain. Never inflate a zone to clear roofs. */
export function createAirspaceVisual(zone:AirspaceZone,meters:number,ground:(x:number,z:number)=>number) {
  const walls:number[]=[],edges:number[]=[],cap:number[]=[],posts:number[]=[]
  const segments=48,low:Vector3[]=[],high:Vector3[]=[]
  for(let i=0;i<=segments;i++){
    const angle=i/segments*Math.PI*2,x=zone.x+Math.cos(angle)*zone.radius,z=zone.z+Math.sin(angle)*zone.radius
    const y=ground(x,z)
    low.push(new Vector3(x,y+zone.floor/meters+.005,z))
    high.push(new Vector3(x,y+zone.ceiling/meters+.005,z))
  }
  const center=new Vector3(zone.x,ground(zone.x,zone.z)+zone.ceiling/meters+.005,zone.z)
  const append=(out:number[],values:Vector3[])=>values.forEach(v=>out.push(v.x,v.y,v.z))
  for(let i=0;i<segments;i++){
    append(walls,[low[i],high[i],low[i+1],low[i+1],high[i],high[i+1]])
    append(edges,[low[i],low[i+1],high[i],high[i+1]])
    append(cap,[center,high[i],high[i+1]])
    if(i%6===0)append(posts,[low[i],high[i]])
  }
  const side=geometry(walls),outline=geometry(edges),roof=geometry(cap),pillars=geometry(posts)
  return {side,outline,roof,pillars,label:center.clone().add(new Vector3(0,18/meters,0)),dispose(){side.dispose();outline.dispose();roof.dispose();pillars.dispose()}}
}
