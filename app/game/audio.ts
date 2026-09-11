export type AudioPreferences={music:boolean;effects:boolean;musicVolume:number;effectsVolume:number};
export type MusicStatus='idle'|'loading'|'playing'|'paused'|'error'|'unavailable';
export const AUDIO_STORAGE_KEY='townies-audio-v1';
export const DEFAULT_AUDIO:AudioPreferences={music:false,effects:false,musicVolume:.4,effectsVolume:.65};
export const MUSIC_URL='/audio/townies-daylight-v1.mp3';

export function audioPreferences(value:unknown):AudioPreferences{
  const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
  const volume=(key:'musicVolume'|'effectsVolume')=>typeof v[key]==='number'&&Number.isFinite(v[key])?Math.max(0,Math.min(1,v[key])):DEFAULT_AUDIO[key];
  return {music:v.music===true,effects:v.effects===true,musicVolume:volume('musicVolume'),effectsVolume:volume('effectsVolume')};
}

// One mixer per mounted game. It is unlocked only by a tap/click/key press.
export class GameAudio{
  private ctx:AudioContext|null=null;
  private musicGain:GainNode|null=null;
  private effectsGain:GainNode|null=null;
  private music:AudioBufferSourceNode|null=null;
  private buffer:AudioBuffer|null=null;
  private loading:Promise<void>|null=null;
  private request:AbortController|null=null;
  private sources=new Set<AudioScheduledSourceNode>();
  private noise:AudioBuffer|null=null;
  private preferences={...DEFAULT_AUDIO};
  private active=false;
  private visible=true;
  private disposed=false;
  private offset=0;
  private started=0;
  private status:MusicStatus='idle';
  private report:(status:MusicStatus)=>void;
  constructor(report:(status:MusicStatus)=>void=()=>{}){this.report=report}

  configure(value:AudioPreferences,active:boolean,visible:boolean){
    this.preferences=audioPreferences(value);this.active=active;this.visible=visible;
    this.sync();
  }
  private setStatus(status:MusicStatus){if(this.status!==status){this.status=status;this.report(status)}}
  private get audible(){return !this.disposed&&this.active&&this.visible}

  // Call synchronously from a user gesture, before awaiting downloads or renders.
  unlock(){
    if(!this.audible||(!this.preferences.music&&!this.preferences.effects))return;
    try{
      if(!this.ctx){
        const Audio=globalThis.AudioContext??(globalThis as typeof globalThis&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
        if(!Audio){this.setStatus('unavailable');return}
        const ctx=this.ctx=new Audio();
        this.musicGain=ctx.createGain();this.effectsGain=ctx.createGain();
        this.musicGain.gain.value=0;this.effectsGain.gain.value=0;
        this.musicGain.connect(ctx.destination);this.effectsGain.connect(ctx.destination);
        ctx.onstatechange=()=>{if(!this.disposed)this.sync()};
      }
      const ctx=this.ctx;
      if(ctx.state!=='running')void ctx.resume().then(()=>this.sync()).catch(()=>{if(!this.disposed)this.setStatus('paused')});
      this.sync();
    }catch{this.setStatus('unavailable')}
  }
  retry(){if(this.status==='error'){this.setStatus('idle');this.sync()}this.unlock()}
  wake(){if(this.ctx)this.unlock()}
  private gain(node:GainNode|null,value:number){
    if(!node||!this.ctx)return;
    node.gain.cancelScheduledValues(this.ctx.currentTime);
    node.gain.setTargetAtTime(value,this.ctx.currentTime,.04);
  }
  private sync(){
    if(this.disposed)return;
    const ctx=this.ctx,p=this.preferences;
    this.gain(this.effectsGain,this.audible&&p.effects?p.effectsVolume:0);
    if(!this.audible||!p.effects)this.stopEffects();
    if(!this.audible||!p.music||p.musicVolume===0){
      this.stopMusic();
      if(this.status!=='unavailable')this.setStatus(p.music?'paused':'idle');
      if(ctx?.state==='running'&&(!this.audible||(!p.music&&!p.effects)))void ctx.suspend().catch(()=>{});
      return;
    }
    if(!ctx||ctx.state!=='running'){if(this.status!=='unavailable')this.setStatus('paused');return}
    if(this.buffer){
      if(!this.music){
        const source=ctx.createBufferSource();source.buffer=this.buffer;source.loop=true;
        source.connect(this.musicGain!);this.started=ctx.currentTime;
        this.musicGain!.gain.setValueAtTime(0,ctx.currentTime);
        source.start(0,this.offset);this.music=source;
      }
      this.gain(this.musicGain,p.musicVolume);this.setStatus('playing');
    }else if(!this.loading&&this.status!=='error')this.load();
  }
  private load(){
    const ctx=this.ctx!;const request=this.request=new AbortController();
    this.setStatus('loading');
    this.loading=(async()=>{
      try{
        const response=await fetch(MUSIC_URL,{signal:request.signal});
        if(!response.ok)throw Error('Music unavailable');
        const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
        if(this.disposed||request.signal.aborted)return;
        this.buffer=buffer;
      }catch{if(!this.disposed&&!request.signal.aborted)this.setStatus('error')}
      finally{this.loading=null;if(!this.disposed)this.sync()}
    })();
  }
  private stopMusic(){
    if(!this.music||!this.ctx)return;
    this.offset=(this.offset+this.ctx.currentTime-this.started)%(this.buffer?.duration??1);
    this.music.stop();this.music.disconnect();this.music=null;
    this.musicGain!.gain.cancelScheduledValues(this.ctx.currentTime);this.musicGain!.gain.setValueAtTime(0,this.ctx.currentTime);
  }
  private stopEffects(){for(const source of this.sources){try{source.stop()}catch{}source.disconnect()}this.sources.clear()}
  private effectContext(){return this.audible&&this.preferences.effects&&this.preferences.effectsVolume>0&&this.ctx?.state==='running'?this.ctx:null}
  private track(source:AudioScheduledSourceNode,cleanup:()=>void){
    if(this.sources.size>=24){source.disconnect();cleanup();return false}
    this.sources.add(source);source.onended=()=>{source.disconnect();cleanup();this.sources.delete(source)};return true;
  }
  private pluck(frequency:number,at:number,volume:number,duration=.6){
    const ctx=this.ctx!,gain=ctx.createGain();gain.connect(this.effectsGain!);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    // The same soft fundamental + harmonics as the trailer's original score.
    const real=new Float32Array(4),imag=new Float32Array([0,1,.28,.09]);
    const oscillator=ctx.createOscillator();oscillator.setPeriodicWave(ctx.createPeriodicWave(real,imag));oscillator.frequency.value=frequency;oscillator.connect(gain);
    if(this.track(oscillator,()=>gain.disconnect())){oscillator.start(at);oscillator.stop(at+duration+.02)}
  }
  reward(){const ctx=this.effectContext();if(!ctx)return;[523.25,659.25,783.99].forEach((f,i)=>this.pluck(f,ctx.currentTime+i*.09,.07))}
  paper(stage:'release'|'impact'){
    const ctx=this.effectContext();if(!ctx)return;
    const at=ctx.currentTime;
    if(stage==='release'){
      if(!this.noise){this.noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.23),ctx.sampleRate);const values=this.noise.getChannelData(0);for(let i=0;i<values.length;i++)values[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/values.length)**2}
      const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
      source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=4200;gain.gain.value=.045;
      source.connect(filter);filter.connect(gain);gain.connect(this.effectsGain!);
      if(this.track(source,()=>{filter.disconnect();gain.disconnect()}))source.start(at);
    }else{
      // A light paper tap at the door; the reward chime waits for a saved delivery.
      const oscillator=ctx.createOscillator(),gain=ctx.createGain();
      oscillator.frequency.setValueAtTime(170,at);oscillator.frequency.exponentialRampToValueAtTime(65,at+.09);
      gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(.1,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+.11);
      oscillator.connect(gain);gain.connect(this.effectsGain!);
      if(this.track(oscillator,()=>gain.disconnect())){oscillator.start(at);oscillator.stop(at+.12)}
    }
  }
  paperReward(){const ctx=this.effectContext();if(ctx)this.pluck(1318.51,ctx.currentTime,.1)}
  dispose(){
    this.disposed=true;this.request?.abort();this.stopMusic();this.stopEffects();
    if(this.ctx){this.ctx.onstatechange=null;void this.ctx.close().catch(()=>{})}
    this.musicGain?.disconnect();this.effectsGain?.disconnect();this.buffer=null;this.noise=null;
  }
}
