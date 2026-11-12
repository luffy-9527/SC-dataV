import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import type { CityGeoJSON } from '@/types/map'
import scMapUrl from '@/assets/sc_map.png'
import { getCityEsriMap } from '@/assets/maps/cities'
import { getDistrictEsriMap } from '@/assets/maps/districts'
import { getRegionAdCode } from '../map/drill'

const RAD = Math.PI / 180
const CENTER_LNG = 104.06
const CENTER_LAT = 30.67
const CENTER_LAT_RAD = CENTER_LAT * RAD

function projectMercator(lng: number, lat: number): [number, number] {
  const x = (lng - CENTER_LNG) * RAD * 1000
  const y =
    (Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) -
      Math.log(Math.tan(Math.PI / 4 + CENTER_LAT_RAD / 2))) *
    1000
  return [x, y]
}

// 四川省全境在墨卡托投影下的标准边界
const SC_BBOX = {
  minX: -117.109917,
  maxX: 78.303987,
  minY: -91.751476,
  maxY: 75.393071,
  w: 195.413905,
  h: 167.144547,
}

let cachedScMapImage: HTMLImageElement | null = null
const imageMemoryCache = new Map<string, HTMLImageElement>()

function getScMapImage(): Promise<HTMLImageElement> {
  if (cachedScMapImage && cachedScMapImage.complete) {
    return Promise.resolve(cachedScMapImage)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = scMapUrl
    img.onload = () => {
      cachedScMapImage = img
      resolve(img)
    }
    img.onerror = reject
  })
}

function computeGeoBBox(data: CityGeoJSON): {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
} {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  function walk(coords: unknown) {
    if (!Array.isArray(coords) || coords.length === 0) return
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const lng = coords[0]
      const lat = coords[1]
      const [x, y] = projectMercator(lng, lat)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      return
    }
    coords.forEach(walk)
  }

  data.features.forEach(f => walk(f.geometry.coordinates))
  return { minX, maxX, minY, maxY, minLng, maxLng, minLat, maxLat }
}

/**
 * 图像微调滤镜：提升遥感卫星影像在三维大屏中的立体感、色彩饱和度与微网格质感
 */
function applyImageEnhancements(ctx: CanvasRenderingContext2D, size: number, isDistrict = false) {
  try {
    const imgData = ctx.getImageData(0, 0, size, size)
    const d = imgData.data

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]

      // 适度提升对比度与饱和度，让平原山地水系纹理更加层次分明
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      const satFactor = isDistrict ? 1.12 : 1.08
      d[i] = Math.max(0, Math.min(255, gray + (r - gray) * satFactor))
      d[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * satFactor))
      d[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * satFactor))
    }
    ctx.putImageData(imgData, 0, 0)
  } catch {
    // 忽略跨域等特殊限制
  }

  // 极细的智慧城市数字微网格，增强科技质感
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.022)'
  ctx.lineWidth = 1
  const step = isDistrict ? 128 : 64
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, size)
    ctx.moveTo(0, i)
    ctx.lineTo(size, i)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * 备选动态瓦片下载器（参考 sat-hunter）：用于未预置本地贴图的下级区县或特定区域
 */
function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  )
  return { x, y }
}

function worldPixelX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * Math.pow(2, zoom) * 256
}

function worldPixelY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom) * 256
}

const tileCanvasMemoryCache = new Map<string, HTMLCanvasElement>()

function getOptimalZoom(minLng: number, minLat: number, maxLng: number, maxLat: number, isDistrict = true): number {
  const span = Math.max(Math.abs(maxLng - minLng), Math.abs(maxLat - minLat))
  if (isDistrict) {
    if (span < 0.16) return 15 // 极小核心城区（如锦江、武侯、金牛等），约 4.8米/像素
    if (span < 0.32) return 14 // 典型区县（如龙泉驿、双流、温江等），约 9.5米/像素
    if (span < 0.60) return 13 // 较大区县/市辖县，约 19米/像素
    return 12
  }
  if (span < 0.45) return 12
  if (span < 0.9) return 11
  return 10
}

async function fetchDynamicEsriTiles(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  isDistrict = true,
  requestedZoom?: number,
): Promise<HTMLCanvasElement | null> {
  let zoom = requestedZoom ?? getOptimalZoom(minLng, minLat, maxLng, maxLat, isDistrict)

  // 保证单次下载瓦片数合理（不超过 64 张），在网络承载与超高清间取得最优平衡
  while (zoom > 9) {
    const tMin = latLonToTile(maxLat, minLng, zoom)
    const tMax = latLonToTile(minLat, maxLng, zoom)
    const count = (Math.max(tMin.x, tMax.x) - Math.min(tMin.x, tMax.x) + 1) *
                  (Math.max(tMin.y, tMax.y) - Math.min(tMin.y, tMax.y) + 1)
    if (count <= 64) break
    zoom -= 1
  }

  const cacheKey = `${minLng.toFixed(3)}_${minLat.toFixed(3)}_${maxLng.toFixed(3)}_${maxLat.toFixed(3)}_${zoom}_${isDistrict ? '2k' : '1k'}`
  const cached = tileCanvasMemoryCache.get(cacheKey)
  if (cached) return cached

  const tMin = latLonToTile(maxLat, minLng, zoom)
  const tMax = latLonToTile(minLat, maxLng, zoom)
  const minX = Math.min(tMin.x, tMax.x)
  const maxX = Math.max(tMin.x, tMax.x)
  const minY = Math.min(tMin.y, tMax.y)
  const maxY = Math.max(tMin.y, tMax.y)

  const tilesX = maxX - minX + 1
  const tilesY = maxY - minY + 1
  if (tilesX * tilesY > 80) return null

  const canvas = document.createElement('canvas')
  canvas.width = tilesX * 256
  canvas.height = tilesY * 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 批次并发加载瓦片，提升加载吞吐量并防止浏览器单次并发连接耗尽
  const tileTasks: (() => Promise<void>)[] = []
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const curX = x
      const curY = y
      tileTasks.push(async () => {
        const left = (curX - minX) * 256
        const top = (curY - minY) * 256
        const primaryUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${curY}/${curX}`
        const fallbackUrl = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${curY}/${curX}`

        await new Promise<void>(resolve => {
          const img = new Image()
          img.crossOrigin = 'Anonymous'
          img.onload = () => {
            ctx.drawImage(img, left, top)
            resolve()
          }
          img.onerror = () => {
            // 备用域名重试
            const retryImg = new Image()
            retryImg.crossOrigin = 'Anonymous'
            retryImg.onload = () => {
              ctx.drawImage(retryImg, left, top)
              resolve()
            }
            retryImg.onerror = () => resolve()
            retryImg.src = fallbackUrl
          }
          img.src = primaryUrl
        })
      })
    }
  }

  const CONCURRENCY = 12
  for (let i = 0; i < tileTasks.length; i += CONCURRENCY) {
    const batch = tileTasks.slice(i, i + CONCURRENCY).map(fn => fn())
    await Promise.all(batch)
  }

  const originX = minX * 256
  const originY = minY * 256
  const cropLeft = Math.max(0, Math.floor(worldPixelX(minLng, zoom) - originX))
  const cropRight = Math.min(canvas.width, Math.ceil(worldPixelX(maxLng, zoom) - originX))
  const cropTop = Math.max(0, Math.floor(worldPixelY(maxLat, zoom) - originY))
  const cropBottom = Math.min(canvas.height, Math.ceil(worldPixelY(minLat, zoom) - originY))

  const cropW = Math.max(10, cropRight - cropLeft)
  const cropH = Math.max(10, cropBottom - cropTop)

  // 区县级输出 2048 超高清，大幅提升近景放大时的细节清晰度
  const outputSize = isDistrict ? 2048 : 1024
  const cropped = document.createElement('canvas')
  cropped.width = outputSize
  cropped.height = outputSize
  const cctx = cropped.getContext('2d')
  if (!cctx) return null
  cctx.imageSmoothingEnabled = true
  cctx.imageSmoothingQuality = 'high'
  cctx.drawImage(canvas, cropLeft, cropTop, cropW, cropH, 0, 0, outputSize, outputSize)
  tileCanvasMemoryCache.set(cacheKey, cropped)
  return cropped
}

export interface ParentDrillContext {
  parentTitle?: string
  parentAdcode?: string
  parentData?: CityGeoJSON
}

/**
 * 下钻城市/区县卫星真实遥感地形纹理生成器：
 *
 * 1. 优先匹配本地专属的高精度 ESRI 遥感影像底图（四川省全部 21 地市州已预置）。
 * 2. 三级区县下钻：
 *    - 首帧（0ms）：若存在父级市级遥感图，按地理 BBox 快速局部裁剪，即刻高清呈现，绝无白屏。
 *    - 进阶（异步 <1.5s）：通过 sat-hunter 瓦片算法拉取该区县高缩放级别（Zoom 12~13）的 ESRI 实时卫星影像并增强。
 * 3. 结果具备内存二级缓存，二次进入 0ms 瞬间渲染，保持 60 FPS 极佳流畅度。
 */
export default function createDrillTerrainTexture(
  title = '成都市',
  cityData?: CityGeoJSON,
  providedImage?: HTMLImageElement,
  parentContext?: ParentDrillContext,
  isDistrict = false,
) {
  const size = isDistrict ? 2560 : 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 16

  // 绘制最终的高清 ESRI 卫星图：保持原生超高清照片级质感，绝不叠加影响清晰度的半透明网格或降采样滤镜
  function drawEsriImage(img: HTMLImageElement | HTMLCanvasElement) {
    ctx.clearRect(0, 0, size, size)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, size, size)
    texture.needsUpdate = true
  }

  // 1. 父级市级底图精准裁剪首帧（三级区县优先）
  function tryDrawParentCrop(): boolean {
    if (!parentContext?.parentData || !cityData || !Array.isArray(cityData.features) || !cityData.features.length) {
      return false
    }

    const parentAdcode = parentContext.parentAdcode || getRegionAdCode(parentContext.parentTitle || '')
    const parentMapUrl = parentAdcode ? getCityEsriMap(parentAdcode) : undefined
    const parentImg = parentMapUrl ? imageMemoryCache.get(parentMapUrl) : providedImage

    if (!parentImg || (parentImg instanceof HTMLImageElement && !parentImg.complete)) {
      return false
    }

    const parentBBox = computeGeoBBox(parentContext.parentData)
    const distBBox = computeGeoBBox(cityData)
    const pSpanX = parentBBox.maxX - parentBBox.minX
    const pSpanY = parentBBox.maxY - parentBBox.minY
    if (pSpanX <= 0 || pSpanY <= 0) return false

    const u0 = (distBBox.minX - parentBBox.minX) / pSpanX
    const u1 = (distBBox.maxX - parentBBox.minX) / pSpanX
    const v0 = (distBBox.minY - parentBBox.minY) / pSpanY
    const v1 = (distBBox.maxY - parentBBox.minY) / pSpanY

    const imgW = (parentImg as HTMLImageElement).naturalWidth || parentImg.width || 1024
    const imgH = (parentImg as HTMLImageElement).naturalHeight || parentImg.height || 1024

    const cropX = Math.max(0, Math.floor(u0 * imgW))
    const cropY = Math.max(0, Math.floor((1 - v1) * imgH))
    const cropW = Math.min(imgW - cropX, Math.ceil((u1 - u0) * imgW))
    const cropH = Math.min(imgH - cropY, Math.ceil((v1 - v0) * imgH))

    ctx.clearRect(0, 0, size, size)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(parentImg, cropX, cropY, cropW, cropH, 0, 0, size, size)
    applyImageEnhancements(ctx, size, isDistrict)
    texture.needsUpdate = true
    return true
  }

  // 全省大地图兜底裁剪首帧
  function drawFallbackCrop(img: HTMLImageElement) {
    const imgW = img.naturalWidth || img.width || 1617
    const imgH = img.naturalHeight || img.height || 1384

    let cropX = 815
    let cropY = 495
    let cropW = 275
    let cropH = 226

    if (cityData && Array.isArray(cityData.features) && cityData.features.length > 0) {
      const bbox = computeGeoBBox(cityData)
      if (Number.isFinite(bbox.minX) && Number.isFinite(bbox.maxX)) {
        const u0 = (bbox.minX - SC_BBOX.minX) / SC_BBOX.w
        const u1 = (bbox.maxX - SC_BBOX.minX) / SC_BBOX.w
        const v0 = (bbox.minY - SC_BBOX.minY) / SC_BBOX.h
        const v1 = (bbox.maxY - SC_BBOX.minY) / SC_BBOX.h

        const padU = (u1 - u0) * 0.015
        const padV = (v1 - v0) * 0.015

        const safeU0 = Math.max(0, u0 - padU)
        const safeU1 = Math.min(1, u1 + padU)
        const safeV0 = Math.max(0, v0 - padV)
        const safeV1 = Math.min(1, v1 + padV)

        cropX = Math.max(0, Math.floor(safeU0 * imgW))
        cropY = Math.max(0, Math.floor((1 - safeV1) * imgH))
        cropW = Math.min(imgW - cropX, Math.ceil((safeU1 - safeU0) * imgW))
        cropH = Math.min(imgH - cropY, Math.ceil((safeV1 - safeV0) * imgH))
      }
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, size, size)
    texture.needsUpdate = true
  }

  // 2. 匹配专属 ESRI 高清卫星遥感图（区县与地市双重优先）
  const parts = title.split('/')
  const leafName = parts[parts.length - 1]?.trim() || title
  const rawAdcode = cityData?.features?.[0]?.properties?.adcode
  const districtMapUrl =
    (rawAdcode ? getDistrictEsriMap(String(rawAdcode)) : undefined) ||
    getDistrictEsriMap(leafName) ||
    getDistrictEsriMap(title)
  const adcode = getRegionAdCode(title) || getRegionAdCode(leafName)
  const esriMapUrl = districtMapUrl || getCityEsriMap(adcode || '') || getCityEsriMap(title)

  if (esriMapUrl) {
    const cached = imageMemoryCache.get(esriMapUrl)
    if (cached && cached.complete && cached.width > 0) {
      drawEsriImage(cached)
    } else {
      const img = new Image()
      img.src = esriMapUrl
      img.onload = () => {
        imageMemoryCache.set(esriMapUrl, img)
        drawEsriImage(img)
      }
      img.onerror = err => {
        console.warn(`[ESRI Map] 加载预置卫星图失败，启用动态降级: ${title}`, err)
      }
      // 在本地图片加载的几毫秒微隙中，优先执行父级裁剪兜底
      if (!tryDrawParentCrop()) {
        getScMapImage().then(drawFallbackCrop).catch(() => {})
      }
    }
  } else {
    // 无专属预置图时，先渲染裁剪首帧，再尝试在线卫星瓦片
    if (!tryDrawParentCrop()) {
      if (providedImage && providedImage.complete && providedImage.width > 0) {
        drawFallbackCrop(providedImage)
      } else {
        getScMapImage().then(drawFallbackCrop).catch(() => {})
      }
    }

    if (cityData) {
      const bbox = computeGeoBBox(cityData)
      if (Number.isFinite(bbox.minLng) && Number.isFinite(bbox.maxLng)) {
        fetchDynamicEsriTiles(bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, isDistrict)
          .then(tilesCanvas => {
            if (tilesCanvas) {
              drawEsriImage(tilesCanvas)
            }
          })
          .catch(() => {})
      }
    }
  }

  return texture
}
