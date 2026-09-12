export type Patch = {
  path: (string | number)[];
  value?: any;
  remove?: true;
  splice?: [number, number, ...any[]];
};
const object = (v: any) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
// Array insertions carry just the changed range; equal-length arrays update
// individual fields (not the entire peer list or grass history).
export function diff(
  before: any,
  after: any,
  path: (string | number)[] = [],
): Patch[] {
  if (Object.is(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length === after.length)
      return after.flatMap((v, i) => diff(before[i], v, [...path, i]));
    let start = 0,
      end = 0;
    while (
      start < Math.min(before.length, after.length) &&
      JSON.stringify(before[start]) === JSON.stringify(after[start])
    )
      start++;
    while (
      end < Math.min(before.length, after.length) - start &&
      JSON.stringify(before[before.length - 1 - end]) ===
        JSON.stringify(after[after.length - 1 - end])
    )
      end++;
    return [
      {
        path,
        splice: [
          start,
          before.length - start - end,
          ...after.slice(start, after.length - end),
        ],
      },
    ];
  }
  if (object(before) && object(after))
    return [
      ...Object.keys(before)
        .filter((k) => !Object.hasOwn(after, k))
        .map((k) => ({ path: [...path, k], remove: true as const })),
      ...Object.keys(after).flatMap((k) =>
        diff(before[k], after[k], [...path, k]),
      ),
    ];
  return [{ path, value: after }];
}
export function applyPatch<T>(input: T, patch: Patch[]): T {
  let root: any = input;
  const copy = (v: any) => (Array.isArray(v) ? v.slice() : { ...v });
  for (const op of patch) {
    if (op.path.some((k) => forbidden.has(String(k))))
      throw new Error('Invalid patch path');
    if (!op.path.length) {
      if (op.splice) {
        root = copy(root);
        root.splice(...op.splice);
      } else root = op.value;
      continue;
    }
    root = copy(root);
    let parent = root;
    for (const key of op.path.slice(0, -1)) {
      parent[key] = copy(parent[key]);
      parent = parent[key];
    }
    const last = op.path.at(-1)!;
    if (op.splice) {
      parent[last] = copy(parent[last]);
      parent[last].splice(...op.splice);
    } else if (op.remove) delete parent[last];
    else parent[last] = op.value;
  }
  return root;
}
export const PUBLIC_FIELDS = [
  'town',
  'peers',
  'properties',
  'occupied',
  'completed',
  'worldWork',
  'parcelHomes',
  'parcelResets',
  'townCreated',
  'grassHistory',
  'lawnCuts',
  'events',
  'civic',
] as const;
export const PRIVATE_FIELDS = [
  'resident',
  'election',
  'planning',
  'life',
  'room',
] as const;
export function select(value: any, fields: readonly string[]) {
  return Object.fromEntries(
    fields.filter((k) => Object.hasOwn(value, k)).map((k) => [k, value[k]]),
  );
}
export type SocketGrant = {
  identity: string;
  session: string;
  expires: number;
  town: string;
  resident: string;
  membership: number;
  url: string;
};
