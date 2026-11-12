// Local, reproducible Chengdu-only data preparation. Run from repository root.
// OSM footprints: ODbL, © OpenStreetMap contributors. Elevation: Mapzen Terrain
// Tiles (Terrarium), see SOURCES.md. No map keys or runtime external requests.
import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'
const dir=path.dirname(fileURLToPath(import.meta.url))
const geo=JSON.parse(await fs.readFile(path.join(dir,'chengdu.json'),'utf8'))
const rawDir=path.join(dir,'source-cache')
await fs.mkdir(rawDir,{recursive:true})
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function download(url,options={}){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(90000)})
  if(!response.ok)throw new Error(response.status+' '+url)
  return response
}
function number(value){const n=parseFloat(value);return Number.isFinite(n)&&n>0?n:undefined}
const manifest={source:'OpenStreetMap contributors',license:'ODbL-1.0',retrieved:new Date().toISOString().slice(0,10),districts:{}}
await fs.mkdir(path.join(dir,'buildings'),{recursive:true})
for(const feature of geo.features){
  const id=String(feature.properties.adcode),center=feature.properties.center
  // This legacy pipeline also refreshes the DEM. Never downgrade a completed
  // district dataset back to the former neighborhood crop when it is rerun.
  let existing
  try{existing=JSON.parse(await fs.readFile(path.join(dir,'buildings',id+'.json'),'utf8'))}catch{}
  if(existing?.extent==='district'){
    const {bounds,count,tagged,estimated}=existing
    manifest.districts[id]={center,bounds,extent:'district',count,tagged,estimated}
    console.log(id,'preserved full district dataset');continue
  }
  const latSpan=.0135,lonSpan=latSpan/Math.cos(center[1]*Math.PI/180)
  const bounds=[center[0]-lonSpan,center[1]-latSpan,center[0]+lonSpan,center[1]+latSpan]
  const rawFile=path.join(rawDir,id+'.json')
  let source
  try{source=JSON.parse(await fs.readFile(rawFile,'utf8'))}catch{
    const query='[out:json][timeout:70];way[building]('+[bounds[1],bounds[0],bounds[3],bounds[2]].join(',')+');out tags geom;'
    for(let attempt=0;attempt<3;attempt++){
      try{const response=await download('https://overpass-api.de/api/interpreter',{method:'POST',body:new URLSearchParams({data:query})});source=await response.json();if(source.remark)throw new Error(source.remark);await fs.writeFile(rawFile,JSON.stringify(source));break}catch(error){if(attempt===2)throw error;await sleep(5000*(attempt+1))}
    }
    await sleep(1300)
  }
  const buildings=[]
  for(const way of source.elements??[]){
    if(!way.geometry||way.geometry.length<4||way.tags?.building==='roof')continue
    const tags=way.tags??{},explicit=number(tags.height),levels=number(tags['building:levels'])
    const height=explicit??(levels?levels*3.2:12)
    if(height>400)continue
    const points=way.geometry.map(p=>[Number(p.lon.toFixed(6)),Number(p.lat.toFixed(6))])
    if(points[0][0]!==points.at(-1)[0]||points[0][1]!==points.at(-1)[1])continue
    buildings.push({id:way.id,points,height,heightSource:explicit?'tag':levels?'levels':'default',name:tags.name??'',kind:tags.building})
  }
  const dataset={id,name:feature.properties.name,center,bounds,buildings}
  await fs.writeFile(path.join(dir,'buildings',id+'.json'),JSON.stringify(dataset))
  manifest.districts[id]={center,bounds,count:buildings.length,tagged:buildings.filter(b=>b.heightSource==='tag').length,estimated:buildings.filter(b=>b.heightSource!=='tag').length}
  console.log(id,feature.properties.name,buildings.length+' footprints')
}
await fs.writeFile(path.join(dir,'buildings','manifest.json'),JSON.stringify(manifest,null,2))
// One compact DEM mosaic covers all Chengdu districts. Keep raw tiles cached
// outside the generated runtime payload; resampling is bilinear in the renderer.
const z=10,all=geo.features.flatMap(f=>f.geometry.coordinates.flat(Infinity)),coords=[]
for(let i=0;i<all.length;i+=2)coords.push([all[i],all[i+1]])
const tile=([lng,lat])=>[(lng+180)/360*2**z,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z]
const projected=coords.map(tile),minX=Math.floor(Math.min(...projected.map(p=>p[0]))),maxX=Math.floor(Math.max(...projected.map(p=>p[0]))),minY=Math.floor(Math.min(...projected.map(p=>p[1]))),maxY=Math.floor(Math.max(...projected.map(p=>p[1])))
const tileSize=64,width=(maxX-minX+1)*tileSize,height=(maxY-minY+1)*tileSize,values=new Array(width*height)
for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const file=path.join(rawDir,'dem-'+z+'-'+x+'-'+y+'.png')
  let data
  try{data=await fs.readFile(file)}catch{data=Buffer.from(await(await download('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+z+'/'+x+'/'+y+'.png')).arrayBuffer());await fs.writeFile(file,data)}
  const {data:pixels,info}=await sharp(data).removeAlpha().raw().toBuffer({resolveWithObject:true})
  for(let j=0;j<tileSize;j++)for(let i=0;i<tileSize;i++){
    const sample=(Math.floor(j*info.height/tileSize)*info.width+Math.floor(i*info.width/tileSize))*info.channels
    values[((y-minY)*tileSize+j)*width+(x-minX)*tileSize+i]=Math.round(pixels[sample]*256+pixels[sample+1]+pixels[sample+2]/256-32768)
  }
}
await fs.writeFile(path.join(dir,'chengdu-dem.json'),JSON.stringify({source:'Mapzen Terrain Tiles / Terrarium',zoom:z,tileSize,minX,minY,width,height,values}))
console.log('Chengdu DEM mosaic',width,height,values.reduce((a,b)=>Math.min(a,b),Infinity),values.reduce((a,b)=>Math.max(a,b),-Infinity))
