'use client';
import { Home, Briefcase, BookOpen, Users } from 'lucide-react';
import TownChatButton from './TownChatButton';
export type ActivityTab = 'home' | 'work' | 'journal' | 'town';
export default function ActivityDock({
  selected,
  unread,
  chatOpen,
  onSelect,
  onChat,
}: {
  selected: ActivityTab | null;
  unread: number;
  chatOpen: boolean;
  onSelect: (tab: ActivityTab) => void;
  onChat: () => void;
}) {
  return (
    <nav className="hud bottom-dock paper" aria-label="Town activities">
      {(
        [
          { id: 'home', label: 'Home', Icon: Home },
          { id: 'work', label: 'Work', Icon: Briefcase },
          { id: 'journal', label: 'Journal', Icon: BookOpen },
        ] as const
      ).map(({ id, label, Icon }) => (
        <button
          className={`dock-button ${selected === id ? 'active' : ''}`}
          key={id}
          aria-pressed={selected === id}
          onClick={() => onSelect(id)}
        >
          <Icon aria-hidden="true" />
          {label}
        </button>
      ))}
      <TownChatButton unread={unread} open={chatOpen} onClick={onChat} />
      <button
        className={`dock-button ${selected === 'town' ? 'active' : ''}`}
        aria-pressed={selected === 'town'}
        onClick={() => onSelect('town')}
      >
        <Users aria-hidden="true" />
        Town
      </button>
    </nav>
  );
}
