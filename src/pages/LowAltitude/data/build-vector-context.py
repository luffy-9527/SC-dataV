"""Cache Chengdu neighborhood roads, waterways and landcover from OSM.
Derived database © OpenStreetMap contributors, ODbL 1.0. No raster imagery.
"""
import concurrent.futures,json,pathlib,time,urllib.request,urllib.parse
root=pathlib.Path(__file__).resolve().parent
manifest=json.loads((root/'buildings'/'manifest.json').read_text(encoding='utf8'))
out=root/'vectors';out.mkdir(exist_ok=True)
def collect(item):
    id,meta=item;file=out/(id+'.json')
    if file.exists():return id+' cached'
    west,south,east,north=meta['bounds'];bbox=f'({south},{west},{north},{east})'
    query='[out:json][timeout:70];('+''.join('way'+tag+bbox+';' for tag in ['[highway]','[waterway]','[natural=water]','[landuse~"grass|forest|meadow|recreation_ground"]','[leisure~"park|garden|pitch"]'])+');out tags geom;'
    for attempt in range(3):
        try:
            req=urllib.request.Request('https://overpass-api.de/api/interpreter',data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'SC-dataV-Chengdu-model/1.0'})
            with urllib.request.urlopen(req,timeout=95) as response:raw=json.load(response)
            if raw.get('remark'):raise RuntimeError(raw['remark'])
            features=[]
            for way in raw.get('elements',[]):
                points=[[round(p['lon'],6),round(p['lat'],6)] for p in way.get('geometry',[])]
                if len(points)<2:continue
                tags=way.get('tags',{})
                if tags.get('tunnel')=='yes':continue
                kind='road' if 'highway' in tags else 'water' if 'waterway' in tags or tags.get('natural')=='water' else 'green'
                features.append({'id':way['id'],'kind':kind,'class':tags.get('highway',tags.get('waterway',tags.get('leisure',tags.get('landuse','water')))),'points':points,'closed':points[0]==points[-1],'width':tags.get('width'),'lanes':tags.get('lanes'),'bridge':tags.get('bridge')=='yes'})
            file.write_text(json.dumps({'id':id,'source':'OpenStreetMap contributors','license':'ODbL-1.0','features':features},separators=(',',':')),encoding='utf8')
            return id+' '+str(len(features))+' features'
        except Exception:
            if attempt==2:raise
            time.sleep(3+attempt*5)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for result in pool.map(collect,manifest['districts'].items()):print(result,flush=True)
