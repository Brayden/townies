'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, ArrowLeft, Home, KeyRound, RefreshCw } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { TownState } from './data';
import {
  townAge,
  TOWN_CAPACITY,
  type TownDestination as Destination,
  type TownCursor,
} from '../../shared/town-directory';
const compactQuery = '(max-width: 359px), (max-height: 650px)';
const phoneQuery = '(max-width: 700px)';
function subscribeSize(notify: () => void) {
  const queries = [compactQuery, phoneQuery].map((q) => window.matchMedia(q));
  queries.forEach((q) => q.addEventListener('change', notify));
  return () => queries.forEach((q) => q.removeEventListener('change', notify));
}
function pageSizeSnapshot() {
  return window.matchMedia(compactQuery).matches
    ? 1
    : window.matchMedia(phoneQuery).matches
      ? 2
      : 4;
}
function TownStats({ town }: { town: Destination }) {
  const open = Math.max(0, TOWN_CAPACITY - town.residents);
  return (
    <span className="move-town-stats">
      <span className="move-town-numbers">
        <span>
          <strong>{town.active72h}</strong> active in past 72 hours
        </span>
        <span>{town.online} online now</span>
      </span>
      <span
        className="move-town-age"
        title={new Date(town.created).toLocaleString()}
      >
        Town age: {townAge(town.created)}
      </span>
      <span className="move-town-capacity">
        <span>
          {town.residents}/{TOWN_CAPACITY} residents
        </span>
        <span>{open ? `${open} spots open` : 'Town full'}</span>
      </span>
      <meter
        min={0}
        max={TOWN_CAPACITY}
        value={town.residents}
        aria-label="Town occupancy"
      />
    </span>
  );
}
type Preview = {
  destination: Destination;
  homes: { id: number; name: string }[];
};
export default function MoveTownPanel({
  data,
  busy,
  onRequest,
  onMove,
}: {
  data: TownState;
  busy: boolean;
  onRequest: (action: string, args: Record<string, unknown>) => Promise<any>;
  onMove: (args: Record<string, unknown>) => Promise<boolean>;
}) {
  const [code, setCode] = useState(''),
    [towns, setTowns] = useState<Destination[] | null>(null),
    [preview, setPreview] = useState<Preview | null>(null),
    [home, setHome] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [accessKey, setAccessKey] = useState('');
  const [pending, setPending] = useState(true),
    [error, setError] = useState(''),
    [cursor, setCursor] = useState<TownCursor | null>(null);
  const pageSize = useSyncExternalStore(
    subscribeSize,
    pageSizeSnapshot,
    () => 4,
  );
  const [page, setPage] = useState(0),
    [addressPage, setAddressPage] = useState(0),
    [lookup, setLookup] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (preview) stepHeading.current?.focus();
  }, [preview, confirmed]);
  const request = useRef(onRequest),
    generation = useRef(0);
  const initialLoad = useRef<{
    town: string;
    result: ReturnType<typeof onRequest>;
  } | null>(null);
  useEffect(() => {
    request.current = onRequest;
  }, [onRequest]);
  useEffect(() => {
    const version = ++generation.current;
    let cancelled = false;
    if (initialLoad.current?.town !== data.town.id)
      initialLoad.current = {
        town: data.town.id,
        result: request.current('move-options', { mode: 'public' }),
      };
    initialLoad.current.result
      .then((v) => {
        if (cancelled || version !== generation.current) return;
        if (!v || v.error) {
          setError(v?.error || 'Could not load towns. Please try again.');
          return;
        }
        setTowns(v.towns);
        setCursor(v.nextCursor ?? null);
      })
      .catch(() => {
        if (!cancelled && version === generation.current)
          setError('Could not load towns. Please try again.');
      })
      .finally(() => {
        if (!cancelled && version === generation.current) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data.town.id]);
  async function browse(more = false) {
    const version = ++generation.current;
    setPending(true);
    setError('');
    setPreview(null);
    setConfirmed(false);
    try {
      const v = await request.current('move-options', {
        mode: 'public',
        ...(more ? { cursor } : {}),
      });
      if (version !== generation.current) return;
      if (!v || v.error) {
        setError(v?.error || 'Could not load towns. Please try again.');
        return;
      }
      const combined = more
        ? [
            ...(towns ?? []),
            ...v.towns.filter(
              (t: Destination) => !towns?.some((o) => o.id === t.id),
            ),
          ]
        : v.towns;
      setTowns(combined);
      setPage(
        more
          ? Math.min(
              page + pageSize,
              towns?.length ?? 0,
              Math.max(0, combined.length - 1),
            )
          : 0,
      );
      setCursor(v.nextCursor ?? null);
    } catch {
      if (version === generation.current)
        setError('Could not load towns. Please try again.');
    } finally {
      if (version === generation.current) setPending(false);
    }
  }
  async function inspect(destination?: string) {
    const version = ++generation.current;
    setPending(true);
    setError('');
    setPreview(null);
    setConfirmed(false);
    const key = destination ? '' : code.trim().toUpperCase();
    try {
      const v = await request.current('move-options', { destination, key });
      if (version !== generation.current) return;
      if (!v || v.error) {
        setError(
          v?.error ||
            'Could not open that town. It may have filled up; refresh and try again.',
        );
        return;
      }
      setAddressPage(0);
      setAccessKey(key);
      setPreview(v);
      setHome(v.homes[0] ? String(v.homes[0].id) : '');
    } catch {
      if (version === generation.current)
        setError('Could not open that town. Please try again.');
    } finally {
      if (version === generation.current) setPending(false);
    }
  }
  const working = busy || pending;
  const choice = preview?.homes.find((h) => String(h.id) === home);
  const visibleTowns = towns?.slice(page, page + pageSize) ?? [];
  const moreLoaded = page + pageSize < (towns?.length ?? 0);
  return (
    <div className="move-town-panel">
      {!preview && (
        <>
          <header className="move-browser-heading menu-section-heading">
            <div>
              <h3>Find your next town</h3>
              <p>Leaving {data.town.name} · moving is free</p>
            </div>
            <button
              className="icon-button"
              aria-label="Refresh towns"
              disabled={working}
              onClick={() => void browse()}
            >
              <RefreshCw size={18} />
            </button>
          </header>
          <div className="menu-segmented" aria-label="Find a town">
            <button
              aria-pressed={!lookup}
              onClick={() => {
                setLookup(false);
                setError('');
              }}
            >
              Public towns
            </button>
            <button
              aria-pressed={lookup}
              onClick={() => {
                setLookup(true);
                setError('');
              }}
            >
              Invite code
            </button>
          </div>
        </>
      )}
      {pending && <output>Loading town details…</output>}
      {error && (
        <p role="alert" className="move-town-error">
          {error}
        </p>
      )}
      {!preview && !lookup && (
        <>
          <p className="menu-footnote">
            Oldest towns first · activity counts residents who played in the
            past 72 hours.
          </p>
          <div className="move-town-list" aria-label="Public towns">
            {visibleTowns.map((t) => (
              <button
                className="move-town-option"
                key={t.id}
                disabled={working || t.residents >= TOWN_CAPACITY}
                onClick={() => void inspect(t.id)}
              >
                <span className="move-town-card">
                  <span className="move-town-title">
                    <strong>{t.name}</strong>
                    {t.residents < TOWN_CAPACITY && <ArrowRight size={17} />}
                  </span>
                  <TownStats town={t} />
                </span>
              </button>
            ))}
          </div>
          {towns?.length === 0 && !pending && (
            <p>
              No other public towns are available yet. Try a friend’s invite
              code.
            </p>
          )}
          {!!towns?.length && (
            <nav className="menu-pagination" aria-label="Town pages">
              <button
                className="secondary-button"
                disabled={working || page === 0}
                onClick={() => setPage((p) => Math.max(0, p - pageSize))}
              >
                <ArrowLeft size={16} />
                Previous
              </button>
              <span>Page {Math.floor(page / pageSize) + 1}</span>
              <button
                className="secondary-button"
                disabled={working || (!moreLoaded && !cursor)}
                onClick={() =>
                  moreLoaded ? setPage((p) => p + pageSize) : void browse(true)
                }
              >
                Next
                <ArrowRight size={16} />
              </button>
            </nav>
          )}
        </>
      )}
      {!preview && lookup && (
        <form
          className="move-invite"
          onSubmit={(e) => {
            e.preventDefault();
            if (!working && code.trim()) void inspect();
          }}
        >
          <KeyRound size={28} />
          <h3>Join your friends</h3>
          <p>Private towns only appear with an invite code.</p>
          <label className="field-label" htmlFor="move-town-code">
            A friend’s town code
          </label>
          <div className="move-code-row">
            <input
              id="move-town-code"
              value={code}
              maxLength={32}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste their town code"
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className="primary-button"
              disabled={working || !code.trim()}
            >
              Find town
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
      )}
      {preview && !confirmed && (
        <section className="move-destination">
          <button
            className="menu-back"
            disabled={working}
            onClick={() => {
              setPreview(null);
              setError('');
            }}
          >
            <ArrowLeft size={16} />
            Back to towns
          </button>
          <header className="menu-section-heading">
            <span className="eyebrow">Choose an address</span>
            <h3 ref={stepHeading} tabIndex={-1}>
              {preview.destination.name}
            </h3>
            <p>Your house design and belongings come with you.</p>
          </header>
          <div className="move-preview-stats">
            <TownStats town={preview.destination} />
          </div>
          <h4>Choose your new address</h4>
          <RadioGroup
            className="move-addresses"
            value={home}
            onValueChange={(v) => setHome(String(v))}
            aria-label="Vacant homes in the destination town"
            disabled={working}
          >
            {preview.homes
              .slice(addressPage * 6, addressPage * 6 + 6)
              .map((h) => (
                <label className="option" key={h.id}>
                  <RadioGroupItem value={String(h.id)} />
                  <span>
                    <Home size={16} />
                    {h.name}
                  </span>
                </label>
              ))}
          </RadioGroup>
          {preview.homes.length > 6 && (
            <nav className="menu-pagination" aria-label="Address pages">
              <button
                className="secondary-button"
                disabled={working || addressPage === 0}
                onClick={() => setAddressPage((p) => p - 1)}
              >
                Previous addresses
              </button>
              <span>
                {addressPage + 1} / {Math.ceil(preview.homes.length / 6)}
              </span>
              <button
                className="secondary-button"
                disabled={
                  working || (addressPage + 1) * 6 >= preview.homes.length
                }
                onClick={() => setAddressPage((p) => p + 1)}
              >
                Next addresses
              </button>
            </nav>
          )}
          <div className="menu-action-footer">
            <span>
              {choice ? `Selected: ${choice.name}` : 'Select an address'}
              <small>Reserved only after confirming.</small>
            </span>
            <button
              className="primary-button"
              disabled={working || !choice}
              onClick={() => setConfirmed(true)}
            >
              Review my move
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}
      {preview && confirmed && (
        <section className="move-destination">
          <span className="eyebrow">Review your move</span>
          <h3 ref={stepHeading} tabIndex={-1}>
            {preview.destination.name}
          </h3>
          <p className="move-selected-address">
            <Home size={18} />
            {choice?.name} · free
          </p>
          <div className="move-summary">
            <section>
              <h4>Coming with you</h4>
              <p>
                Coins, career, XP, education, outfits, equipment, house upgrades
                and belongings. Your upkeep schedule stays the same.
              </p>
            </section>
            <section>
              <h4>Staying in {data.town.name}</h4>
              <p>
                Town funds, donations, projects and contribution history. Your
                old home becomes vacant; your shift and any campaign or mayoral
                role end.
              </p>
            </section>
          </div>
          <p className="menu-footnote">
            If voting has already opened here, you can participate next
            election. You can move again when there is room; your old address is
            not reserved.
          </p>
          <div className="menu-action-footer">
            <button
              className="secondary-button"
              disabled={working}
              onClick={() => setConfirmed(false)}
            >
              Keep looking
            </button>
            <button
              className="primary-button"
              disabled={working || !choice}
              onClick={async () => {
                const moved = await onMove({
                  destination: preview.destination.id,
                  key: accessKey,
                  home: Number(home),
                  fromTown: data.town.id,
                  membership: data.resident.townJoinedAt ?? 0,
                });
                if (!moved) {
                  setConfirmed(false);
                  setPreview(null);
                  setError(
                    'Your move did not complete. Your current home is safe; refresh and try again.',
                  );
                }
              }}
            >
              Move to {preview.destination.name} · free
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
