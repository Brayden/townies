// Quality changes preserve the scene, camera and player state.
export const GRAPHICS_LEVELS=[
  {name:'High',ratio:2,pixels:3_000_000,shadows:true},
  {name:'Balanced',ratio:2,pixels:2_000_000,shadows:false},
  {name:'Light',ratio:1.5,pixels:1_500_000,shadows:false},
  {name:'Low',ratio:1,pixels:1_000_000,shadows:false},
] as const;

export class AdaptiveGraphics{
  level:number;
  private last:number;
  private readyAt:number;
  private upgradeAfter:number;
  private elapsed=0;
  private frames=0;
  private slowWindows=0;
  private fastTime=0;
  constructor(level=0,now=0){
    this.level=level;this.last=now;this.readyAt=now+8000;
    this.upgradeAfter=now+(level?90000:0);
  }
  private resetWindow(){this.elapsed=0;this.frames=0}
  suspend(now:number){this.last=now;this.readyAt=now+8000;this.resetWindow();this.slowWindows=0;this.fastTime=0}
  recover(now:number){this.level=Math.max(1,this.level);this.suspend(now);this.upgradeAfter=now+90000}
  sample(now:number,active=true):number|null{
    const delta=now-this.last;this.last=now;
    // Background throttling, device sleep and loading are not GPU benchmarks.
    if(!active||delta>1000||delta<=0){this.suspend(now);return null}
    if(now<this.readyAt)return null;
    this.elapsed+=Math.min(delta,250);this.frames++;
    if(this.elapsed<2000||this.frames<4)return null;
    const mean=this.elapsed/this.frames,windowTime=this.elapsed;this.resetWindow();
    // A steady 30 FPS (common in phone power-saving modes) is acceptable.
    this.slowWindows=mean>36?this.slowWindows+1:0;
    this.fastTime=mean<18.5?this.fastTime+windowTime:0;
    if(this.slowWindows>=2&&this.level<GRAPHICS_LEVELS.length-1){
      this.level++;this.upgradeAfter=now+90000;this.suspend(now);return this.level;
    }
    if(this.fastTime>=30000&&now>=this.upgradeAfter&&this.level>0){
      this.level--;this.upgradeAfter=now+30000;this.suspend(now);return this.level;
    }
    return null;
  }
}
