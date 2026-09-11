import * as THREE from 'three';

import {AdaptiveGraphics,GRAPHICS_LEVELS} from './adaptiveGraphics';

const RECOVERY_KEY='townies-graphics-recovery-at';
let sessionLevel=0;
const states=new WeakMap<THREE.WebGLRenderer,{policy:AdaptiveGraphics;width:number;height:number;maxSize:number}>();
export function rememberLightGraphics(){
  sessionLevel=Math.max(1,sessionLevel);
  try{localStorage.setItem(RECOVERY_KEY,String(Date.now()))}catch{}
}
function recentGraphicsFailure(){
  try{const at=Number(localStorage.getItem(RECOVERY_KEY));return at>0&&Date.now()-at>=0&&Date.now()-at<15*60*1000}catch{return false}
}

export function createTownRenderer(lightweight=false){
  // Ignore the old permanent mobile/low-memory flag: measured performance decides.
  const lightFirst=lightweight||recentGraphicsFailure();
  const failures:string[]=[];
  // The second attempt drops multisampling and the dedicated-GPU preference.
  for(const light of lightFirst?[true]:[false,true]){
    const canvas=document.createElement('canvas');
    let context:WebGL2RenderingContext|null=null,renderer:THREE.WebGLRenderer|undefined,status='';
    const creationError=(event:Event)=>{status=(event as WebGLContextEvent).statusMessage||'Context creation was refused'};
    canvas.addEventListener('webglcontextcreationerror',creationError);
    try{
      const options:WebGLContextAttributes={antialias:!light,alpha:false,powerPreference:light?'default':'high-performance'};
      context=canvas.getContext('webgl2',options);
      if(!context||context.isContextLost()||!context.getContextAttributes())throw new Error(status||'WebGL 2 context unavailable');
      renderer=new THREE.WebGLRenderer({canvas,context,...options});
      const level=Math.max(sessionLevel,light?1:0);
      renderer.shadowMap.enabled=GRAPHICS_LEVELS[level].shadows;
      const viewport=context.getParameter(context.MAX_VIEWPORT_DIMS) as Int32Array;
      states.set(renderer,{policy:new AdaptiveGraphics(level,performance.now()),width:1,height:1,maxSize:Math.min(renderer.capabilities.maxTextureSize,viewport[0],viewport[1])});
      if((light&&!lightFirst)||lightweight)rememberLightGraphics();
      return {renderer,lightweight:light};
    }catch(error){
      failures.push(`${light?'Light':'Standard'}: ${status||(error instanceof Error?error.message:String(error))}`);
      try{renderer?.dispose();context?.getExtension('WEBGL_lose_context')?.loseContext()}catch{}
    }finally{canvas.removeEventListener('webglcontextcreationerror',creationError)}
  }
  throw new Error(failures.join('\n'));
}

export function resizeTownRenderer(renderer:THREE.WebGLRenderer,width:number,height:number){
  const w=Math.max(1,width),h=Math.max(1,height),state=states.get(renderer);
  if(!state)return;
  if(state.width!==w||state.height!==h)state.policy.suspend(performance.now());
  state.width=w;state.height=h;
  const quality=GRAPHICS_LEVELS[state.policy.level];
  const ratio=Math.min(globalThis.devicePixelRatio||1,quality.ratio,Math.sqrt(quality.pixels/(w*h)),state.maxSize/w,state.maxSize/h);
  if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
  renderer.setSize(w,h);
}

function applyQuality(renderer:THREE.WebGLRenderer,scene:THREE.Scene){
  const state=states.get(renderer);if(!state)return;
  const shadows=GRAPHICS_LEVELS[state.policy.level].shadows;
  if(renderer.shadowMap.enabled!==shadows){
    renderer.shadowMap.enabled=shadows;
    scene.traverse(object=>{
      if(object instanceof THREE.Mesh){const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(m=>m.needsUpdate=true)}
      if(!shadows&&object instanceof THREE.Light&&'shadow' in object){
        const shadow=(object as THREE.DirectionalLight).shadow;
        shadow?.dispose();if(shadow){shadow.map=null;shadow.mapPass=null;}
      }
    });
    renderer.shadowMap.needsUpdate=true;
  }
  resizeTownRenderer(renderer,state.width,state.height);
}

export function updateTownGraphics(renderer:THREE.WebGLRenderer,scene:THREE.Scene,now:number){
  const state=states.get(renderer);if(!state)return;
  const active=!document.hidden&&!renderer.getContext().isContextLost();
  if(state.policy.sample(now,active)!==null){sessionLevel=state.policy.level;applyQuality(renderer,scene)}
}
export function recoverTownGraphics(renderer:THREE.WebGLRenderer,scene:THREE.Scene){
  rememberLightGraphics();const state=states.get(renderer);if(!state)return;
  state.policy.recover(performance.now());sessionLevel=state.policy.level;applyQuality(renderer,scene);
}

export function graphicsDetails(error:unknown){
  return `Townies adaptive graphics v3\n${navigator.userAgent}\nScreen: ${innerWidth} × ${innerHeight}, DPR ${devicePixelRatio||1}\n${error instanceof Error?error.message:String(error)}`;
}
export function releaseTownRenderer(renderer:THREE.WebGLRenderer){
  states.delete(renderer);
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}
