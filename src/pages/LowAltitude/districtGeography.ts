import { Vector2 } from 'three'
import { buildMapRegions } from '../SmartCity/map/geo'
import type { CityGeoJSON, CityGeoFeature } from '@/types/map'
import chengdu from './data/chengdu.json'

export type MapPoint = [number, number]
export interface GeographicAnchor { point: MapPoint; clearance: number }
const cache = new Map<string, ReturnType<typeof buildGeography>>()

// Bucket boundary edges by latitude. Full-district roads issue millions of
// containment queries; exact intersections only need edges crossing this row.
function indexedRing(ring:MapPoint[]) {
  const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1])
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs)
  const rows=Array.from({length:128},()=>[] as [MapPoint,MapPoint][])
  const row=(z:number)=>Math.max(0,Math.min(127,Math.floor((z-minZ)/(maxZ-minZ||1)*128)))
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j]
    for(let n=row(Math.min(a[1],b[1]));n<=row(Math.max(a[1],b[1]));n++)rows[n].push([a,b])
  }
  return ([x,z]:MapPoint)=>{
    if(x<minX||x>maxX||z<minZ||z>maxZ)return false
    let inside=false
    for(const [a,b] of rows[row(z)])if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside
    return inside
  }
}
function buildGeography(id:string) {
  const feature=(chengdu as unknown as CityGeoJSON).features.find(f=>String(f.properties.adcode)===id)
  if(!feature)throw new Error('Missing local district boundary: '+id)
  const data:CityGeoJSON={type:'FeatureCollection',features:[feature]}
  // Same Mercator projection as SmartCity. Recenter each district independently.
  const {projection,bbox}=buildMapRegions(data,0,120)
  const center=bbox.getCenter(new Vector2()),size=bbox.getSize(new Vector2())
  const scale=120/Math.max(size.x,size.y)
  const project=(point:number[]):MapPoint=>{const p=projection(point as MapPoint)!;return [(p[0]-center.x)*scale,(p[1]+center.y)*scale]}
  const unproject=(point:MapPoint):MapPoint=>projection.invert!([point[0]/scale+center.x,point[1]/scale-center.y]) as MapPoint
  const coordinates=feature.geometry.type==='Polygon'?[feature.geometry.coordinates as number[][][]]:feature.geometry.coordinates as number[][][][]
  const polygons=coordinates.map(polygon=>polygon.map(ring=>ring.map(project)))
  const width=size.x*scale,depth=size.y*scale
  const indexedPolygons=polygons.map(rings=>rings.map(indexedRing))
  function contains(point:MapPoint) { return indexedPolygons.some(rings=>rings[0](point)&&!rings.slice(1).some(contains=>contains(point))) }
  function clearance(point:MapPoint) {
    if(!contains(point))return 0
    let distance=Infinity
    for(const rings of polygons)for(const ring of rings)for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1]
      const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/(dx*dx+dz*dz||1)))
      distance=Math.min(distance,Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz))
    }
    return distance
  }
  // Spatially separated demo anchors; they are NOT surveyed landing facilities.
  const candidates:GeographicAnchor[]=[]
  for(let x=-width/2+1;x<width/2;x+=1.8)for(let z=-depth/2+1;z<depth/2;z+=1.8){
    const point:MapPoint=[x,z],distance=clearance(point)
    if(distance>=5.8)candidates.push({point,clearance:distance})
  }
  candidates.sort((a,b)=>b.clearance-a.clearance)
  if(!candidates.length)throw new Error('District too narrow for demo corridors: '+id)
  const anchors:GeographicAnchor[]=[candidates[0]]
  for(let i=1;i<8;i++){
    let best=candidates[0],score=-Infinity
    for(const candidate of candidates){
      const spacing=Math.min(...anchors.map(a=>Math.hypot(a.point[0]-candidate.point[0],a.point[1]-candidate.point[1])))
      const value=spacing+Math.min(candidate.clearance,15)*.3
      if(value>score){score=value;best=candidate}
    }
    anchors.push(best)
  }
  const latitude=unproject([0,0])[1]*Math.PI/180
  const metersPerUnit=6378137*Math.cos(latitude)/(projection.scale()*scale)
  const centerPoint=project(feature.properties.center as MapPoint)
  const urbanCandidates:GeographicAnchor[]=[]
  for(let ix=-10;ix<=10;ix++)for(let iz=-10;iz<=10;iz++){
    const point:MapPoint=[centerPoint[0]+ix*120/metersPerUnit,centerPoint[1]+iz*120/metersPerUnit],distance=clearance(point)
    if(distance>160/metersPerUnit)urbanCandidates.push({point,clearance:distance})
  }
  urbanCandidates.sort((a,b)=>Math.hypot(a.point[0]-centerPoint[0],a.point[1]-centerPoint[1])-Math.hypot(b.point[0]-centerPoint[0],b.point[1]-centerPoint[1]))
  const urbanAnchors:GeographicAnchor[]=[urbanCandidates[0]??anchors[0]]
  for(let i=1;i<8;i++){
    let best=urbanCandidates[0]??anchors[i],score=-Infinity
    for(const candidate of urbanCandidates){const spacing=Math.min(...urbanAnchors.map(a=>Math.hypot(a.point[0]-candidate.point[0],a.point[1]-candidate.point[1])));if(spacing>score){score=spacing;best=candidate}}
    urbanAnchors.push(best)
  }
  return {id,feature:feature as CityGeoFeature,data,polygons,width,depth,project,unproject,contains,clearance,anchors,urbanAnchors,metersPerUnit}
}
export function districtGeography(id:string) {
  let result=cache.get(id)
  if(!result){result=buildGeography(id);cache.set(id,result)}
  return result
}
