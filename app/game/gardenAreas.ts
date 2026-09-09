// Shared layout keeps garden beds, scenery, and mowable ground in agreement.
export const GARDEN_AREAS=[
 {id:'park-garden',name:'Pocket Park Gardens',x:-49,z:9,width:12,depth:10},
 {id:'school-garden',name:'School Learning Garden',x:9,z:-29,width:12,depth:8},
 {id:'riverside-garden',name:'Riverside Gardens',x:47,z:-16,width:12,depth:5},
 {id:'meadow-garden',name:'Meadow Commons',x:47,z:17.7,width:12,depth:2.8},
];
export function inCommunityGarden(x:number,z:number,padding=0){return GARDEN_AREAS.some(a=>Math.abs(x-a.x)<a.width/2+padding&&Math.abs(z-a.z)<a.depth/2+padding)}
