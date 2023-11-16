import {UnifiedMetadata, UnifiedMetadataFromJSON} from "@maxar/transform-api";


export interface HeadInfo {
    headerSize: number,
    tileSize: number,
    fileSize: number
}
/**
   *
   * @param {string} url
   * @param {string} token
   * returns {object}
   */
export async function getHeadInfo(url: string, token?: string) : Promise<HeadInfo>
{

    let headers = {};
    if(!(typeof token === 'undefined' || token === null))
    {
        headers = {'Authorization': `Bearer ${token}`};
    }

    const response = await fetch(url, { method: 'HEAD', headers});
    if(!response.ok) throw new Error(`status=${response.status}, text=${response.statusText} `)
    try{
      const filesizeVal = response.headers.get('content-length');
      if(filesizeVal === null) throw Error("Where you getting this... transform-api always includes content-length");
      const fileSize = +filesizeVal;
      
      const headerVal = response.headers.get('x-tiff-header-length');
      if(headerVal === null) throw Error("Where you getting this... transform-api always includes x-tiff-header-length");
      const headerSize = +headerVal;

      const tileVal = response.headers.get('x-tiff-nominal-tile-byte-count');
      if(tileVal === null) throw Error("Where you getting this... transform-api always includes x-tiff-nominal-tile-byte-count");
      const tileByteCount = +tileVal;

      return {headerSize: headerSize,
              tileSize: tileByteCount,
              fileSize: fileSize}

    }
    catch(e)
    {
      throw new Error(`Error fetching HEAD url=${url}, error=${e}`);
    }

}

  /**
   * 
   * @param {string} url
   * @param {string} token
   * returns {UnifiedMetadata} metadata
   */
 export async function getMetadata(url: string, token?: string) : Promise<UnifiedMetadata>
  {
    const api_url = url.replace('geotiff', 'metadata');
    try{
        let headers = {};
        if(!(typeof token === 'undefined' || token === null))
        {
            headers = {'Authorization': `Bearer ${token}`};
        }
        const response = await fetch(api_url, { method: 'GET', headers });
        const json = await response.json();
        if(!response.ok)
        {       
            throw new Error(JSON.stringify(json));
        }
        return UnifiedMetadataFromJSON(json)
    }
    catch(e)
    {
        throw new Error(`Error fetching metadata url=${url}, error=${e}`);
    }
 
  }
