# Low-altitude geographic data

- `chengdu.json`: 20 district features from the same DataV source used by
  `SmartCity/map/drill.ts`, saved locally on 2026-11-12 from
  `https://geo.datav.aliyun.com/areas_v3/bound/510100_full.json`.
- The active renderer uses a solid shaded DEM surface and modeled building
  roofs/facades. Satellite images are not requested or attached to materials.
  District boundary vertices, projection and terrain elevation stay unchanged.
- `vectors/`: local OSM roads, water and green-space ways, retrieved 2026-11-12
  with `python src/pages/LowAltitude/data/build-district-data.py`. Geometry is
  projected and draped onto the existing DEM, clipped to the district boundary.
  Queries cover each complete district bounding box, replacing the former
  3 km neighborhood limit. OSM source gaps still exist; full query extent does
  not mean a complete district building inventory. No synthetic infill is used.
- `buildings/` and `chengdu-dem.json`: see `SOURCES.md` for provenance, coverage,
  height estimates and attribution. Flight objects remain simulated.
- The page loads these bundled assets only; switching district requires no
  external map service. Legacy satellite assets remain on disk for other uses;
  the low-altitude scene has no active satellite loader.

The daylight theme uses white information cards, a blue-gray terrain surface,
solid building roofs, desaturated green parks and blue waterways. Boundary
containment uses indexed edges without simplifying the district outline. Roads
retain source bends; additional terrain subdivisions are coarser outside the
operational center. Geometry remains merged to limit draw calls.
Large JSON datasets are emitted as static assets and fetched for the selected
district only. They are not compiled into JavaScript modules or retained in
the module cache after switching; pending loads are aborted on scene disposal.
