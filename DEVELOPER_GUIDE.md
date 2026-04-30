# @maxar/transform-ol Developer Guide

OpenLayers extensions for working with Maxar's Transform API and Cloud-Optimized
GeoTIFFs (COGs). This guide documents the project layout and shows how to use
the custom `GeoTIFFSource` in a map.

## Project Overview

`@maxar/transform-ol` is an ES6 / TypeScript library that provides:

- A custom OpenLayers `DataTile` source (`GeoTIFFSource`) that reads tiles
  directly from a remote COG via range requests, using
  [`@maxar/cogeotiff-core`](https://www.npmjs.com/package/@maxar/cogeotiff-core)
  and [`@chunkd/source-http`](https://www.npmjs.com/package/@chunkd/source-http).
- Helpers for building OpenLayers projections from EPSG codes
  (`makeProjectionFromEpsgCode`) and pixel-space projections
  (`makePixelSpaceProjection`).
- Helpers for fetching Maxar Transform API metadata
  (`getHeadInfo`, `getMetadata`) and for converting `UnifiedMetadata` into
  OpenLayers extents, tile ranges, and tile / grid layers
  (`gridLayerFromUnifiedMetadata`, `xyLayerFromUnifiedMetadata`).
- Spatial utilities (`xForm`, `transformExtents`, `getSrsInfo`).

### Source layout

```
src/
├── index.ts                    # Public re-exports
├── Info.ts                     # getHeadInfo / getMetadata (Transform API)
├── Layers.ts                   # gridLayerFromUnifiedMetadata, xyLayerFromUnifiedMetadata
├── Metadata.ts                 # extents, tile range, min/max estimation
├── ProjectionHelper.ts         # makeProjectionFromEpsgCode, makePixelSpaceProjection
├── Spatial.ts                  # xForm, transformExtents, getSrsInfo
├── types.ts                    # TileRange, Range, Point, SrsInfo
└── ol/
    ├── helpers/XYHelpers.ts    # XYZ tile / grid layer factories
    └── source/
        ├── GeoTIFF.js          # GeoTIFFSource (custom DataTile source)
        └── Grid.js             # Debug grid source
```

### Tooling

- Language: TypeScript (with ES6 modules, `Node16` resolution).
- Build: `npm run build` (delegates to `tsc`).
- Clean: `npm run clean`.
- Output: `dist/src/index.js` + `dist/src/index.d.ts` (per `package.json`).

### Peer dependencies

The library expects the consuming application to provide:

| Package                   | Version      |
|---------------------------|--------------|
| `ol`                      | `^10.9.0`    |
| `proj4`                   | `^2.20.0`    |
| `@chunkd/source-http`     | `11.4.0`     |
| `@maxar/cogeotiff-core`   | (workspace)  |
| `@maxar/transform-api`    | (workspace)  |

## Using the GeoTIFFSource

`GeoTIFFSource` is an OpenLayers `DataTile` source that fetches tiles directly
from a remote COG over HTTP using range requests. It can be combined with any
`WebGLTileLayer` and used inside a `Map`.

### Minimal example

```js
import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/WebGLTile.js';
import { GeoTIFFSource } from '@maxar/transform-ol';

const source = new GeoTIFFSource({
  sources: [
    { url: 'https://transform.example.com/api/v1/.../geotiff' }
  ],
});

const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source })],
  view: source.getView(),   // resolves once metadata has been read
});
```

The view is resolved asynchronously by the source after it reads the COG
header, so passing `source.getView()` lets OpenLayers center and zoom on the
imagery once it is ready.

### Authenticated requests

Pass HTTP headers via `sourceOptions.headers`. They are forwarded to
`@chunkd/source-http`, which applies them to every range request:

```js
const source = new GeoTIFFSource({
  sources: [{ url: 'https://transform.example.com/.../geotiff' }],
  sourceOptions: {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  },
});
```

### Chrome Stall Issue

There is a known issue where chrome based browsers have an issue where it will stall requests to the same URL. If your requests are stalling, try setting `Cache-Control: no-store, no-cache, max-age=0`

```js
const source = new GeoTIFFSource({
  sources: [{ url: 'https://transform.example.com/.../geotiff' }],
  sourceOptions: {
    headers: {
      ...,
      'Cache-Control': 'no-store, no-cache, max-age=0',
    },
  },
});
```

### Pre-fetched header / tile sizes

If you already know the COG header and nominal tile sizes (for example from a
prior `HEAD` request via `getHeadInfo`), you can pass them through to avoid an
extra round trip during initialization:

```js
import { getHeadInfo } from '@maxar/transform-ol';

const { headerSize, tileSize } = await getHeadInfo(url, accessToken);

const source = new GeoTIFFSource({
  sources: [{ url }],
  sourceOptions: {
    headers: { Authorization: `Bearer ${accessToken}` },
    headerSize,
    tileSize,
  },
});
```

### Controlling normalization

By default, source pixel values are normalized to `0–255` based on either:

1. `min`/`max` on the source entry,
2. `STATISTICS_MINIMUM` / `STATISTICS_MAXIMUM` from GDAL metadata, or
3. data-type defaults.

To work with raw pixel values in style expressions, disable normalization:

```js
new GeoTIFFSource({
  sources: [{ url, min: 100, max: 2047 }],
  normalize: false,
});
```

### Selecting bands

Use `SourceInfo.bands` (1-based) to read a subset of bands. For example, to
render an 8-band WorldView image as NIR1/Green/Coastal:

```js
new GeoTIFFSource({
  sources: [{ url, bands: [7, 3, 1] }],
});
```

### Setting an explicit projection

If the COG is in a non-standard projection that OpenLayers does not know about,
register it ahead of time with `proj4` and pass the resulting `Projection`:

```js
import { makeProjectionFromEpsgCode } from '@maxar/transform-ol';

const projection = await makeProjectionFromEpsgCode(32613); // UTM zone 13N

const source = new GeoTIFFSource({
  sources: [{ url }],
  projection,
});
```

If no projection is provided and none can be derived from the GeoKeys,
`GeoTIFFSource` falls back to a pixel-space projection sized to the image.

### Multiple sources

`sources` accepts more than one COG. Their resolution sets must agree (after
applying a per-source resolution scale). Output bands are the concatenation of
each source's selected bands, optionally followed by an alpha band when any
source declares a `nodata` value:

```js
new GeoTIFFSource({
  sources: [
    { url: rgbUrl },                      // 3 bands
    { url: panUrl, bands: [1] },          // 1 band
  ],
});
```

## Using the Transform API helpers

For Maxar Transform API URLs, the library exposes helpers that wrap the
metadata and HEAD endpoints and produce ready-to-use OpenLayers layers.

### Fetching metadata

```js
import { getMetadata, getHeadInfo } from '@maxar/transform-ol';

const unified = await getMetadata(geotiffUrl, accessToken);
const head    = await getHeadInfo(geotiffUrl, accessToken);
```

`getMetadata` rewrites `geotiff` to `metadata` in the URL and parses the
response into a `UnifiedMetadata`. `getHeadInfo` issues a `HEAD` request and
returns `{ headerSize, tileSize, fileSize }` derived from the
`x-tiff-header-length`, `x-tiff-nominal-tile-byte-count`, and `content-length`
response headers.

### Building XYZ / grid layers from `UnifiedMetadata`

```js
import {
  xyLayerFromUnifiedMetadata,
  gridLayerFromUnifiedMetadata,
  makeProjectionFromEpsgCode,
} from '@maxar/transform-ol';

const projection = await makeProjectionFromEpsgCode(srsCode);

const tileLayer = xyLayerFromUnifiedMetadata(
  unified, projection, xyzUrlTemplate, accessToken, 'My Image', 1.0,
);

const gridLayer = gridLayerFromUnifiedMetadata(unified, projection, 'Grid');

map.addLayer(tileLayer);
map.addLayer(gridLayer);
```

`xyLayerFromUnifiedMetadata` expects an XYZ-style URL template with `{x}` and
`{y}` placeholders; the layer's loader appends an
`Authorization: Bearer <accessToken>` header to every tile request.

## API reference (selected)

### `GeoTIFFSource` options

| Option          | Type                  | Notes                                                                             |
|-----------------|-----------------------|-----------------------------------------------------------------------------------|
| `sources`       | `SourceInfo[]`        | Required. List of COG sources to combine.                                         |
| `sourceOptions` | `object`              | Optional. `{ headers, headerSize, tileSize }` forwarded to the HTTP source.       |
| `projection`    | `ProjectionLike`      | Optional. Source projection; otherwise derived from GeoKeys.                      |
| `normalize`     | `boolean`             | Default `true`. Scale values to `0–255` for rendering.                            |
| `opaque`        | `boolean`             | Whether the layer is opaque.                                                      |
| `transition`    | `number`              | Opacity transition duration in ms.                                                |
| `wrapX`         | `boolean`             | Render tiles beyond the tile-grid extent.                                         |
| `interpolate`   | `boolean`             | Default `true`. Linear vs. nearest-neighbor resampling.                           |
| `attributions`  | `AttributionLike`     | Standard OpenLayers attribution.                                                  |

### `SourceInfo`

| Property    | Type        | Notes                                                                                |
|-------------|-------------|--------------------------------------------------------------------------------------|
| `url`       | `string`    | URL of the COG. Mutually exclusive with `blob`.                                      |
| `blob`      | `Blob`      | Reserved; not yet implemented.                                                       |
| `overviews` | `string[]`  | Reserved; not yet implemented.                                                       |
| `min`       | `number`    | Minimum value used when normalizing.                                                 |
| `max`       | `number`    | Maximum value used when normalizing.                                                 |
| `nodata`    | `number`    | Override metadata nodata; forces an extra alpha band.                                |
| `bands`     | `number[]`  | 1-based band selection.                                                              |

### Other exports

- `getMetadata(url, token?)`, `getHeadInfo(url, token?)` — Transform API helpers.
- `calculateExtents`, `calculateImagePixelExtents`, `toTileRange`,
  `estimateDefaultMinMax`, `determineBands`, `determineSizeOfABlock` —
  metadata-derived computations.
- `makeProjectionFromEpsgCode`, `makePixelSpaceProjection` — projection setup.
- `xForm`, `transformExtents`, `getSrsInfo` — affine + SRS utilities.
- `makeXYTileGrid`, `makeXYTileImage`, `makeXYTileLayer`, `makeXYGridLayer`
  — XYZ-tile and debug-grid factories.
- `gridLayerFromUnifiedMetadata`, `xyLayerFromUnifiedMetadata` — high-level
  layer builders driven by `UnifiedMetadata`.

## Debugging tips

- Listen for source errors via the standard OpenLayers `change` event:

  ```js
  source.on('change', () => {
    if (source.getState() === 'error') {
      console.error(source.getError());
    }
  });
  ```

- Add `gridLayerFromUnifiedMetadata(...)` (or a layer built from the `Grid`
  source directly) on top of imagery to visualize the tile grid and the
  extent reported by metadata.
- If tiles never load, confirm the COG URL responds to range requests
  (`Range: bytes=...`) and includes CORS headers. The source uses
  `@chunkd/source-http`, which relies on `fetch` range requests.
- If the map opens with no view, ensure you passed `source.getView()` (a
  `Promise<ViewOptions>`) to the `Map`. The view resolves only after the
  source reads the COG header.
