import Projection from "ol/proj/Projection.js";
import {get as getProjection} from 'ol/proj.js';
import proj4 from "proj4";
import {register} from "ol/proj/proj4.js";
import {Extent} from 'ol/extent.js'
/**
 * 
 * @param {number} code 
 * @returns 
 */
export async function makeProjectionFromEpsgCode(code: number) : Promise<Projection> {
    const epsgio_url = `https://epsg.io/?format=json&q=${code}`;
    const repsonse = await fetch(epsgio_url, {
        mode: 'cors',
        cache: 'default'
    });
    if(!repsonse.ok)
    {
        throw {"projection error": `url=${epsgio_url} failed. code=${repsonse.status}.`};
    }
    const json = await repsonse.json();
    const results = json['results'];
    if (results.length < 1) throw {"projection error": `code=${code} not found`};
    const result = results[0];
    const proj4def = result['proj4'];
    const extent = result['bbox']; // AREA_NORTH_BOUND_LAT, AREA_WEST_BOUND_LON, AREA_SOUTH_BOUND_LAT, AREA_EAST_BOUND_LON
    let minx = extent[1];
    let maxx = extent[3];
    let miny = extent[2];
    let maxy = extent[0];

    const p1 = proj4(proj4def,[minx, miny]);
    const p2 = proj4(proj4def,[maxx, miny]);
    const p3 = proj4(proj4def,[maxx, maxy]);
    const p4 = proj4(proj4def,[minx, maxy]);

    minx = Math.min(p1[0], p2[0], p3[0], p4[0]);
    maxx = Math.max(p1[0], p2[0], p3[0], p4[0]);
    miny = Math.min(p1[1], p2[1], p3[1], p4[1]);
    maxy = Math.max(p1[1], p2[1], p3[1], p4[1]);

    const newProjCode = `EPSG:${code}`;
    proj4.defs(newProjCode, proj4def);
    register(proj4);

    const projection = getProjection(newProjCode);
    if(typeof projection === 'undefined' || projection === null) throw new Error(`Unable to create ol/projection for code=${code}`);
    projection.setExtent([minx, miny, maxx, maxy]);
    return projection;
   
}

/**
 * Make a custom image space projection
 * @param {number[]} extent Image pixel extents
 */
export function makePixelSpaceProjection(extent: Extent) : Projection
{
    const projection = new Projection({
        code: 'xkcd-image',
        units: 'pixels',
        extent: extent
    });
    return projection;
}