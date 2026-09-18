// Inward-facing civic frontage. Houses and the surrounding street grid stay put.
export const SQUARE_FRONTAGES: Record<
  string,
  { x: number; z: number; rotation: number }
> = {
  school: { x: -15, z: -13, rotation: 0 },
  townhall: { x: -5, z: -13, rotation: 0 },
  library: { x: 6, z: -13, rotation: 0 },
  cafe: { x: -17, z: -4, rotation: 90 },
  general: { x: -17, z: 5, rotation: 90 },
  clothing: { x: 17, z: -4, rotation: 270 },
  gardenclub: { x: 17, z: 5, rotation: 270 },
  post: { x: -15, z: 15, rotation: 180 },
};
export const SQUARE_LOTS = [
  {
    id: 'square-north',
    name: 'North Square Lot',
    territory: 'square',
    x: 15,
    z: -13,
    width: 8,
    depth: 6,
    rotation: 0,
  },
  {
    id: 'square-southwest',
    name: 'Southwest Square Lot',
    territory: 'square',
    x: -5,
    z: 15,
    width: 8,
    depth: 6,
    rotation: 180,
  },
  {
    id: 'square-southeast',
    name: 'Southeast Square Lot',
    territory: 'square',
    x: 5,
    z: 15,
    width: 8,
    depth: 6,
    rotation: 180,
  },
  {
    id: 'square-southeast-corner',
    name: 'Southeast Corner Lot',
    territory: 'square',
    x: 15,
    z: 15,
    width: 8,
    depth: 6,
    rotation: 180,
  },
];
export const squareLot = (id: unknown) =>
  SQUARE_LOTS.find((lot) => lot.id === id);
export const hasCommunitySquare = (s: { squareVersion?: number }) =>
  s.squareVersion === 1;
