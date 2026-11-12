import type { DistrictProfile } from './districts'

export type GroundPoint = [number, number]
export interface SiteBounds { minX:number; maxX:number; minZ:number; maxZ:number; height:number; kind:string }
export const boundsOf = (points:GroundPoint[],height=0,kind='building'):SiteBounds => ({minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1])),height,kind})
export const overlaps = (a:SiteBounds,b:SiteBounds,gap=.35) => a.minX<b.maxX+gap&&a.maxX>b.minX-gap&&a.minZ<b.maxZ+gap&&a.maxZ>b.minZ-gap
export const squareSite = (x:number,z:number,r:number,kind='facility'):SiteBounds => ({minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r,height:0,kind})
export const riverCenter = (d:DistrictProfile,z:number) => d.riverOffset+Math.sin(z*.042)*d.riverBend+Math.sin(z*.105)*1.6
export const riverHalfWidth = (d:DistrictProfile,z:number) => d.riverWidth+.7*Math.sin(z*.09+1)
export function drySite(d:DistrictProfile,b:SiteBounds,margin=.8) {
  // Sample the whole footprint, including the river's bend between corners.
  for(let z=b.minZ-margin;z<=b.maxZ+margin+.01;z+=.4){
    const center=riverCenter(d,z),width=riverHalfWidth(d,z)+margin
    if(b.maxX>center-width&&b.minX<center+width)return false
  }
  return true
}
export function cityStreets(d:DistrictProfile) {
  const xs=[-62,-49,-36,-23,-10,3,16,30,44,59],zs=[-46,-34,-22,-10,3,16,29,43]
  const intersections:GroundPoint[][]=zs.map((z,j)=>xs.map((x,i)=>[x+z*d.streetAngle+Math.sin(j*.65)*2.2+Math.sin(i*.8+j),z+Math.sin(i*.56)*2.8+Math.sin(i+j*.5)*.7]))
  const roads=intersections.map((points,j)=>({points,major:j===3||j===6}))
  xs.forEach((_,i)=>roads.push({points:intersections.map(row=>row[i]),major:i===3||i===8}))
  return {xs,zs,intersections,roads}
}
export function roadClearance(b:SiteBounds,roads:ReturnType<typeof cityStreets>['roads']) {
  for(const road of roads)for(let i=0;i<road.points.length-1;i++){
    const a=road.points[i],c=road.points[i+1],steps=Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/.45),r=road.major?1.2:.8
    if(!overlaps(b,{minX:Math.min(a[0],c[0])-r,maxX:Math.max(a[0],c[0])+r,minZ:Math.min(a[1],c[1])-r,maxZ:Math.max(a[1],c[1])+r,height:0,kind:'road'},0))continue
    for(let n=0;n<=steps;n++)if(overlaps(b,squareSite(a[0]+(c[0]-a[0])*n/steps,a[1]+(c[1]-a[1])*n/steps,r),0))return false
  }
  return true
}
/** Deterministic facilities are placed before any building, on dry street parcels. */
export function facilityPositions(d:DistrictProfile,positions:GroundPoint[]):GroundPoint[] {
  const reserved:SiteBounds[]=[],roads=cityStreets(d).roads
  return positions.map(([x,z])=>{
    for(let radius=0;radius<=65;radius+=1.5)for(let n=0;n<(radius?24:1);n++){
      const angle=n*Math.PI/12,p:GroundPoint=[x+Math.cos(angle)*radius,z+Math.sin(angle)*radius],site=squareSite(...p,2.65)
      if(Math.hypot(p[0]/1.2,p[1])>62||!drySite(d,site)||!roadClearance(site,roads)||reserved.some(r=>overlaps(site,r,1)))continue
      reserved.push(site);return p
    }
    throw new Error('No clear landing parcel in '+d.name)
  })
}
