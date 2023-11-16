import {SpatialTransform} from "@maxar/transform-api";
import {Point, SrsInfo} from './types.js'
import {Extent} from 'ol/extent.js'
/**
 * 
 * @param {number[]} objpoint  [x,y]
 * @param {SpatialTransform} transform
 * @returns {number[]} [x,y]
 */



export function xForm(objpoint: Point, transform: SpatialTransform) {
    const [x, y] = objpoint;
    const xT: number = transform.affine.translateX + x * transform.affine.scaleX + y * transform.affine.shearX;
    const yT = transform.affine.translateY + objpoint[0] * transform.affine.shearY + objpoint[1] * transform.affine.scaleY;
    return [xT, yT];
}

/**
 *
 * @param transform
 * @param extents
 * @param pixelShift
 */
export function transformExtents(transform: SpatialTransform, extents: number[], pixelShift: Point = [0,0]) : number[]
{
    const xMapShift = pixelShift[0]*transform.affine.scaleX;
    const yMapShift = pixelShift[1]*transform.affine.scaleY;

    const p1 = xForm([extents[0], extents[1]], transform);
    const p2 = xForm([extents[2], extents[3]], transform);

    const retval = new Array(4);        
    retval[0] = Math.min(p1[0], p2[0]) + xMapShift;
    retval[1] = Math.min(p1[1], p2[1]) + yMapShift;
    retval[2] = Math.max(p1[0], p2[0]) + xMapShift;
    retval[3] = Math.max(p1[1], p2[1]) + yMapShift;
    return retval;
    
}


/**
 *
 * @param {SpatialTransform} transform
 * @returns
 */
export function getSrsInfo(transform: SpatialTransform) : SrsInfo
{
    if(transform && transform.spatialReferenceSystemIdentifier)
    {
        let code: number | null = null;
        let authority_: string | undefined | null;
        let code_: string | undefined | null;
        [authority_, code_] = transform.spatialReferenceSystemIdentifier.split(':');
        const authority = typeof authority_ === 'undefined' ? null : authority_;
        try {
            code = Number(code_);
        }
        finally {
            //pass
        }
        return {authority: authority, code: code}
    }

    return {authority: null, code: null}
}
