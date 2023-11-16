import {ImageMetadata, SpatialTransform, UnifiedMetadata} from "@maxar/transform-api";
import {transformExtents} from "./Spatial.js";
import {SourceMetadata} from "@maxar/transform-api";
import {Extent} from 'ol/extent.js'
import {Range, TileRange} from "./types.js";

/**
 * 
 * @param {ImageMetadata} imageMetadata
 * @returns {Extent} [minX, minY, maxX, maxY]
 */
export function calculateImagePixelExtents(imageMetadata: ImageMetadata) : Extent
{
    let minX = imageMetadata.minPixelX;
    let minY = imageMetadata.minPixelY;
    let maxX = imageMetadata.maxPixelX;
    let maxY = imageMetadata.maxPixelY;

    return [minX, minY, maxX, maxY];
}


/**
 * Calculatest the most suitable extents based on whether the image is in some sort of projected map space
 * or image map space
 * @param imageMetadata
 * @param transform
 */
export function calculateExtents(imageMetadata: ImageMetadata, transform: SpatialTransform) : Extent
{
    let minX = imageMetadata.minPixelX;//imageMetadata.minTileX * imageMetadata.tileSizeX;
    let minY = imageMetadata.minPixelY;//imageMetadata.minTileY * imageMetadata.tileSizeY;
    let maxX = imageMetadata.maxPixelX;//(imageMetadata.maxTileX + 1) * imageMetadata.tileSizeX;
    let maxY = imageMetadata.maxPixelY;//(imageMetadata.maxTileY + 1) * imageMetadata.tileSizeY;

    let retval = [minX, minY, maxX, maxY];

    //this is a standard pixel space extent
    if(transform && transform.spatialReferenceSystemType.toUpperCase() !== 'IDEAL')
    {
        retval = transformExtents(transform, retval, [imageMetadata.tileOffsetX, imageMetadata.tileOffsetY])
    }

    return retval;

}


/**
 * 
 * @param {ImageMetadata} imageMetadata
 * @param {SourceMetadata} sourceMetadata
 * @returns {number[]} [min,max] for pixel values
 */
export function estimateDefaultMinMax(imageMetadata: ImageMetadata, sourceMetadata: SourceMetadata) : Range
{
    if (imageMetadata.dataType === "UNSIGNED_SHORT" && (sourceMetadata.vehicleName === "WV03" || sourceMetadata.vehicleName === "WV02"))
    {
        return {min: 100.0, max: 847.0}
    }
    else if (imageMetadata.dataType === "UNSIGNED_SHORT") {
        return {min: 100.0, max: 2047.0}
    }
    else if (imageMetadata.dataType === "FLOAT" || imageMetadata.dataType === "DOUBLE") {
        return {min: 0.0, max: 1.0}
    }
    return {min: 0.0, max: 255.0}
}


/**
 * 
 * @param {ImageMetadata} imageMetadata
 * @returns {number[]} bands array
 */
export function determineBands(imageMetadata: ImageMetadata) : number[]
{
    let bandsArray : number[] = [];
    if (imageMetadata.numBands === 1 || imageMetadata.numBands === 3) return bandsArray;


    if (imageMetadata.numBands === 8) {
        bandsArray = [4, 2, 1];
    }
    else if (imageMetadata.numBands > 3) {
        bandsArray = [2, 1, 0];
    }

    return bandsArray;

}

/**
 * 
 * @param {ImageMetadata} imageMetadata
 * @returns 
 */
export function determineSizeOfABlock(imageMetadata: ImageMetadata) : number
{
    let blocksize = imageMetadata.tileSizeX * imageMetadata.tileSizeY * imageMetadata.numBands;

    let dataSize = 1;
    if (imageMetadata.dataType.includes("SHORT"))
    {
        dataSize = 2;
    }
    else if (imageMetadata.dataType === "FLOAT" || imageMetadata.dataType.includes("INTEGER")) {
        dataSize = 4;
    }
    else if (imageMetadata.dataType === "DOUBLE" || imageMetadata.dataType.includes("LONG")) {
        dataSize = 8;
    }
    return blocksize*dataSize;
}


/**
 *
 * @param {ImageMetadata} imageMetadata
 * @returns
 */
export function toTileRange(imageMetadata: ImageMetadata) : TileRange
{
    return {tileSizeX: imageMetadata.tileSizeX, tileSizeY: imageMetadata.tileSizeY,
        minTileX: imageMetadata.minTileX, minTileY: imageMetadata.minTileY, maxTileX: imageMetadata.maxTileX,
        maxTileY: imageMetadata.maxTileY, tileOffsetX: imageMetadata.tileOffsetX, tileOffsetY: imageMetadata.tileOffsetY}
}


