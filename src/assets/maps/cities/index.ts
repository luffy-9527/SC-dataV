// 自动生成的四川省 21 地市州 ESRI 高精度卫星遥感影像底图映射表
import img_510100 from './510100.jpg'
import img_510300 from './510300.jpg'
import img_510400 from './510400.jpg'
import img_510500 from './510500.jpg'
import img_510600 from './510600.jpg'
import img_510700 from './510700.jpg'
import img_510800 from './510800.jpg'
import img_510900 from './510900.jpg'
import img_511000 from './511000.jpg'
import img_511100 from './511100.jpg'
import img_511300 from './511300.jpg'
import img_511400 from './511400.jpg'
import img_511500 from './511500.jpg'
import img_511600 from './511600.jpg'
import img_511700 from './511700.jpg'
import img_511800 from './511800.jpg'
import img_511900 from './511900.jpg'
import img_512000 from './512000.jpg'
import img_513200 from './513200.jpg'
import img_513300 from './513300.jpg'
import img_513400 from './513400.jpg'

export const CITY_ESRI_MAPS: Record<string, string> = {
  '510100': img_510100,
  '成都市': img_510100,
  '510300': img_510300,
  '自贡市': img_510300,
  '510400': img_510400,
  '攀枝花市': img_510400,
  '510500': img_510500,
  '泸州市': img_510500,
  '510600': img_510600,
  '德阳市': img_510600,
  '510700': img_510700,
  '绵阳市': img_510700,
  '510800': img_510800,
  '广元市': img_510800,
  '510900': img_510900,
  '遂宁市': img_510900,
  '511000': img_511000,
  '内江市': img_511000,
  '511100': img_511100,
  '乐山市': img_511100,
  '511300': img_511300,
  '南充市': img_511300,
  '511400': img_511400,
  '眉山市': img_511400,
  '511500': img_511500,
  '宜宾市': img_511500,
  '511600': img_511600,
  '广安市': img_511600,
  '511700': img_511700,
  '达州市': img_511700,
  '511800': img_511800,
  '雅安市': img_511800,
  '511900': img_511900,
  '巴中市': img_511900,
  '512000': img_512000,
  '资阳市': img_512000,
  '513200': img_513200,
  '阿坝藏族羌族自治州': img_513200,
  '513300': img_513300,
  '甘孜藏族自治州': img_513300,
  '513400': img_513400,
  '凉山彝族自治州': img_513400,
}

export function getCityEsriMap(key: string): string | undefined {
  return CITY_ESRI_MAPS[key]
}
