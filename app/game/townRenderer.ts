import * as THREE from 'three';

export function createTownRenderer(lightweight=false){
  // A rejected high-performance context need not mean WebGL is unavailable.
  for(const light of lightweight?[true]:[false,true]){
    const canvas=document.createElement('canvas');
    let context:WebGL2RenderingContext|null=null;
    try{
      const options:WebGLContextAttributes={antialias:!light,alpha:false,powerPreference:light?'default':'high-performance'};
      // Own the context before constructing Three so a failed attempt can release it.
      context=canvas.getContext('webgl2',options);
      if(!context)throw new Error('Graphics context unavailable');
      const renderer=new THREE.WebGLRenderer({canvas,context,...options});
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,light?1:1.7));
      renderer.shadowMap.enabled=!light;
      return {renderer,lightweight:light};
    }catch(error){context?.getExtension('WEBGL_lose_context')?.loseContext();if(light)throw error}
  }
  throw new Error('The graphics view could not start.');
}

export function releaseTownRenderer(renderer:THREE.WebGLRenderer){
  // dispose frees Three's resources; loseContext also releases the browser slot.
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}
