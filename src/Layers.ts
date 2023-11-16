import {UnifiedMetadata} from "@maxar/transform-api";
import TileLayer from "ol/layer/WebGLTile.js";
import {calculateExtents, toTileRange} from "./Metadata.js";
import {makeXYGridLayer, makeXYTileGrid, makeXYTileLayer} from "./ol/helpers/XYHelpers.js";
import Projection from "ol/proj/Projection.js";
import {Extent} from "ol/extent.js";
import {TileRange} from "./types.js";

/**
 *
 * @param unifiedMetadata
 * @param projection
 * @param title
 */
export function gridLayerFromUnifiedMetadata(unifiedMetadata: UnifiedMetadata, projection: Projection, title: string = 'Grid')  {
    const extent = calculateExtents(unifiedMetadata.imageMetadata, unifiedMetadata.spatialTransform);
    const tileRange = toTileRange(unifiedMetadata.imageMetadata);
    let resolutions: number[];
    if(!unifiedMetadata.spatialTransform || unifiedMetadata.spatialTransform.spatialReferenceSystemType.toUpperCase() === 'IDEAL') resolutions = [1];
    else resolutions = [unifiedMetadata.spatialTransform.affine.scaleX];
    const tileGrid = makeXYTileGrid(extent, resolutions, {width: unifiedMetadata.imageMetadata.tileSizeX, height: unifiedMetadata.imageMetadata.tileSizeY});
    const tileLayer = makeXYGridLayer(title, projection,extent, tileGrid, tileRange);
    tileLayer.setMaxResolution(4*resolutions[0]);
    return tileLayer;
}

/**
 *
 * @param unifiedMetadata
 * @param projection
 * @param url
 * @param accessToken
 * @param title
 * @param opacity
 */
export function xyLayerFromUnifiedMetadata(unifiedMetadata: UnifiedMetadata, projection: Projection, url: string, accessToken: string, title: string, opacity: number = 1.0)  {
    const extent = calculateExtents(unifiedMetadata.imageMetadata, unifiedMetadata.spatialTransform);
    const tileRange = toTileRange(unifiedMetadata.imageMetadata);
    let resolutions: number[];
    if(!unifiedMetadata.spatialTransform || unifiedMetadata.spatialTransform.spatialReferenceSystemType.toUpperCase() === 'IDEAL') resolutions = [1];
    else resolutions = [unifiedMetadata.spatialTransform.affine.scaleX];
    const tileGrid = makeXYTileGrid(extent, resolutions, {width: unifiedMetadata.imageMetadata.tileSizeX, height: unifiedMetadata.imageMetadata.tileSizeY});
    const urlFunc = (x, y, tileRange)=>{
        if (x < tileRange.minTileX || x > tileRange.maxTileX) return undefined;
        if (y < tileRange.minTileY || y > tileRange.maxTileY) return undefined;
        let completeUrl = `${url.replace('{x}', x).replace('{y}', y)}`;
        return `${completeUrl}`;

    }
    const tileLayer = makeXYTileLayer(title, projection, extent, resolutions, tileRange, urlFunc, accessToken, opacity);
    return tileLayer;
}