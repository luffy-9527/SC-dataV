import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createServer} from 'vite'
const server=await createServer({cacheDir:'node_modules/.vite-city-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'})
try{
 const {districts}=await server.ssrLoadModule('/src/pages/LowAltitude/districts.ts')
 const {districtGeography}=await server.ssrLoadModule('/src/pages/LowAltitude/districtGeography.ts')
 const {createTerrain,elevationMeters}=await server.ssrLoadModule('/src/pages/LowAltitude/terrain.ts')
 const {createUrbanModel}=await server.ssrLoadModule('/src/pages/LowAltitude/urbanModel.ts')
 const {createDistrictSnapshot}=await server.ssrLoadModule('/src/pages/LowAltitude/districtData.ts')
 const {FlightMotion}=await server.ssrLoadModule('/src/pages/LowAltitude/flightMotion.ts')
 const results=[]
 for(const district of districts){
  const geography=districtGeography(district.id),terrain=createTerrain(geography),snapshot=createDistrictSnapshot(district)
  const data=JSON.parse(await fs.readFile('src/pages/LowAltitude/data/buildings/'+district.id+'.json','utf8'))
  const urban=createUrbanModel(geography,terrain,data)
  assert(urban.sites.length>0,district.name+' has no building coverage')
  for(const g of [urban.walls,urban.roofs,urban.ground])for(const value of g.attributes.position.array)assert(Number.isFinite(value),'invalid geometry')
  for(const site of urban.sites){assert(site.top>site.base);assert(site.points.every(p=>geography.contains(p)))}
  let roof=0
  for(const r of snapshot.routes)for(const p of r.points)roof=Math.max(roof,terrain.height(...p))
  const motion=new FlightMotion(snapshot.routes,snapshot.aircraft,roof,{metersPerUnit:geography.metersPerUnit,ground:urban.supportHeight})
  roof=Math.max(roof,urban.corridorObstacleHeight(motion.paths.values()))
  motion.setSurface(roof,urban.supportHeight)
  for(const path of motion.paths.values())for(const p of path.samples)assert(geography.contains([p.x,p.z]),district.name+' flight path outside boundary')
  for(let i=0;i<snapshot.vertiports.length;i++)for(let j=0;j<i;j++){const a=snapshot.vertiports[i],b=snapshot.vertiports[j];assert(Math.hypot(a.x-b.x,a.z-b.z)>32/geography.metersPerUnit,'pads intersect')}
  let minClearance=Infinity,maxSpeedError=0
  for(let frame=0;frame<600;frame++){
   const before=snapshot.aircraft.map(a=>motion.poses.get(a.id).position.clone());motion.step(1/30,snapshot.aircraft)
   snapshot.aircraft.forEach((a,i)=>{if(a.status!=='flying')return;const p=motion.poses.get(a.id).position,expected=a.speed/geography.metersPerUnit/30;maxSpeedError=Math.max(maxSpeedError,Math.abs(p.distanceTo(before[i])/expected-1));minClearance=Math.min(minClearance,(p.y-urban.supportHeight(p.x,p.z)-motion.modelScale*.8)*geography.metersPerUnit)})
  }
  assert(minClearance>20,district.name+' aircraft intersects terrain/building')
  assert(maxSpeedError<.04,district.name+' uneven speed')
  const thirty=new FlightMotion(snapshot.routes,snapshot.aircraft,roof,{metersPerUnit:geography.metersPerUnit,ground:terrain.height}),fast=new FlightMotion(snapshot.routes,snapshot.aircraft,roof,{metersPerUnit:geography.metersPerUnit,ground:terrain.height})
  for(let i=0;i<300;i++)thirty.step(1/30,snapshot.aircraft);for(let i=0;i<1440;i++)fast.step(1/144,snapshot.aircraft)
  for(const a of snapshot.aircraft)assert(thirty.poses.get(a.id).position.distanceTo(fast.poses.get(a.id).position)<1e-7,'frame dependent')
  results.push({id:district.id,buildings:urban.sites.length,tagged:urban.tagged,estimated:urban.estimated,minClearanceMeters:minClearance,maxSpeedErrorPercent:maxSpeedError*100,triangles:(urban.walls.attributes.position.count+urban.roofs.attributes.position.count)/3})
  urban.dispose()
 }
 assert(elevationMeters([103.1,30.9])>elevationMeters([104.08,30.65])+500,'DEM lacks mountain relief')
 console.log(JSON.stringify({districts:20,results},null,2))
}finally{await server.close()}
