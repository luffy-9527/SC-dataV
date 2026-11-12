import { BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, PlaneGeometry, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace, Vector2 } from 'three'
import type { districtGeography, MapPoint } from './districtGeography'
import type { createTerrain } from './terrain'

export interface BuildingFeature {id:number;points:MapPoint[];height:number;heightSource:'tag'|'levels'|'default';name:string;kind:string}
export interface BuildingDataset {id:string;name:string;center:MapPoint;bounds:number[];extent?:'district';buildings:BuildingFeature[]}
const datasets=import.meta.glob<string>('./data/buildings/51*.json',{query:'?url',import:'default',eager:true})
export async function loadBuildings(id:string,signal?:AbortSignal):Promise<BuildingDataset> {
  const url=datasets['./data/buildings/'+id+'.json']
  if(!url)throw new Error('Building dataset unavailable: '+id)
  const response=await fetch(url,{signal})
  if(!response.ok)throw new Error('Building dataset failed: '+response.status)
  return response.json()
}
export interface BuildingSite {id:number;points:MapPoint[];minX:number;maxX:number;minZ:number;maxZ:number;base:number;top:number}
export function pointInFootprint(x:number,z:number,points:MapPoint[]) {
  let inside=false
  for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside}
  return inside
}
/** Two merged meshes for all footprints; no per-building component or draw. */
export function createUrbanModel(geography:ReturnType<typeof districtGeography>,terrain:ReturnType<typeof createTerrain>,data:BuildingDataset) {
  const northwest=geography.project([data.bounds[0],data.bounds[3]]),southeast=geography.project([data.bounds[2],data.bounds[1]])
  const imageWidth=southeast[0]-northwest[0],imageDepth=southeast[1]-northwest[1]
  const wallPositions:number[]=[],wallNormals:number[]=[],wallColors:number[]=[],wallUV:number[]=[],roofPositions:number[]=[],edges:number[]=[],sites:BuildingSite[]=[]
  let tagged=0,estimated=0,maxRoof=-Infinity
  for(const building of data.buildings){
    const points=building.points.slice(0,-1).map(point=>geography.project(point))
    if(points.length<3||points.some(p=>!geography.contains(p)))continue
    const signedArea=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1]},0)/2
    if(Math.abs(signedArea)<12/geography.metersPerUnit**2)continue
    // Normalize winding so all facade normals face outward.
    if(signedArea<0)points.reverse()
    const ground=points.map(([x,z])=>terrain.height(x,z)),base=Math.min(...ground)-.025
    const height=building.height/geography.metersPerUnit,top=Math.max(...ground)+height
    const shade=new Color(building.height>70?'#7eabbf':building.height>25?'#a4c0cc':'#b3c4c9')
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)
      if(length<1e-8)continue
      const nx=dz/length,nz=-dx/length,light=.68+Math.max(0,-nx*.55+nz*.65)*.32
      const vertices=[[a[0],base,a[1],0,0],[a[0],top,a[1],0,building.height/3.2],[b[0],top,b[1],length*geography.metersPerUnit/4,building.height/3.2],[a[0],base,a[1],0,0],[b[0],top,b[1],length*geography.metersPerUnit/4,building.height/3.2],[b[0],base,b[1],length*geography.metersPerUnit/4,0]]
      for(const v of vertices){wallPositions.push(v[0],v[1],v[2]);wallNormals.push(nx,0,nz);wallUV.push(v[3],v[4]);wallColors.push(shade.r*light,shade.g*light,shade.b*light)}
      edges.push(a[0],top+.006,a[1],b[0],top+.006,b[1])
    }
    const shape=new Shape(points.map(([x,z])=>new Vector2(x,-z)))
    const triangulated=new ShapeGeometry(shape),roof=triangulated.toNonIndexed(),pos=roof.attributes.position
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=-pos.getY(i);roofPositions.push(x,top,z)}
    triangulated.dispose();roof.dispose()
    const xs=points.map(p=>p[0]),zs=points.map(p=>p[1])
    sites.push({id:building.id,points,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),base,top})
    maxRoof=Math.max(maxRoof,top);if(building.heightSource==='tag')tagged++;else estimated++
  }
  function geometry(positions:number[],uv?:number[]){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));if(uv)g.setAttribute('uv',new Float32BufferAttribute(uv,2));return g}
  const walls=geometry(wallPositions,wallUV);walls.setAttribute('normal',new Float32BufferAttribute(wallNormals,3));walls.setAttribute('color',new Float32BufferAttribute(wallColors,3))
  const roofs=geometry(roofPositions);roofs.computeVertexNormals()
  const roofEdges=geometry(edges)
  const ground=new PlaneGeometry(imageWidth,imageDepth,48,48).rotateX(-Math.PI/2).translate((northwest[0]+southeast[0])/2,0,(northwest[1]+southeast[1])/2)
  const vertices=ground.attributes.position
  for(let i=0;i<vertices.count;i++)vertices.setY(i,terrain.height(vertices.getX(i),vertices.getZ(i))+.012)
  ground.computeVertexNormals()
  const spatial=new Map<string,BuildingSite[]>()
  for(const site of sites)for(let x=Math.floor(site.minX);x<=Math.floor(site.maxX);x++)for(let z=Math.floor(site.minZ);z<=Math.floor(site.maxZ);z++){const key=x+','+z;let bucket=spatial.get(key);if(!bucket)spatial.set(key,bucket=[]);bucket.push(site)}
  function supportHeight(x:number,z:number){let h=terrain.height(x,z);for(const site of spatial.get(Math.floor(x)+','+Math.floor(z))??[])if(x>=site.minX&&x<=site.maxX&&z>=site.minZ&&z<=site.maxZ&&pointInFootprint(x,z,site.points))h=Math.max(h,site.top);return h}
  function corridorObstacleHeight(paths:Iterable<{samples:readonly {x:number;z:number}[]}>,padding=30/geography.metersPerUnit) {
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,height=-Infinity
    for(const path of paths)for(const p of path.samples){
      minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z)
      height=Math.max(height,terrain.height(p.x,p.z))
    }
    for(const site of sites)if(site.maxX>=minX-padding&&site.minX<=maxX+padding&&site.maxZ>=minZ-padding&&site.minZ<=maxZ+padding)height=Math.max(height,site.top)
    return Number.isFinite(height)?height:0
  }
  walls.userData={count:sites.length,tagged,estimated,districtId:geography.id}
  return {walls,roofs,roofEdges,ground,sites,tagged,estimated,maxRoof:Number.isFinite(maxRoof)?maxRoof:0,supportHeight,corridorObstacleHeight,dispose(){walls.dispose();roofs.dispose();roofEdges.dispose();ground.dispose()}}
}
export function facadeTexture() {
  const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#e0e5e5';ctx.fillRect(0,0,32,32)
  ctx.fillStyle='#a6bdc8';ctx.fillRect(5,6,22,17);ctx.fillStyle='#c5d2d7';ctx.fillRect(6,7,20,3)
  ctx.fillStyle='#bdc8cc';ctx.fillRect(15,6,2,17);ctx.fillStyle='#b8c2c4';ctx.fillRect(0,29,32,3)
  const texture=new CanvasTexture(canvas);texture.wrapS=texture.wrapT=RepeatWrapping;texture.colorSpace=SRGBColorSpace;texture.anisotropy=4
  return texture
}
