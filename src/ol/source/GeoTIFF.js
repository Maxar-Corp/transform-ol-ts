/**
 * @module ol/source/GeoTIFF
 */
import DataTile from 'ol/source/DataTile.js';
import TileGrid from 'ol/tilegrid/TileGrid.js';

import {get as getCachedProjection, toUserCoordinate, toUserExtent,} from 'ol/proj.js';
import {SourceHttp} from '@chunkd/source-http';
import {SourceView} from '@chunkd/source';
import {CogTiff} from '@maxar/cogeotiff-core';
import {clamp} from 'ol/math.js';
import {getCenter, getIntersection} from 'ol/extent.js';
import {error as logError} from 'ol/console.js';


/**
 * TODO: fixup
 * Determine if an image type is a mask.
 * See https://www.awaresystems.be/imaging/tiff/tifftags/newsubfiletype.html
 * @param {CogTiffImage} image The image.
 * @return {boolean} The image is a mask.
 */
function isMask(image) {
  return false;
}


/**
 * @typedef {Object} SourceInfo
 * @property {string} [url] URL for the source GeoTIFF.
 * @property {Array<string>} [overviews] List of any overview URLs, only applies if the url parameter is given.
 * @property {Blob} [blob] Blob containing the source GeoTIFF. `blob` and `url` are mutually exclusive.
 * @property {number} [min=0] The minimum source data value.  Rendered values are scaled from 0 to 1 based on
 * the configured min and max.  If not provided and raster statistics are available, those will be used instead.
 * If neither are available, the minimum for the data type will be used.  To disable this behavior, set
 * the `normalize` option to `false` in the constructor.
 * @property {number} [max] The maximum source data value.  Rendered values are scaled from 0 to 1 based on
 * the configured min and max.  If not provided and raster statistics are available, those will be used instead.
 * If neither are available, the maximum for the data type will be used.  To disable this behavior, set
 * the `normalize` option to `false` in the constructor.
 * @property {number} [nodata] Values to discard (overriding any nodata values in the metadata).
 * When provided, an additional alpha band will be added to the data.  Often the GeoTIFF metadata
 * will include information about nodata values, so you should only need to set this property if
 * you find that it is not already extracted from the metadata.
 * @property {Array<number>} [bands] Band numbers to be read from (where the first band is `1`). If not provided, all bands will
 * be read. For example, if a GeoTIFF has blue (1), green (2), red (3), and near-infrared (4) bands, and you only need the
 * near-infrared band, configure `bands: [4]`.
 */

/**
 * @typedef {Object} GeoKeys
 * @property {number} GTModelTypeGeoKey Model type.
 * @property {number} GTRasterTypeGeoKey Raster type.
 * @property {number} GeogAngularUnitsGeoKey Angular units.
 * @property {number} GeogInvFlatteningGeoKey Inverse flattening.
 * @property {number} GeogSemiMajorAxisGeoKey Semi-major axis.
 * @property {number} GeographicTypeGeoKey Geographic coordinate system code.
 * @property {number} ProjLinearUnitsGeoKey Projected linear unit code.
 * @property {number} ProjectedCSTypeGeoKey Projected coordinate system code.
 */

/**
 * @typedef {import("geotiff").GeoTIFF} GeoTIFF
 */

/**
 * @typedef {Object} GDALMetadata
 * @property {string} STATISTICS_MINIMUM The minimum value (as a string).
 * @property {string} STATISTICS_MAXIMUM The maximum value (as a string).
 */

const STATISTICS_MAXIMUM = 'STATISTICS_MAXIMUM';
const STATISTICS_MINIMUM = 'STATISTICS_MINIMUM';

const defaultTileSize = 256;

/**
 * @typedef {import("@maxar/cogeotiff-core").CogTiffImage} CogTiffImage
 */


/**
 * Get the bounding box of an image.  If the image does not have an affine transform,
 * the pixel bounds are returned.
 * @param {CogTiffImage} image The image.
 * @return {Array<number>} The image bounding box.
 */
function getBoundingBox(image) {
  try {
    return image.bbox;
  } catch (_) {
    return [0, 0, image.size.width, image.size.height];
  }
}

/**
 * Get the origin of an image.  If the image does not have an affine transform,
 * the top-left corner of the pixel bounds is returned.
 * @param {CogTiffImage} image The image.
 * @return {Array<number>} The image origin.
 */
function getOrigin(image) {
  try {
    return image.origin.slice(0, 2);
  } catch (_) {
    return [0, image.size.height];
  }
}

/**
 * Get the resolution of an image.  If the image does not have an affine transform,
 * the width of the image is compared with the reference image.
 * @param {CogTiffImage} image The image.
 * @param {CogTiffImage} referenceImage The reference image.
 * @return {Array<number>} The map x and y units per pixel.
 */
function getResolutions(image, referenceImage) {
  try {
    return image.resolution;
  } catch (_) {
    return [
      referenceImage.size.width / image.size.width,
      referenceImage.size.height / image.size.height,
    ];
  }
}

/**
 * @param {CogTiffImage} image A GeoTIFF.
 * @return {import("ol/proj/Projection.js").default|null} The image projection.
 */
function getProjection(image) {
  const epsg = image.epsg;
  if (!epsg) {
    return null;
  }

  const code = 'EPSG:' + epsg;
  let projection = getCachedProjection(code);
  return projection;


}

/**
 * @param {SourceInfo} source The GeoTIFF source.
 * @param {Object} options Options for the GeoTIFF source.
 * @return {Promise<Array<CogTiffImage>>} Resolves to a list of images.
 */
function getImagesForSource(source, options) {
  if (source.blob) {
    throw new Error('Not implemented');
  } else if (source.overviews) {
    throw new Error('Not implemented');
  } else {
    //todo: handle options
    let headers;
    if (Object.prototype.hasOwnProperty.call(options, 'headers')) headers = options['headers'];
    const tiffSource = new SourceView(new SourceHttp(source.url, headers));
    let headerSize;
    if (Object.prototype.hasOwnProperty.call(options, 'headerSize')) headerSize = options['headerSize'];
    let tileSize;
    if (Object.prototype.hasOwnProperty.call(options, 'tileSize')) tileSize = options['tileSize'];
    return CogTiff.createEx(tiffSource, headerSize, tileSize).then((tiff) => tiff.images);
  }

}

/**
 * @param {number|Array<number>|Array<Array<number>>} expected Expected value.
 * @param {number|Array<number>|Array<Array<number>>} got Actual value.
 * @param {number} tolerance Accepted tolerance in fraction of expected between expected and got.
 * @param {string} message The error message.
 * @param {function(Error):void} rejector A function to be called with any error.
 */
function assertEqual(expected, got, tolerance, message, rejector) {
  if (Array.isArray(expected)) {
    const length = expected.length;
    if (!Array.isArray(got) || length != got.length) {
      const error = new Error(message);
      rejector(error);
      throw error;
    }
    for (let i = 0; i < length; ++i) {
      assertEqual(expected[i], got[i], tolerance, message, rejector);
    }
    return;
  }

  got = /** @type {number} */ (got);
  if (Math.abs(expected - got) > tolerance * expected) {
    throw new Error(message);
  }
}

/**
 * @param {Array} array The data array.
 * @return {number} The minimum value.
 */
function getMinForDataType(array) {
  if (array instanceof Int8Array) {
    return -128;
  }
  if (array instanceof Int16Array) {
    return -32768;
  }
  if (array instanceof Int32Array) {
    return -2147483648;
  }
  if (array instanceof Float32Array) {
    return 1.2e-38;
  }
  return 0;
}

/**
 * @param {Array} array The data array.
 * @return {number} The maximum value.
 */
function getMaxForDataType(array) {
  if (array instanceof Int8Array) {
    return 127;
  }
  if (array instanceof Uint8Array) {
    return 255;
  }
  if (array instanceof Uint8ClampedArray) {
    return 255;
  }
  if (array instanceof Int16Array) {
    return 32767;
  }
  if (array instanceof Uint16Array) {
    return 65535;
  }
  if (array instanceof Int32Array) {
    return 2147483647;
  }
  if (array instanceof Uint32Array) {
    return 4294967295;
  }
  if (array instanceof Float32Array) {
    return 3.4e38;
  }
  return 255;
}

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number[]} bands
 * @param {number} xSize
 * @param {number} zSize
 * @returns
 */
function getBIP2DarrayIndex(x, y, bands, xSize, zSize) {
  return bands.map((band) => y * xSize * zSize + x * zSize + band);
}


/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number} band
 * @param {number} xSize
 * @param {number} zSize
 * @returns
 */
function getBIP2DarrayIndexSingle(x, y, band, xSize, zSize) {
  return y * xSize * zSize + x * zSize + band;
}

/**
 *
 * @param {number} sample_format
 * @param {number} bits_per_sample
 * @param {ArrayBuffer} tileData
 * @returns
 */
function arrayBufferToTypedArray(sample_format, bits_per_sample, tileData) {
  let view = null;
  switch (sample_format) {
    case 1:
      if (bits_per_sample === 8)
        view = new Uint8Array(tileData);
      else if (bits_per_sample === 16)
        view = new Uint16Array(tileData);
      else if (bits_per_sample === 32)
        view = new Uint32Array(tileData);
      break;
    case 2:
      if (bits_per_sample === 8)
        view = new Int8Array(tileData);
      else if (bits_per_sample === 16)
        view = new Int16Array(tileData);
      else if (bits_per_sample === 32)
        view = new Int32Array(tileData);
      break;
    case 3:
      if (bits_per_sample === 32)
        view = new Float32Array(tileData);
      if (bits_per_sample === 64)
        view = new Float64Array(tileData);
      break;
    default:
      console.warn("Unknown pixel format type");
      view = new Uint8Array(tileData);
      break;
  }

  return view;
}

const arrayRange = (start = 0, stop = 2, step = 1) =>
    Array.from({ length: (stop - start) / step + 1 }, (value, index) => start + index * step);

const RED = 0;
const GREEN = 1;
const BLUE = 2;
const ALPHA = 3;
const CANVAS_NUM_BANDS = 4;

/**
 *
 * @param {number} gain
 * @param {number} bias
 * @param {number} sourceValue
 * @returns number
 */
function clampValue(gain, bias, sourceValue) {
  let value = clamp(gain * sourceValue + bias, 0, 255);
  return value
}


/**
 * @typedef {Object} Options
 * @property {Array<SourceInfo>} sources List of information about GeoTIFF sources.
 * Multiple sources can be combined when their resolution sets are equal after applying a scale.
 * The list of sources defines a mapping between input bands as they are read from each GeoTIFF and
 * the output bands that are provided by data tiles. To control which bands to read from each GeoTIFF,
 * use the {@link import("./GeoTIFF.js").SourceInfo bands} property. If, for example, you specify two
 * sources, one with 3 bands and {@link import("./GeoTIFF.js").SourceInfo nodata} configured, and
 * another with 1 band, the resulting data tiles will have 5 bands: 3 from the first source, 1 alpha
 * band from the first source, and 1 band from the second source.
 * @property {boolean} [normalize=true] By default, the source data is normalized to values between
 * 0 and 1 with scaling factors based on the raster statistics or `min` and `max` properties of each source.
 * If instead you want to work with the raw values in a style expression, set this to `false`.  Setting this option
 * to `false` will make it so any `min` and `max` properties on sources are ignored.
 * @property {boolean} [opaque=false] Whether the layer is opaque.
 * @property {import("ol/proj.js").ProjectionLike} [projection] Source projection.  If not provided, the GeoTIFF metadata
 * will be read for projection information.
 * @property {number} [transition=250] Duration of the opacity transition for rendering.
 * To disable the opacity transition, pass `transition: 0`.
 * @property {boolean} [wrapX=false] Render tiles beyond the tile grid extent.
 * @property {boolean} [interpolate=true] Use interpolated values when resampling.  By default,
 * the linear interpolation is used to resample the data.  If false, nearest neighbor is used.
 */

/**
 * @classdesc
 * A source for working with GeoTIFF data.
 * **Note for users of the full build**: The `GeoTIFF` source requires the
 * [geotiff.js](https://github.com/geotiffjs/geotiff.js) library to be loaded as well.
 *
 * @api
 */
class GeoTIFFSource extends DataTile {
  /**
   * @param {Options} options Data tile options.
   */
  constructor(options) {
    super({
      state: 'loading',
      tileGrid: null,
      projection: options.projection || null,
      opaque: options.opaque,
      transition: options.transition,
      interpolate: options.interpolate !== false,
      wrapX: options.wrapX,
    });

    /**
     * @type {Array<SourceInfo>}
     * @private
     */
    this.sourceInfo_ = options.sources;

    const numSources = this.sourceInfo_.length;

    /**
     * @type {Object}
     * @private
     */
    this.sourceOptions_ = options.sourceOptions;

    /**
     * @type {Array<Array<CogTiffImage>>}
     * @private
     */
    this.sourceImagery_ = new Array(numSources);

    /**
     * @type {Array<Array<CogTiffImage>>}
     * @private
     */
    this.sourceMasks_ = new Array(numSources);

    /**
     * @type {Array<number>}
     * @private
     */
    this.resolutionFactors_ = new Array(numSources);

    /**
     * @type {Array<number>}
     * @private
     */
    this.samplesPerPixel_;

    /**
     * @type {Array<number>}
     * @private
     */
    this.bitsPerSample_;

    /**
     * @type {Array<number>}
     * @private
     */
    this.sampleFormat_;

    /**
     * @type {Array<Array<number>>}
     * @private
     */
    this.nodataValues_;

    /**
     * @type {Array<Array<GDALMetadata>>}
     * @private
     */
    this.metadata_;


    /**
     * @type {boolean}
     * @private
     */
    this.normalize_ = options.normalize !== false;

    /**
     * @type {boolean}
     * @private
     */
    this.addAlpha_ = true;

    /**
     * @type {Error}
     * @private
     */
    this.error_ = null;


    this.setKey(this.sourceInfo_.map((source) => source.url).join(','));

    const self = this;
    const requests = new Array(numSources);
    for (let i = 0; i < numSources; ++i) {
      requests[i] = getImagesForSource(
          this.sourceInfo_[i],
          this.sourceOptions_
      );
    }
    Promise.all(requests)
        .then(function (sources) {
          self.configure_(sources);
        })
        .catch(function (error) {
          logError(error);
          self.error_ = error;
          self.setState('error');
        });
  }

  /**
   * @return {Error} A source loading error. When the source state is `error`, use this function
   * to get more information about the error. To debug a faulty configuration, you may want to use
   * a listener like
   * ```js
   * GeoTIFFSource.on('change', () => {
   *   if (GeoTIFFSource.getState() === 'error') {
   *     console.error(GeoTIFFSource.getError());
   *   }
   * });
   * ```
   */
  getError() {
    return this.error_;
  }

  /**
   * Determine the projection of the images in this GeoTIFF.
   * The default implementation looks at the ProjectedCSTypeGeoKey and the GeographicTypeGeoKey
   * of each image in turn.
   * You can override this method in a subclass to support more projections.
   *
   * @param {Array<Array<CogTiffImage>>} sources Each source is a list of images
   * from a single GeoTIFF.
   */
  determineProjection(sources) {
    const firstSource = sources[0];
    for (let i = firstSource.length - 1; i >= 0; --i) {
      const image = firstSource[i];
      const projection = getProjection(image);
      if (projection) {
        this.projection = projection;
        break;
      }
    }
  }

  /**
   * Configure the tile grid based on images within the source GeoTIFFs.  Each GeoTIFF
   * must have the same internal tiled structure.
   * @param {Array<Array<CogTiffImage>>} sources Each source is a list of images
   * from a single GeoTIFF.
   * @private
   */
  configure_(sources) {
    let extent;
    let origin;
    let commonRenderTileSizes;
    let commonSourceTileSizes;
    let resolutions;
    const samplesPerPixel = new Array(sources.length);
    const nodataValues = new Array(sources.length);
    const metadata = new Array(sources.length);
    let minZoom = 0;

    const sourceCount = sources.length;
    for (let sourceIndex = 0; sourceIndex < sourceCount; ++sourceIndex) {
      const images = [];
      const masks = [];
      sources[sourceIndex].forEach((item) => {
        if (isMask(item)) {
          masks.push(item);
        } else {
          images.push(item);
        }
      });

      const imageCount = images.length;
      if (masks.length > 0 && masks.length !== imageCount) {
        throw new Error(
            `Expected one mask per image found ${masks.length} masks and ${imageCount} images`
        );
      }

      let sourceExtent;
      let sourceOrigin;
      const sourceTileSizes = new Array(imageCount);
      const renderTileSizes = new Array(imageCount);
      const sourceResolutions = new Array(imageCount);

      this.bitsPerSample_ = new Array(sources.length);
      this.sampleFormat_ = new Array(sources.length);

      nodataValues[sourceIndex] = new Array(imageCount);
      metadata[sourceIndex] = new Array(imageCount);

      for (let imageIndex = 0; imageIndex < imageCount; ++imageIndex) {
        const image = images[imageIndex];
        const nodataValue = image.gdalNoData;
        this.bitsPerSample_[imageIndex] = image.bitsPerSample[0];
        this.sampleFormat_[imageIndex] = image.sampleFormat[0];
        metadata[sourceIndex][imageIndex] = null;//image.getGDALMetadata(0);
        nodataValues[sourceIndex][imageIndex] = nodataValue;

        const wantedSamples = this.sourceInfo_[sourceIndex].bands;
        samplesPerPixel[sourceIndex] = wantedSamples
            ? wantedSamples.length
            : image.samplesPerPixel;
        const level = imageCount - (imageIndex + 1);

        if (!sourceExtent) {
          sourceExtent = getBoundingBox(image);
        }

        if (!sourceOrigin) {
          sourceOrigin = getOrigin(image);
        }

        const imageResolutions = getResolutions(image, images[0]);
        sourceResolutions[level] = imageResolutions[0];

        const sourceTileSize = [image.tileSize.width, image.tileSize.height];

        // request larger blocks for untiled layouts
        if (
            sourceTileSize[0] !== sourceTileSize[1] &&
            sourceTileSize[1] < defaultTileSize
        ) {
          sourceTileSize[0] = defaultTileSize;
          sourceTileSize[1] = defaultTileSize;
        }

        sourceTileSizes[level] = sourceTileSize;

        const aspectRatio = imageResolutions[0] / Math.abs(imageResolutions[1]);
        renderTileSizes[level] = [
          sourceTileSize[0],
          sourceTileSize[1] / aspectRatio,
        ];
      }

      if (!extent) {
        extent = sourceExtent;
      } else {
        getIntersection(extent, sourceExtent, extent);
      }

      if (!origin) {
        origin = sourceOrigin;
      } else {
        const message = `Origin mismatch for source ${sourceIndex}, got [${sourceOrigin}] but expected [${origin}]`;
        assertEqual(origin, sourceOrigin, 0, message, this.viewRejector);
      }

      if (!resolutions) {
        resolutions = sourceResolutions;
        this.resolutionFactors_[sourceIndex] = 1;
      } else {
        if (resolutions.length - minZoom > sourceResolutions.length) {
          minZoom = resolutions.length - sourceResolutions.length;
        }
        const resolutionFactor =
            resolutions[resolutions.length - 1] /
            sourceResolutions[sourceResolutions.length - 1];
        this.resolutionFactors_[sourceIndex] = resolutionFactor;
        const scaledSourceResolutions = sourceResolutions.map(
            (resolution) => (resolution *= resolutionFactor)
        );
        const message = `Resolution mismatch for source ${sourceIndex}, got [${scaledSourceResolutions}] but expected [${resolutions}]`;
        assertEqual(
            resolutions.slice(minZoom, resolutions.length),
            scaledSourceResolutions,
            0.02,
            message,
            this.viewRejector
        );
      }

      if (!commonRenderTileSizes) {
        commonRenderTileSizes = renderTileSizes;
      } else {
        assertEqual(
            commonRenderTileSizes.slice(minZoom, commonRenderTileSizes.length),
            renderTileSizes,
            0.01,
            `Tile size mismatch for source ${sourceIndex}`,
            this.viewRejector
        );
      }

      if (!commonSourceTileSizes) {
        commonSourceTileSizes = sourceTileSizes;
      } else {
        assertEqual(
            commonSourceTileSizes.slice(minZoom, commonSourceTileSizes.length),
            sourceTileSizes,
            0,
            `Tile size mismatch for source ${sourceIndex}`,
            this.viewRejector
        );
      }

      this.sourceImagery_[sourceIndex] = images.reverse();
      this.sourceMasks_[sourceIndex] = masks.reverse();
    }

    for (let i = 0, ii = this.sourceImagery_.length; i < ii; ++i) {
      const sourceImagery = this.sourceImagery_[i];
      while (sourceImagery.length < resolutions.length) {
        sourceImagery.unshift(undefined);
      }
    }

    if (!this.getProjection()) {
      this.determineProjection(sources);
    }


    this.samplesPerPixel_ = samplesPerPixel;
    this.nodataValues_ = nodataValues;
    this.metadata_ = metadata;

    // decide if we need to add an alpha band to handle nodata
    outer: for (let sourceIndex = 0; sourceIndex < sourceCount; ++sourceIndex) {
      // option 1: source is configured with a nodata value
      if (this.sourceInfo_[sourceIndex].nodata !== undefined) {
        this.addAlpha_ = true;
        break;
      }
      if (this.sourceMasks_[sourceIndex].length) {
        this.addAlpha_ = true;
        break;
      }

      const values = nodataValues[sourceIndex];

      // option 2: check image metadata for limited bands
      const bands = this.sourceInfo_[sourceIndex].bands;
      if (bands) {
        for (let i = 0; i < bands.length; ++i) {
          if (values[bands[i] - 1] !== null) {
            this.addAlpha_ = true;
            break outer;
          }
        }
        continue;
      }

      // option 3: check image metadata for all bands
      for (let imageIndex = 0; imageIndex < values.length; ++imageIndex) {
        if (values[imageIndex] !== null) {
          this.addAlpha_ = true;
          break outer;
        }
      }
    }

    let bandCount = this.addAlpha_ ? 1 : 0;
    for (let sourceIndex = 0; sourceIndex < sourceCount; ++sourceIndex) {
      bandCount += samplesPerPixel[sourceIndex];
    }
    this.bandCount = bandCount;

    this.tileGrid = new TileGrid({
      extent: extent,
      minZoom: minZoom,
      origin: origin,
      resolutions: resolutions,
      tileSizes: commonRenderTileSizes,
    });
    this.setTileSizes(commonSourceTileSizes);

    this.setLoader(this.loadTile_.bind(this));
    this.setState('ready');

    const zoom = 1;
    if (resolutions.length === 2) {
      resolutions = [resolutions[0], resolutions[1], resolutions[1] / 2];
    } else if (resolutions.length === 1) {
      resolutions = [resolutions[0] * 2, resolutions[0], resolutions[0] / 2];
    }

    this.viewResolver({
      showFullExtent: true,
      projection: this.projection,
      resolutions: resolutions,
      center: toUserCoordinate(getCenter(extent), this.projection),
      extent: toUserExtent(extent, this.projection),
      zoom: zoom,
    });
  }

  /**
   * @param {number} z The z tile index.
   * @param {number} x The x tile index.
   * @param {number} y The y tile index.
   * @return {Promise} The composed tile data.
   * @private
   */
  loadTile_(z, x, y) {
    const sourceTileSize = this.getTileSize(z);
    const sourceCount = this.sourceImagery_.length;
    const requests = new Array(sourceCount * 2);
    for (let sourceIndex = 0; sourceIndex < sourceCount; ++sourceIndex) {
      const image = this.sourceImagery_[sourceIndex][z];
      requests[sourceIndex] = image.getTile(x, y);
      // requests after `sourceCount` are for mask data (if any)
      const maskIndex = sourceCount + sourceIndex;
      const mask = this.sourceMasks_[sourceIndex][z];
      if (!mask) {
        requests[maskIndex] = Promise.resolve(null);
        continue;
      }

    }

    return Promise.all(requests)
        .then(this.composeTile_.bind(this, sourceTileSize))
        .catch(function (error) {
          logError(error);
          throw error;
        });
  }



  /**
   * @param {import("../size.js").Size} sourceTileSize The source tile size.
   * @param {Array} sourceSamples The source samples.
   * @return {import("../DataTile.js").Data} The composed tile data.
   * @private
   */
  composeTile_(sourceTileSize, sourceSamples) {
    const metadata = this.metadata_;
    const sourceInfo = this.sourceInfo_;
    const sourceCount = this.sourceImagery_.length;
    const bandCount = this.bandCount;
    const samplesPerPixel = this.samplesPerPixel_;
    const normalize = this.normalize_;
    const addAlpha = this.addAlpha_;

    const pixelCount = sourceTileSize[0] * sourceTileSize[1];
    const dataLength = pixelCount * bandCount;



    /** @type {Uint8Array|Float32Array} */
    let data;
    if (normalize) {
      data = new Uint8Array(dataLength);
    } else {
      data = new Float32Array(dataLength);
    }

    for (let sourceIndex = 0; sourceIndex < sourceCount; ++sourceIndex) {
      let view = arrayBufferToTypedArray(this.sampleFormat_[sourceIndex], this.bitsPerSample_[sourceIndex], sourceSamples[sourceIndex].bytes);
      const source = sourceInfo[sourceIndex];

      for (let y = 0; y < sourceTileSize[1]; ++y) {
        for (let x = 0; x < sourceTileSize[0]; ++x) {

          let min = source.min;
          let max = source.max;
          let gain, bias;
          if (normalize) {
            const stats = metadata[sourceIndex][0];
            if (min === undefined) {
              if (stats && STATISTICS_MINIMUM in stats) {
                min = parseFloat(stats[STATISTICS_MINIMUM]);
              } else {
                min = getMinForDataType(view);
              }
            }
            if (max === undefined) {
              if (stats && STATISTICS_MAXIMUM in stats) {
                max = parseFloat(stats[STATISTICS_MAXIMUM]);
              } else {
                max = getMaxForDataType(view);
              }
            }
            gain = 255 / (max - min);
            bias = -min * gain;
          }

          const sidx = getBIP2DarrayIndex(x, y, arrayRange(0, samplesPerPixel[sourceIndex] - 1), sourceTileSize[0], samplesPerPixel[sourceIndex]);
          const didx = getBIP2DarrayIndex(x, y, arrayRange(0, bandCount - 1), 256, bandCount);

          switch (sidx.length) {
            case 1: // a greyscale image
            {
              const pixVal = clampValue(gain, bias, view[sidx[0]]);
              data[didx[0]] = pixVal;
              if(addAlpha)
              {
                pixVal === clampValue(gain, bias, 0) ? data[didx[1]] = 0 : data[didx[1]] = 255;
              }
            }
              break;
            default: // an RGB image
            {
              const r = normalize ? clampValue(gain, bias, view[sidx[0]]) : view[sidx[0]];
              const g = normalize ? clampValue(gain, bias, view[sidx[1]]) : view[sidx[1]];
              const b = normalize ? clampValue(gain, bias, view[sidx[2]]) : view[sidx[2]];
              const transparent = normalize ? clampValue(gain, bias, 0) : 0;
              data[didx[0]] = r;
              data[didx[1]] = g;
              data[didx[2]] = b;
              if(addAlpha)
              {
                r === transparent && g === transparent && b === transparent ? data[didx[3]] = 0 : data[didx[3]] = 255;
              }
            }
          }
        }
      }
    }
    //console.log(this);
    return data;
  }
}

/**
 * Get a promise for view properties based on the source.  Use the result of this function
 * as the `view` option in a map constructor.
 *
 *     const source = new GeoTIFF(options);
 *
 *     const map = new Map({
 *       target: 'map',
 *       layers: [
 *         new TileLayer({
 *           source: source,
 *         }),
 *       ],
 *       view: source.getView(),
 *     });
 *
 * @function
 * @return {Promise<import("../View.js").ViewOptions>} A promise for view-related properties.
 * @api
 *
 */
GeoTIFFSource.prototype.getView;

export default GeoTIFFSource;
