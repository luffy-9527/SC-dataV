import type { CityGeoJSON, CityGeoFeature } from '@/types/map'

/**
 * 第二十八阶段：Demo1 地图下钻配置。
 *
 * DataV 的下级地图接口格式：
 *   https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json
 *
 * 这里先内置四川省地市州 adcode，点击对应行政区后加载其区县级 GeoJSON。
 */
const AD_CODE_MAP: Record<string, string> = {
  成都市: '510100',
  成都: '510100',
  自贡市: '510300',
  攀枝花市: '510400',
  泸州市: '510500',
  德阳市: '510600',
  绵阳市: '510700',
  广元市: '510800',
  遂宁市: '510900',
  内江市: '511000',
  乐山市: '511100',
  南充市: '511300',
  眉山市: '511400',
  宜宾市: '511500',
  广安市: '511600',
  达州市: '511700',
  雅安市: '511800',
  巴中市: '511900',
  资阳市: '512000',
  阿坝藏族羌族自治州: '513200',
  阿坝州: '513200',
  甘孜藏族自治州: '513300',
  甘孜州: '513300',
  凉山彝族自治州: '513400',
  凉山州: '513400',
}

function normalizeName(name: string) {
  return name.replace(/\s/g, '')
}

export function getRegionAdCode(name: string) {
  const normalized = normalizeName(name)
  return AD_CODE_MAP[normalized] || AD_CODE_MAP[normalized.replace(/市$/, '')]
}

export function canDrillRegion(name: string, level = 0, currentMapData?: CityGeoJSON) {
  if (level >= 2) return false
  if (level === 0) {
    return Boolean(getRegionAdCode(name))
  }
  if (level === 1) {
    if (!currentMapData || !Array.isArray(currentMapData.features)) return false
    const target = normalizeName(name)
    return currentMapData.features.some(f => normalizeName(f.properties?.name || '') === target)
  }
  return false
}

function isSupportedFeature(feature: unknown): feature is CityGeoFeature {
  const item = feature as CityGeoFeature | undefined
  return Boolean(
    item &&
      item.type === 'Feature' &&
      item.properties &&
      typeof item.properties.name === 'string' &&
      item.geometry &&
      (item.geometry.type === 'Polygon' || item.geometry.type === 'MultiPolygon') &&
      Array.isArray(item.geometry.coordinates),
  )
}

function normalizeGeoJSON(value: unknown): CityGeoJSON | null {
  const data = value as CityGeoJSON | undefined
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) return null

  const features = data.features.filter(isSupportedFeature)
  if (!features.length) return null

  return {
    type: 'FeatureCollection',
    features,
  }
}

export interface DrillLoadResult {
  title: string
  adcode: string
  parentAdcode?: string
  parentTitle?: string
  data: CityGeoJSON
}

export async function loadDrillMap(
  name: string,
  level = 0,
  currentMapData?: CityGeoJSON,
  parentTitle?: string,
): Promise<DrillLoadResult | null> {
  // 一级 -> 二级（地市州下钻）
  if (level === 0) {
    const adcode = getRegionAdCode(name)
    if (!adcode) return null

    const url = `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`地市级地图下钻数据加载失败：${name} ${response.status}`)
    }

    const data = normalizeGeoJSON(await response.json())
    if (!data) {
      throw new Error(`地市级地图下钻数据格式异常：${name}`)
    }

    return {
      title: name,
      adcode,
      data,
    }
  }

  // 二级 -> 三级（区县级下钻）
  if (level === 1) {
    if (!currentMapData || !Array.isArray(currentMapData.features)) return null
    const target = normalizeName(name)
    const feature = currentMapData.features.find(f => normalizeName(f.properties?.name || '') === target)
    if (!feature) return null

    const districtAdcode = feature.properties?.adcode ? String(feature.properties.adcode) : ''
    const rawParentAdcode = (feature.properties as any)?.parent?.adcode
    const parentAdcode = rawParentAdcode
      ? String(rawParentAdcode)
      : districtAdcode
        ? `${districtAdcode.slice(0, 4)}00`
        : ''

    // 默认直接提取上一级市级已有的该区县几何数据（0ms 即开，断网/弱网 100% 稳妥）
    let districtData: CityGeoJSON = {
      type: 'FeatureCollection',
      features: [feature],
    }

    // 尝试拉取单边界超高精细 GeoJSON 轮廓
    if (districtAdcode) {
      try {
        const response = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${districtAdcode}.json`)
        if (response.ok) {
          const detailed = normalizeGeoJSON(await response.json())
          if (detailed && detailed.features.length) {
            districtData = detailed
          }
        }
      } catch {
        // 请求失败降级使用市级已有几何
      }
    }

    return {
      title: name,
      adcode: districtAdcode,
      parentAdcode,
      parentTitle,
      data: districtData,
    }
  }

  return null
}
