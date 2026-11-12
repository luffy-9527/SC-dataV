import { BufferGeometry, CanvasTexture, Color, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, PlaneGeometry, SRGBColorSpace } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Vertiport } from './types'
import type { DistrictProfile } from './districts'
import { boundsOf, cityStreets, drySite, overlaps, riverCenter, riverHalfWidth, roadClearance, squareSite } from './sceneLayout'
import type { SiteBounds } from './sceneLayout'

type Point = [number, number]
type Block = [Point, Point, Point, Point]

/** Illustrative urban fabric. These buildings and streets are not survey data. */
export function createCityAssets(district:DistrictProfile, vertiports:Vertiport[]) {
  let seed = district.seed
  const random = () => { seed = seed * 48271 % 2147483647; return seed / 2147483647 }
  const range = (min: number, max: number) => min + random() * (max - min)
  const mix = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  const bilinear = (block: Block, u: number, v: number) => mix(mix(block[0], block[1], u), mix(block[3], block[2], u), v)
  const subBlock = (block: Block, u0: number, v0: number, u1: number, v1: number): Block => [bilinear(block,u0,v0),bilinear(block,u1,v0),bilinear(block,u1,v1),bilinear(block,u0,v1)]
  const center = (points: Point[]): Point => [points.reduce((v,p)=>v+p[0],0)/points.length,points.reduce((v,p)=>v+p[1],0)/points.length]
  const scale = (points: Point[], factor: number): Point[] => { const c=center(points);return points.map(p=>mix(c,p,factor)) }
  const chamfer = (points: Point[], amount = .07): Point[] => points.flatMap((p,i)=>[mix(p,points[(i+points.length-1)%points.length],amount),mix(p,points[(i+1)%points.length],amount)])
  const rectangle = (x:number,z:number,w:number,d:number,angle=0):Block => ([[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]] as Point[]).map(([a,b])=>[x+a*Math.cos(angle)-b*Math.sin(angle),z+a*Math.sin(angle)+b*Math.cos(angle)]) as Block
  const riverX = (z:number) => riverCenter(district,z)
  const riverWidth = (z:number) => riverHalfWidth(district,z)
  const {xs,zs,intersections,roads}=cityStreets(district)
  const sites:SiteBounds[]=vertiports.map(p=>squareSite(p.x,p.z,2.65,'vertiport'))
  function available(site:SiteBounds) {return drySite(district,site)&&roadClearance(site,roads)&&!sites.some(other=>overlaps(site,other,.45))}
  function landmarkSite(x:number,z:number,w:number,d:number,height:number,kind:string) {
    for(let radius=0;radius<55;radius+=1)for(let n=0;n<(radius?32:1);n++){
      const angle=n*Math.PI/16,p:Point=[x+radius*Math.cos(angle),z+radius*Math.sin(angle)]
      const site=boundsOf(rectangle(...p,w,d),height,kind)
      if(Math.hypot(p[0]/1.2,p[1])>65||!available(site))continue
      sites.push(site);return {x:p[0],z:p[1]}
    }
    throw new Error('Cannot place landmark: '+district.name+' '+kind)
  }
  // Reserve final, river-safe landmark positions before generating surrounding blocks.
  const towers=[[-16,-9,3.3,3.7,13.5],[-10.7,-7.6,2.6,3.1,10.4],...(district.heightScale>.6?[[24.2,7,3.1,3.5,10.8],[29.3,8.2,2.4,3.3,8.5]]:[])].map(([x,z,w,d,h])=>({...landmarkSite(x,z,w+2.1,d+1.7,h*district.heightScale+2,'tower'),width:w,depth:d,height:h*district.heightScale}))
  const museumSite=landmarkSite(-29,20,8.4,5.2,3,'museum')
  const stadiumSite=landmarkSite(-43,-18,10.8,7.8,1.5,'stadium')

  const ground = document.createElement('canvas')
  ground.width=ground.height=2048
  const ctx=ground.getContext('2d')!
  const size=240, pixels=ground.width/size
  const px=(n:number)=>(n/size+.5)*ground.width
  ctx.fillStyle='#253d49';ctx.fillRect(0,0,2048,2048)
  const wash=ctx.createRadialGradient(1024,1024,160,1024,1024,950)
  wash.addColorStop(0,'#62766b');wash.addColorStop(.65,'#465f5b');wash.addColorStop(1,'#253d49')
  ctx.fillStyle=wash;ctx.fillRect(0,0,2048,2048)
  function path(points:Point[], close=true) { ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(px(p[0]),px(p[1])):ctx.moveTo(px(p[0]),px(p[1])));if(close)ctx.closePath() }
  function fill(points:Point[], color:string) { path(points);ctx.fillStyle=color;ctx.fill() }
  function stroke(points:Point[], color:string, width:number, close=false) { path(points,close);ctx.strokeStyle=color;ctx.lineWidth=width*pixels;ctx.stroke() }

  // Four facade families and a roof strip share one atlas and one material.
  const atlas=document.createElement('canvas');atlas.width=atlas.height=1024
  const facade=atlas.getContext('2d')!
  const skins=['#87a8bc','#c4cccd','#cbbfa6','#547e9b']
  for(let style=0;style<4;style++){
    const origin=style*256
    facade.fillStyle=skins[style];facade.fillRect(origin,0,256,800)
    for(let row=0;row<36;row++)for(let col=0;col<9;col++){
      const lit=random()
      facade.fillStyle=lit>.985?'#d9c59b':lit>.78?'#aec9d6':lit>.28?'#63889f':'#456b85'
      const gap=style===1?2:style===2?8:4
      facade.fillRect(origin+col*28+gap,row*22+5,28-gap*2,style===2?11:14)
      if(style===0||style===3){facade.fillStyle='#a6bbc15c';facade.fillRect(origin+col*28+2,row*22+20,26,1)}
    }
    if(style===3){facade.fillStyle='#91a9b07d';for(let x=8;x<256;x+=56)facade.fillRect(origin+x,0,2,800)}
  }
  facade.fillStyle='#acb9bc';facade.fillRect(0,816,1024,208)
  facade.fillStyle='#5d707c';facade.fillRect(0,816,256,208)
  facade.fillStyle='#d4d9d6';facade.fillRect(512,816,256,208)
  const facadeTexture=new CanvasTexture(atlas);facadeTexture.colorSpace=SRGBColorSpace;facadeTexture.anisotropy=4

  const positions:number[]=[],uvs:number[]=[],colors:number[]=[],edges:number[]=[]
  let buildingCount=0
  const roofUV:Point=[.38,.10],rimUV:Point=[.62,.10]
  function triangle(a:number[],b:number[],c:number[],ta:Point,tb:Point,tc:Point,tint:Color){positions.push(...a,...b,...c);uvs.push(...ta,...tb,...tc);for(let n=0;n<3;n++)colors.push(tint.r,tint.g,tint.b)}
  function quad(a:number[],b:number[],c:number[],d:number[],ta:Point,tb:Point,tc:Point,td:Point,tint:Color){triangle(a,b,c,ta,tb,tc,tint);triangle(a,c,d,ta,tc,td,tint)}
  function line(a:Point,b:Point,y:number){edges.push(a[0],y,a[1],b[0],y,b[1])}
  function prism(points:Point[],base:number,height:number,style:number,tint:Color,roof=true,outline=false){
    const top=base+height, roofPoints=outline?scale(points,.96):points, bevel=outline?Math.min(.12,height*.12):0
    const v0=.24+Math.floor(random()*3)*.02, v1=Math.min(.98,v0+height*56/1024)
    points.forEach((p,i)=>{
      const q=points[(i+1)%points.length], r=roofPoints[i],s=roofPoints[(i+1)%points.length]
      const width=Math.hypot(q[0]-p[0],q[1]-p[1])
      const u0=(style*256+6)/1024,u1=(style*256+6+Math.min(240,width*45))/1024
      quad([p[0],base,p[1]],[p[0],top-bevel,p[1]],[q[0],top-bevel,q[1]],[q[0],base,q[1]],[u0,v0],[u0,v1],[u1,v1],[u1,v0],tint)
      if(outline)quad([p[0],top-bevel,p[1]],[r[0],top,r[1]],[s[0],top,s[1]],[q[0],top-bevel,q[1]],rimUV,rimUV,rimUV,rimUV,tint)
      if(outline){line(r,s,top+.015);if(i%2===0)edges.push(p[0],base,p[1],p[0],top-bevel,p[1])}
    })
    if(roof){const c=center(roofPoints);roofPoints.forEach((p,i)=>{const q=roofPoints[(i+1)%points.length];triangle([c[0],top,c[1]],[q[0],top,q[1]],[p[0],top,p[1]],roofUV,roofUV,roofUV,tint)})}
  }
  function shadow(points:Point[],height:number){
    const shifted=points.map(p=>[p[0]+height*.55,p[1]+height*.3] as Point)
    fill([...points.slice(0,2),...shifted.slice(1),points[3]],'#06121b55')
    ctx.save();ctx.shadowColor='#020a12aa';ctx.shadowBlur=9;fill(points,'#0b1b24');ctx.restore()
  }
  function pitchedRoof(points:Block,base:number,rise:number,tint:Color){
    const [a,b,c,d]=points,front=mix(a,b,.5),back=mix(d,c,.5)
    const pa=[a[0],base,a[1]],pb=[b[0],base,b[1]],pc=[c[0],base,c[1]],pd=[d[0],base,d[1]]
    const f=[front[0],base+rise,front[1]],r=[back[0],base+rise,back[1]]
    quad(pa,pd,r,f,roofUV,roofUV,roofUV,roofUV,tint)
    quad(f,r,pc,pb,rimUV,rimUV,rimUV,rimUV,tint)
    triangle(pa,f,pb,roofUV,roofUV,roofUV,tint);triangle(pd,pc,r,roofUV,roofUV,roofUV,tint)
  }
  const treeParts:BufferGeometry[]=[]
  const treeCandidates:{x:number;z:number;radius:number}[]=[]
  const foliage=new IcosahedronGeometry(1,0),treeShapes:BufferGeometry[]=[]
  for(const [x,y,z,s] of [[-.27,.1,0,.74],[.25,.25,.12,.77],[0,.61,-.16,.65]]){
    const part=foliage.clone().scale(s,s,s).translate(x,y,z);treeShapes.push(part)
  }
  treeShapes.push(new CylinderGeometry(.07,.11,1,4).translate(0,-.45,0))
  const normalizedTrees=treeShapes.map(shape=>shape.index?shape.toNonIndexed():shape)
  const treeBase=mergeGeometries(normalizedTrees)!
  normalizedTrees.forEach(shape=>shape.dispose());treeShapes.forEach(shape=>shape.dispose());foliage.dispose()
  function tree(x:number,z:number,radius=.5){
    treeCandidates.push({x,z,radius})
  }
  function plantTree(x:number,z:number,radius:number){
    const site=squareSite(x,z,radius*1.1,'tree')
    if(!available(site))return
    sites.push(site)
    const g=treeBase.clone();g.scale(radius,radius*1.3,radius);g.rotateY(random()*Math.PI);g.translate(x,radius*1.05+.2,z)
    const c=new Color().setHSL(range(.26,.34),.36,range(.16,.27)),a:number[]=[]
    for(let i=0;i<g.attributes.position.count;i++)a.push(c.r,c.g,c.b)
    g.setAttribute('color',new Float32BufferAttribute(a,3));treeParts.push(g)
  }
  const parks=[{x:-33,z:17,r:7},{x:36,z:-22,r:7.5},{x:30,z:32,r:6},{x:-43,z:-18,r:9}]
  const clearSite=(p:Point,margin=0)=>!available(squareSite(...p,Math.max(.2,margin)))

  // Streets share their endpoints. Unequal block sizes and gentle distortion
  // remove the checkerboard pattern while keeping buildings inside parcels.
  for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){
    const block:Block=[intersections[j][i],intersections[j][i+1],intersections[j+1][i+1],intersections[j+1][i]]
    const c=center(block),radius=Math.hypot(c[0]/1.2,c[1])
    if(radius>49+random()*8)continue
    const inset=subBlock(block,.07,.07,.93,.93)
    fill(inset,random()>.5?'#81918d':'#768786')
    const park=parks.some(p=>Math.hypot(c[0]-p.x,c[1]-p.z)<p.r)
    if(park||random()>district.density){fill(inset,'#496e51');for(let n=0;n<16;n++){const p=bilinear(inset,random(),random());if(!clearSite(p))tree(...p,range(.45,.85))}continue}
    const cbd=Math.max(Math.exp(-((c[0]+14)**2+(c[1]+9)**2)/320),Math.exp(-((c[0]-26)**2+(c[1]-8)**2)/220))
    const family=district.character==='heritage'?random()*.4:random(),cols=cbd>.35?2:family>.66?3:2,rows=family<.3?3:2
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      if(random()<(radius>56?.3:.09))continue
      const u0=col/cols+.055,u1=(col+1)/cols-.055,v0=row/rows+.06,v1=(row+1)/rows-.06
      const parcel=subBlock(inset,u0,v0,u1,v1)
      const site=boundsOf(parcel)
      if(!available(site))continue
      const tall=cbd>.3&&random()>.32&&district.heightScale>.65
      const h=(tall?range(4.3,8.8)+cbd*1.8:family>.66?range(2.1,4.1):range(.9,2.6))*district.heightScale
      site.height=h+1.5;sites.push(site)
      const tint=new Color().setHSL(range(.54,.58),range(.06,.17),range(.61,.78))
      const footprint=tall?chamfer(parcel,.045):parcel
      shadow(footprint,h)
      if(tall){
        prism(footprint,.08,.8,2,tint)
        const tower=scale(footprint,range(.62,.76))
        prism(tower,.88,h,random()>.5?0:3,tint,true,true)
        prism(scale(tower,.55),h+.88,.22,1,tint)
        const roofCenter=center(tower);prism(rectangle(roofCenter[0],roofCenter[1],.5,.55),h+1.1,.3,1,tint)
      }else if(district.character==='industrial'&&family>.4){
        const warehouse=subBlock(parcel,.02,.02,.98,.98)
        prism(warehouse,.08,1.25,2,tint);pitchedRoof(warehouse,1.33,.4,new Color('#85a9c0'))
        // Solar arrays sit on a flat service roof, rather than cutting across a gable.
        prism(subBlock(warehouse,.32,.2,.68,.8),1.73,.06,3,new Color('#5a7c95'))
      }else if(family<.28){
        // Courtyards and articulated low-rise commercial blocks.
        const body=subBlock(parcel,0,0,1,.45),wing=subBlock(parcel,0,.45,.3,1)
        prism(body,.08,h,2,tint);prism(wing,.08,h*.9,2,tint)
        const t=bilinear(parcel,.7,.72);tree(t[0],t[1],.55)
      }else if(family>.75){
        // Slender residential slabs, stair cores and pitched roof silhouettes.
        const slab=subBlock(parcel,.10,.04,.86,.96)
        prism(slab,.08,h,1,tint)
        pitchedRoof(slab,h+.08,.32,tint)
        const core=subBlock(parcel,.77,.36,.99,.65)
        prism(core,.08,h+.2,2,tint)
      }else{
        prism(footprint,.08,h,family>.66?1:2,tint,true,h>3.2)
        prism(scale(footprint,.76),h+.08,.13,2,tint)
        if(h>2){const r=center(parcel);prism(rectangle(r[0],r[1],.55,.7),h+.21,.24,2,tint)}
      }
      buildingCount++
    }
    if(i%2===0){const t=bilinear(inset,.04,.5);if(!clearSite(t,1.5))tree(...t,.5)}
  }

  // Low-rise fringe extends the visible city into the distance without adding
  // another draw call. It prevents the main blocks reading as an isolated board.
  for(let z=-81;z<=69;z+=9)for(let x=-86;x<=86;x+=9){
    const r=Math.hypot(x/1.2,z)
    if(r<53||r>82||random()>.62*district.density)continue
    const p:Point=[x+range(-2,2),z+range(-2,2)]
    if(clearSite(p,3))continue
    const footprint=rectangle(p[0],p[1],range(2.6,4.5),range(2.1,3.5),district.streetAngle)
    const h=range(.8,3.2)*district.heightScale
    const site=boundsOf(footprint,h+.1)
    if(!available(site))continue
    sites.push(site)
    fill(scale(footprint,1.3),'#6a8078');shadow(footprint,h)
    prism(footprint,.07,h,1,new Color('#bac8c7'));buildingCount++
    if(random()>.4)tree(p[0]+3,p[1],.6)
  }

  // Asphalt, curbs, lane markings and crosswalks are baked once.
  roads.forEach(({points,major})=>{
    stroke(points,'#b2bdb9',major?2.15:1.3)
    stroke(points,'#344952',major?1.8:1.05)
    if(major){ctx.setLineDash([1.3*pixels,.8*pixels]);stroke(points,'#8194926e',.055);ctx.setLineDash([])}
    points.slice(1,-1).forEach((p,i)=>{
      if(!major||i%2||Math.abs(p[0]-riverX(p[1]))<riverWidth(p[1])+3)return
      const next=points[i+2],angle=Math.atan2(next[1]-p[1],next[0]-p[0])
      const x=p[0]+Math.cos(angle)*3-Math.sin(angle)*.4,z=p[1]+Math.sin(angle)*3+Math.cos(angle)*.4
      prism(rectangle(x,z,.58,.25,angle),.035,.15,2,new Color(i%4?'#7192a4':'#d8dbd6'))
    })
  })
  for(let j=1;j<intersections.length-1;j++)for(let i=1;i<xs.length-1;i++){
    const p=intersections[j][i]
    if(Math.hypot(p[0]/1.2,p[1])>66||Math.abs(p[0]-riverX(p[1]))<4)continue
    for(let s=-2;s<=2;s++)stroke([[p[0]+s*.2,p[1]+1.4],[p[0]+s*.2,p[1]+2.1]],'#78909172',.085)
  }

  const left:Point[]=[],right:Point[]=[]
  for(let z=-119;z<=119;z+=1){const x=riverX(z),w=riverWidth(z);left.push([x-w,z]);right.push([x+w,z])}
  stroke(left,'#315a555c',1.7);stroke(right,'#315a555c',1.7)
  fill([...left,...right.slice().reverse()],'#286481')
  stroke(left,'#a0b8b8',.16);stroke(right,'#a0b8b8',.16)
  for(let z=-110;z<110;z+=.6){const x=riverX(z);stroke([[x-riverWidth(z)*.8,z],[x+riverWidth(z)*.8,z-.18]],z%3<1?'#7bb7c01b':'#173e581b',.035)}
  for(let z=-62;z<64;z+=2.3){
    const x=riverX(z),w=riverWidth(z)
    for(const side of [-1,1]){tree(x+side*(w+1.05),z,range(.35,.55));stroke([[x+side*(w+.5),z-.8],[x+side*(w+.5),z+.8]],'#67818145',.08)}
    if(random()>.35)stroke([[x-range(.2,1),z],[x+range(.3,1),z-.2]],'#5b879321',.04)
  }
  const concrete=new Color('#aebdc2')
  intersections.forEach((row,j)=>{
    if(j===0||j===intersections.length-1)return
    for(let i=0;i<row.length-1;i++){
      const a=row[i],b=row[i+1]
      if((a[0]-riverX(a[1]))*(b[0]-riverX(b[1]))>=0)continue
      const z=(a[1]+b[1])/2,x=riverX(z),width=riverWidth(z)*2+3,angle=Math.atan2(b[1]-a[1],b[0]-a[0])
      const deck=rectangle(x,z,width,j===3||j===6?1.9:1.25,angle)
      prism(deck,.05,.28,1,concrete,true)
      // Paved bridge deck and narrow parapets stay above the water texture.
      for(const offset of [-.53,.53])prism(rectangle(x-Math.sin(angle)*offset,z+Math.cos(angle)*offset,width,.08,angle),.33,.16,2,concrete)
      line(deck[0],deck[1],.35);line(deck[3],deck[2],.35)
      if(j===3&&district.riverWidth>=3){
        // Slender cable-stayed crossing, built into the shared urban mesh.
        const local=(u:number,v:number):Point=>[x+Math.cos(angle)*u-Math.sin(angle)*v,z+Math.sin(angle)*u+Math.cos(angle)*v]
        for(const side of [-1,1]){
          const p=local(-width*.18,side*.7)
          prism(rectangle(p[0],p[1],.22,.24,angle),.33,4.2,2,new Color('#d4dfe0'))
          for(const fraction of [-.43,-.33,.05,.2,.36,.47]){
            const q=local(width*fraction,side*.7),tint=new Color('#d5e7e9')
            quad([p[0],4.46,p[1]],[q[0],.42,q[1]],[q[0]+.025,.42,q[1]+.025],[p[0]+.025,4.46,p[1]+.025],rimUV,rimUV,rimUV,rimUV,tint)
            quad([p[0]+.025,4.46,p[1]+.025],[q[0]+.025,.42,q[1]+.025],[q[0],.42,q[1]],[p[0],4.46,p[1]],rimUV,rimUV,rimUV,rimUV,tint)
          }
        }
      }
    }
  })

  // A small number of composed landmarks establishes a recognizable skyline.
  function landmarkTower(x:number,z:number,width:number,depth:number,height:number,angle:number){
    const tint=new Color('#b5cbd1'),base=chamfer(rectangle(x,z,width+2,depth+1.6,angle),.1)
    shadow(base,height);fill(scale(base,1.2),'#42545b');prism(base,.08,1,2,tint)
    const body=chamfer(rectangle(x,z,width,depth,angle),.11)
    prism(body,1.08,height*.73,3,tint,true,true)
    prism(scale(body,.82),1.08+height*.73,height*.2,0,tint,true,true)
    prism(scale(body,.60),1.08+height*.93,height*.07,0,tint,true,true)
    prism(scale(body,.38),1.08+height,.22,2,tint)
    const crown=rectangle(x,z,width*.72,depth*.72,angle)
    pitchedRoof(crown,1.3+height,.65,new Color('#bcd7de'))
  }
  towers.forEach(t=>landmarkTower(t.x,t.z,t.width,t.depth,t.height,0))
  const museum=chamfer(rectangle(museumSite.x,museumSite.z,7.5,4.6),.15)
  fill(scale(museum,1.4),'#405054');shadow(museum,2.6)
  prism(museum,.08,1.6,0,new Color('#c0c7c6'));prism(scale(museum,1.08),1.68,.25,2,new Color('#b9c8cb'))
  prism(scale(museum,.7),1.93,.8,0,new Color('#bacfd6'));prism(scale(museum,.77),2.73,.16,2,new Color('#c0c7c6'))
  const oval=(rx:number,rz:number):Point[]=>Array.from({length:32},(_,i)=>{const a=i*Math.PI*2/32;return[stadiumSite.x+Math.cos(a)*rx,stadiumSite.z+Math.sin(a)*rz]})
  const outer=oval(5.3,3.8),inner=oval(4.2,2.7),stadiumTint=new Color('#a1bbc3')
  shadow(outer,1.5);fill(scale(outer,1.3),'#2e4546');fill(inner,'#28584d')
  prism(outer,.08,1.2,2,stadiumTint,false)
  for(let i=0;i<outer.length;i++){const j=(i+1)%outer.length;quad([outer[i][0],1.28,outer[i][1]],[inner[i][0],1.48,inner[i][1]],[inner[j][0],1.48,inner[j][1]],[outer[j][0],1.28,outer[j][1]],rimUV,roofUV,roofUV,rimUV,stadiumTint);line(inner[i],inner[j],1.5)}
  stroke(rectangle(stadiumSite.x,stadiumSite.z,6.3,3.6),'#92b3a1',.06,true)
  stroke([[stadiumSite.x,stadiumSite.z-1.8],[stadiumSite.x,stadiumSite.z+1.8]],'#92b3a1',.06)
  vertiports.forEach(p=>{fill(rectangle(p.x,p.z,4.8,4.8),'#47646c');stroke(rectangle(p.x,p.z,4.8,4.8),'#a0c0c5',.08,true)})
  treeCandidates.forEach(t=>plantTree(t.x,t.z,t.radius))

  // Low-cost distant terrain gives foothill districts a different silhouette.
  const terrain=new PlaneGeometry(480,480,48,48);terrain.rotateX(-Math.PI/2)
  const terrainPositions=terrain.getAttribute('position'),terrainColors:number[]=[]
  for(let i=0;i<terrainPositions.count;i++){
    const x=terrainPositions.getX(i),z=terrainPositions.getZ(i),r=Math.hypot(x/1.2,z)
    const fade=Math.max(0,Math.min(1,(r-92)/30))*Math.max(0,Math.min(1,(210-r)/60))
    const hills=district.character==='foothills'?21:district.character==='garden'?9:4
    const h=fade*hills*(.5+.3*Math.sin(x*.055)+.2*Math.cos(z*.08))
    terrainPositions.setY(i,h-.35)
    const color=new Color('#253d49').lerp(new Color('#4d6858'),fade*.85)
    terrainColors.push(color.r,color.g,color.b)
  }
  terrain.setAttribute('color',new Float32BufferAttribute(terrainColors,3));terrain.computeVertexNormals()

  const texture=new CanvasTexture(ground);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4
  const buildings=new BufferGeometry()
  buildings.setAttribute('position',new Float32BufferAttribute(positions,3));buildings.setAttribute('uv',new Float32BufferAttribute(uvs,2));buildings.setAttribute('color',new Float32BufferAttribute(colors,3));buildings.computeVertexNormals()
  const rooflines=new BufferGeometry();rooflines.setAttribute('position',new Float32BufferAttribute(edges,3))
  const vegetation=mergeGeometries(treeParts)!
  treeParts.forEach(g=>g.dispose());treeBase.dispose()
  // Static light is baked into vertex colors. No shadow map, postprocessing or
  // per-pixel lighting is required for the thousands of architectural faces.
  for(const geometry of [buildings,vegetation]){
    const normals=geometry.getAttribute('normal'),tints=geometry.getAttribute('color')
    for(let i=0;i<tints.count;i++){
      const light=.62+Math.max(0,-normals.getX(i)*.42+normals.getY(i)*.83+normals.getZ(i)*.36)*.82
      const vegetationShade = geometry === vegetation ? .8 : 1
      tints.setXYZ(i,tints.getX(i)*light*.93*vegetationShade,tints.getY(i)*light*.98*vegetationShade,tints.getZ(i)*light*vegetationShade)
    }
  }
  buildings.computeBoundingBox()
  buildings.userData.sites=sites
  return {texture,facadeTexture,buildings,rooflines,vegetation,terrain,buildingCount,sites,maxRoof:buildings.boundingBox!.max.y}
}
