export type Point = [number, number]
export interface TileRange {tileSizeX: number, tileSizeY: number, minTileX: number, minTileY: number, maxTileX: number, maxTileY: number, tileOffsetX: number, tileOffsetY: number}
export interface Range {min: number, max: number}

export interface SrsInfo {authority: string | null, code: number | null}