import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createServer} from 'vite'
const server=await createServer({cacheDir:'node_modules/.vite-vector-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'})
try{
 const {districts}=await server.ssrLoadModule('/src/pages/LowAltitude/districts.ts')
 const {districtGeography}=await server.ssrLoadModule('/src/pages/LowAltitude/districtGeography.ts')
 const {createTerrain}=await server.ssrLoadModule('/src/pages/LowAltitude/terrain.ts')
 const {createGeographicAssets}=await server.ssrLoadModule('/src/pages/LowAltitude/geographicAssets.ts')
 const {createVectorContext}=await server.ssrLoadModule('/src/pages/LowAltitude/vectorContext.ts')
 const results=[]
 for(const d of districts){
  const geo=districtGeography(d.id),terrain=createTerrain(geo),assets=createGeographicAssets(d.id)
  assert.equal(assets.surface.attributes.uv,undefined,'terrain must have no raster UV mapping')
  const p=assets.surface.attributes.position
  for(let i=0;i<p.count;i+=19)assert(Math.abs(p.getY(i)-terrain.height(p.getX(i),p.getZ(i)))<.0001,'DEM geometry changed')
  const input=JSON.parse(await fs.readFile('src/pages/LowAltitude/data/vectors/'+d.id+'.json','utf8')),model=createVectorContext(geo,terrain,input)
  let vertices=0
  for(const key of ['roads','curbs','markings','water','green','waterEdges']){
   const positions=model[key].attributes.position;vertices+=positions.count
   for(let i=0;i<positions.count;i++){assert(Number.isFinite(positions.getY(i)));if(i%17===0){const x=positions.getX(i),z=positions.getZ(i);assert(positions.getY(i)>=terrain.height(x,z)-.001,'vector layer below ground')}}
  }
  assert(model.roads.attributes.position.count>0,d.name+' missing roads')
  results.push({id:d.id,...model.counts,vertices});model.dispose();assets.dispose()
 }
 console.log(JSON.stringify({districts:20,noRasterMapping:true,terrainPreserved:true,results},null,2))
}finally{await server.close()}
