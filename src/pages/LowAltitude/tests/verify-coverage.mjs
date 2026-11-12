import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createServer} from 'vite'

const server=await createServer({cacheDir:'node_modules/.vite-coverage-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'})
function inRing([x,z],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
try{
  const {districtGeography}=await server.ssrLoadModule('/src/pages/LowAltitude/districtGeography.ts')
  const source=JSON.parse(await fs.readFile('src/pages/LowAltitude/data/chengdu.json','utf8'))
  const results=[]
  for(const feature of source.features){
    const id=String(feature.properties.adcode),geo=districtGeography(id)
    const buildings=JSON.parse(await fs.readFile(`src/pages/LowAltitude/data/buildings/${id}.json`,'utf8'))
    const vectors=JSON.parse(await fs.readFile(`src/pages/LowAltitude/data/vectors/${id}.json`,'utf8'))
    assert.equal(buildings.extent,'district',id+' still limited to neighborhood')
    assert.equal(vectors.extent,'district',id+' road coverage still limited')
    const flat=feature.geometry.coordinates.flat(Infinity),xs=[],ys=[]
    for(let i=0;i<flat.length;i+=2){xs.push(flat[i]);ys.push(flat[i+1])}
    assert.deepEqual(buildings.bounds,[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)])
    assert.deepEqual(vectors.bounds,buildings.bounds)
    for(let x=-62;x<=62;x+=1.7)for(let z=-62;z<=62;z+=1.7){
      const naive=geo.polygons.some(rings=>inRing([x,z],rings[0])&&!rings.slice(1).some(r=>inRing([x,z],r)))
      assert.equal(geo.contains([x,z]),naive,id+' indexed boundary changed geography')
    }
    const [cx,cy]=buildings.center,dx=.0135/Math.cos(cy*Math.PI/180)
    const outside=buildings.buildings.filter(b=>b.points.some(([x,y])=>Math.abs(x-cx)>dx||Math.abs(y-cy)>.0135)&&b.points.every(p=>geo.contains(geo.project(p)))).length
    if(id==='510104')assert(outside>5000,'Jinjiang expansion did not add district buildings')
    results.push({id,buildings:buildings.buildings.length,outsideFormerNeighborhood:outside})
  }
  console.log(JSON.stringify({districts:results.length,boundaryIndexEquivalent:true,results},null,2))
}finally{await server.close()}
