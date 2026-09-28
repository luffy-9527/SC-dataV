import { Box2, Vector2 } from 'three'
import { geoMercator, type GeoProjection } from 'd3-geo'
import type { CityGeoJSON, CityGeoFeature } from '@/types/map'

export interface MapRegion {
  city: string
  adcode?: string | number
  cityId: [x: number, y: number, z: number]
  points: Vector2[][]
  feature: CityGeoFeature
}

function isPosition(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number'
}

function normalizeRings(coordinates: unknown): number[][][] {
  if (!Array.isArray(coordinates)) return []

  // Polygon: [[[lng,lat], ...]]
  if (Array.isArray(coordinates[0]) && isPosition((coordinates[0] as unknown[])[0])) {
    return coordinates as number[][][]
  }

  // MultiPolygon: [[[[lng,lat], ...]], ...]
  return (coordinates as number[][][][]).flatMap(poly => poly)
}

function getFeatureCenter(feature: CityGeoFeature): [number, number] | undefined {
  return feature.properties.centroid ?? feature.properties.center
}

function getMapCenter(data: CityGeoJSON): [number, number] {
  const centers = data.features.map(getFeatureCenter).filter(Boolean) as [number, number][]
  if (centers.length) {
    const total = centers.reduce(
      (acc, item) => {
        acc[0] += item[0]
        acc[1] += item[1]
        return acc
      },
      [0, 0] as [number, number],
    )
    return [total[0] / centers.length, total[1] / centers.length]
  }

  const firstFeature = data.features[0]
  return firstFeature?.properties.centroid ?? firstFeature?.properties.center ?? [104.06, 30.67]
}

function buildWithProjection(data: CityGeoJSON, depth: number, projection: GeoProjection) {
  const bbox = new Box2()
  const center = getMapCenter(data)

  const toVector2 = (coord: number[]) => {
    const projectedPoint = projection(coord as [number, number])
    const [x, y] = projectedPoint ?? [0, 0]
    const vector = new Vector2(x, -y)
    bbox.expandByPoint(vector)
    return vector
  }

  const regions: MapRegion[] = data.features.map(feature => {
    const rings = normalizeRings(feature.geometry.coordinates)
      .map(ring => ring.map(toVector2))
      .filter(ring => ring.length >= 3)

    const cityCenter = feature.properties.centroid ?? feature.properties.center ?? center
    const [x, y] = projection(cityCenter) ?? [0, 0]

    return {
      city: feature.properties.name,
      adcode: feature.properties.adcode,
      cityId: [x, -y, depth + 0.1],
      points: rings,
      feature,
    }
  })

  return { regions, bbox, projection }
}

export function buildMapRegions(data: CityGeoJSON, depth: number, targetMaxSize = 255) {
  // 第三十阶段：不再依赖外层 TresGroup 缩放来放大下钻地图。
  // 之前下钻后仍然很小，是因为 projection 固定 scale=1000，成都市区县图的经纬度 bbox
  // 远小于四川省 bbox；部分 TresGroup scale 又不会稳定响应 hash query。
  // 这里直接按 GeoJSON bbox 重新计算 geoMercator scale，让省级图和区县图都能填满中间视口。
  const center = getMapCenter(data)
  const safeTarget = Number.isFinite(targetMaxSize) && targetMaxSize > 20 ? targetMaxSize : 255

  const draftProjection = geoMercator().center(center).scale(1000).translate([0, 0])
  const draft = buildWithProjection(data, depth, draftProjection)
  const size = draft.bbox.getSize(new Vector2())
  const maxSize = Math.max(size.x, size.y, 1)
  const fitScale = Math.min(200000, Math.max(350, (1000 * safeTarget) / maxSize))

  const projection = geoMercator().center(center).scale(fitScale).translate([0, 0])
  return buildWithProjection(data, depth, projection)
}
