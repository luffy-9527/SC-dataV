// Rebuild the local aerial atlas from the repository's existing district imagery.
// Projection and bounds match CityScene.vue; no network access is required.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { geoMercator } from 'd3-geo'

const directory = path.dirname(fileURLToPath(import.meta.url))
const geo = JSON.parse(await fs.readFile(path.join(directory, 'chengdu.json'), 'utf8'))
const project = geoMercator().center([104.06, 30.67]).scale(5800).translate([0, 0])
const width = 4096
const height = 3206
const bounds = { x: -115, z: -90, width: 230, depth: 180 }
const pixel = point => {
  const [x, z] = project(point)
  return [(x - bounds.x) / bounds.width * width, (z - bounds.z) / bounds.depth * height]
}
const overlays = []
for (const feature of geo.features) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  const rings = polygons.flat()
  const points = rings.flat().map(pixel)
  const left = Math.floor(Math.min(...points.map(p => p[0])))
  const top = Math.floor(Math.min(...points.map(p => p[1])))
  const right = Math.ceil(Math.max(...points.map(p => p[0])))
  const bottom = Math.ceil(Math.max(...points.map(p => p[1])))
  const imageWidth = right - left
  const imageHeight = bottom - top
  const outline = rings.map(ring => ring.map((point, index) => {
    const [x, y] = pixel(point)
    return `${index === 0 ? 'M' : 'L'}${x - left},${y - top}`
  }).join(' ') + 'Z').join(' ')
  const mask = Buffer.from(`<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg"><path d="${outline}" fill="white" fill-rule="evenodd"/></svg>`)
  const input = await sharp(path.resolve(directory, '../../../assets/maps/districts', `${feature.properties.adcode}.jpg`))
    .resize(imageWidth, imageHeight, { fit: 'fill' })
    .greyscale().tint('#719bbf').linear(0.72, 0)
    .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const clippedLeft = Math.max(0, left)
  const clippedTop = Math.max(0, top)
  const clippedRight = Math.min(width, right)
  const clippedBottom = Math.min(height, bottom)
  if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) continue
  overlays.push({
    input: await sharp(input).extract({ left: clippedLeft - left, top: clippedTop - top, width: clippedRight - clippedLeft, height: clippedBottom - clippedTop }).toBuffer(),
    left: clippedLeft,
    top: clippedTop,
  })
}
await sharp({ create: { width, height, channels: 3, background: '#101e30' } })
  .composite(overlays).webp({ quality: 88 }).toFile(path.join(directory, 'chengdu-aerial.webp'))
console.log('Built local Chengdu aerial atlas (4096 × 3206).')
