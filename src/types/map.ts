export interface CityGeoProperties {
  name: string
  center?: [number, number]
  centroid?: [number, number]
  [key: string]: unknown
}

export interface CityGeoFeature {
  type: 'Feature'
  properties: CityGeoProperties
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export interface CityGeoJSON {
  type: 'FeatureCollection'
  features: CityGeoFeature[]
}
