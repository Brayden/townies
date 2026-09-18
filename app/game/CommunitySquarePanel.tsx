'use client';
import { useState } from 'react';
import { Briefcase, Users } from 'lucide-react';
import {
  COMMUNITY_BUILDINGS,
  communityBuilding,
  type CommunityBuilding,
} from './communityBuildings';
import { SQUARE_LOTS, hasCommunitySquare } from './communitySquare';
import { townBuildings, plotOccupied, type PlanningState } from './charters';
import type { BuildingChoice } from './placement';

export function BuildingPossibilities({
  building,
}: {
  building: CommunityBuilding;
}) {
  return (
    <div className="venue-possibilities">
      <div>
        <span className="eyebrow">Potential career · planned</span>
        <strong>{building.job}</strong>
        <p>{building.work}</p>
      </div>
      <div>
        <span className="eyebrow">
          {building.liveService
            ? 'Available when built'
            : 'Community activity · planned'}
        </span>
        <strong>{building.activity}</strong>
        <p>{building.outcome}</p>
      </div>
      <p className="note">Future paths to explore: {building.future}</p>
    </div>
  );
}
export default function CommunitySquarePanel({
  state,
  canPropose,
  busy,
  onChoose,
  onPreview,
  onLook,
  initialLot,
}: {
  state: PlanningState;
  canPropose: boolean;
  busy: boolean;
  onChoose: (choice: BuildingChoice) => void;
  onPreview: (choice: BuildingChoice) => void;
  onLook: (x: number, z: number) => void;
  initialLot?: string | null;
}) {
  const [selectedLot, setSelectedLot] = useState(
      initialLot ?? SQUARE_LOTS[0].id,
    ),
    [selected, setSelected] = useState('bakery');
  const square = hasCommunitySquare(state),
    lot = SQUARE_LOTS.find((l) => l.id === selectedLot)!,
    building = communityBuilding(selected)!;
  const occupied = square && plotOccupied(lot.id, state),
    active = state.proposals.some((p) =>
      ['voting', 'approved', 'ready'].includes(p.status),
    );
  const choice: BuildingChoice = {
    kind: 'build',
    institution: null,
    option: selected,
    ...(square ? { fromPlot: lot.id } : {}),
  };
  return (
    <section className="community-square-panel">
      <div className="eyebrow">Built by the people who live here</div>
      <h3>A place for our next shared story</h3>
      <p>
        {square
          ? 'Four lots, twelve possibilities. Choose a lot to explore what it could bring to your square.'
          : 'Explore twelve community buildings for a clear site in your town. New towns also start with four reserved lots around an inward-facing square.'}
      </p>
      {square && (
        <>
          <svg
            className="square-plan"
            viewBox="-23 -20 46 41"
            aria-label="Town square plan; north at the top. Choose a lot using the buttons below."
          >
            <rect
              x="-22"
              y="-19"
              width="44"
              height="39"
              rx="2"
              fill="#d8dfb8"
            />
            <rect x="-12" y="-8" width="24" height="20" rx="2" fill="#9bbc7d" />
            <circle r="2" fill="#7eafbe" />
            {townBuildings(state)
              .filter((b) => Math.abs(b.x) < 22 && Math.abs(b.z) < 19)
              .map((b) => (
                <g key={b.id}>
                  <rect
                    x={b.x - b.width / 2}
                    y={b.z - b.depth / 2}
                    width={b.width}
                    height={b.depth}
                    rx=".4"
                    fill={b.roof}
                  />
                  <title>{b.name}</title>
                </g>
              ))}
            {SQUARE_LOTS.map((p, i) => (
              <g key={p.id}>
                <rect
                  x={p.x - p.width / 2}
                  y={p.z - p.depth / 2}
                  width={p.width}
                  height={p.depth}
                  rx=".5"
                  fill={
                    plotOccupied(p.id, state)
                      ? '#879981'
                      : p.id === selectedLot
                        ? '#efc36b'
                        : '#f4e3b8'
                  }
                  stroke="#765f40"
                  strokeWidth=".25"
                  strokeDasharray={
                    plotOccupied(p.id, state) ? undefined : '1 .6'
                  }
                />
                <text
                  x={p.x}
                  y={p.z + 0.9}
                  textAnchor="middle"
                  fontSize="2.5"
                  fill="#3e4f3e"
                >
                  {i + 1}
                </text>
              </g>
            ))}
            <text
              x="0"
              y="-17.5"
              textAnchor="middle"
              fontSize="1.7"
              fill="#3e4f3e"
            >
              NORTH
            </text>
          </svg>
          <fieldset
            className="square-lot-options"
            aria-label="Choose a square lot"
          >
            {SQUARE_LOTS.map((p, i) => (
              <button
                className="secondary-button"
                aria-pressed={selectedLot === p.id}
                key={p.id}
                onClick={() => setSelectedLot(p.id)}
              >
                <strong>
                  {i + 1} · {p.name}
                </strong>
                <small>
                  {plotOccupied(p.id, state)
                    ? 'Built'
                    : state.proposals.some(
                          (v) =>
                            v.fromPlot === p.id &&
                            ['voting', 'approved', 'ready'].includes(v.status),
                        )
                      ? 'Town project underway'
                      : 'Open for ideas'}
                </small>
              </button>
            ))}
          </fieldset>
          <button className="danger-link" onClick={() => onLook(lot.x, lot.z)}>
            Look at {lot.name}
          </button>
        </>
      )}
      {occupied ? (
        <p className="note">
          This lot already has a community building. Choose another open lot.
        </p>
      ) : (
        <>
          <fieldset
            className="venue-catalog"
            aria-label="Community building choices"
          >
            {COMMUNITY_BUILDINGS.map((b) => (
              <button
                className="venue-choice"
                key={b.id}
                aria-pressed={selected === b.id}
                onClick={() => setSelected(b.id)}
              >
                <span className="eyebrow">{b.category}</span>
                <strong>{b.name}</strong>
                <small>{b.cost.toLocaleString()} town coins</small>
                <span className="venue-choice-benefits">
                  <span className="venue-choice-benefit">
                    <Briefcase size={16} aria-hidden="true" />
                    <span>
                      <span className="venue-choice-benefit-label">
                        Job · Planned
                      </span>
                      <span>{b.job}</span>
                    </span>
                  </span>
                  <span className="venue-choice-benefit">
                    <Users size={16} aria-hidden="true" />
                    <span>
                      <span className="venue-choice-benefit-label">
                        {b.liveService
                          ? 'Community · Available when built'
                          : 'Community · Planned'}
                      </span>
                      <span>{b.activity}</span>
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </fieldset>
          <article className="venue-detail">
            <h4>{building.name}</h4>
            <p>{building.description}</p>
            <BuildingPossibilities building={building} />
            <p className="note">
              These places can be funded and built now. Careers and community
              activities marked planned are not playable yet.
            </p>
            <div className="button-row">
              <button
                className="secondary-button"
                onClick={() => onPreview(choice)}
              >
                Preview building
              </button>
              <button
                className="primary-button"
                disabled={!canPropose || active || busy}
                onClick={() => onChoose(choice)}
              >
                Review proposal
              </button>
            </div>
          </article>
        </>
      )}
      <p className="note">
        {square ? 'The vote locks the building, price, lot, and facing. ' : ''}
        One town project runs at a time. Residents vote; the mayor funds and
        places it after approval.{' '}
        {canPropose ? '' : 'Your mayor opens the formal proposal.'}
      </p>
    </section>
  );
}
