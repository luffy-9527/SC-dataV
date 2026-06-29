import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

function hash2(x: number, y: number, seed: number) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)
  n = (n ^ (n >>> 13)) >>> 0
  n = Math.imul(n, 1274126177) >>> 0
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function valueNoise(x: number, y: number, scale: number, seed: number) {
  const gx = Math.floor(x / scale)
  const gy = Math.floor(y / scale)
  const tx = smoothstep((x - gx * scale) / scale)
  const ty = smoothstep((y - gy * scale) / scale)

  const a = hash2(gx, gy, seed)
  const b = hash2(gx + 1, gy, seed)
  const c = hash2(gx, gy + 1, seed)
  const d = hash2(gx + 1, gy + 1, seed)
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty)
}

function fbm(x: number, y: number, seed: number) {
  let sum = 0
  let amp = 0.56
  let total = 0
  let scale = 220
  for (let i = 0; i < 7; i += 1) {
    sum += valueNoise(x, y, scale, seed + i * 113) * amp
    total += amp
    amp *= 0.52
    scale *= 0.52
  }
  return sum / total
}

function ridgeNoise(x: number, y: number, seed: number) {
  let sum = 0
  let amp = 0.58
  let total = 0
  let scale = 118
  for (let i = 0; i < 6; i += 1) {
    const n = valueNoise(x, y, scale, seed + 900 + i * 71)
    const ridge = 1 - Math.abs(n * 2 - 1)
    sum += Math.pow(ridge, 2.1) * amp
    total += amp
    amp *= 0.5
    scale *= 0.55
  }
  return sum / total
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

function mixColor(a: [number, number, number], b: [number, number, number], t: number) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ] as [number, number, number]
}

function terrainColor(h: number, moisture: number): [number, number, number] {
  const water: [number, number, number] = [76, 131, 139]
  const plain: [number, number, number] = [94, 136, 82]
  const forest: [number, number, number] = [54, 102, 68]
  const dry: [number, number, number] = [147, 139, 101]
  const rock: [number, number, number] = [126, 116, 96]
  const snow: [number, number, number] = [220, 218, 202]

  if (h < 0.22) return mixColor(water, plain, h / 0.22)
  if (h < 0.48) return mixColor(moisture > 0.52 ? forest : plain, plain, (h - 0.22) / 0.26)
  if (h < 0.68) return mixColor(plain, dry, (h - 0.48) / 0.2)
  if (h < 0.86) return mixColor(dry, rock, (h - 0.68) / 0.18)
  return mixColor(rock, snow, (h - 0.86) / 0.14)
}

function drawMeanderingRiver(ctx: CanvasRenderingContext2D, seed: number, size: number, startY: number, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let i = 0; i <= 64; i += 1) {
    const t = i / 64
    const x = -40 + t * (size + 80)
    const y =
      startY +
      Math.sin(t * Math.PI * 3.4 + seed * 0.017) * (20 + (seed % 11)) +
      Math.sin(t * Math.PI * 7.5 + seed * 0.031) * 9
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = 'rgba(120, 181, 195, 0.48)'
  ctx.lineWidth = 4.2
  ctx.stroke()
  ctx.strokeStyle = 'rgba(224, 244, 247, 0.56)'
  ctx.lineWidth = 1.35
  ctx.stroke()
  ctx.restore()
}

/**
 * 下钻区县地图专用“真实地形纹理”。
 *
 * 目标：二级地图不再使用城市道路图，也不强行复用四川省整图贴图。
 * 这里生成稳定的卫星地形质感：山脉阴影、丘陵纹理、平原绿地、细水系与高光山脊。
 */
export default function createDrillTerrainTexture(seedText = 'drill-real-terrain') {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  let seed = 0
  for (let i = 0; i < seedText.length; i += 1) seed += seedText.charCodeAt(i) * (i + 23)
  seed = seed || 20260625

  const heights = new Float32Array(size * size)

  // 先生成高度场：左上/西部偏山地，右下/东部偏平原，中间叠加丘陵。
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = x / size
      const ny = y / size
      const base = fbm(x, y, seed)
      const ridge = ridgeNoise(x * 1.05 + seed * 0.07, y * 0.95 - seed * 0.04, seed)
      const westMountain = clamp(1.08 - (nx * 1.22 + ny * 0.18), 0, 1)
      const northMountain = clamp(0.72 - Math.abs(ny - 0.18) * 1.85 + (0.28 - nx) * 0.25, 0, 1)
      const basin = clamp(1 - Math.hypot(nx - 0.55, ny - 0.55) * 1.65, 0, 1)
      const valley = clamp(1 - Math.abs(ny - 0.52 - Math.sin(nx * 7.4) * 0.045) * 5.4, 0, 1)
      let h = 0.22 + base * 0.34 + ridge * 0.34
      h += westMountain * 0.26 + northMountain * 0.15
      h -= basin * 0.18 + valley * 0.08
      heights[y * size + x] = clamp(h, 0, 1)
    }
  }

  const image = ctx.createImageData(size, size)
  const data = image.data
  const light = { x: -0.55, y: -0.68, z: 0.48 }

  for (let y = 0; y < size; y += 1) {
    const ym = Math.max(0, y - 1)
    const yp = Math.min(size - 1, y + 1)
    for (let x = 0; x < size; x += 1) {
      const xm = Math.max(0, x - 1)
      const xp = Math.min(size - 1, x + 1)
      const idx = y * size + x
      const h = heights[idx]
      const moisture = fbm(x + 1130, y - 740, seed + 4096)
      let [r, g, b] = terrainColor(h, moisture)

      const dx = heights[y * size + xp] - heights[y * size + xm]
      const dy = heights[yp * size + x] - heights[ym * size + x]
      const nx = -dx * 9.2
      const ny = -dy * 9.2
      const nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      const shade = clamp((nx / len) * light.x + (ny / len) * light.y + (nz / len) * light.z, -0.55, 1)
      const detail = (valueNoise(x, y, 8, seed + 777) - 0.5) * 18
      const ridgeLine = Math.pow(clamp(ridgeNoise(x * 1.35, y * 1.35, seed + 181), 0, 1), 5) * 34
      const factor = 0.78 + shade * 0.5

      r = clamp((r + ridgeLine + detail) * factor, 0, 255)
      g = clamp((g + ridgeLine + detail) * factor, 0, 255)
      b = clamp((b + ridgeLine + detail) * factor, 0, 255)

      data[idx * 4] = r
      data[idx * 4 + 1] = g
      data[idx * 4 + 2] = b
      data[idx * 4 + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)

  // 轻微大气/云影，增加卫星图层次但不变成城市路网。
  const haze = ctx.createRadialGradient(size * 0.62, size * 0.42, size * 0.08, size * 0.62, size * 0.42, size * 0.72)
  haze.addColorStop(0, 'rgba(255, 247, 218, 0.16)')
  haze.addColorStop(0.55, 'rgba(255, 247, 218, 0.04)')
  haze.addColorStop(1, 'rgba(255, 247, 218, 0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, size, size)

  // 水系不是道路：更细、更蓝、更自然。
  drawMeanderingRiver(ctx, seed + 1, size, size * 0.28, 0.34)
  drawMeanderingRiver(ctx, seed + 2, size, size * 0.58, 0.28)
  drawMeanderingRiver(ctx, seed + 3, size, size * 0.76, 0.22)

  // 等高线/山脊淡线，增强地形感。
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.16
  ctx.strokeStyle = 'rgba(245, 239, 216, 0.48)'
  ctx.lineWidth = 0.65
  for (let i = 0; i < 28; i += 1) {
    ctx.beginPath()
    const y0 = (i / 27) * size
    for (let x = 0; x <= size; x += 18) {
      const n = valueNoise(x, y0, 52, seed + i * 17)
      const y = y0 + (n - 0.5) * 36 + Math.sin(x * 0.018 + i) * 9
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()

  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
