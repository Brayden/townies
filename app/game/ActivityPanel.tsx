'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Home,
  Package,
  Shirt,
  Bike,
  X,
  MapPin,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { HOMES, JOBS, SHOP, type TownState } from './data';
import { OUTFITS } from './outfits';
import { houseById } from './lifestyle';
import { JOB_HINTS, WORK_PAY, type FieldJob } from './workTargets';
import { townLevel, workPay } from './civicProjects';
import { townWorkCatalog, townWorkProgress } from './townWork';
import type { PlanningState } from './charters';
import MenuSlots from './MenuSlots';
type Props = {
  view: 'home' | 'work' | 'journal';
  data: TownState;
  busy: boolean;
  startDisabled: boolean;
  online: boolean;
  tier: number;
  onClose: () => void;
  onEnter: () => void;
  onHome: () => void;
  onHousing: () => void;
  onSchool: () => void;
  onStart: (id?: string) => void;
  onAction: (
    action: string,
    args: Record<string, unknown>,
    message?: string,
  ) => unknown;
};
export default function ActivityPanel({
  view,
  data,
  busy,
  startDisabled,
  online,
  tier,
  onClose,
  onEnter,
  onHome,
  onHousing,
  onSchool,
  onStart,
  onAction,
}: Props) {
  const r = data.resident,
    house = houseById(r.house),
    job = JOBS.find((j) => j.id === r.job) ?? JOBS[0];
  const [career, setCareer] = useState(r.job ?? 'mow');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const planningKey = JSON.stringify(data.planning);
  const catalog = useMemo(
    () => townWorkCatalog(JSON.parse(planningKey) as PlanningState),
    [planningKey],
  );
  const work = townWorkProgress(data, catalog, now);
  const pay = (id: string, regular: boolean) =>
    workPay(
      id === 'mow'
        ? regular
          ? 2
          : 1
        : WORK_PAY[id as FieldJob] - (regular ? 0 : 1),
      data.civic.tax,
      townLevel(data.civic.projects.filter((p) => p.completed).length).bonus,
    ).coins;
  const ownedGear = r.items.filter((id) => !OUTFITS.some((o) => o.id === id));
  const clothes = OUTFITS.filter(
    (o) => o.price === 0 || r.items.includes(o.id),
  );
  const title =
    view === 'home' ? 'My home' : view === 'work' ? 'Work' : 'My journal';
  return (
    <aside className="panel paper activity-panel" aria-label={title}>
      <header className="activity-panel-heading">
        <div>
          <span className="eyebrow">{r.name}</span>
          <h2>{title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close panel"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      {view === 'home' ? (
        <Tabs className="activity-tabs" defaultValue="home">
          <TabsList className="game-menu-tabs" aria-label="Home sections">
            <TabsTrigger value="home">House</TabsTrigger>
            <TabsTrigger value="items">Belongings</TabsTrigger>
            <TabsTrigger value="outfits">Outfits</TabsTrigger>
          </TabsList>
          <div className="activity-panel-body">
            <TabsContent value="home">
              <div className="menu-section-heading">
                <Home size={28} />
                <h3>{house.name}</h3>
                <p>
                  {HOMES[r.home!]?.name} · Level {house.level}
                </p>
              </div>
              <dl className="personal-stats">
                <div>
                  <dt>Upkeep</dt>
                  <dd>
                    {house.upkeep
                      ? `${house.upkeep} coins / month`
                      : 'No upkeep'}
                  </dd>
                </div>
                {!!r.upkeepDue && (
                  <div>
                    <dt>Next payment</dt>
                    <dd>{new Date(r.upkeepDue).toLocaleDateString()}</dd>
                  </div>
                )}
                <div>
                  <dt>Visits</dt>
                  <dd>
                    {r.homeAccess === 'everyone'
                      ? 'Everyone'
                      : r.homeAccess === 'friends'
                        ? 'Friends'
                        : 'Private'}
                  </dd>
                </div>
              </dl>
              {r.upkeepNote && <p className="menu-footnote">{r.upkeepNote}</p>}
              <div className="menu-action-stack">
                <button
                  className="primary-button"
                  disabled={busy || !online}
                  onClick={onEnter}
                >
                  <Home size={17} />
                  Go inside & decorate
                </button>
                <button className="secondary-button" onClick={onHome}>
                  <MapPin size={17} />
                  Walk home
                </button>
                <button className="secondary-button" onClick={onHousing}>
                  Manage house & address
                </button>
              </div>
            </TabsContent>
            <TabsContent value="items">
              <div className="menu-section-heading">
                <h3>Your belongings</h3>
                <p>
                  {ownedGear.length} owned items · visit shops for new items.
                </p>
              </div>
              {ownedGear.length ? (
                <MenuSlots
                  label="Belongings"
                  items={ownedGear.map((id) => {
                    const item = SHOP.find((s) => s.id === id);
                    return {
                      id,
                      content: (
                        <>
                          <Package size={22} />
                          <strong>{item?.name ?? id}</strong>
                          <small>Owned</small>
                          {id === 'bike' && (
                            <button
                              className="secondary-button"
                              disabled={
                                busy || !online || !!r.shift || r.mowing
                              }
                              onClick={() =>
                                onAction(
                                  'bike',
                                  { active: !r.riding },
                                  r.riding ? 'Bike parked.' : 'Bike ready.',
                                )
                              }
                            >
                              <Bike size={16} />
                              {r.riding ? 'Park' : 'Ride'}
                            </button>
                          )}
                        </>
                      ),
                    };
                  })}
                />
              ) : (
                <p>No equipment or decorations yet.</p>
              )}
              {(r.catPet || r.dogPet) && (
                <p className="menu-footnote">
                  At home:{' '}
                  {[r.catPet ? 'your cat' : null, r.dogPet ? 'your dog' : null]
                    .filter(Boolean)
                    .join(' and ')}
                  .
                </p>
              )}
            </TabsContent>
            <TabsContent value="outfits">
              <div className="menu-section-heading">
                <h3>Your wardrobe</h3>
                <p>Wear what you own. New styles are at Thread & Thistle.</p>
              </div>
              <MenuSlots
                label="Outfits"
                items={clothes.map((o) => {
                  const wearing =
                    o.slot === 'hat'
                      ? r.hat === o.id
                      : o.slot === 'accessory'
                        ? r.accessory === o.id
                        : r.outfit === o.id ||
                          (!r.outfit && r.color === o.color);
                  return {
                    id: o.id,
                    content: (
                      <button
                        className="owned-outfit"
                        aria-pressed={wearing}
                        disabled={busy || !online || wearing}
                        onClick={() =>
                          onAction(
                            'wardrobe',
                            { item: o.id },
                            'Outfit updated.',
                          )
                        }
                      >
                        <Shirt size={24} style={{ color: o.color }} />
                        <strong>{o.name}</strong>
                        <small>{wearing ? 'Wearing' : 'Wear'}</small>
                      </button>
                    ),
                  };
                })}
              />
            </TabsContent>
          </div>
        </Tabs>
      ) : view === 'work' ? (
        <Tabs className="activity-tabs" defaultValue="shift">
          <TabsList className="game-menu-tabs" aria-label="Work sections">
            <TabsTrigger value="shift">My job</TabsTrigger>
            <TabsTrigger value="available">Pitch in</TabsTrigger>
            <TabsTrigger value="career">Career</TabsTrigger>
          </TabsList>
          <div className="activity-panel-body">
            <TabsContent value="shift">
              <div className="menu-section-heading">
                <span className="eyebrow">Tier {tier}</span>
                <h3>{job.name}</h3>
                <p>{JOB_HINTS[job.id as FieldJob]}</p>
              </div>
              <dl className="personal-stats">
                <div>
                  <dt>Take-home pay</dt>
                  <dd>
                    {pay(job.id, true)} coins /{' '}
                    {job.id === 'mow' ? 'patch' : 'action'}
                  </dd>
                </div>
                <div>
                  <dt>Available work</dt>
                  <dd>
                    {work.jobs
                      .find((j) => j.id === job.id)
                      ?.remaining.toLocaleString()}{' '}
                    tasks
                  </dd>
                </div>
              </dl>
              <button
                className="primary-button full"
                disabled={startDisabled}
                onClick={() => (r.mowing || r.shift ? onClose() : onStart())}
              >
                <Briefcase size={18} />
                {r.mowing || r.shift ? 'Back to my shift' : 'Start my job'}
              </button>
            </TabsContent>
            <TabsContent value="available">
              <div className="menu-section-heading">
                <h3>
                  {work.remaining ? 'Pitch in around town' : 'All caught up!'}
                </h3>
                <p>
                  {work.remaining.toLocaleString()} tasks left · shared with
                  your neighbors
                </p>
              </div>
              <MenuSlots
                label="Jobs"
                pageSize={4}
                items={work.jobs.map((j) => ({
                  id: j.id,
                  content: (
                    <button
                      className="job-slot"
                      disabled={startDisabled || j.remaining === 0}
                      onClick={() => onStart(j.id)}
                    >
                      <Briefcase size={22} />
                      <strong>{j.name}</strong>
                      <small>
                        {j.remaining
                          ? `${j.remaining.toLocaleString()} ${j.unit} left`
                          : 'All done'}
                      </small>
                      <span>
                        {pay(j.id, j.id === r.job)} coins /{' '}
                        {j.id === 'mow' ? 'patch' : 'action'}
                      </span>
                    </button>
                  ),
                }))}
              />
            </TabsContent>
            <TabsContent value="career">
              <div className="menu-section-heading">
                <h3>Your calling</h3>
                <p>
                  {job.name} · Tier {tier} · {r.xp.toLocaleString()} XP
                </p>
              </div>
              <div className="work-profession">
                <label htmlFor="work-profession">Change profession</label>
                <select
                  id="work-profession"
                  value={career}
                  onChange={(e) => setCareer(e.target.value)}
                >
                  {JOBS.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
                <button
                  className="primary-button"
                  disabled={busy || !online || career === r.job}
                  onClick={() =>
                    onAction(
                      'job',
                      { job: career },
                      'A new calling, with all your progress kept.',
                    )
                  }
                >
                  Change my job
                </button>
              </div>
              <p className="menu-footnote">
                Your XP and education stay with you.
              </p>
              <button className="secondary-button full" onClick={onSchool}>
                <GraduationCap size={17} />
                Walk to school
              </button>
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <div className="activity-panel-body">
          <div className="menu-section-heading">
            <h3>Your progress</h3>
            <p>
              {job.name} · Tier {tier}
            </p>
          </div>
          <dl className="personal-stats">
            <div>
              <dt>Career experience</dt>
              <dd>{r.xp.toLocaleString()} XP</dd>
            </div>
            <div>
              <dt>Your savings</dt>
              <dd>{r.coins.toLocaleString()} coins</dd>
            </div>
          </dl>
          <h3 className="menu-minor-heading">Education</h3>
          <div className="progress-label">
            <span>Professional qualification</span>
            <strong>{Math.min(30, r.education)} / 30</strong>
          </div>
          <Progress
            className="progress"
            value={Math.min(100, (r.education / 30) * 100)}
            aria-label="Education progress"
          />
          <p>
            {r.education >= 30
              ? 'Qualification earned. Keep building experience in your career.'
              : r.lastStudy === new Date(now).toISOString().slice(0, 10)
                ? 'Today’s lesson is complete. Come back tomorrow.'
                : 'One lesson per day. Missing a day keeps your progress.'}
          </p>
          <button className="secondary-button full" onClick={onSchool}>
            <GraduationCap size={17} />
            Walk to school
          </button>
          <p className="menu-footnote">
            {online
              ? 'Progress saved to your account.'
              : 'Reconnecting to your town…'}
          </p>
        </div>
      )}
    </aside>
  );
}
