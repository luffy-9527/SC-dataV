"""Fetch raw OSM/DEM inputs through urllib (supports system HTTPS proxy)."""
import concurrent.futures, json, math, pathlib, time, urllib.request, urllib.parse
root=pathlib.Path(__file__).resolve().parent
cache=root/'source-cache'; cache.mkdir(exist_ok=True)
geo=json.loads((root/'chengdu.json').read_text(encoding='utf-8'))
def fetch(url,data=None):
    req=urllib.request.Request(url,data=data,headers={'User-Agent':'SC-dataV-Chengdu-demo/1.0'})
    with urllib.request.urlopen(req,timeout=100) as response:return response.read()
def buildings(feature):
    p=feature['properties']; file=cache/(str(p['adcode'])+'.json')
    if file.exists():return str(p['adcode'])+' cached'
    x,y=p['center']; dy=.0135; dx=dy/math.cos(math.radians(y))
    query=f'[out:json][timeout:75];way[building]({y-dy},{x-dx},{y+dy},{x+dx});out tags geom;'
    for attempt in range(3):
        try:
            raw=fetch('https://overpass-api.de/api/interpreter',urllib.parse.urlencode({'data':query}).encode())
            data=json.loads(raw)
            if data.get('remark'):raise RuntimeError(data['remark'])
            file.write_bytes(raw);return str(p['adcode'])+' '+str(len(data.get('elements',[])))
        except Exception:
            if attempt==2:raise
            time.sleep(5+attempt*8)
    return ''
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for result in pool.map(buildings,geo['features']):print(result,flush=True)
points=[]
def walk(coords):
    if isinstance(coords[0],(int,float)):points.append(coords)
    else:
        for c in coords:walk(c)
for f in geo['features']:walk(f['geometry']['coordinates'])
def tile(point):
    x,y=point; return ((x+180)/360*1024,(1-math.asinh(math.tan(math.radians(y)))/math.pi)/2*1024)
tiles=[tile(p) for p in points]; xs=[t[0] for t in tiles]; ys=[t[1] for t in tiles]
jobs=[(x,y) for x in range(math.floor(min(xs)),math.floor(max(xs))+1) for y in range(math.floor(min(ys)),math.floor(max(ys))+1)]
def dem(job):
    x,y=job; file=cache/f'dem-10-{x}-{y}.png'
    if not file.exists():file.write_bytes(fetch(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/10/{x}/{y}.png'))
    return file.name
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for result in pool.map(dem,jobs):print(result,flush=True)
