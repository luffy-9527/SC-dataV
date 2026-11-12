# Chengdu 3D scene sources

## Buildings

© OpenStreetMap contributors, Open Database License (ODbL 1.0). The compact
derived datasets in `buildings/` retain OSM way IDs and are made available under
the same license. Attribution is visible in the application. Source access:

- https://www.openstreetmap.org/copyright
- https://opendatacommons.org/licenses/odbl/1-0/
- https://overpass-api.de/api/interpreter
- https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings

Downloaded 2026-11-12. District datasets query the full bounding box of each
administrative feature in `chengdu.json`; `extent: district` records completed
retrieval. This replaces the former approximately 3 × 3 km center crop. OSM coverage is
uneven; these are not complete district inventories. Only closed building ways
are included. Open ways, unsupported relations and roof-only structures are
not synthesized. The UI reports the rendered count.

Height provenance is recorded per footprint: `tag` means an OSM height tag
(not independently surveyed/verified); `levels` uses floors × 3.2 m; `default`
uses a clearly disclosed 12 m display estimate. Facade windows are stylized,
not measured facade textures. Roofs use clean solid-color materials; no imagery
is projected onto them.

## Terrain

Mapzen Terrain Tiles, Terrarium format. Source documentation and attribution:

- https://github.com/tilezen/joerd/blob/master/docs/formats.md
- https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png

`chengdu-dem.json` is a Chengdu-bounded mosaic from zoom 10, sampled every four
source pixels, approximately 530 m sample spacing near Chengdu. It represents
regional terrain rather than rooftop or street-level elevation. Height decodes
as R × 256 + G + B / 256 − 32768 metres; rendering uses bilinear sampling.
Horizontal and vertical units use the same Mercator local scale, with district
center elevation subtracted for numerical stability. Buildings rest on the
local DEM; aircraft maintain clearance from modeled terrain/buildings.

## Vector ground model (active)

`vectors/` is a derived OSM database under ODbL 1.0, retaining way IDs. Roads,
waterways, closed water areas, parks and green land-use ways are fetched for the
same full administrative bounding boxes. Unsupported multipolygon
relations are not synthesized. Width tags/lanes are used where available;
otherwise road-class display widths are estimates. Bridge/tunnel tags receive
simple visual separation, not surveyed engineering geometry. Source attribution
is shown in the UI. Run `python src/pages/LowAltitude/data/build-district-data.py`.

## Legacy imagery (not loaded by the current renderer)

ESRI World Imagery, the same provider already used by SmartCity. Local district
imagery remains on disk but is not an active overview layer. `urban-imagery/` contains zoom 15/16 crops
for the above neighborhoods, composed with the exact Web Mercator bounds.
The current scene loads none of these images. Local retrieval date does not
establish satellite capture date. No imagery
rights are transferred by this application.

## Preparation and operation

Run `python src/pages/LowAltitude/data/build-district-data.py` to refresh all
district building and vector datasets, or pass administrative codes to refresh
selected districts. Requests use cached geographic tiles and deduplicate OSM
way IDs. A failed request preserves the previous runtime files. Source gaps
are not filled with fictional buildings. The existing DEM does not need a refresh.

The older `cache-city-sources.py` / `build-city-data.mjs` pipeline prepares the
original neighborhood data and DEM; it is not the current district refresh path.

Raw responses/tiles live in git-ignored `source-cache/`. Runtime only loads
bundled local assets, with one district's building dataset loaded on demand.
This is footprint-based 3D GIS, not an oblique photogrammetry reconstruction.
Telemetry, routes, facilities and emergency scenarios remain fictional demos.
