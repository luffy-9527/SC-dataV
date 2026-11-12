import { BufferGeometry, Float32BufferAttribute, Shape, ShapeGeometry, Vector2 } from 'three'
import type { districtGeography, MapPoint } from './districtGeography'
import type { createTerrain } from './terrain'

interface VectorFeature {id:number;kind:'road'|'water'|'green';class:string;points:MapPoint[];closed:boolean;width?:string;lanes?:string;bridge:boolean}
interface VectorDataset {id:string;features:VectorFeature[]}
const datasets=import.meta.glob<string>('./data/vectors/51*.json',{query:'?url',import:'default',eager:true})
export async function loadVectorContext(id:string,signal?:AbortSignal):Promise<VectorDataset>{
  const url=datasets['./data/vectors/'+id+'.json']
  if(!url)throw new Error('Vector district unavailable: '+id)
  const response=await fetch(url,{signal})
  if(!response.ok)throw new Error('Vector dataset failed: '+response.status)
  return response.json()
}

/** Fixed draw-count layers; all coordinates use the same projection and DEM. */
export function createVectorContext(geo:ReturnType<typeof districtGeography>,terrain:ReturnType<typeof createTerrain>,data:VectorDataset){
  const buffers={roads:[] as number[],curbs:[] as number[],markings:[] as number[],water:[] as number[],green:[] as number[],waterEdges:[] as number[]}
  const m=geo.metersPerUnit
  const center=geo.project(geo.feature.properties.center as MapPoint)
  const nearCenter=(p:MapPoint)=>Math.hypot(p[0]-center[0],p[1]-center[1])*m<2600
  const roadWidths:Record<string,number>={motorway:17,trunk:15,primary:13,secondary:11,tertiary:9,residential:7,unclassified:6,service:4,living_street:5,pedestrian:4,footway:2,cycleway:2,path:1.5,steps:1.5}
  let roads=0,water=0,green=0
  function vertex(output:number[],p:MapPoint,lift:number){output.push(p[0],terrain.height(...p)+lift/m,p[1])}
  function quad(output:number[],a:MapPoint,b:MapPoint,width:number,lift:number){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<1e-9)return
    const nx=-dz/length*width/(2*m),nz=dx/length*width/(2*m)
    const al:MapPoint=[a[0]+nx,a[1]+nz],ar:MapPoint=[a[0]-nx,a[1]-nz],bl:MapPoint=[b[0]+nx,b[1]+nz],br:MapPoint=[b[0]-nx,b[1]-nz]
    if(![al,ar,bl,br].every(p=>geo.contains(p)))return
    for(const p of [al,bl,ar,ar,bl,br])vertex(output,p,lift)
  }
  function polygon(output:number[],points:MapPoint[],lift:number,edge=false){
    const shape=new Shape(points.map(([x,z])=>new Vector2(x,-z))),indexed=new ShapeGeometry(shape),g=indexed.toNonIndexed(),p=g.attributes.position
    function triangle(a:MapPoint,b:MapPoint,c:MapPoint,depth=0){
      const lengths=[Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1])],i=lengths.indexOf(Math.max(...lengths))
      if(lengths[i]>(nearCenter(a)?80:180)/m&&depth<12){const vs=[a,b,c],u=vs[i],v=vs[(i+1)%3],w=vs[(i+2)%3],mid:MapPoint=[(u[0]+v[0])/2,(u[1]+v[1])/2];triangle(u,mid,w,depth+1);triangle(mid,v,w,depth+1);return}
      if([a,b,c].every(v=>geo.contains(v)))for(const v of [a,b,c])vertex(output,v,lift)
    }
    for(let i=0;i<p.count;i+=3)triangle([p.getX(i),-p.getY(i)],[p.getX(i+1),-p.getY(i+1)],[p.getX(i+2),-p.getY(i+2)])
    g.dispose();indexed.dispose()
    if(edge)for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];if(geo.contains(a)&&geo.contains(b)){vertex(buffers.waterEdges,a,lift+.3);vertex(buffers.waterEdges,b,lift+.3)}}
  }
  for(const feature of data.features){
    const points=feature.points.map(p=>geo.project(p))
    if(feature.kind==='green'&&feature.closed){polygon(buffers.green,points,1.2);green++;continue}
    if(feature.kind==='water'&&feature.closed){polygon(buffers.water,points,1.5,true);water++;continue}
    if(feature.kind==='green')continue
    const explicit=parseFloat(feature.width??''),lanes=parseFloat(feature.lanes??'')
    const width=Number.isFinite(explicit)?Math.max(1,Math.min(explicit,100)):feature.kind==='water'?(feature.class==='river'?22:5):(Number.isFinite(lanes)?Math.min(30,lanes*3.2):roadWidths[feature.class]??5)
    const lift=feature.kind==='water'?1.5:feature.bridge?4:2
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1])*m
      // Preserve every source bend; only reduce extra DEM subdivisions away
      // from the operational center. Terrain resolution is approximately 530 m.
      const steps=Math.max(1,Math.ceil(length/(nearCenter(a)?30:90)))
      for(let j=0;j<steps;j++){
        const t=j/steps,u=(j+1)/steps,p:MapPoint=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],q:MapPoint=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]
        if(feature.kind==='water')quad(buffers.water,p,q,width,lift)
        else{quad(buffers.curbs,p,q,width+1.6,lift-.2);quad(buffers.roads,p,q,width,lift);if(width>=9&&j%2===0)quad(buffers.markings,p,q,.24,lift+.12)}
      }
    }
    if(feature.kind==='road')roads++;else water++
  }
  const meshes=Object.fromEntries(Object.entries(buffers).map(([key,positions])=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));return [key,g]})) as Record<keyof typeof buffers,BufferGeometry>
  meshes.roads.userData={districtId:geo.id,roads,water,green}
  return {...meshes,counts:{roads,water,green},dispose(){Object.values(meshes).forEach(g=>g.dispose())}}
}
