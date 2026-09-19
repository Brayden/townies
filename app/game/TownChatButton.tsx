'use client';
import { MessageCircle } from 'lucide-react';
export default function TownChatButton({
  unread,
  open,
  onClick,
}: {
  unread: number;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`dock-button chat-dock-button ${open ? 'active' : ''}`}
      aria-label={`Chat${unread ? `, ${unread} unread ${unread === 1 ? 'message' : 'messages'}` : ''}`}
      aria-expanded={open}
      aria-controls="town-chat"
      onClick={onClick}
      title="Talk with your town"
    >
      <MessageCircle aria-hidden="true" />
      <span>Chat</span>
      {unread > 0 && (
        <span className="town-chat-unread" aria-hidden="true">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
