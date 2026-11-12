import { initialAircraft, initialAlerts, initialMissions, initialRoutes, initialVertiports, initialZones, simulatedEmergency } from './data'
import type { DistrictProfile } from './districts'
import type { SimulationEvent } from './types'
import { districtGeography } from './districtGeography'

export function createDistrictSnapshot(district:DistrictProfile) {
  const prefix=district.name
  const geography=districtGeography(district.id)
  const routeNames=['示范巡检航线','社区巡检演练线','交通巡检演练线','医疗转运演练线','园区联络演练线','生态巡检演练线','训练检查航线','应急联动航线']
  // Real boundaries, simulated operations. Keep rounded corridors fully inside
  // an interior disk; these positions do not claim surveyed/approved facilities.
  const routes=initialRoutes.map((route,i)=>{
    const anchor=geography.urbanAnchors[i],angle=(i*.71+district.seed*.01)%Math.PI
    const radius=Math.min(320/geography.metersPerUnit,anchor.clearance-60/geography.metersPerUnit)
    const points=Array.from({length:5},(_,j)=>{
      const along=(j/4*2-1)*radius,bend=Math.sin(j/4*Math.PI)*radius*.17
      return [anchor.point[0]+Math.cos(angle)*along-Math.sin(angle)*bend,anchor.point[1]+Math.sin(angle)*along+Math.cos(angle)*bend] as [number,number]
    })
    return {...route,name:prefix+' · '+routeNames[i],points}
  })
  const ports=initialVertiports.map((p,i)=>({...p,name:prefix+' · 模拟'+['中心起降场','一号机巢','二号机巢','应急备降点','巡检起降场','三号机巢'][i],x:geography.urbanAnchors[i].point[0],z:geography.urbanAnchors[i].point[1]}))
  // Every district owns a separate local snapshot, including alerts and missions.
  const ids=['UAV-01','UAV-03','UAV-04','UAV-05','UAV-07','UAV-08','UAV-10','UAV-12','UAV-13','UAV-17']
  const aircraft=initialAircraft.filter(a=>ids.includes(a.id)).map((a,i)=>{
    const route=routes.find(r=>r.id===a.routeId)!
    const phase=(i*.137+district.seed%17*.013)%1,scaled=phase*(route.points.length-1),n=Math.floor(scaled),t=scaled-n
    const start=route.points[n],end=route.points[Math.min(n+1,route.points.length-1)]
    const status=i<8?'flying':i<9?'standby':'offline'
    return {...a,status:status as typeof a.status,phase,x:status==='flying'?start[0]+(end[0]-start[0])*t:ports[i%ports.length].x,z:status==='flying'?start[1]+(end[1]-start[1])*t:ports[i%ports.length].z,heading:Math.atan2(end[1]-start[1],end[0]-start[0])*180/Math.PI,altitude:status==='flying'?a.altitude||80:0,operator:prefix+'模拟运行组',model:'四旋翼 · 云台巡检型',signal:status==='offline'?0:a.signal}
  })
  const zoneNames=['临时空域','限制空域','保护空域','巡检开放空域','社区开放空域','训练临时空域','生态限制空域','设施保护空域']
  const zones=initialZones.map((z,i)=>({...z,name:prefix+' · 模拟'+zoneNames[i],x:geography.urbanAnchors[i].point[0],z:geography.urbanAnchors[i].point[1],radius:Math.min(180/geography.metersPerUnit,geography.urbanAnchors[i].clearance-20/geography.metersPerUnit),height:(z.ceiling-z.floor)/geography.metersPerUnit,activeFlights:[1,1,0,3,3,0,0,0][i]}))
  const missionNames=['区域巡检演练','道路巡查演练','园区巡检演练','生态监测演练','医疗物资演练','应急联动演练']
  const missions=initialMissions.map((m,i)=>({...m,name:prefix+' · '+missionNames[i],owner:prefix+'模拟服务组'}))
  const alerts=initialAlerts.map(a=>({...a,detail:prefix+' · '+a.detail}))
  const emergency={...simulatedEmergency,title:prefix+' · 模拟烟雾线索核查',location:prefix+'示范片区 · 虚构事件'}
  const now=Date.now()
  const eventLog:SimulationEvent[]=[{timestamp:now-24000,type:'任务起飞',entityId:'UAV-01',payload:{label:missions[0].name}},{timestamp:now-98000,type:'航线审批',entityId:'RT-01',payload:{label:routes[0].name+'已批准'}}]
  return {aircraft,routes,vertiports:ports,zones,missions,alerts,emergency,eventLog}
}
export type DistrictSnapshot = ReturnType<typeof createDistrictSnapshot>
