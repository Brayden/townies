export type ChatRead={created:number;ids:string[]};
export const EMPTY_CHAT_READ:ChatRead={created:0,ids:[]};
export function chatRead(value:unknown):ChatRead{
  const v=value as Partial<ChatRead>|null;
  return {created:Number.isSafeInteger(v?.created)&&Number(v?.created)>=0?Number(v?.created):0,ids:Array.isArray(v?.ids)?[...new Set(v.ids.filter(id=>typeof id==='string'&&/^[a-zA-Z0-9-]{16,50}$/.test(id)))].slice(0,60):[]};
}
export function mergeChatRead(a:ChatRead,b:ChatRead):ChatRead{
  if(a.created!==b.created)return a.created>b.created?a:b;
  return {created:a.created,ids:[...new Set([...a.ids,...b.ids])].sort().slice(0,60)};
}
export function readMessages(messages:{id:string;created:number}[]):ChatRead{
  const created=messages.reduce((n,m)=>Math.max(n,m.created),0);
  return chatRead({created,ids:messages.filter(m=>m.created===created).map(m=>m.id)});
}
