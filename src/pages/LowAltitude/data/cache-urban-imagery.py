"""Cache ESRI imagery tiles for Chengdu urban detail, matching Web Mercator."""
import concurrent.futures,json,math,pathlib,urllib.request,time
root=pathlib.Path(__file__).resolve().parent;cache=root/'source-cache';cache.mkdir(exist_ok=True)
manifest=json.loads((root/'buildings'/'manifest.json').read_text(encoding='utf8'))
jobs=set();regions={}
def pixel(lng,lat,z):return ((lng+180)/360*2**z*256,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z*256)
for id,item in manifest['districts'].items():
    z=16 if item['count']>=200 else 15
    west,south,east,north=item['bounds'];left,top=pixel(west,north,z);right,bottom=pixel(east,south,z)
    x0,y0,x1,y1=math.floor(left/256),math.floor(top/256),math.floor(right/256),math.floor(bottom/256)
    regions[id]={'zoom':z,'bounds':item['bounds'],'pixels':[left,top,right,bottom],'tiles':[x0,y0,x1,y1]}
    for x in range(x0,x1+1):
        for y in range(y0,y1+1):jobs.add((z,x,y))
def get(job):
    z,x,y=job;file=cache/f'urban-{z}-{x}-{y}.jpg'
    if file.exists():return True
    for attempt in range(3):
        try:
            url=f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            with urllib.request.urlopen(url,timeout=35) as r:raw=r.read()
            if len(raw)<100:raise RuntimeError('empty tile')
            file.write_bytes(raw);return True
        except Exception:
            if attempt==2:raise
            time.sleep(1+attempt)
    return False
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for i,result in enumerate(pool.map(get,sorted(jobs))):
        if i%60==0:print(f'{i+1}/{len(jobs)} imagery tiles',flush=True)
(cache/'urban-regions.json').write_text(json.dumps(regions),encoding='utf8')
print('Imagery cache ready',len(jobs),flush=True)
