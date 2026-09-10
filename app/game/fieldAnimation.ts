export const FIELD_DURATION={deliver:1250,clean:1050};
export function fieldPose(job:string,elapsed:number,origin:{x:number;z:number},target:{x:number;z:number},reduced=false){
 const duration=job==='deliver'?FIELD_DURATION.deliver:FIELD_DURATION.clean,t=Math.max(0,Math.min(1,elapsed/duration));const ease=(v:number)=>v*v*(3-2*v);
 if(job==='deliver'){const move=ease(Math.max(0,Math.min(1,(t-.16)/.64))),settle=Math.max(0,(t-.8)/.2);return{x:origin.x+(target.x-origin.x)*move,y:1.05*(1-move)+.655*move+(reduced?0:Math.sin(move*Math.PI)*.36+Math.sin(settle*Math.PI*2)*.035*(1-settle)),z:origin.z+(target.z-origin.z)*move,rotation:reduced?0:Math.sin(move*Math.PI)*.12,bend:reduced?0:Math.sin(t*Math.PI)*.26,scale:1,done:t===1};}
 const lift=ease(Math.max(0,Math.min(1,(t-.28)/.57)));return{x:target.x+(origin.x-target.x)*lift,y:.28+.65*lift+(reduced?0:Math.sin(lift*Math.PI)*.25),z:target.z+(origin.z-target.z)*lift,rotation:reduced?0:lift*.8,bend:reduced?0:Math.sin(Math.min(1,t/.72)*Math.PI)*.42,scale:t>.83?Math.max(0,(1-t)/.17):1,done:t===1};
}
