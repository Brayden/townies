'use client';
import { useRef, useState } from 'react';
import {
  Coins,
  Users,
  Heart,
  MessageCircle,
  MapPin,
  Copy,
  Link as LinkIcon,
  ArrowRight,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import CivicPanel from './CivicPanel';
import TownInitiatives from './TownInitiatives';
import { townBuildings, proposalTitle } from './charters';
import { entrance } from './townLayout';
import { projectById } from './civicProjects';
import type { TownState } from './data';
export type TownTab = 'overview' | 'projects' | 'hall' | 'neighbors' | 'places';
type Destination = 'life' | 'election' | 'planning' | 'pets' | 'move-town';
type Props = {
  data: TownState;
  busy: boolean;
  canMove: boolean;
  initialTab?: TownTab;
  previewAccess?: boolean;
  inviteFallback: string;
  onOpen: (destination: Destination) => void;
  onChat: () => void;
  onCopyInvite: (link?: boolean) => void;
  onAction: (
    action: string,
    args: Record<string, unknown>,
    message?: string,
  ) => unknown;
  onLook: (x: number, z: number) => void;
  onWalk: (x: number, z: number, label: string) => void;
};
export default function TownPanel({
  data,
  busy,
  canMove,
  initialTab = 'overview',
  previewAccess = false,
  inviteFallback,
  onOpen,
  onChat,
  onCopyInvite,
  onAction,
  onLook,
  onWalk,
}: Props) {
  const [tab, setTab] = useState<TownTab>(initialTab),
    navigation = useRef<HTMLDivElement>(null),
    mayor = data.election.mayor,
    plan = data.planning.proposals.find((p) =>
      ['voting', 'approved', 'ready'].includes(p.status),
    ),
    featured = projectById(data.civic.featured),
    spaces = Math.max(0, 50 - data.town.residents);
  const goTo = (value: TownTab) => {
    setTab(value);
    navigation.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'instant',
    });
  };
  const civicAction = (action: string, args: Record<string, unknown>) => {
    void onAction(
      action,
      args,
      action === 'support-project'
        ? 'Thank you for contributing to the town fund.'
        : 'Your town decision is saved.',
    );
  };
  return (
    <div className="town-menu planning-panel">
      <div className="town-menu-summary">
        <span>
          <Users size={15} />
          {data.town.residents}/50 residents
        </span>
        <span>
          <Coins size={15} />
          {data.town.treasury.toLocaleString()} town coins
        </span>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => goTo(value as TownTab)}
        className="planning-tabs"
      >
        <div ref={navigation} className="planning-tab-navigation">
          <TabsList
            aria-label="Town menu areas"
            className="planning-tab-list town-menu-tabs"
          >
            {[
              ['overview', 'Overview'],
              ['projects', 'Projects'],
              ['hall', 'Town Hall'],
              ['neighbors', 'Neighbors'],
              ['places', 'Places'],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="planning-tab-content">
          <section className="town-menu-welcome">
            <h3>Your town at a glance</h3>
            <p>
              {mayor
                ? `Mayor ${mayor.name} leads your town.`
                : 'Your town has no elected mayor yet.'}{' '}
              Every neighbor can help shape what comes next.
            </p>
            <div className="progress-label">
              <span>Town prosperity</span>
              <strong>{data.town.prosperity}%</strong>
            </div>
            <Progress
              className="progress"
              value={data.town.prosperity}
              aria-label="Town prosperity"
            />
          </section>
          <div className="planning-destinations">
            <button onClick={() => goTo('projects')}>
              <strong>Help a town project</strong>
              <span>
                {featured?.name ?? 'Park improvements & the Town Farm'}
              </span>
              <small>See shared progress and ways to contribute.</small>
            </button>
            <button onClick={() => onOpen('planning')}>
              <strong>Shape the next chapter</strong>
              <span>
                {plan
                  ? proposalTitle(plan)
                  : 'New places, upgrades & more land'}
              </span>
              <small>
                {plan
                  ? `${plan.status === 'voting' ? 'Resident vote open' : plan.status === 'approved' ? 'Approved · needs funding' : 'Funded · ready to place'}. Open town planning for the next step.`
                  : 'Explore building choices and resident votes.'}
              </small>
            </button>
            <button onClick={() => onOpen('election')}>
              <strong>Mayoral election</strong>
              <span>Campaigns, candidates & voting</span>
              <small>See the election status and have your say.</small>
            </button>
          </div>
          <button className="secondary-button full" onClick={onChat}>
            <MessageCircle size={17} />
            Talk with your neighbors
          </button>
        </TabsContent>
        <TabsContent
          value="projects"
          keepMounted
          className="planning-tab-content"
        >
          <TownInitiatives
            data={data}
            busy={busy}
            onAction={onAction}
            onLook={onLook}
            onWalk={onWalk}
          />
          <CivicPanel
            section="projects"
            data={data}
            busy={busy}
            onAction={civicAction}
            onLook={onLook}
          />
          <button
            className="primary-button full"
            onClick={() => onOpen('planning')}
          >
            <MapPin size={17} />
            Town planning · buildings & land
          </button>
        </TabsContent>
        <TabsContent value="hall" keepMounted className="planning-tab-content">
          <div>
            <h3>Town Hall</h3>
            <p>
              See how the town fund is used, review work taxes, and follow
              public decisions.
            </p>
          </div>
          <button
            className="secondary-button full"
            onClick={() => onOpen('election')}
          >
            <Users size={17} />
            Mayoral election
          </button>
          <CivicPanel
            section="governance"
            data={data}
            busy={busy}
            onAction={civicAction}
            onLook={onLook}
          />
        </TabsContent>
        <TabsContent
          value="neighbors"
          keepMounted
          className="planning-tab-content"
        >
          <div>
            <h3>Make yourself part of the neighborhood</h3>
            <p>
              Spend time together, start a conversation, or invite friends to
              join.
            </p>
          </div>
          <button
            className="primary-button full"
            onClick={() => onOpen('life')}
          >
            <Heart size={17} />
            Town life · farm, picnic & friends
          </button>
          <button className="secondary-button full" onClick={onChat}>
            <MessageCircle size={17} />
            Open town & profession chat
          </button>
          <section className="invite-card">
            <h3>Bring your friends along</h3>
            <p>
              {spaces
                ? `${spaces} resident spots available. Share this code or an invite link so friends can join your town.`
                : 'This town has 50 residents. Friends can join when a spot becomes available.'}
            </p>
            {data.town.key && (
              <>
                <label className="field-label" htmlFor="share-town-code">
                  Your town code
                </label>
                <input
                  id="share-town-code"
                  readOnly
                  value={data.town.key}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </>
            )}
            <div className="button-row">
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => onCopyInvite()}
              >
                <Copy size={16} />
                Copy town code
              </button>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => onCopyInvite(true)}
              >
                <LinkIcon size={16} />
                Copy invite link
              </button>
            </div>
            {inviteFallback && (
              <>
                <label className="field-label" htmlFor="invite-fallback">
                  Select and copy
                </label>
                <input
                  id="invite-fallback"
                  readOnly
                  value={inviteFallback}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </>
            )}
            <p className="note">
              Friends can select “I have a key” on the welcome screen and paste
              your code. An invite link fills it in for them.{' '}
              {previewAccess
                ? 'They also need access to this game preview; a town code does not grant that access.'
                : 'Friends create an account or log in first, then join your town if a spot is available.'}
            </p>
          </section>
          <details className="civic-section">
            <summary>Around the neighborhood</summary>
            {data.events.length ? (
              data.events.map((e, i) => (
                <p key={i}>
                  <strong>{e.name}</strong> {e.text}.
                </p>
              ))
            ) : (
              <p>A fresh page in the town scrapbook. Make the first memory.</p>
            )}
          </details>
          <button
            className="secondary-button full"
            disabled={busy || !canMove}
            onClick={() => onOpen('move-town')}
          >
            <ArrowRight size={17} />
            Move to another town
          </button>
        </TabsContent>
        <TabsContent value="places" className="planning-tab-content">
          <div>
            <h3>Places around town</h3>
            <p>
              Choose a destination to walk there. Your route follows your town’s
              current layout.
            </p>
          </div>
          <div className="town-directory town-menu-directory">
            {townBuildings(data.planning).map((b) => (
              <button
                className="secondary-button"
                key={b.id}
                onClick={() => {
                  const door = entrance(b);
                  onWalk(door.x, door.z, b.name);
                }}
              >
                <MapPin size={16} />
                {b.name}
              </button>
            ))}
          </div>
          <button
            className="secondary-button full"
            onClick={() => onOpen('pets')}
          >
            Paws & Porches · pets for your home
          </button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
