export type Point3={x:number;y:number;z:number};
export type PaperThrow={id:number;target:string;at:number;origin:{x:number;z:number};confirmed:boolean;coins?:number;xp?:number;tax?:number};
export const PAPER_TIMING={release:90,impact:620,drop:900,land:1040,end:1140};
export function paperDestination(home:{x:number;z:number}){
 return {door:{x:home.x+.55,y:1.08,z:home.z+2.19},porch:{x:home.x+.46,y:.50,z:home.z+2.37}};
}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(t:number)=>t*t*(3-2*t);
const lerp=(a:Point3,b:Point3,t:number)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),z:mix(a.z,b.z,t)});
export function paperPose(elapsed:number,origin:Point3,home:{x:number;z:number},reducedMotion=false){
 const {door,porch}=paperDestination(home),t=Math.max(0,elapsed);
 if(reducedMotion){const f=smooth(clamp(t/220));return {position:lerp(origin,porch,f),rotation:{x:0,y:.25,z:0},scale:{x:1,y:1,z:1},phase:t<220?'flight':'settled',landed:t>=220};}
 let position=origin,pitch=0,yaw=.25,roll=0,sx=1,sy=1,sz=1,phase='windup';
 if(t>=PAPER_TIMING.release&&t<PAPER_TIMING.impact){
  phase='flight';const f=clamp((t-PAPER_TIMING.release)/(PAPER_TIMING.impact-PAPER_TIMING.release)),v=1-f;
  // A frontward control point steers side-on mailbox throws around the cottage corner.
  const front=Math.max(home.z+3.5,origin.z),a={x:origin.x,y:origin.y+1.25,z:front},b={x:door.x,y:door.y+.85,z:front};
  position={x:v*v*v*origin.x+3*v*v*f*a.x+3*v*f*f*b.x+f*f*f*door.x,y:v*v*v*origin.y+3*v*v*f*a.y+3*v*f*f*b.y+f*f*f*door.y,z:v*v*v*origin.z+3*v*v*f*a.z+3*v*f*f*b.z+f*f*f*door.z};
  pitch=Math.sin(f*Math.PI)*.45;yaw=.25+Math.PI*4*f;roll=Math.sin(f*Math.PI*2)*.2;
 }else if(t>=PAPER_TIMING.impact&&t<PAPER_TIMING.drop){
  phase='door-bounce';const f=clamp((t-PAPER_TIMING.impact)/(PAPER_TIMING.drop-PAPER_TIMING.impact));
  const first={x:porch.x+.06,y:porch.y,z:porch.z-.05};position=lerp(door,first,f);position.y=door.y+(first.y-door.y)*f*f+Math.sin(f*Math.PI)*.08;
  pitch=-Math.sin(f*Math.PI)*.65;yaw=.25+Math.PI*4;roll=Math.sin(f*Math.PI)*.16;
  const hit=Math.max(0,1-f*6);sx=1+hit*.15;sy=1-hit*.32;sz=1+hit*.08;
 }else if(t>=PAPER_TIMING.drop&&t<PAPER_TIMING.land){
  phase='porch-bounce';const f=clamp((t-PAPER_TIMING.drop)/(PAPER_TIMING.land-PAPER_TIMING.drop));position=lerp({x:porch.x+.06,y:porch.y,z:porch.z-.05},porch,smooth(f));position.y+=Math.sin(f*Math.PI)*.105;pitch=Math.sin(f*Math.PI)*.22;yaw=.25+Math.PI*4;roll=-Math.sin(f*Math.PI)*.08;
 }else if(t>=PAPER_TIMING.land){phase='settled';position=porch;const f=clamp((t-PAPER_TIMING.land)/(PAPER_TIMING.end-PAPER_TIMING.land));sy=1-Math.sin(f*Math.PI)*.15;yaw=.25+Math.PI*4;}
 return {position,rotation:{x:pitch,y:yaw,z:roll},scale:{x:sx,y:sy,z:sz},phase,landed:t>=PAPER_TIMING.end};
}
