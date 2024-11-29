import ImageTile from 'ol/source/ImageTile.js';
import {createCanvasContext2D} from 'ol/dom.js';


/**
 * @classdesc
 * A pseudo tile source, which does not fetch tiles from a server, but renders
 * a grid outline for the tile grid/projection along with the coordinates for
 * each tile. See examples/canvas-tiles for an example.
 * @api
 */
class Grid extends ImageTile {
  /**
   * @param {Options} [options] Debug tile options.
   */
  constructor(options) {
    /**
     * @type {Options}
     */
    options = options || {};
    
    super({
      transition: 0,
      projection: options.projection,
      tileGrid: options.tileGrid,
      wrapX: options.wrapX !== undefined ? options.wrapX : true,
      zDirection: options.zDirection,
      loader: (z, x, y, loaderOptions) => {
        if(x > this.tileRange.maxTileX+1 || y > this.tileRange.maxTileY+1) return;
        const text = `x:${x} y:${y}`;
        const tileSize = this.getTileSize(z);
        const context = createCanvasContext2D(tileSize[0], tileSize[1]);
        context.strokeStyle = 'cyan';
        context.strokeRect(0.5, 0.5, tileSize[0] + 0.5, tileSize[1] + 0.5);
        context.fillStyle = 'grey';
        context.strokeStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = '24px sans-serif';
        context.lineWidth = 4;
        context.strokeText(text, tileSize[0] / 2, tileSize[1] / 2, tileSize[0]);
        context.fillText(text, tileSize[0] / 2, tileSize[1] / 2, tileSize[0]);
        return context.canvas;
      },
    })
    this.tileRange =  options.tileRange;
    this.extent = options.extent;
    ;
  }
}

export default Grid;