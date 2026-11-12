import dem from './data/chengdu-dem.json'
import type { districtGeography, MapPoint } from './districtGeography'

export function elevationMeters([lng,lat]:MapPoint) {
  const x=((lng+180)/360*2**dem.zoom-dem.minX)*dem.tileSize
  const z=((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**dem.zoom-dem.minY)*dem.tileSize
  const px=Math.max(0,Math.min(dem.width-1.001,x)),pz=Math.max(0,Math.min(dem.height-1.001,z))
  const ix=Math.floor(px),iz=Math.floor(pz),tx=px-ix,tz=pz-iz
  const a=dem.values[iz*dem.width+ix]*(1-tx)+dem.values[iz*dem.width+ix+1]*tx
  const b=dem.values[(iz+1)*dem.width+ix]*(1-tx)+dem.values[(iz+1)*dem.width+ix+1]*tx
  return a*(1-tz)+b*tz
}
export function createTerrain(geography:ReturnType<typeof districtGeography>) {
  const base=elevationMeters(geography.feature.properties.center as MapPoint)
  const height=(x:number,z:number)=>(elevationMeters(geography.unproject([x,z]))-base)/geography.metersPerUnit
  return {base,height}
}
