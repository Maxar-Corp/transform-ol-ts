import TileGrid from 'ol/tilegrid/TileGrid.js';
import ImageTile from 'ol/source/ImageTile.js';
import Projection from "ol/proj/Projection.js";
import {Extent} from 'ol/extent.js'
import {TileRange} from "../../types.js";

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

var loadError = new Error("Image failed to load");
export function makeXYTileImage (projection: Projection, extent: Extent, resolutions: number[], tileRange: TileRange, urlFunc: any, accessToken: string) : ImageTile {
    const tileGrid =makeXYTileGrid(extent, resolutions,{width: tileRange.tileSizeX, height: tileRange.tileSizeY});
    return new ImageTile({
        projection: projection,
        tileGrid: tileGrid,
        loader: async function (requestZ, requestX, requestY, loaderOptions) {
            const headers = new Headers();
            headers.append('Authorization', `Bearer ${accessToken}`);
            //headers.append('Content-Type', 'image/png');
            headers.append('Accept', 'image/png');

            const request = new Request(urlFunc(requestX, requestY, tileRange, loaderOptions));
            return await fetch(request, {
                headers: headers,
                mode: 'cors',
                cache: 'default',
                method: 'GET'
            }).then(function(response) {
                return response.blob();
            }).then(function(blob) {
                return new Promise((resolve, reject) => {
                    const image = new Image();
                    image.crossOrigin = loaderOptions.crossOrigin ?? null;
                    image.addEventListener("load", () => resolve(image));
                    image.addEventListener("error", () => reject(loadError));
                    image.src = URL.createObjectURL(blob);
                  });
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
    // @ts-ignore
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