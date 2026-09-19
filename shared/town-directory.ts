export const TOWN_CAPACITY = 50;
export const ACTIVITY_WINDOW_MS = 72 * 60 * 60 * 1000;
export const TOWN_PAGE_SIZE = 12;
export type TownCursor = { created: number; id: string };
export type TownDestination = {
  id: string;
  name: string;
  private: number;
  created: number;
  residents: number;
  online: number;
  active72h: number;
  project: number;
  farm_funded: number;
};
export function townAge(created: number, now = Date.now()): string {
  const hours = Math.max(0, Math.floor((now - created) / 3600000));
  if (hours < 1) return 'Less than an hour';
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days} ${days === 1 ? 'day' : 'days'}`;
  const years = Math.floor(days / 365),
    remainder = days % 365;
  return `${years} ${years === 1 ? 'year' : 'years'}${remainder ? `, ${remainder} ${remainder === 1 ? 'day' : 'days'}` : ''}`;
}
