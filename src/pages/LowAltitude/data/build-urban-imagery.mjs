import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'
const dir=path.dirname(fileURLToPath(import.meta.url)),cache=path.join(dir,'source-cache'),out=path.join(dir,'urban-imagery')
await fs.mkdir(out,{recursive:true})
const regions=JSON.parse(await fs.readFile(path.join(cache,'urban-regions.json'),'utf8'))
for(const [id,region] of Object.entries(regions)){
 const [x0,y0,x1,y1]=region.tiles,tiles=[]
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)tiles.push({input:path.join(cache,'urban-'+region.zoom+'-'+x+'-'+y+'.jpg'),left:(x-x0)*256,top:(y-y0)*256})
 const big=await sharp({create:{width:(x1-x0+1)*256,height:(y1-y0+1)*256,channels:3,background:'#33434a'}}).composite(tiles).png().toBuffer()
 const [l,t,r,b]=region.pixels,left=Math.round(l-x0*256),top=Math.round(t-y0*256),width=Math.round(r-l),height=Math.round(b-t)
 await sharp(big).extract({left,top,width,height}).resize(2048,2048,{fit:'fill'}).webp({quality:87}).toFile(path.join(out,id+'.webp'))
 console.log(id,width,height)
}
