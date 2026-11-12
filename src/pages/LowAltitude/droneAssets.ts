import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, SphereGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

/** One shared airframe and one shared rotor; detail does not add per-aircraft draw calls. */
export function createDroneAssets() {
  const parts:BufferGeometry[]=[]
  function part(source:BufferGeometry,color:string) {
    const geometry=source.index?source.toNonIndexed():source
    if(geometry!==source)source.dispose()
    geometry.deleteAttribute('uv') // Vertex-colored parts share one attribute layout.
    const tint=new Color(color),colors=new Float32Array(geometry.attributes.position.count*3)
    for(let i=0;i<colors.length;i+=3){colors[i]=tint.r;colors[i+1]=tint.g;colors[i+2]=tint.b}
    geometry.setAttribute('color',new Float32BufferAttribute(colors,3));parts.push(geometry)
  }
  // The nose points along local +X, matching the flight heading convention.
  // Tapered continuous shell: a narrower nose, broad shoulders and curved crown
  // read as an airframe rather than a rounded rectangular box in close view.
  const shellPositions:number[]=[],shellIndices:number[]=[]
  const sections=[[-.77,.10,.16],[-.63,.18,.34],[-.27,.205,.43],[.28,.18,.39],[.63,.125,.29],[.76,.06,.17]]
  const segments=16
  sections.forEach(([x,ry,rz])=>{for(let j=0;j<=segments;j++){const angle=j/segments*Math.PI*2;shellPositions.push(x,.085+Math.sin(angle)*ry,Math.cos(angle)*rz)}})
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;shellIndices.push(a,b,a+1,b,b+1,a+1)}
  for(const end of [0,sections.length-1]){const c=shellPositions.length/3;shellPositions.push(sections[end][0],.085,0);for(let j=0;j<segments;j++){const a=end*(segments+1)+j;shellIndices.push(...(end===0?[c,a,a+1]:[c,a+1,a]))}}
  const shell=new BufferGeometry();shell.setAttribute('position',new Float32BufferAttribute(shellPositions,3));shell.setIndex(shellIndices);shell.computeVertexNormals()
  part(shell,'#d8dfe2')
  part(new RoundedBoxGeometry(1.32,.20,.69,1,.08).translate(-.035,-.105,0),'#2e414d')
  part(new RoundedBoxGeometry(.81,.11,.51,1,.04).translate(-.16,.28,0),'#e9edec')
  part(new BoxGeometry(.30,.014,.055).translate(-.16,.343,0),'#5e6b73')
  part(new BoxGeometry(.065,.016,.025).translate(.02,.345,0),'#5fb9c3')
  // Removable battery seam, antenna blister and small fasteners stay in the
  // shared mesh; adding detail therefore does not multiply draw calls.
  part(new RoundedBoxGeometry(.54,.055,.34,2,.025).translate(-.18,.35,0),'#d4dcdf')
  for(const x of [-.52,.23])for(const z of [-.22,.22])part(new CylinderGeometry(.022,.022,.012,6).translate(x,.299,z),'#637580')
  part(new SphereGeometry(.12,12,6).scale(1.2,.35,.8).translate(.41,.24,0),'#aabac3')
  for(const z of [-.19,.19])part(new BoxGeometry(.22,.02,.018).translate(.39,.27,z),'#98a5ac')
  for(const x of [-.41,-.29,-.17,-.05])for(const z of [-.411,.411])part(new BoxGeometry(.065,.045,.014).translate(x,.07,z),'#3c535f')
  const motors:[number,number,number][]=[]
  for(const x of [-1,1])for(const z of [-1,1]){
    const mx=x*1.19,mz=z*1.08
    const direction=new Vector3(mx-x*.40,.07,mz-z*.24)
    const arm=new RoundedBoxGeometry(direction.length(),.13,.18,1,.045)
    arm.rotateY(-Math.atan2(direction.z,direction.x));arm.translate((mx+x*.40)/2,.09,(mz+z*.24)/2)
    part(arm,'#aebbc2')
    const trim=new BoxGeometry(direction.length()*.83,.035,.115)
    trim.rotateY(-Math.atan2(direction.z,direction.x));trim.translate((mx+x*.40)/2,.165,(mz+z*.24)/2)
    part(trim,'#e6e9e7')
    part(new CylinderGeometry(.13,.13,.17,10).translate(x*.46,.11,z*.30),'#516571')
    part(new CylinderGeometry(.155,.135,.24,12).translate(mx,.19,mz),'#2b3943')
    part(new CylinderGeometry(.163,.163,.055,12).translate(mx,.3,mz),'#a2b1b7')
    part(new CylinderGeometry(.065,.07,.065,10).translate(mx,.38,mz),'#182934')
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5])part(new BoxGeometry(.028,.10,.02).rotateY(angle).translate(mx+Math.cos(angle)*.142,.19,mz+Math.sin(angle)*.142),'#637983')
    part(new BoxGeometry(.08,.035,.12).translate(mx,.02,mz+z*.13),x>0?'#6ed6ba':'#a9d8f3')
    motors.push([mx,.4,mz])
  }
  // Slender landing legs, skids and a suspended three-axis camera gimbal.
  for(const z of [-1,1]){
    for(const x of [-1,1])part(new CylinderGeometry(.035,.045,.51,6).rotateX(z*.20).translate(x*.43,-.32,z*.34),'#c0cacf')
    part(new CylinderGeometry(.041,.041,1.25,8).rotateZ(Math.PI/2).translate(0,-.57,z*.40),'#acbac1')
    for(const x of [-.50,.50])part(new BoxGeometry(.16,.055,.095).translate(x,-.59,z*.40),'#22333e')
  }
  part(new CylinderGeometry(.075,.075,.20,8).translate(.48,-.22,0),'#a1b1bc')
  part(new BoxGeometry(.1,.25,.35).translate(.39,-.38,0),'#556674')
  part(new SphereGeometry(.20,12,8).scale(1,.87,1.08).translate(.58,-.43,0),'#c6d0d4')
  part(new CylinderGeometry(.135,.145,.12,16).rotateZ(-Math.PI/2).translate(.76,-.43,0),'#152c3b')
  part(new CylinderGeometry(.096,.096,.014,16).rotateZ(-Math.PI/2).translate(.828,-.43,0),'#2e6684')
  part(new CylinderGeometry(.058,.058,.016,12).rotateZ(-Math.PI/2).translate(.838,-.43,0),'#102434')
  part(new SphereGeometry(.034,8,6).scale(.15,1,1).translate(.85,-.40,.026),'#93c8db')
  part(new RoundedBoxGeometry(.055,.13,.51,1,.025).translate(.733,.06,0),'#758691')
  for(const z of [-.19,.19]){
    part(new CylinderGeometry(.064,.064,.026,10).rotateZ(-Math.PI/2).translate(.775,.06,z),'#152c3b')
    part(new CylinderGeometry(.035,.035,.028,10).rotateZ(-Math.PI/2).translate(.79,.06,z),'#396880')
  }
  const body=mergeGeometries(parts)!;parts.forEach(geometry=>geometry.dispose())
  // Swept, tapered two-blade propeller. Both blades share a thin closed mesh.
  const positions:number[]=[]
  const blade=[[-.07,.025],[.24,.095],[.67,.065],[.73,.015],[.31,-.045],[.03,-.045]]
  for(const sign of [-1,1]){
    const points=blade.map(([x,z])=>[x*sign,z*sign])
    for(let i=1;i<points.length-1;i++){
      for(const y of [-.009,.009]){
        const triangle=y>0?[points[0],points[i+1],points[i]]:[points[0],points[i],points[i+1]]
        for(const p of triangle)positions.push(p[0],y,p[1])
      }
    }
    points.forEach((p,i)=>{const q=points[(i+1)%points.length];positions.push(p[0],-.009,p[1],q[0],-.009,q[1],q[0],.009,q[1],p[0],-.009,p[1],q[0],.009,q[1],p[0],.009,p[1])})
  }
  const rotor=new BufferGeometry();rotor.setAttribute('position',new Float32BufferAttribute(positions,3));rotor.computeVertexNormals()
  return {body,rotor,motors}
}
