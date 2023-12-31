/**
 * @module ol/source/TileDebug
 */

import Tile from 'ol/Tile.js';
import TileState from 'ol/TileState.js';
import {createCanvasContext2D} from 'ol/dom.js';
import {toSize} from 'ol/size.js';
import XYZ from 'ol/source/XYZ.js';
import {getKeyZXY} from 'ol/tilecoord.js';


export function  olGridCoordinateToRdaGridXY(coordinate, tileRange )
{
    if (coordinate === null) return undefined;
    const x = coordinate[1] + tileRange.minTileX;
    const y = coordinate[2] + tileRange.minTileY;
    return [x,y];
}

class LabeledTile extends Tile {
    private tileSize_: any;
    private text_: any;
    private canvas_?: HTMLCanvasElement;
    /**
     * @param {import("../tilecoord.js").TileCoord} tileCoord Tile coordinate.
     * @param {import("../size.js").Size} tileSize Tile size.
     * @param {string} text Text.
     */
    constructor(tileCoord, tileSize, text) {

        super(tileCoord, TileState.LOADED);

        /**
         * @private
         * @type {import("../size.js").Size}
         */
        this.tileSize_ = tileSize;

        /**
         * @private
         * @type {string}
         */
        this.text_ = text;

    }

    /**
     * Get the image element for this tile.
     * @return {HTMLCanvasElement} Image.
     */
    getData() {
        if (this.canvas_) {
            return this.canvas_;
        } else {
            const tileSize = this.tileSize_;
            const context = createCanvasContext2D(tileSize[0], tileSize[1]);

            context.strokeStyle = 'cyan';
            context.strokeRect(0.5, 0.5, tileSize[0] + 0.5, tileSize[1] + 0.5);

            context.fillStyle = 'grey';
            context.strokeStyle = 'white';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.font = '24px sans-serif';
            context.lineWidth = 4;
            context.strokeText(this.text_, tileSize[0] / 2, tileSize[1] / 2, tileSize[0]);
            context.fillText(this.text_, tileSize[0] / 2, tileSize[1] / 2, tileSize[0]);

            this.canvas_ = context.canvas;
            return context.canvas;
        }
    }

    /**
     * @override
     */
    override load() {}
}



/**
 * @classdesc
 * A pseudo tile source, which does not fetch tiles from a server, but renders
 * a grid outline for the tile grid/projection along with the coordinates for
 * each tile. See examples/canvas-tiles for an example.
 *
 * Uses Canvas context2d, so requires Canvas support.
 * @api
 */
export class Grid extends XYZ {
    private tileRange: any;
    /**
     * @param {Options=} opt_options Debug tile options.
     */
    constructor(opt_options) {
        /**
         * @type {Options}
         */
        const options = opt_options || {};

        super({
            opaque: false,
            projection: options.projection,
            tileGrid: options.tileGrid,
            wrapX: options.wrapX !== undefined ? options.wrapX : true,
            zDirection: options.zDirection
        });

        this.tileRange = options.tileRange;

    }

    /**
     * @inheritDoc
     */
    override getTile(z, x, y) {
        const tileCoordKey = getKeyZXY(z, x, y);
        if (this.tileCache.containsKey(tileCoordKey)) {
            return /** @type {!LabeledTile} */ (this.tileCache.get(tileCoordKey));
        } else {
            const tileSize = toSize(this.tileGrid!.getTileSize(z));
            const tileCoord = [z, x, y];
            const textTileCoord = this.getTileCoordForTileUrlFunction(tileCoord);


            let text;
            if (textTileCoord) {
                const labelCoords = olGridCoordinateToRdaGridXY(textTileCoord, this.tileRange )!;
                if(labelCoords[0] > this.tileRange.maxTileX || labelCoords[1] > this.tileRange.maxTileY)
                    text = '';
                else
                    text = ' x:' + labelCoords[0] + ' y:' + labelCoords[1];
            } else {
                text = '';
            }
            const tile = new LabeledTile(tileCoord, tileSize, text);
            this.tileCache.set(tileCoordKey, tile);
            return tile;
        }
    }
}
export default Grid;
