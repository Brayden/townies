// Shared layout keeps garden beds, scenery, and mowable ground in agreement.
export const GARDEN_AREAS=[
 {id:'park-garden',name:'Pocket Park Gardens',x:-16,z:-7,width:7,depth:6},
 {id:'school-garden',name:'School Learning Garden',x:-8,z:-22,width:7,depth:6},
 {id:'riverside-garden',name:'Riverside Gardens',x:38,z:16,width:8,depth:7},
 {id:'meadow-garden',name:'Meadow Commons',x:-36,z:16,width:9,depth:7},
];
export function inCommunityGarden(x:number,z:number,padding=0){return GARDEN_AREAS.some(a=>Math.abs(x-a.x)<a.width/2+padding&&Math.abs(z-a.z)<a.depth/2+padding)}
