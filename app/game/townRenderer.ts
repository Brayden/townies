import * as THREE from 'three';

const LIGHT_GRAPHICS_KEY='townies-light-graphics';
export function rememberLightGraphics(){try{localStorage.setItem(LIGHT_GRAPHICS_KEY,'1')}catch{/* Private browsing may disallow storage. */}}
export function prefersLightGraphics(){
  try{if(localStorage.getItem(LIGHT_GRAPHICS_KEY)==='1')return true}catch{}
  const memory=(navigator as Navigator&{deviceMemory?:number}).deviceMemory;
  return window.matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(memory!==undefined&&memory<=4);
}

export function createTownRenderer(lightweight=false){
  const lightFirst=lightweight||prefersLightGraphics();
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
      renderer.shadowMap.enabled=!light;
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
  const w=Math.max(1,width),h=Math.max(1,height),light=!renderer.shadowMap.enabled;
  // Bound the framebuffer even on large Retina displays and high-DPI phones.
  const ratio=Math.min(globalThis.devicePixelRatio||1,light?1:1.7,Math.sqrt((light?1_200_000:3_000_000)/(w*h)));
  if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
  renderer.setSize(w,h);
}

export function graphicsDetails(error:unknown){
  return `Townies graphics recovery v2\n${navigator.userAgent}\nScreen: ${innerWidth} × ${innerHeight}, DPR ${devicePixelRatio||1}\n${error instanceof Error?error.message:String(error)}`;
}
export function releaseTownRenderer(renderer:THREE.WebGLRenderer){
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}
