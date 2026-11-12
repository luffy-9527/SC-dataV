import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Run from the repository root: node src/pages/LowAltitude/tests/verify.mjs
const server=await createServer({cacheDir:'node_modules/.vite-low-altitude-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'})
try {
  const {FlightMotion,METERS_PER_UNIT,AIRCRAFT_SCALE,routePath}=await server.ssrLoadModule('/src/pages/LowAltitude/flightMotion.ts')
  const {districts}=await server.ssrLoadModule('/src/pages/LowAltitude/districts.ts')
  const {createDistrictSnapshot}=await server.ssrLoadModule('/src/pages/LowAltitude/districtData.ts')
  const {districtGeography}=await server.ssrLoadModule('/src/pages/LowAltitude/districtGeography.ts')
  let maxSpeedError=0,minClearance=Infinity,minLaneSeparation=Infinity
  for(const district of districts){
    const snapshot=createDistrictSnapshot(district),motion=new FlightMotion(snapshot.routes,snapshot.aircraft,16.8)
    const geography=districtGeography(district.id)
    assert(Math.abs(Math.max(geography.width,geography.depth)-120)<1e-8,'district fit')
    for(const pad of snapshot.vertiports)assert(geography.clearance([pad.x,pad.z])>30/geography.metersPerUnit,'pad outside district')
    for(let i=0;i<snapshot.vertiports.length;i++)for(let j=0;j<i;j++){const a=snapshot.vertiports[i],b=snapshot.vertiports[j];assert(Math.hypot(a.x-b.x,a.z-b.z)>32/geography.metersPerUnit,'overlapping pads')}
    for(const route of snapshot.routes)for(const p of routePath(route,20/geography.metersPerUnit).samples)assert(geography.contains([p.x,p.z]),district.name+' route leaves boundary')
    for(const zone of snapshot.zones)assert(geography.clearance([zone.x,zone.z])>=zone.radius,'zone leaves boundary')
    for(const rings of geography.polygons)for(const ring of rings)for(const point of ring){const projected=geography.project(geography.unproject(point));assert(Math.hypot(point[0]-projected[0],point[1]-projected[1])<1e-7,'projection round trip')}
    const aircraft=snapshot.aircraft.filter(a=>a.status==='flying')
    // Equal elapsed time at different frame rates must reach the same position.
    const motion30=new FlightMotion(snapshot.routes,snapshot.aircraft,16.8),motion144=new FlightMotion(snapshot.routes,snapshot.aircraft,16.8)
    for(let n=0;n<30*12;n++)motion30.step(1/30,snapshot.aircraft)
    for(let n=0;n<144*12;n++)motion144.step(1/144,snapshot.aircraft)
    for(const a of aircraft)assert(motion30.poses.get(a.id).position.distanceTo(motion144.poses.get(a.id).position)<1e-7,'frame-rate-dependent distance')
    // Start close to the seam and cross both the wrap and the opposite turn.
    for(const a of aircraft){const p=motion.poses.get(a.id);p.distance=motion.paths.get(a.routeId).length-.05}
    motion.step(0,snapshot.aircraft)
    for(let n=0;n<2400;n++){
      const before=aircraft.map(a=>motion.poses.get(a.id).position.clone())
      const dt=n%2?1/30:1/60
      motion.step(dt,snapshot.aircraft)
      aircraft.forEach((a,i)=>{
        const pose=motion.poses.get(a.id),distance=pose.position.distanceTo(before[i]),expected=a.speed/METERS_PER_UNIT*dt
        maxSpeedError=Math.max(maxSpeedError,Math.abs(distance/expected-1))
        assert(Math.abs(distance/expected-1)<.035,JSON.stringify({reason:'uneven speed',district:district.name,id:a.id,distance,expected,error:distance/expected-1,step:n}))
        const clearance=pose.position.y-AIRCRAFT_SCALE*.8-16.8
        minClearance=Math.min(minClearance,clearance);assert(clearance>1.9,'roof clearance')
        for(let j=0;j<i;j++){const separation=Math.abs(pose.position.y-motion.poses.get(aircraft[j].id).position.y);minLaneSeparation=Math.min(minLaneSeparation,separation);assert(separation>.9,'aircraft altitude overlap')}
      })
    }
    const retarget=aircraft.find(a=>a.id==='UAV-05'),pose=motion.poses.get(retarget.id),before=pose.position.clone()
    retarget.routeId='RT-08';motion.step(1/60,snapshot.aircraft)
    assert(pose.position.distanceTo(before)<.08,'emergency route teleports')
    for(let n=0;n<1800;n++)motion.step(1/60,snapshot.aircraft)
    motion.publish(snapshot.aircraft)
    assert.equal(retarget.altitude,Math.round(pose.position.y*METERS_PER_UNIT))
  }
  console.log(JSON.stringify({districts:districts.length,maxSpeedErrorPercent:maxSpeedError*100,minClearance,minLaneSeparation,checks:['Mercator round trip','district fit','pad containment and separation','full flight path containment','airspace containment','frame-independent speed','closed-loop continuity','flight clearance','lane separation','emergency route continuity','telemetry alignment']},null,2))
}finally{await server.close()}
