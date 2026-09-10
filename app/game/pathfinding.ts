export type Point={x:number;z:number};
export function findPath(start:Point,goal:Point,blocked:(x:number,z:number)=>boolean):Point[]{
const startCell={x:Math.round(start.x),z:Math.round(start.z)};let end={x:Math.round(goal.x),z:Math.round(goal.z)};
if(blocked(end.x,end.z)){let found=false;for(let r=1;r<=5&&!found;r++){const candidates:Point[]=[];for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++)if(Math.abs(x)===r||Math.abs(z)===r)candidates.push({x:end.x+x,z:end.z+z});candidates.sort((a,b)=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z));const free=candidates.find(p=>!blocked(p.x,p.z));if(free){end=free;found=true}}if(!found)return[]}
type Node=Point&{g:number;f:number;parent?:Node};const key=(p:Point)=>`${p.x},${p.z}`;const open:Node[]=[{...startCell,g:0,f:0}],cost=new Map([[key(startCell),0]]);let iterations=0;
while(open.length&&iterations++<35000){open.sort((a,b)=>b.f-a.f);const current=open.pop()!;if(current.x===end.x&&current.z===end.z){const result:Point[]=[];let n:Node|undefined=current;while(n?.parent){result.unshift({x:n.x,z:n.z});n=n.parent}return result.length?result:[end]}
for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=current.x+dx,z=current.z+dz;if(x< -61||x>113||z< -97||z>99||blocked(x,z)||((dx&&dz)&&(blocked(current.x+dx,current.z)||blocked(current.x,current.z+dz))))continue;const g=current.g+Math.hypot(dx,dz),k=key({x,z});if(g>=(cost.get(k)??Infinity))continue;cost.set(k,g);open.push({x,z,g,f:g+Math.hypot(end.x-x,end.z-z),parent:current})}}
return[];
}
