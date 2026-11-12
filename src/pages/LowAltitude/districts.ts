import geo from './data/chengdu.json'

export type DistrictCharacter = 'waterfront' | 'heritage' | 'campus' | 'industrial' | 'garden' | 'foothills'
export interface DistrictProfile {
  id: string
  name: string
  character: DistrictCharacter
  caption: string
  seed: number
  heightScale: number
  density: number
  riverWidth: number
  riverOffset: number
  riverBend: number
  streetAngle: number
  labels: [string,string,string]
}

// Art-directed demo environments, not surveyed digital twins. Administrative
// names come from the existing local dataset; geometry uses these scene presets.
const presets: Record<DistrictCharacter, Omit<DistrictProfile,'id'|'name'|'seed'>> = {
  waterfront: {character:'waterfront',caption:'滨水商务 · 城市巡检',heightScale:1.1,density:.88,riverWidth:5.5,riverOffset:8,riverBend:10,streetAngle:.06,labels:['滨水商务片区','东岸居住片区','沿江绿廊']},
  heritage: {character:'heritage',caption:'院落街区 · 文化公园',heightScale:.55,density:.88,riverWidth:2.1,riverOffset:29,riverBend:6,streetAngle:-.10,labels:['传统院落片区','公共文化片区','城市公园']},
  campus: {character:'campus',caption:'科创园区 · 交通巡检',heightScale:.9,density:.78,riverWidth:2.8,riverOffset:20,riverBend:6,streetAngle:.13,labels:['科创商务片区','园区居住片区','生态绿廊']},
  industrial: {character:'industrial',caption:'产业园区 · 设施巡检',heightScale:.48,density:.68,riverWidth:2.5,riverOffset:-25,riverBend:4,streetAngle:0,labels:['产业作业片区','物流服务片区','生活配套片区']},
  garden: {character:'garden',caption:'公园社区 · 生态巡检',heightScale:.55,density:.56,riverWidth:4.2,riverOffset:9,riverBend:15,streetAngle:-.08,labels:['滨水社区','公园生活片区','生态巡检片区']},
  foothills: {character:'foothills',caption:'山麓城镇 · 应急巡护',heightScale:.4,density:.48,riverWidth:3.6,riverOffset:-9,riverBend:18,streetAngle:.18,labels:['山麓生活片区','城镇服务片区','生态巡护片区']},
}
const characters: Record<string,DistrictCharacter> = {
  '锦江区':'waterfront','青羊区':'heritage','金牛区':'industrial','武侯区':'campus','成华区':'campus',
  '龙泉驿区':'foothills','青白江区':'industrial','新都区':'industrial','温江区':'garden','双流区':'campus',
  '郫都区':'campus','新津区':'waterfront','金堂县':'garden','大邑县':'foothills','蒲江县':'garden',
  '都江堰市':'foothills','彭州市':'foothills','邛崃市':'heritage','崇州市':'garden','简阳市':'waterfront',
}
export const districts: DistrictProfile[] = geo.features.map((feature,index)=>{
  const name=feature.properties.name,character=characters[name]??'garden'
  const preset=presets[character]
  return {...preset,id:String(feature.properties.adcode),name,seed:29137+index*7919,riverOffset:preset.riverOffset+(index%3-1)*2,streetAngle:preset.streetAngle+(index%4)*.025}
})
export const defaultDistrict = districts.find(district=>district.name==='锦江区')!
export function districtById(id:string) { return districts.find(d=>d.id===id)??defaultDistrict }
