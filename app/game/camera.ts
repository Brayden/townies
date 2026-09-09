export const DEFAULT_YAW=Math.atan2(24,37);
export const DEFAULT_PITCH=Math.atan2(31,Math.hypot(24,37));
export function clampPitch(pitch:number){return Math.max(Math.PI/9,Math.min(Math.PI*4/9,pitch))}
export function screenToGround(x:number,y:number,yaw:number){return {x:x*Math.cos(yaw)+y*Math.sin(yaw),z:-x*Math.sin(yaw)+y*Math.cos(yaw)}}
export function cameraOffset(yaw:number,pitch:number,radius=53.91){return {x:Math.sin(yaw)*Math.cos(pitch)*radius,y:Math.sin(pitch)*radius,z:Math.cos(yaw)*Math.cos(pitch)*radius}}
