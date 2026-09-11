'use client';
import {Music2,Volume2} from 'lucide-react';
import type {useGameAudio} from './useGameAudio';

export default function AudioSettings({audio}:{audio:ReturnType<typeof useGameAudio>}){
  const {preferences:p,change,status}=audio;
  return <section className="audio-settings" aria-labelledby="audio-heading">
    <h3 id="audio-heading">Sound & music</h3>
    <p className="audio-hint">A little soundtrack for life in town. Your choices are saved on this device.</p>
    {(['music','effects'] as const).map(channel=>{
      const music=channel==='music',title=music?'Background music':'Sound effects',key=music?'musicVolume':'effectsVolume',Icon=music?Music2:Volume2;
      return <div className="audio-channel" key={channel}>
        <div className="audio-channel-heading"><Icon size={20} aria-hidden="true"/><div><strong id={`audio-${channel}-label`}>{title}</strong><p>{music?'Daylight in Townies · original soundtrack':'Paper throws, doorstep taps & rewards'}</p></div><button type="button" role="switch" aria-checked={p[channel]} aria-labelledby={`audio-${channel}-label`} className="audio-toggle" onClick={()=>change({[channel]:!p[channel]})}><span aria-hidden="true"/>{p[channel]?'On':'Off'}</button></div>
        <label className="audio-volume"><span>{title} volume</span><input aria-label={`${title} volume`} type="range" min="0" max="100" step="5" value={Math.round(p[key]*100)} disabled={!p[channel]} onChange={e=>change({[key]:Number(e.target.value)/100})}/><output>{Math.round(p[key]*100)}%</output></label>
      </div>;
    })}
    <p className="audio-hint">Pauses while the game is in the background.</p>
    <div aria-live="polite">{p.music&&status==='loading'&&<p className="audio-hint">Getting the music ready…</p>}{status==='unavailable'&&<p className="audio-hint">Audio isn’t available in this browser.</p>}{p.music&&status==='error'&&<p className="audio-hint">The music couldn’t load. <button className="audio-retry" onClick={audio.retry}>Try again</button></p>}</div>
  </section>;
}
