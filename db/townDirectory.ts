import {
  ACTIVITY_WINDOW_MS,
  TOWN_PAGE_SIZE,
  type TownCursor,
  type TownDestination,
} from '../shared/town-directory.ts';

// D1 supplies only the public directory. Live counts come from each town's DO.
// Keyset pagination bounds fan-out and lets residents browse beyond 12 towns.
export async function publicTownPage(
  d: D1Database,
  current: string,
  cursor?: unknown,
) {
  let after: TownCursor | null = null;
  if (cursor !== undefined && cursor !== null) {
    const c = cursor as TownCursor;
    if (
      typeof c !== 'object' ||
      !Number.isSafeInteger(c.created) ||
      c.created < 0 ||
      typeof c.id !== 'string' ||
      !c.id ||
      c.id.length > 128
    )
      return { error: 'Refresh the town list and try again.', status: 400 };
    after = c;
  }
  const rows = (
    await d
      .prepare(
        `SELECT id,created FROM towns WHERE private=0 AND id<>? ${after ? 'AND (created>? OR (created=? AND id>?))' : ''} ORDER BY created,id LIMIT ?`,
      )
      .bind(
        current,
        ...(after ? [after.created, after.created, after.id] : []),
        TOWN_PAGE_SIZE + 1,
      )
      .all<TownCursor>()
  ).results;
  const towns = rows.slice(0, TOWN_PAGE_SIZE);
  return {
    towns,
    nextCursor: rows.length > TOWN_PAGE_SIZE ? towns[towns.length - 1] : null,
  };
}

export async function townSummary(d: D1Database, id: string, now = Date.now()) {
  return d
    .prepare(`SELECT t.id,t.name,t.private,t.created,t.project,t.farm_funded,
    COUNT(r.id) AS residents,
    COUNT(CASE WHEN r.seen>? THEN 1 END) AS online,
    COUNT(CASE WHEN r.last_active>=? AND r.last_active>0 THEN 1 END) AS active72h
    FROM towns t LEFT JOIN residents r ON r.town_id=t.id WHERE t.id=? GROUP BY t.id`)
    .bind(now - 12000, now - ACTIVITY_WINDOW_MS, id)
    .first<TownDestination>();
}
