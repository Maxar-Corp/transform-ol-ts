import TileGrid from 'ol/tilegrid/TileGrid.js';
import TileImage from "ol/source/TileImage.js";
import Projection from "ol/proj/Projection.js";
import {Extent} from 'ol/extent.js'
import {TileRange} from "../../types.js";
import {ImageTile} from "ol";
import TileLayer from "ol/layer/WebGLTile.js";
import Grid from "../source/Grid.js";

export interface TileSize {width: number, height: number}

export function makeXYTileGrid (extent: Extent, resolutions: number[], tileSize: TileSize) : TileGrid {
       if(resolutions.length !== 1) throw new Error("XYTileGrid:constructor resolutions should be in form [gsd]");
       return  new TileGrid({
            extent: extent,
            origin: [extent[0], extent[3]],
            resolutions: resolutions,
            tileSize: tileSize.width,
        });
}



export function makeXYTileImage (projection: Projection, extent: Extent, resolutions: number[], tileRange: TileRange, urlFunc: any, accessToken: string) : TileImage {
    const tileGrid =makeXYTileGrid(extent, resolutions,{width: tileRange.tileSizeX, height: tileRange.tileSizeY});
    return new TileImage({
        crossOrigin: null,
        projection: projection,
        tileGrid: tileGrid,

        tileUrlFunction: function (coordinate) {
            return urlFunc(coordinate[1], coordinate[2], tileRange);
        }
        ,tileLoadFunction: function(tile, src) {
            const _tile = tile as ImageTile;
            const image = _tile.getImage() as HTMLImageElement;
            const headers = new Headers();
            headers.append('Authorization', `Bearer ${accessToken}`);
            //headers.append('Content-Type', 'image/png');
            headers.append('Accept', 'image/png');

            const request = new Request(src);
            fetch(request, {
                headers: headers,
                mode: 'cors',
                cache: 'default',
                method: 'GET'
            }).then(function(response) {
                return response.blob();
            }).then(function(blob) {
                image.src = URL.createObjectURL(blob);
            });
        }
    })
}


export function makeXYTileLayer (title: string, projection: Projection, extent: Extent, resolutions: number[], tileRange: TileRange, urlFunc: any, accessToken: string, opacity = 1.0) : TileLayer {
    const source = makeXYTileImage(projection, extent, resolutions, tileRange, urlFunc, accessToken);
    const layer = new TileLayer({
        opacity: opacity,
        extent: extent,
        source: source
    });
    layer.set('title', title);
    return layer;
}

export function makeXYGridLayer(title: string, projection: Projection, extent: Extent, tileGrid: TileGrid, tileRange: TileRange) : TileLayer {
    const layer = new TileLayer({
        visible: false,
        extent: extent,
        source: new Grid({
            projection: projection,
            extent: extent,
            tileGrid: tileGrid,
            tileRange: tileRange
        })
    });
    layer.set('title', title);
    return layer;
}