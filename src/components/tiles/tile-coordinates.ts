export interface TileCoordinates {
  column: number;
  row: number;
}

export function formatTileCoordinates(coordinates: TileCoordinates) {
  return `[${coordinates.row}, ${coordinates.column}]`;
}
