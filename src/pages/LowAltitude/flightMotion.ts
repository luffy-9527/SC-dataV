import { CatmullRomCurve3, Vector3 } from 'three'
import type { Aircraft, FlightRoute } from './types'

export const AIRCRAFT_SCALE=.52
export const METERS_PER_UNIT=6
export const FLIGHT_CLEARANCE=2.4
const PATH_SAMPLES=2048
export interface FlightPose { position:Vector3; heading:number; bank:number; distance:number; routeId:string; speed:number; lane:number; transition?:FlightPath }

/** Arc-length sampling is shared by the map, telemetry and animated aircraft. */
export class FlightPath {
  readonly curve:CatmullRomCurve3
  readonly length:number
  readonly samples:Vector3[]
  constructor(points:Vector3[],readonly closed=true) {
    this.curve=new CatmullRomCurve3(points,closed,'centripetal')
    this.curve.arcLengthDivisions=8192;this.curve.updateArcLengths()
    this.length=this.curve.getLength()
    this.samples=this.curve.getSpacedPoints(PATH_SAMPLES)
  }
  sample(distance:number,target:Vector3) {
    const normalized=this.closed?((distance%this.length)+this.length)%this.length:Math.max(0,Math.min(distance,this.length))
    const index=normalized/this.length*PATH_SAMPLES,i=Math.min(PATH_SAMPLES-1,Math.floor(index))
    return target.copy(this.samples[i]).lerp(this.samples[i+1],index-i)
  }
  nearest(position:Vector3) {
    let best=Infinity,distance=0
    this.samples.forEach((p,i)=>{const d=(p.x-position.x)**2+(p.z-position.z)**2;if(d<best){best=d;distance=i/PATH_SAMPLES*this.length}})
    return distance
  }
}
export function routePath(route:FlightRoute,laneWidth=1.15) {
  const source=route.points.map(([x,z])=>new Vector3(x,0,z)),points:Vector3[]=[]
  // Parallel outbound/return lanes with rounded end turns avoid end-to-start jumps.
  const normals=source.map((_,i)=>{const before=source[Math.max(0,i-1)],after=source[Math.min(source.length-1,i+1)];return new Vector3(-(after.z-before.z),0,after.x-before.x).normalize().multiplyScalar(laneWidth)})
  source.forEach((p,i)=>points.push(p.clone().add(normals[i])))
  const end=source.length-1,endTangent=source[end].clone().sub(source[end-1]).normalize().multiplyScalar(laneWidth*1.435)
  points.push(source[end].clone().add(endTangent))
  for(let i=end;i>=0;i--)points.push(source[i].clone().sub(normals[i]))
  points.push(source[0].clone().add(source[0].clone().sub(source[1]).normalize().multiplyScalar(laneWidth*1.435)))
  return new FlightPath(points)
}
export class FlightMotion {
  readonly paths:Map<string,FlightPath>
  readonly poses=new Map<string,FlightPose>()
  floor:number
  readonly modelScale:number
  readonly metersPerUnit:number
  private ground:(x:number,z:number)=>number
  private readonly ahead=new Vector3()
  constructor(routes:FlightRoute[],aircraft:Aircraft[],maxRoof:number,options?:{metersPerUnit:number;ground:(x:number,z:number)=>number}) {
    this.metersPerUnit=options?.metersPerUnit??METERS_PER_UNIT
    this.modelScale=options?Math.max(.045,Math.min(.14,7/this.metersPerUnit)):AIRCRAFT_SCALE
    this.ground=options?.ground??(()=>0)
    this.floor=options?maxRoof+55/this.metersPerUnit:Math.max(12,maxRoof+FLIGHT_CLEARANCE)
    this.paths=new Map(routes.map(route=>[route.id,routePath(route,options?20/this.metersPerUnit:1.15)]))
    aircraft.forEach((a,i)=>{
      const path=this.paths.get(a.routeId)!,position=new Vector3(a.x,this.ground(a.x,a.z)+this.modelScale*1.125,a.z),distance=a.phase*path.length
      const pose:FlightPose={position,heading:a.heading*Math.PI/180,bank:0,distance,routeId:a.routeId,speed:a.speed,lane:this.floor+i*(options?Math.max(this.modelScale*1.9,14/this.metersPerUnit):.95)}
      if(a.status==='flying'){path.sample(distance,position);position.y=pose.lane;path.sample(distance+.12,this.ahead);pose.heading=Math.atan2(this.ahead.z-position.z,this.ahead.x-position.x)}
      this.poses.set(a.id,pose)
    })
  }
  setSurface(maxRoof:number,ground:(x:number,z:number)=>number){
    this.ground=ground
    const floor=maxRoof+55/this.metersPerUnit,delta=floor-this.floor
    this.floor=floor
    for(const pose of this.poses.values()){pose.lane+=delta;if(pose.speed>0)pose.position.y=pose.lane}
  }
  step(seconds:number,aircraft:Aircraft[]) {
    for(const a of aircraft){
      const p=this.poses.get(a.id)!,path=this.paths.get(a.routeId)
      if(!path)continue
      if(a.status!=='flying'){p.position.set(a.x,this.ground(a.x,a.z)+this.modelScale*1.125,a.z);p.speed=0;continue}
      if(p.routeId!==a.routeId){
        const join=path.nearest(p.position),start=p.position.clone(),end=path.sample(join,new Vector3());end.y=p.lane
        const heading=new Vector3(Math.cos(p.heading),0,Math.sin(p.heading)),endTangent=path.sample(join+1,new Vector3()).sub(path.sample(join,new Vector3())).normalize()
        const reach=Math.min(3,Math.max(.4,start.distanceTo(end)/3))
        p.transition=new FlightPath([start,start.clone().addScaledVector(heading,reach),end.clone().addScaledVector(endTangent,-reach),end],false)
        p.routeId=a.routeId;p.distance=0
      }
      const speed=Math.max(0,a.speed)/this.metersPerUnit
      p.speed=a.speed;p.distance+=speed*seconds
      const active=p.transition??path
      active.sample(p.distance,p.position)
      active.sample(p.distance+.12,this.ahead)
      if(p.transition&&p.distance>=active.length){
        p.distance=path.nearest(p.position)+(p.distance-active.length);p.transition=undefined
        path.sample(p.distance,p.position);path.sample(p.distance+.12,this.ahead)
      }
      p.position.y=p.lane
      const heading=Math.atan2(this.ahead.z-p.position.z,this.ahead.x-p.position.x)
      const turn=Math.atan2(Math.sin(heading-p.heading),Math.cos(heading-p.heading))
      const bank=Math.max(-.12,Math.min(.12,-turn/Math.max(.008,seconds)*.07))
      p.bank+=(bank-p.bank)*(1-Math.exp(-seconds*5));p.heading=heading
    }
  }
  publish(aircraft:Aircraft[]) {
    for(const a of aircraft){const pose=this.poses.get(a.id)!,path=this.paths.get(a.routeId)!;a.x=pose.position.x;a.z=pose.position.z;a.heading=pose.heading*180/Math.PI;a.altitude=a.status==='flying'?Math.round((pose.position.y-this.ground(pose.position.x,pose.position.z))*this.metersPerUnit):0;a.phase=((pose.distance%path.length)+path.length)%path.length}
  }
}
