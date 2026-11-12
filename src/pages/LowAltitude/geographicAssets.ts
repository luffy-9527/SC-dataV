import { BufferGeometry, Float32BufferAttribute, Path, Shape, ShapeGeometry, Vector2 } from 'three'
import { districtGeography } from './districtGeography'
import { createTerrain } from './terrain'

export function createGeographicAssets(id:string) {
  const geography=districtGeography(id),terrain=createTerrain(geography),shapes:Shape[]=[],outline:number[]=[]
  for(const rings of geography.polygons){
    // X/-Z is the horizontal shape plane; rotate into world X/Z afterwards.
    const shape=new Shape(rings[0].map(([x,z])=>new Vector2(x,-z)))
    shape.holes=rings.slice(1).map(ring=>new Path(ring.map(([x,z])=>new Vector2(x,-z))))
    shapes.push(shape)
    for(const ring of rings)for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length]
      const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.2))
      for(let j=0;j<steps;j++){const t=j/steps,u=(j+1)/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,nx=a[0]+(b[0]-a[0])*u,nz=a[1]+(b[1]-a[1])*u;outline.push(x,terrain.height(x,z)+.025,z,nx,terrain.height(nx,nz)+.025,nz)}
    }
  }
  const flat=new ShapeGeometry(shapes),base=flat.toNonIndexed(),surface=new BufferGeometry()
  const position=base.attributes.position,vertices:number[]=[],wall:number[]=[]
  // Split in the geographic plane before sampling the DEM, preserving holes
  // and precise edges without a square raster mask or invented mountain peaks.
  function triangle(a:number[],b:number[],c:number[],level=0){
    const lengths=[Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1])]
    const edge=lengths.indexOf(Math.max(...lengths))
    if(lengths[edge]>1.6&&level<16){
      const p=[a,b,c],u=p[edge],v=p[(edge+1)%3],w=p[(edge+2)%3],mid=[(u[0]+v[0])/2,(u[1]+v[1])/2]
      triangle(u,mid,w,level+1);triangle(mid,v,w,level+1);return
    }
    for(const p of [a,b,c])vertices.push(p[0],terrain.height(p[0],-p[1]),-p[1])
  }
  for(let i=0;i<position.count;i+=3)triangle([position.getX(i),position.getY(i)],[position.getX(i+1),position.getY(i+1)],[position.getX(i+2),position.getY(i+2)])
  base.dispose();flat.dispose()
  // Preserve geographic vertices; ground shading no longer samples any imagery.
  surface.setAttribute('position',new Float32BufferAttribute(vertices,3));surface.computeVertexNormals()
  surface.userData={districtId:id,source:'Local administrative boundary / Mapzen DEM',polygonCount:shapes.length}
  let floor=-2
  for(let i=1;i<vertices.length;i+=3)floor=Math.min(floor,vertices[i]-1)
  for(let i=0;i<outline.length;i+=6){const ax=outline[i],ay=outline[i+1]-.025,az=outline[i+2],bx=outline[i+3],by=outline[i+4]-.025,bz=outline[i+5];wall.push(ax,ay,az,bx,by,bz,ax,floor,az,bx,by,bz,bx,floor,bz,ax,floor,az)}
  const slab=new BufferGeometry();slab.setAttribute('position',new Float32BufferAttribute(wall,3));slab.computeVertexNormals()
  const edge=new BufferGeometry();edge.setAttribute('position',new Float32BufferAttribute(outline,3))
  return {geography,terrain,surface,slab,edge,floor,dispose(){surface.dispose();slab.dispose();edge.dispose()}}
}
