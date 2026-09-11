'use client';
import {MessageCircle} from 'lucide-react';
export default function TownChatButton({unread,open,onClick}:{unread:number;open:boolean;onClick:()=>void}){
 return <div className="town-chat-anchor"><button type="button" className="town-chat-launch" aria-label={`Town chat${unread?`, ${unread} unread ${unread===1?'message':'messages'}`:''}`} aria-expanded={open} aria-controls="town-chat" onClick={onClick} title="Talk with your town"><MessageCircle size={21} aria-hidden="true"/><span>Town chat</span>{unread>0&&<span className="town-chat-unread" aria-hidden="true">{unread>99?'99+':unread}</span>}</button></div>;
}
