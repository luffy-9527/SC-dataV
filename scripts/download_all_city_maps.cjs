const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const AD_CODE_MAP = {
  成都市: '510100',
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
  甘孜藏族自治州: '513300',
  凉山彝族自治州: '513400',
};

function latLonToTile(lat, lon, zoom) {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
  return { x, y };
}

function worldPixelX(lng, zoom) {
  return ((lng + 180) / 360) * Math.pow(2, zoom) * 256;
}

function worldPixelY(lat, zoom) {
  const latRad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom) * 256;
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.arrayBuffer();
      }
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

async function runQueue(tasks, limit = 8) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const taskIndex = index++;
      results[taskIndex] = await tasks[taskIndex]();
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function downloadCityMap(name, adcode, outDir) {
  const outFile = path.join(outDir, `${adcode}.jpg`);
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 10000) {
    console.log(`[${name}] (${adcode}) already downloaded, skipping.`);
    return;
  }

  console.log(`\n>>> Processing [${name}] (${adcode})...`);
  const geoUrl = `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`;
  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) {
    throw new Error(`Failed to fetch GeoJSON for ${name}: HTTP ${geoRes.status}`);
  }
  const geoData = await geoRes.json();

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  function walk(coords) {
    if (!Array.isArray(coords) || coords.length === 0) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    coords.forEach(walk);
  }
  geoData.features.forEach(f => walk(f.geometry.coordinates));

  // Determine appropriate zoom level
  const isLargePrefecture = ['513200', '513300', '513400'].includes(adcode);
  const zoom = isLargePrefecture ? 9 : 10;

  const tMin = latLonToTile(maxLat, minLng, zoom);
  const tMax = latLonToTile(minLat, maxLng, zoom);

  const minX = Math.min(tMin.x, tMax.x);
  const maxX = Math.max(tMin.x, tMax.x);
  const minY = Math.min(tMin.y, tMax.y);
  const maxY = Math.max(tMin.y, tMax.y);

  const tilesX = maxX - minX + 1;
  const tilesY = maxY - minY + 1;
  console.log(`  BBox: [${minLng.toFixed(2)}, ${minLat.toFixed(2)}, ${maxLng.toFixed(2)}, ${maxLat.toFixed(2)}] | Zoom ${zoom} | Tiles: ${tilesX}x${tilesY} = ${tilesX * tilesY}`);

  const composites = [];
  const tasks = [];

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const left = (x - minX) * 256;
      const top = (y - minY) * 256;
      const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
      tasks.push(async () => {
        try {
          const buf = await fetchWithRetry(tileUrl, 3);
          composites.push({
            input: Buffer.from(buf),
            left,
            top
          });
        } catch (err) {
          console.error(`  Warning: Tile failed at (${zoom}/${y}/${x}):`, err.message);
        }
      });
    }
  }

  await runQueue(tasks, 10);
  console.log(`  Downloaded ${composites.length}/${tilesX * tilesY} tiles. Stitching and cropping...`);

  const fullW = tilesX * 256;
  const fullH = tilesY * 256;

  const stitchedBuffer = await sharp({
    create: {
      width: fullW,
      height: fullH,
      channels: 4,
      background: { r: 15, g: 25, b: 18, alpha: 255 }
    }
  })
    .composite(composites)
    .jpeg({ quality: 95 })
    .toBuffer();

  const originX = minX * 256;
  const originY = minY * 256;

  const cropLeft = Math.max(0, Math.floor(worldPixelX(minLng, zoom) - originX));
  const cropRight = Math.min(fullW, Math.ceil(worldPixelX(maxLng, zoom) - originX));
  const cropTop = Math.max(0, Math.floor(worldPixelY(maxLat, zoom) - originY));
  const cropBottom = Math.min(fullH, Math.ceil(worldPixelY(minLat, zoom) - originY));

  const cropWidth = Math.max(10, cropRight - cropLeft);
  const cropHeight = Math.max(10, cropBottom - cropTop);

  await sharp(stitchedBuffer)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .resize(1024, 1024, { fit: 'fill' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outFile);

  const stat = fs.statSync(outFile);
  console.log(`  Done: ${outFile} (${(stat.size / 1024).toFixed(1)} KB)`);
}

async function main() {
  const outDir = path.resolve(__dirname, '../src/assets/maps/cities');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const entries = Object.entries(AD_CODE_MAP);
  console.log(`Starting ESRI satellite imagery download for ${entries.length} cities/prefectures in Sichuan...`);

  for (const [name, adcode] of entries) {
    try {
      await downloadCityMap(name, adcode, outDir);
    } catch (err) {
      console.error(`Failed to process ${name} (${adcode}):`, err);
    }
  }

  // Generate index.ts for typed static imports
  let indexTs = `// 自动生成的四川省 21 地市州 ESRI 高精度卫星遥感影像底图映射表\n`;
  for (const [name, adcode] of entries) {
    indexTs += `import img_${adcode} from './${adcode}.jpg'\n`;
  }
  indexTs += `\nexport const CITY_ESRI_MAPS: Record<string, string> = {\n`;
  for (const [name, adcode] of entries) {
    indexTs += `  '${adcode}': img_${adcode},\n`;
    indexTs += `  '${name}': img_${adcode},\n`;
  }
  indexTs += `}\n\nexport function getCityEsriMap(key: string): string | undefined {\n  return CITY_ESRI_MAPS[key]\n}\n`;

  fs.writeFileSync(path.join(outDir, 'index.ts'), indexTs, 'utf8');
  console.log(`\nGenerated ${path.join(outDir, 'index.ts')}`);
  console.log('All 21 city satellite maps successfully downloaded and indexed!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
