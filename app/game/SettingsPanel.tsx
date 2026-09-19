'use client';
import { useState, type ComponentProps } from 'react';
import { Music2, UserRound, Gamepad2, MapPin } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AccountSettings } from '../account/AccountGate';
import AudioSettings from './AudioSettings';
import MoveTownPanel from './MoveTownPanel';
import type { TownState } from './data';

type Props = {
  audio: ComponentProps<typeof AudioSettings>['audio'];
  data: TownState | null;
  active: boolean;
  busy: boolean;
  onRequest: ComponentProps<typeof MoveTownPanel>['onRequest'];
  onMove: ComponentProps<typeof MoveTownPanel>['onMove'];
};
const controls = {
  desktop: [
    ['Move', 'W A S D / Arrow keys'],
    ['Walk to a place', 'Click the ground'],
    ['Pan camera', 'Drag / Alt + arrows'],
    ['Rotate & tilt', 'Right-drag · Q / R rotate'],
    ['Zoom', 'Mouse wheel / + / −'],
    ['Work nearby', 'E · Space to throw a paper'],
  ],
  touch: [
    ['Move', 'Thumb control'],
    ['Walk to a place', 'Tap the ground'],
    ['Pan camera', 'Drag the map'],
    ['Rotate camera', 'Twist with two fingers'],
    ['Zoom', 'Pinch with two fingers'],
    ['Work nearby', 'Tap the action button'],
  ],
};
export default function SettingsPanel({
  audio,
  data,
  active,
  busy,
  onRequest,
  onMove,
}: Props) {
  const [input, setInput] = useState<'desktop' | 'touch'>('desktop');
  return (
    <Tabs className="game-settings" defaultValue="sound">
      <TabsList className="game-menu-tabs" aria-label="Settings categories">
        <TabsTrigger value="sound">
          <Music2 size={18} />
          Sound
        </TabsTrigger>
        <TabsTrigger value="account">
          <UserRound size={18} />
          Account
        </TabsTrigger>
        <TabsTrigger value="controls">
          <Gamepad2 size={18} />
          Controls
        </TabsTrigger>
        <TabsTrigger value="towns">
          <MapPin size={18} />
          Towns
        </TabsTrigger>
      </TabsList>
      <div className="game-menu-body">
        <TabsContent value="sound">
          <AudioSettings audio={audio} />
        </TabsContent>
        <TabsContent value="account">
          <header className="menu-section-heading">
            <h3>Your account</h3>
            <p>Your Townie and progress travel with your login.</p>
          </header>
          <AccountSettings />
        </TabsContent>
        <TabsContent value="controls">
          <header className="menu-section-heading">
            <h3>Controls</h3>
            <p>Find your way around town.</p>
          </header>
          <div className="menu-segmented" aria-label="Control device">
            {(['desktop', 'touch'] as const).map((device) => (
              <button
                key={device}
                aria-pressed={input === device}
                onClick={() => setInput(device)}
              >
                {device === 'desktop' ? 'Keyboard & mouse' : 'Touch screen'}
              </button>
            ))}
          </div>
          <dl className="control-bindings">
            {controls[input].map(([action, binding]) => (
              <div key={action}>
                <dt>{action}</dt>
                <dd>{binding}</dd>
              </div>
            ))}
          </dl>
          <p className="menu-footnote">
            Movement follows your camera. Start moving to return to your Townie.
          </p>
        </TabsContent>
        <TabsContent value="towns">
          {active && data ? (
            <MoveTownPanel
              data={data}
              busy={busy}
              onRequest={onRequest}
              onMove={onMove}
            />
          ) : (
            <div className="menu-section-heading">
              <h3>Find your next town</h3>
              <p>
                Choose your first home and profession to unlock moving between
                towns.
              </p>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
