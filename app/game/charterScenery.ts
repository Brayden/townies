import * as THREE from 'three';
import {TERRITORIES,PLOTS,FERRY_STOPS,plotOwned,plotOccupied,locationOf,nodeById,townBuildings,expansionRoads,type PlanningState} from './charters.ts';
import type {Kit} from './civicScenery.ts';
export function charterScenery(k:Kit,s:PlanningState){const {box,ball,cylinder,roof,bench,flower}=k,root=new THREE.Group();
 for(const t of TERRITORIES.filter(t=>s.territories.includes(t.id))){box(t.width,.65,t.depth,'#a7ab79',t.x,-.35,t.z,root);box(t.width,.08,t.depth,'#9abb72',t.x,.08,t.z,root);for(const dx of [-t.width/2+.7,t.width/2-.7])for(let z=t.z-t.depth/2+2;z<t.z+t.depth/2-1;z+=6){cylinder(.13,.8,'#9f8057',t.x+dx,.5,z,root);ball(.55,'#7d9d58',t.x+dx,1.2,z,root)}}
 for(const r of expansionRoads(s))box(r.width,.045,r.depth,'#ddcca7',r.x,.17,r.z,root);
 for(const p of PLOTS.filter(p=>plotOwned(p,s)&&!plotOccupied(p.id,s))){box(p.width-.3,.035,p.depth-.3,'#b1c984',p.x,.15,p.z,root);for(const dx of [-p.width/2+.4,p.width/2-.4])for(const dz of [-p.depth/2+.4,p.depth/2-.4]){box(.13,.65,.13,'#b39261',p.x+dx,.46,p.z+dz,root);box(.35,.14,.35,'#ece0ac',p.x+dx,.77,p.z+dz,root)}}

 const buildings=townBuildings(s);
 for(const i of s.institutions){if(i.node==='root'&&i.id!=='harbor')continue;const b=buildings.find(b=>b.id===i.id)!;root.add(buildingModel(k,b,nodeById(i.node)?.style??'harbor'));}
 for(const building of s.buildings){const p=locationOf(building),b=buildings.find(b=>b.id===`site-${building.plot}`)??{id:'garden',...p,name:'Civic garden',width:7,depth:4,height:1,color:'#b1c984',roof:'#719088',action:'town'};root.add(buildingModel(k,b,building.kind==='pets'?'pets':building.kind==='garden'?'garden':building.kind==='food'?'market':'workshop'));}
 if(s.territories.includes('island'))for(const f of FERRY_STOPS){box(3,.2,2,'#bc956c',f.x,.32,f.z,root);for(const x of [-1.4,1.4])box(.13,1.4,.13,'#917958',f.x+x,.9,f.z+.7,root);box(2.2,.8,.16,'#7b9c96',f.x,1.7,f.z+.7,root);const boat=ball(1,'#c7a16b',f.x,0,f.z+2.1,root);boat.scale.set(1.5,.28,.7);box(1.4,.75,.8,'#f1e4bc',f.x,.65,f.z+2.1,root);roof(1.8,1,.45,'#7899a2',f.x,1.03,f.z+2.1,root);}
 return root;
}

export function buildingModel(k:Kit,b:ReturnType<typeof townBuildings>[number],style:string){const {box,ball,cylinder,roof,flower,bench}=k,g=new THREE.Group();g.position.set(b.x,0,b.z);g.rotation.y=(b.rotation??0)*Math.PI/180;const w=b.modelWidth??b.width,d=b.modelDepth??b.depth,h=b.height;
 if(style==='garden'){for(const x of [-2,2])bench(x,0,g);for(let i=0;i<20;i++)flower(-3+i%10*.65,-2+Math.floor(i/10)*3,'#e5b2bd',g);cylinder(1,.25,'#d5c19a',0,.35,0,g);return g;}
  box(w+.25,.25,d+.25,'#c3b391',0,.22,0,g);box(w,h,d,b.color,0,h/2+.35,0,g);box(w+.3,.22,d+.3,'#ead8b1',0,h+.35,0,g);
  if(style==='glass'){roof(w+.3,d+.3,h*.38,b.roof,0,h+.4,0,g);for(let x=-w/2+.4;x<w/2;x+=1.3){box(.09,h+.1,.1,'#f6efd0',x,h/2+.4,d/2+.06,g);box(.08,.12,d+.1,'#e4e5c8',x,h+.5,0,g)}for(const y of [1.1,h*.65])box(w,.08,.1,'#edf0d4',0,y,d/2+.12,g);}
  else if(style==='museum'||style==='observatory'){box(w*.45,1,d*.8,b.color,0,h+.7,0,g);const dome=ball(Math.min(w,d)*.35,b.roof,0,h+1.3,0,g);dome.scale.y=.75;if(style==='observatory'){const tube=cylinder(.19,2.8,'#c3d2cc',.4,h+2.2,.4,g);tube.rotation.z=-.75;}else for(const x of [-w*.4,w*.4])roof(w*.25,d,1.4,b.roof,x,h+.4,0,g);}
  else if(style==='mall'){roof(w*.48,d+.3,1.3,'#9bbfc0',0,h+.45,0,g);for(const x of [-w*.36,w*.36])box(w*.26,.45,d+.3,b.roof,x,h+.6,0,g);}
  else{roof(w+.65,d+.5,style==='theater'?2:1.5,b.roof,0,h+.45,0,g);}
  if(['harbor','campus','workshop'].includes(style)){const x=style==='harbor'?w*.3:0;box(1.5,2,1.5,b.color,x,h+1.5,0,g);roof(2,2,.8,b.roof,x,h+2.5,0,g);cylinder(.25,.35,'#efd89f',x,h+3.4,0,g);}
  if(style==='workshop'){for(const x of [-w*.28,w*.28]){box(.4,1.3,.4,'#927c5c',x,h+1.4,0,g);box(2.5,.15,.15,'#c2a26a',x,h+2,0,g)}}
  for(let x=-w/2+1;x<w/2-.4;x+=2){for(let y=1.7;y<h;y+=2){box(1.05,1.2,.13,'#f6e8c6',x,y,d/2+.08,g);box(.82,.98,.08,'#7baeb5',x,y,d/2+.18,g)}if(['campus','museum','theater'].includes(style))cylinder(.15,h*.68,'#f1e4be',x,h*.34+.3,d/2+.3,g);}
  box(1.4,2,.18,'#55776f',0,1.3,d/2+.22,g);box(2.6,.15,1,'#d8c59d',0,.25,d/2+.6,g);roof(Math.min(w,5),1.5,.55,style==='theater'?'#b17b7d':b.roof,0,2.5,d/2+.6,g);
  if(['pets','market','festival','mall','theater'].includes(style)){for(let x=-w/2+.3;x<w/2;x+=.65)box(.65,.16,1.3,Math.round(x/.65)%2?'#f8e9c3':b.roof,x,2.7,d/2+.6,g);}
  if(style==='festival'||style==='theater')for(const x of [-w*.4,w*.4]){box(.09,2,.09,'#aa8b5a',x,h+2,0,g);box(.75,.7,.05,'#e7bf70',x+.35,h+2.5,0,g);}
  if(style==='pets'){box(2.5,.85,.15,'#eee1bf',0,3.15,d/2+.18,g);const pad=ball(.22,'#946a89',0,3.04,d/2+.3,g);pad.scale.set(1,.75,.24);for(const [x,y]of [[-.36,3.3],[-.13,3.46],[.13,3.46],[.36,3.3]]){const toe=ball(.12,'#946a89',x,y,d/2+.3,g);toe.scale.z=.35;}for(const x of [-2.3,2.3]){cylinder(.25,.1,'#8ba7a5',x,.36,d/2+.5,g);}}
  for(const x of [-w/2+.6,w/2-.6]){cylinder(.35,.45,'#bb9369',x,.5,d/2+.5,g);for(let j=0;j<3;j++){const flowers=new THREE.Group();flowers.position.y=.55;g.add(flowers);flower(x+(j-1)*.2,d/2+.5,j%2?'#f4d896':'#dba4b5',flowers)}}
 return g;
}
