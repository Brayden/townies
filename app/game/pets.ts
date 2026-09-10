export type Pet={id:string;kind:'cat'|'dog';name:string;price:number;coat:string;accent:string;pattern:'plain'|'tabby'|'tuxedo'|'points'|'patches'|'spots';ears:'pointed'|'floppy';size:number;long?:boolean};
export const PETS:Pet[]=[
 {id:'pet-cat-tabby',kind:'cat',name:'Ginger tabby',price:300,coat:'#ce955d',accent:'#875b3b',pattern:'tabby',ears:'pointed',size:1},
 {id:'pet-cat-tuxedo',kind:'cat',name:'Tuxedo cat',price:350,coat:'#414847',accent:'#f5ead3',pattern:'tuxedo',ears:'pointed',size:1},
 {id:'pet-cat-siamese',kind:'cat',name:'Siamese cat',price:450,coat:'#e7d9bb',accent:'#715a4b',pattern:'points',ears:'pointed',size:1},
 {id:'pet-cat-calico',kind:'cat',name:'Calico cat',price:400,coat:'#f1e3ce',accent:'#b57b4b',pattern:'patches',ears:'pointed',size:1},
 {id:'pet-cat-white',kind:'cat',name:'Snowy white cat',price:350,coat:'#f2eee0',accent:'#d5b1a8',pattern:'plain',ears:'pointed',size:1.05},
 {id:'pet-cat-black',kind:'cat',name:'Midnight black cat',price:300,coat:'#414346',accent:'#777b79',pattern:'plain',ears:'pointed',size:1},
 {id:'pet-dog-retriever',kind:'dog',name:'Golden retriever',price:550,coat:'#d4ad6c',accent:'#f0d7a3',pattern:'tuxedo',ears:'floppy',size:1.1},
 {id:'pet-dog-corgi',kind:'dog',name:'Corgi',price:600,coat:'#c69360',accent:'#f6e5cb',pattern:'tuxedo',ears:'pointed',size:.85,long:true},
 {id:'pet-dog-dachshund',kind:'dog',name:'Dachshund',price:450,coat:'#976345',accent:'#633f31',pattern:'plain',ears:'floppy',size:.8,long:true},
 {id:'pet-dog-husky',kind:'dog',name:'Husky',price:650,coat:'#879499',accent:'#f0e7d8',pattern:'tuxedo',ears:'pointed',size:1.08},
 {id:'pet-dog-dalmatian',kind:'dog',name:'Dalmatian',price:600,coat:'#ede5d3',accent:'#494b49',pattern:'spots',ears:'floppy',size:1.05},
 {id:'pet-dog-collie',kind:'dog',name:'Border collie',price:550,coat:'#454b49',accent:'#f4e8d2',pattern:'tuxedo',ears:'pointed',size:1},
];
export const petById=(id:unknown)=>PETS.find(p=>p.id===id);
// Absolute shared time gives every neighbor the same quiet wander, even after login.
export function petPose(kind:'cat'|'dog',home:number,now:number){
 const t=now/1000+home*7.31;
 if(kind==='cat')return {x:.03,y:.44,z:2.26,yaw:.18+Math.sin(t*.15)*.22,walk:0,tail:Math.sin(t*1.3)*.22};
 const cycle=((t%24)+24)%24,walking=cycle<18,phase=Math.min(cycle,18)/18*Math.PI*2;
 return {x:-3+Math.sin(phase)*.06,y:.15,z:.1+Math.cos(phase)*1.3,yaw:Math.atan2(Math.cos(phase)*.06,-Math.sin(phase)*1.3),walk:walking?Math.sin(t*9)*.35:0,tail:Math.sin(t*(walking?8:3))*.5};
}
