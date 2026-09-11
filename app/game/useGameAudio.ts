'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AUDIO_STORAGE_KEY,DEFAULT_AUDIO,GameAudio,audioPreferences,type AudioPreferences,type MusicStatus} from './audio';

export function useGameAudio(active:boolean){
  const [preferences,setPreferences]=useState<AudioPreferences>({...DEFAULT_AUDIO});
  const [status,setStatus]=useState<MusicStatus>('idle');
  const mixer=useRef<GameAudio|null>(null),saved=useRef(preferences),playing=useRef(active);
  playing.current=active;
  useEffect(()=>{
    const audio=new GameAudio(setStatus);mixer.current=audio;
    const read=()=>{try{return audioPreferences(JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY)??'null'))}catch{return {...DEFAULT_AUDIO}}};
    saved.current=read();setPreferences(saved.current);
    const sync=()=>audio.configure(saved.current,playing.current,!document.hidden);
    const gesture=()=>audio.unlock();
    const visibility=()=>{sync();if(!document.hidden)audio.wake()};
    const storage=(event:StorageEvent)=>{if(event.key===AUDIO_STORAGE_KEY||event.key===null){saved.current=read();setPreferences(saved.current);sync()}};
    sync();
    document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);
    // Touch-end also covers browsers that require a completed touch gesture.
    document.addEventListener('touchend',gesture,{passive:true});
    document.addEventListener('visibilitychange',visibility);window.addEventListener('storage',storage);
    return()=>{document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);document.removeEventListener('touchend',gesture);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('storage',storage);audio.dispose();mixer.current=null};
  },[]);
  useEffect(()=>{mixer.current?.configure(saved.current,active,!document.hidden)},[active]);
  const change=useCallback((patch:Partial<AudioPreferences>)=>{
    const next=audioPreferences({...saved.current,...patch});saved.current=next;setPreferences(next);
    try{localStorage.setItem(AUDIO_STORAGE_KEY,JSON.stringify(next))}catch{/* Audio still works when storage is disabled. */}
    mixer.current?.configure(next,playing.current,!document.hidden);mixer.current?.unlock();
  },[]);
  const reward=useCallback(()=>mixer.current?.reward(),[]);
  const paper=useCallback((stage:'release'|'impact')=>mixer.current?.paper(stage),[]);
  const paperReward=useCallback(()=>mixer.current?.paperReward(),[]);
  const retry=useCallback(()=>mixer.current?.retry(),[]);
  return {preferences,status,change,reward,paper,paperReward,retry};
}
