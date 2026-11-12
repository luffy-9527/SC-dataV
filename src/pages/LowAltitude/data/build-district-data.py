"""Fetch full administrative extents, preserving real OSM geometry (no invented infill).

Run: python src/pages/LowAltitude/data/build-district-data.py [adcode ...]
Raw cache keys are distinct from the former 3 km neighborhood cache.
Existing runtime datasets are replaced only after a successful, complete response.
"""
import concurrent.futures, datetime, json, math, pathlib, re, sys, time, threading
import urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
CACHE = ROOT / 'source-cache' / 'district-v1'
CACHE.mkdir(parents=True, exist_ok=True)
geo = json.loads((ROOT / 'chengdu.json').read_text(encoding='utf8'))
tile_locks = {}; lock = threading.Lock()

def fetch_tile(x, y):
    key = f'tile-{x}-{y}'
    with lock: tile_lock = tile_locks.setdefault(key, threading.Lock())
    with tile_lock:
        file = CACHE / (key+'.json')
        if file.exists(): return json.loads(file.read_text(encoding='utf8'))['elements']
        bbox = f'({y*.16},{x*.16},{(y+1)*.16},{(x+1)*.16})'
        tags = ['[building]', '[highway]', '[waterway]', '[natural=water]',
                '[landuse~"grass|forest|meadow|recreation_ground"]', '[leisure~"park|garden|pitch"]']
        query = '[out:json][timeout:90];(' + ''.join('way'+tag+bbox+';' for tag in tags) + ');out tags geom;'
        for attempt in range(3):
            try:
                endpoint = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'][attempt % 2]
                request = urllib.request.Request(endpoint, data=urllib.parse.urlencode({'data': query}).encode(), headers={'User-Agent': 'SC-dataV-Chengdu-model/1.0'})
                with urllib.request.urlopen(request, timeout=110) as response: raw = json.load(response)
                if raw.get('remark'): raise RuntimeError(raw['remark'])
                temporary = file.with_suffix('.tmp')
                temporary.write_text(json.dumps(raw, separators=(',', ':')), encoding='utf8'); temporary.replace(file)
                print(key, len(raw['elements']), 'ways', flush=True)
                return raw['elements']
            except Exception as error:
                print(key, 'retry', attempt+1, str(error), flush=True)
                if attempt == 2: raise
                time.sleep(3)

def number(value):
    match = re.match(r'^\s*(\d+(?:\.\d+)?)', str(value or ''))
    return float(match[1]) if match and float(match[1]) > 0 else None

def ring_index(ring):
    west=min(p[0] for p in ring); east=max(p[0] for p in ring)
    south=min(p[1] for p in ring); north=max(p[1] for p in ring)
    rows=[[] for _ in range(128)]
    def row(y): return max(0,min(127,int((y-south)/(north-south or 1)*128)))
    for i,a in enumerate(ring):
        b=ring[i-1]
        for n in range(row(min(a[1],b[1])),row(max(a[1],b[1]))+1): rows[n].append((a,b))
    def contains(p):
        x,y=p
        if not west<=x<=east or not south<=y<=north:return False
        inside=False
        for a,b in rows[row(y)]:
            if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:inside=not inside
        return inside
    return contains

def collect(feature, subdivide=False):
    props = feature['properties']; code = str(props['adcode'])
    polygons = feature['geometry']['coordinates']
    if feature['geometry']['type'] == 'Polygon': polygons = [polygons]
    indexed=[[ring_index(ring) for ring in polygon] for polygon in polygons]
    def contains(p):return any(rings[0](p) and not any(hole(p) for hole in rings[1:]) for rings in indexed)
    points = [p for polygon in polygons for ring in polygon for p in ring]
    bounds = [min(p[0] for p in points), min(p[1] for p in points),
              max(p[0] for p in points), max(p[1] for p in points)]
    west, south, east, north = bounds
    bbox = f'({south},{west},{north},{east})'
    tags = ['[building]', '[highway]', '[waterway]', '[natural=water]',
            '[landuse~"grass|forest|meadow|recreation_ground"]', '[leisure~"park|garden|pitch"]']
    query = '[out:json][timeout:100];(' + ''.join('way'+tag+bbox+';' for tag in tags) + ');out tags geom;'
    cached = CACHE / (code + '.json')
    if cached.exists():
        raw = json.loads(cached.read_text(encoding='utf8'))
    else:
        # Prefer a single complete response; subdivide only when the service
        # cannot handle the extent. This also avoids unnecessary server load.
        try:
            request = urllib.request.Request('https://overpass-api.de/api/interpreter', data=urllib.parse.urlencode({'data':query}).encode(), headers={'User-Agent':'SC-dataV-Chengdu-model/1.0'})
            with urllib.request.urlopen(request, timeout=125) as response: raw=json.load(response)
            if raw.get('remark'): raise RuntimeError(raw['remark'])
        except Exception as error:
            if not subdivide: raise
            print(code, 'subdividing', str(error), flush=True)
            elements = {}
            for x in range(math.floor(west/.16), math.floor(east/.16)+1):
                for y in range(math.floor(south/.16), math.floor(north/.16)+1):
                    for way in fetch_tile(x, y):
                        if any(west<=p['lon']<=east and south<=p['lat']<=north for p in way.get('geometry', [])):
                            elements[way['id']] = way
            raw = {'elements': list(elements.values())}
        temporary = cached.with_suffix('.tmp')
        temporary.write_text(json.dumps(raw, separators=(',', ':')), encoding='utf8'); temporary.replace(cached)
    buildings, vectors = [], []
    for way in raw.get('elements', []):
        points = [[round(p['lon'], 6), round(p['lat'], 6)] for p in way.get('geometry', [])]
        if len(points) < 2: continue
        tags = way.get('tags', {}); closed = points[0] == points[-1]
        if 'building' in tags:
            if len(points) < 4 or not closed or tags['building'] in ['roof', 'no']: continue
            # Match the renderer's containment rule before shipping JSON. This
            # removes neighbors outside this district without changing coverage.
            if not all(contains(p) for p in points): continue
            explicit, levels = number(tags.get('height')), number(tags.get('building:levels'))
            height = explicit or (levels * 3.2 if levels else 12)
            if height > 400: continue
            buildings.append(dict(id=way['id'], points=points, height=height,
                heightSource='tag' if explicit else 'levels' if levels else 'default',
                name=tags.get('name', ''), kind=tags['building']))
        else:
            if tags.get('tunnel') == 'yes': continue
            kind = 'road' if 'highway' in tags else 'water' if 'waterway' in tags or tags.get('natural') == 'water' else 'green'
            vectors.append({'id': way['id'], 'kind': kind, 'class': tags.get('highway', tags.get('waterway', tags.get('leisure', tags.get('landuse', 'water')))),
                'points': points, 'closed': closed, 'width': tags.get('width'), 'lanes': tags.get('lanes'), 'bridge': tags.get('bridge') == 'yes'})
    metadata = dict(center=props['center'], bounds=bounds, extent='district', count=len(buildings),
        tagged=sum(b['heightSource']=='tag' for b in buildings), estimated=sum(b['heightSource']!='tag' for b in buildings))
    dataset = dict(id=code, name=props['name'], **metadata, buildings=buildings)
    vector = dict(id=code, bounds=bounds, extent='district', source='OpenStreetMap contributors', license='ODbL-1.0', features=vectors)
    for folder, payload in [('buildings', dataset), ('vectors', vector)]:
        target = ROOT / folder / (code+'.json'); temporary = target.with_suffix('.tmp')
        temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
        temporary.replace(target)
    print(code, props['name'], len(buildings), 'buildings', len(vectors), 'vectors', flush=True)
    return code, metadata

if __name__ == '__main__':
    requested = set(sys.argv[1:])
    features = [f for f in geo['features'] if not requested or str(f['properties']['adcode']) in requested]
    manifest_file = ROOT / 'buildings' / 'manifest.json'
    manifest = json.loads(manifest_file.read_text(encoding='utf8'))
    failures = []
    # Complete small successful districts first. Retry transient busy responses
    # before spending requests on tiled fallback for a single large extent.
    for attempt in range(3):
        failures = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            jobs = {pool.submit(collect, feature, attempt==2): feature for feature in features}
            for job in concurrent.futures.as_completed(jobs):
                try:
                    code, metadata = job.result(); manifest['districts'][code] = metadata
                    manifest['retrieved'] = datetime.date.today().isoformat()
                    manifest_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
                except Exception as error:
                    failures.append(jobs[job]); print('RETRY LATER', jobs[job]['properties']['adcode'], str(error), flush=True)
        if not failures: break
        features = failures
        time.sleep(20)
    if failures: sys.exit(1)
