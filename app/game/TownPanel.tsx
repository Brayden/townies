'use client';
import { useState, type ComponentProps } from 'react';
import {
  Users,
  Coins,
  MapPin,
  Copy,
  Link,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import type { TownState } from './data';
import { projectById } from './civicProjects';
import TownInitiatives from './TownInitiatives';
import CivicPanel from './CivicPanel';
import MenuSlots from './MenuSlots';
type Props = {
  data: TownState;
  busy: boolean;
  places: { id: string; name: string }[];
  inviteFallback: string;
  onCopy: (link?: boolean) => void;
  onVisit: (id: string) => void;
  onMove: () => void;
  onElection: () => void;
  onPlanning: () => void;
  onLife: () => void;
  onFriends: () => void;
  onAction: ComponentProps<typeof TownInitiatives>['onAction'];
  onLook: (x: number, z: number) => void;
  onWalk: ComponentProps<typeof TownInitiatives>['onWalk'];
};
export default function TownPanel({
  data,
  busy,
  places,
  inviteFallback,
  onCopy,
  onVisit,
  onMove,
  onElection,
  onPlanning,
  onLife,
  onFriends,
  onAction,
  onLook,
  onWalk,
}: Props) {
  const [project, setProject] = useState('park'),
    [community, setCommunity] = useState('activity');
  return (
    <Tabs className="game-settings town-menu" defaultValue="overview">
      <TabsList className="game-menu-tabs" aria-label="Town sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="places">Places</TabsTrigger>
        <TabsTrigger value="community">Community</TabsTrigger>
      </TabsList>
      <div className="game-menu-body">
        <TabsContent value="overview">
          <header className="menu-section-heading">
            <h3>{data.town.name}</h3>
            <p>
              {data.town.private ? 'Private town' : 'Public town'} ·{' '}
              {data.peers.length} online
            </p>
          </header>
          <div className="town-stat-grid">
            <div>
              <Users size={19} />
              <strong>{data.town.residents} / 50</strong>
              <span>Residents</span>
            </div>
            <div>
              <Coins size={19} />
              <strong>{data.town.treasury.toLocaleString()}</strong>
              <span>Town coins</span>
            </div>
          </div>
          <div className="prosperity-summary">
            <div className="progress-label">
              <span>Town prosperity</span>
              <strong>{data.town.prosperity}%</strong>
            </div>
            <Progress
              className="progress"
              value={data.town.prosperity}
              aria-label="Town prosperity"
            />
            <p>Shared work and lasting improvements help your town grow.</p>
          </div>
          <dl className="personal-stats">
            <div>
              <dt>Mayor</dt>
              <dd>{data.election.mayor?.name ?? 'Not yet elected'}</dd>
            </div>
            <div>
              <dt>Featured project</dt>
              <dd>
                {projectById(data.civic.featured)?.name ??
                  'Awaiting a town decision'}
              </dd>
            </div>
          </dl>
          <div className="town-menu-actions">
            <button className="secondary-button" onClick={onElection}>
              Mayoral election
              <Users size={17} />
            </button>
            <button className="primary-button" onClick={onPlanning}>
              Town planning
              <MapPin size={17} />
            </button>
          </div>
        </TabsContent>
        <TabsContent value="projects">
          <div className="menu-segmented" aria-label="Project group">
            {[
              ['park', 'Park'],
              ['farm', 'Farm'],
              ['mayor', 'Mayor & funds'],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={project === id}
                onClick={() => setProject(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {project === 'mayor' ? (
            <CivicPanel
              data={data}
              busy={busy}
              onAction={(action, args) =>
                onAction(
                  action,
                  args,
                  action === 'support-project'
                    ? 'Thank you for contributing to the town fund.'
                    : 'Your town decision is saved.',
                )
              }
              onLook={onLook}
            />
          ) : (
            <TownInitiatives
              focus={project === 'park' ? 'park' : 'farm'}
              data={data}
              busy={busy}
              onAction={onAction}
              onLook={onLook}
              onWalk={onWalk}
            />
          )}
        </TabsContent>
        <TabsContent value="places">
          <header className="menu-section-heading">
            <h3>Places around town</h3>
            <p>
              Walk to a building to visit. Shops sell items at the storefront.
            </p>
          </header>
          <MenuSlots
            label="Places"
            items={places.map((place) => ({
              id: place.id,
              content: (
                <button
                  className="place-slot"
                  onClick={() => onVisit(place.id)}
                >
                  <MapPin size={23} />
                  <strong>{place.name}</strong>
                  <small>Walk there</small>
                </button>
              ),
            }))}
          />
        </TabsContent>
        <TabsContent value="community">
          <div className="town-menu-actions">
            <button className="secondary-button" onClick={onFriends}>
              <Users size={17} />
              Neighbors & friends
            </button>
            <button className="secondary-button" onClick={onLife}>
              <Heart size={17} />
              Town life
            </button>
          </div>
          <div className="menu-segmented" aria-label="Community view">
            {[
              ['activity', 'Town activity'],
              ['invite', 'Invite & move'],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={community === id}
                onClick={() => setCommunity(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {community === 'activity' ? (
            <>
              <h3 className="menu-minor-heading">Around the neighborhood</h3>
              {data.events.length ? (
                <ul className="town-event-feed">
                  {data.events.map((e, i) => (
                    <li key={i}>
                      <strong>{e.name}</strong> {e.text}.
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No town activity yet. Make the first memory.</p>
              )}
            </>
          ) : (
            <div className="town-invite-menu">
              <h3 className="menu-minor-heading">Bring your friends</h3>
              <p>
                {Math.max(0, 50 - data.town.residents)} resident spots available
              </p>
              {data.town.key && (
                <>
                  <label htmlFor="share-town-code">Your town code</label>
                  <input
                    id="share-town-code"
                    readOnly
                    value={data.town.key}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </>
              )}
              <div className="town-menu-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => onCopy()}
                >
                  <Copy size={16} />
                  Copy code
                </button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => onCopy(true)}
                >
                  <Link size={16} />
                  Copy invite link
                </button>
              </div>
              {inviteFallback && (
                <>
                  <label htmlFor="invite-fallback">Select and copy</label>
                  <input
                    id="invite-fallback"
                    readOnly
                    value={inviteFallback}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </>
              )}
              <p className="menu-footnote">
                Friends sign in, then use this code to join if there is room.
              </p>
              <button
                className="secondary-button full"
                disabled={busy}
                onClick={onMove}
              >
                Move to another town
                <ArrowRight size={17} />
              </button>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
