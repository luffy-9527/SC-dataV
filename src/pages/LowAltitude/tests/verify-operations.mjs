import assert from 'node:assert/strict'
import {createServer} from 'vite'
const server=await createServer({cacheDir:'node_modules/.vite-operations-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:'custom'})
try{
  const {createAirspaceVisual,createRouteVisual}=await server.ssrLoadModule('/src/pages/LowAltitude/operationGeometry.ts')
  const {FlightMotion}=await server.ssrLoadModule('/src/pages/LowAltitude/flightMotion.ts')
  const {createDistrictSnapshot}=await server.ssrLoadModule('/src/pages/LowAltitude/districtData.ts')
  const {districts}=await server.ssrLoadModule('/src/pages/LowAltitude/districts.ts')
  const {districtGeography}=await server.ssrLoadModule('/src/pages/LowAltitude/districtGeography.ts')
  const {createTerrain}=await server.ssrLoadModule('/src/pages/LowAltitude/terrain.ts')
  let routes=0,zones=0
  for(const district of districts){
    const geo=districtGeography(district.id),terrain=createTerrain(geo),snapshot=createDistrictSnapshot(district)
    const motion=new FlightMotion(snapshot.routes,snapshot.aircraft,0,{metersPerUnit:geo.metersPerUnit,ground:terrain.height})
    for(const zone of snapshot.zones){
      // Exercise nonzero lower limits as well as the demo's ground-based zones.
      const input={...zone,floor:Math.min(40,zone.ceiling/2)}
      const visual=createAirspaceVisual(input,geo.metersPerUnit,terrain.height),outline=visual.outline.attributes.position
      for(let i=0;i<outline.count;i++){
        const x=outline.getX(i),y=outline.getY(i),z=outline.getZ(i)
        const agl=(y-terrain.height(x,z)-.005)*geo.metersPerUnit
        assert(Math.min(Math.abs(agl-input.floor),Math.abs(agl-input.ceiling))<.03,'boundary must match displayed AGL limits')
        assert(geo.contains([x,z]),'airspace outside district')
      }
      for(const g of [visual.side,visual.outline,visual.roof,visual.pillars])for(const value of g.attributes.position.array)assert(Number.isFinite(value))
      visual.dispose();zones++
    }
    for(const path of motion.paths.values()){
      const visual=createRouteVisual(path,geo.metersPerUnit),positions=visual.dashed.attributes.position,distances=visual.dashed.attributes.lineDistance
      for(let i=0;i<positions.count;i++){
        const p=path.curve.getPointAt(i/(positions.count-1))
        assert(Math.hypot(p.x-positions.getX(i),p.z-positions.getZ(i))<.0001,'visible line diverges from flight path')
        if(i)assert(distances.getX(i)>=distances.getX(i-1),'dash spacing reverses')
      }
      assert(visual.direction.attributes.position.count>=24)
      visual.dispose();routes++
    }
  }
  console.log(JSON.stringify({districts:districts.length,routes,zones,routeAlignment:true,terrainFollowingAGL:true},null,2))
}finally{await server.close()}
