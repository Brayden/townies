import * as THREE from 'three';

// Avatar geometry is private; town palette materials are shared with scenery.
export function releaseAvatar(avatar:THREE.Group,sharedMaterials:ReadonlySet<THREE.Material>){
  const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  avatar.traverse(object=>{if(object instanceof THREE.Mesh){
    geometry.add(object.geometry);
    for(const material of Array.isArray(object.material)?object.material:[object.material])if(!sharedMaterials.has(material))materials.add(material);
  }});
  geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  avatar.removeFromParent();
}
