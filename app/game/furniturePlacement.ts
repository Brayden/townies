import type {PlacedFurniture} from './interiors';

type Point={x:number;z:number};
type Pointer={id:number;x:number;y:number;point:Point|null};
type PlacementState={editing:boolean;locked:boolean;draft:PlacedFurniture|null};
type Options={
 state:()=>PlacementState;
 select:(id:string)=>PlacedFurniture|null;
 preview:(piece:PlacedFurniture)=>void;
 commit:(piece:PlacedFurniture)=>void;
 cancel:()=>void;
};
export const snapFurniture=(piece:PlacedFurniture,point:Point,offset:Point={x:0,z:0}):PlacedFurniture=>({...piece,x:Math.round((point.x-offset.x)*2)/2||0,z:Math.round((point.z-offset.z)*2)/2||0});

// Screen-distance threshold distinguishes selecting a piece from dragging it.
// Keep the grabbed floor offset so a large piece does not jump under the cursor.
export function furniturePlacement(options:Options){
 let gesture:{id:number;x:number;y:number;piece:PlacedFurniture;offset:Point;selected:boolean;dragged:boolean}|null=null;
 return {
  get dragging(){return !!gesture?.dragged;},
  get active(){return gesture!==null;},
  down(p:Pointer,hit:string|null){
   const s=options.state();if(!s.editing||s.locked||gesture||!p.point)return;
   const selected=!s.draft,piece=s.draft??(hit?options.select(hit):null);if(!piece)return;
   gesture={id:p.id,x:p.x,y:p.y,piece,selected,dragged:false,offset:selected?{x:p.point.x-piece.x,z:p.point.z-piece.z}:{x:0,z:0}};
   if(!selected)options.preview(snapFurniture(piece,p.point));
  },
  move(p:Pointer,hover:boolean){
   const s=options.state();if(!s.editing||s.locked)return;
   if(gesture){
    if(p.id!==gesture.id||!p.point)return;
    if(Math.hypot(p.x-gesture.x,p.y-gesture.y)>8)gesture.dragged=true;
    if(gesture.dragged)options.preview(snapFurniture(s.draft??gesture.piece,p.point,gesture.offset));
   }else if(hover&&s.draft&&p.point)options.preview(snapFurniture(s.draft,p.point));
  },
  up(p:Pointer,inside:boolean){
   if(!gesture||p.id!==gesture.id)return;
   const g=gesture;gesture=null;const s=options.state();
   if(!inside||!p.point||!s.editing||s.locked){options.cancel();return;}
   if(!g.selected||g.dragged){const piece=snapFurniture(s.draft??g.piece,p.point,g.offset);options.preview(piece);options.commit(piece);}
  },
  cancel(){if(gesture){gesture=null;options.cancel();}},
 };
}
