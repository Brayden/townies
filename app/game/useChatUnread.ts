'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {townConnection,townFetch} from './town-connection';
import {chatRead,mergeChatRead,readMessages,type ChatRead} from '../../shared/chat-read';

export function useChatUnread(resident:string|undefined,town:string|undefined,job:string|null|undefined,active:boolean){
  const scope=active&&resident&&town?`${resident}:${town}`:'';
  const [state,setState]=useState<{scope:string;counts:Record<string,number>}>({scope:'',counts:{}});
  const cursors=useRef<Record<string,ChatRead>>({}),refresh=useRef<(()=>void)|null>(null),scopeRef=useRef('');
  useEffect(()=>{
    scopeRef.current=scope;cursors.current={};setState({scope,counts:{}});if(!scope)return;
    const channels=[...new Set(['town',...(job?[job]:[])])];let alive=true,running=false,dirty=false,lastRead=0;
    const acknowledged:Record<string,ChatRead>={};
    const key=(channel:string)=>`townies-chat-read-v1:${scope}:${channel}`;
    const read=(channel:string)=>{try{return chatRead(JSON.parse(localStorage.getItem(key(channel))??'null'))}catch{return chatRead(null)}};
    for(const channel of channels)cursors.current[channel]=read(channel);
    const load=async()=>{
      if(!alive||document.hidden)return;if(running){dirty=true;return}running=true;
      try{
        const values=await Promise.all(channels.map(async channel=>{
          let cursor=cursors.current[channel];
          // Import older browser read progress, and retry unacknowledged reads after reconnecting.
          if(cursor.created&&JSON.stringify(cursor)!==JSON.stringify(acknowledged[channel])){
            const response=await townFetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',townId:town,channel,read:cursor})});
            if(!alive)return null;
            if(!response.ok&&response.status!==400)throw Error('Read progress unavailable');
            if(response.ok){
              const value=await response.json() as {read:ChatRead};
              if(!alive)return null;
              acknowledged[channel]=chatRead(value.read);
              cursors.current[channel]=JSON.stringify(cursors.current[channel])===JSON.stringify(cursor)?acknowledged[channel]:mergeChatRead(cursors.current[channel],acknowledged[channel]);
            }else if(JSON.stringify(cursors.current[channel])===JSON.stringify(cursor)){
              // A stale browser boundary may reference messages no longer retained.
              cursors.current[channel]=chatRead(null);
            }
          }
          cursor=cursors.current[channel];
          if(cursor.created&&JSON.stringify(cursor)!==JSON.stringify(acknowledged[channel])){dirty=true;return null}
          const signature=JSON.stringify(cursor);
          const params=new URLSearchParams({town:town!,channel,summary:'1'});
          const response=await townFetch('/api/chat?'+params);if(!response.ok)throw Error('Unread messages unavailable');
          const value=await response.json() as {unread:number;read:ChatRead};
          if(!alive)return null;
          if(signature!==JSON.stringify(cursors.current[channel])){dirty=true;return null}
          acknowledged[channel]=chatRead(value.read);
          cursors.current[channel]=mergeChatRead(cursor,acknowledged[channel]);
          try{localStorage.setItem(key(channel),JSON.stringify(cursors.current[channel]))}catch{}
          return {channel,signature:JSON.stringify(cursors.current[channel]),count:Math.max(0,Number(value.unread)||0)};
        }));
        if(!alive)return;
        const counts:Record<string,number>={};
        for(const value of values){if(!value)continue;if(value.signature!==JSON.stringify(cursors.current[value.channel])){dirty=true;continue}counts[value.channel]=value.count}
        setState(previous=>({scope,counts:{...(previous.scope===scope?previous.counts:{}),...counts}}));lastRead=Date.now();
      }catch{/* Keep the previous badge while reconnecting. */}
      finally{running=false;if(dirty&&alive){dirty=false;void load()}}
    };
    refresh.current=()=>void load();void load();
    const off=townConnection.on('chat',event=>{if(!event?.channel||channels.includes(event.channel))void load()});
    const visibility=()=>{if(!document.hidden)void load()};
    const storage=(event:StorageEvent)=>{if(event.key===null||channels.some(channel=>event.key===key(channel))){for(const channel of channels)cursors.current[channel]=mergeChatRead(cursors.current[channel],read(channel));void load()}};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('storage',storage);
    const timer=setInterval(()=>{if(!townConnection.connected()||Date.now()-lastRead>30000)void load()},5000);
    return()=>{alive=false;clearInterval(timer);off();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('storage',storage);refresh.current=null};
  },[scope,town,job]);
  const markRead=useCallback((channel:string,messages:{id:string;created:number}[])=>{
    if(!scope||scope!==scopeRef.current||document.hidden||!cursors.current[channel])return;
    const key=`townies-chat-read-v1:${scope}:${channel}`;let previous=cursors.current[channel];
    try{previous=mergeChatRead(previous,chatRead(JSON.parse(localStorage.getItem(key)??'null')))}catch{}
    const next=mergeChatRead(previous,readMessages(messages));if(JSON.stringify(next)===JSON.stringify(cursors.current[channel]))return;
    cursors.current[channel]=next;try{localStorage.setItem(key,JSON.stringify(next))}catch{}
    setState(value=>({scope,counts:{...(value.scope===scope?value.counts:{}),[channel]:0}}));refresh.current?.();
  },[scope]);
  const counts=state.scope===scope?state.counts:{};
  return {counts,total:(counts.town??0)+(job&&job!=='town'?counts[job]??0:0),markRead};
}
