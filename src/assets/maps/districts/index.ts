// 自动生成的成都市各区县高精度 ESRI 卫星遥感底图映射表
import img_510104 from './510104.jpg'
import img_510105 from './510105.jpg'
import img_510106 from './510106.jpg'
import img_510107 from './510107.jpg'
import img_510108 from './510108.jpg'
import img_510112 from './510112.jpg'
import img_510113 from './510113.jpg'
import img_510114 from './510114.jpg'
import img_510115 from './510115.jpg'
import img_510116 from './510116.jpg'
import img_510117 from './510117.jpg'
import img_510118 from './510118.jpg'
import img_510121 from './510121.jpg'
import img_510129 from './510129.jpg'
import img_510131 from './510131.jpg'
import img_510181 from './510181.jpg'
import img_510182 from './510182.jpg'
import img_510183 from './510183.jpg'
import img_510184 from './510184.jpg'
import img_510185 from './510185.jpg'

export const DISTRICT_ESRI_MAPS: Record<string, string> = {
  '510104': img_510104,
  '锦江区': img_510104,
  '510105': img_510105,
  '青羊区': img_510105,
  '510106': img_510106,
  '金牛区': img_510106,
  '510107': img_510107,
  '武侯区': img_510107,
  '510108': img_510108,
  '成华区': img_510108,
  '510112': img_510112,
  '龙泉驿区': img_510112,
  '510113': img_510113,
  '青白江区': img_510113,
  '510114': img_510114,
  '新都区': img_510114,
  '510115': img_510115,
  '温江区': img_510115,
  '510116': img_510116,
  '双流区': img_510116,
  '510117': img_510117,
  '郫都区': img_510117,
  '510118': img_510118,
  '新津区': img_510118,
  '510121': img_510121,
  '金堂县': img_510121,
  '510129': img_510129,
  '大邑县': img_510129,
  '510131': img_510131,
  '蒲江县': img_510131,
  '510181': img_510181,
  '都江堰市': img_510181,
  '510182': img_510182,
  '彭州市': img_510182,
  '510183': img_510183,
  '邛崃市': img_510183,
  '510184': img_510184,
  '崇州市': img_510184,
  '510185': img_510185,
  '简阳市': img_510185,
}

export function getDistrictEsriMap(key: string): string | undefined {
  return DISTRICT_ESRI_MAPS[key]
}
