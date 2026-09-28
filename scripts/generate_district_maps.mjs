import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../src/assets/maps/districts')
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
      res.on('error', reject)
    })
  })
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) {
        return resolve(null)
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', () => resolve(null))
    }).on('error', () => resolve(null))
  })
}

function latLonToTile(lat, lon, zoom) {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  )
  return { x, y }
}

function worldPixelX(lng, zoom) {
  return ((lng + 180) / 360) * Math.pow(2, zoom) * 256
}

function worldPixelY(lat, zoom) {
  const latRad = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom) * 256
}

function computeGeoBBox(feature) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  function walk(c) {
    if (typeof c[0] === 'number') {
      minLng = Math.min(minLng, c[0])
      maxLng = Math.max(maxLng, c[0])
      minLat = Math.min(minLat, c[1])
      maxLat = Math.max(maxLat, c[1])
    } else c.forEach(walk)
  }
  walk(feature.geometry.coordinates)
  return { minLng, maxLng, minLat, maxLat }
}

async function generateDistrictMap(feature, zoom = 13) {
  const adcode = feature.properties.adcode
  const name = feature.properties.name
  const outFile = path.join(OUT_DIR, `${adcode}.jpg`)
  if (fs.existsSync(outFile)) {
    console.log(`[Skip] Already exists: ${name} (${adcode})`)
    return
  }

  const { minLng, maxLng, minLat, maxLat } = computeGeoBBox(feature)
  const tMin = latLonToTile(maxLat, minLng, zoom)
  const tMax = latLonToTile(minLat, maxLng, zoom)
  const minX = Math.min(tMin.x, tMax.x)
  const maxX = Math.max(tMin.x, tMax.x)
  const minY = Math.min(tMin.y, tMax.y)
  const maxY = Math.max(tMin.y, tMax.y)
  const tilesX = maxX - minX + 1
  const tilesY = maxY - minY + 1

  console.log(`[Generating] ${name} (${adcode}) Zoom: ${zoom}, Tiles: ${tilesX}x${tilesY} (${tilesX * tilesY})`)

  // 并发拉取瓦片
  const tileBuffers = []
  const tasks = []
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const curX = x
      const curY = y
      tasks.push(async () => {
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${curY}/${curX}`
        const buf = await fetchBuffer(url)
        return { x: curX, y: curY, buf }
      })
    }
  }

  // 16 并发下载
  const results = []
  const CONCURRENCY = 16
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const chunk = tasks.slice(i, i + CONCURRENCY).map(fn => fn())
    results.push(...(await Promise.all(chunk)))
  }

  // 使用 sharp 拼合大图
  const compositeInputs = []
  const transparentTile = await sharp({
    create: { width: 256, height: 256, channels: 3, background: { r: 100, g: 130, b: 90 } }
  }).jpeg().toBuffer()

  for (const item of results) {
    const left = (item.x - minX) * 256
    const top = (item.y - minY) * 256
    compositeInputs.push({
      input: item.buf || transparentTile,
      left,
      top,
    })
  }

  const canvasW = tilesX * 256
  const canvasH = tilesY * 256

  const bigImage = await sharp({
    create: { width: canvasW, height: canvasH, channels: 3, background: { r: 0, g: 0, b: 0 } }
  })
    .composite(compositeInputs)
    .jpeg()
    .toBuffer()

  // 按照区县精准经纬度 BBox 进行裁剪
  const originX = minX * 256
  const originY = minY * 256
  const cropLeft = Math.max(0, Math.floor(worldPixelX(minLng, zoom) - originX))
  const cropRight = Math.min(canvasW, Math.ceil(worldPixelX(maxLng, zoom) - originX))
  const cropTop = Math.max(0, Math.floor(worldPixelY(maxLat, zoom) - originY))
  const cropBottom = Math.min(canvasH, Math.ceil(worldPixelY(minLat, zoom) - originY))

  const cropW = Math.max(10, cropRight - cropLeft)
  const cropH = Math.max(10, cropBottom - cropTop)

  // 最终输出 1536x1536 高清 JPEG
  await sharp(bigImage)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .resize(1536, 1536, { fit: 'fill' })
    .modulate({ saturation: 1.15, brightness: 1.02 })
    .sharpen({ sigma: 1.2 })
    .jpeg({ quality: 88 })
    .toFile(outFile)

  console.log(`[Done] Saved: ${outFile}`)
}

async function main() {
  const chengduData = await fetchJson('https://geo.datav.aliyun.com/areas_v3/bound/510100_full.json')
  console.log(`Found ${chengduData.features.length} districts in Chengdu.`)

  // 先处理重点区县：郫都区(510117)、龙泉驿区(510112)、双流区(510116)、锦江区(510104)、武侯区(510107)、金牛区(510106)、青羊区(510105)、成华区(510108)、温江区(510115)、新都区(510114)
  for (const feature of chengduData.features) {
    const name = feature.properties.name
    const adcode = feature.properties.adcode
    console.log(`Processing: ${name} (${adcode})`)
    try {
      await generateDistrictMap(feature, 13)
    } catch (err) {
      console.error(`Error processing ${name}:`, err)
    }
  }

  // 生成 index.ts 映射文件
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.jpg'))
  const imports = []
  const mappingEntries = []

  for (const f of files) {
    const code = f.replace('.jpg', '')
    const feat = chengduData.features.find(x => String(x.properties.adcode) === code)
    const varName = `img_${code}`
    imports.push(`import ${varName} from './${f}'`)
    mappingEntries.push(`  '${code}': ${varName},`)
    if (feat) {
      mappingEntries.push(`  '${feat.properties.name}': ${varName},`)
    }
  }

  const indexContent = `// 自动生成的成都市各区县高精度 ESRI 卫星遥感底图映射表
${imports.join('\n')}

export const DISTRICT_ESRI_MAPS: Record<string, string> = {
${mappingEntries.join('\n')}
}

export function getDistrictEsriMap(key: string): string | undefined {
  return DISTRICT_ESRI_MAPS[key]
}
`
  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), indexContent, 'utf-8')
  console.log('[All Done] Generated districts index.ts successfully!')
}

main().catch(console.error)
