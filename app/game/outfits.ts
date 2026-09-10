export const OUTFITS: {id:string;name:string;color:string;price:number;slot?:string;shape?:string}[]=[
 {id:'outfit-blue',name:'Blue everyday shirt',color:'#6988ab',price:0},
 {id:'outfit-rose',name:'Rose everyday shirt',color:'#a66b75',price:0},
 {id:'outfit-honey',name:'Honey everyday shirt',color:'#ce9e4e',price:0},
 {id:'outfit-leaf',name:'Leaf everyday shirt',color:'#688451',price:0},
 {id:'outfit-lilac',name:'Lilac everyday shirt',color:'#957cad',price:0},
 {id:'outfit-crimson',name:'Cranberry work shirt',color:'#ba4254',price:90},
 {id:'outfit-ocean',name:'Ocean blue shirt',color:'#237fba',price:90},
 {id:'outfit-cream',name:'Sunday cream shirt',color:'#f2e3bd',price:120},
 {id:'outfit-plum',name:'Plum evening shirt',color:'#723c8f',price:120},
 {id:'outfit-teal',name:'Deep teal shirt',color:'#278b81',price:150},
];

const garments=[['suit','Tailored suit',220],['dress','Garden party dress',180],['overalls','Workshop overalls',150],['coat','Long town coat',210]] as const;
for(const [shape,name,price] of garments)for(const [tone,color] of [['Sage','#668c76'],['Rose','#b16b85'],['Midnight','#394c68'],['Ivory','#ecdfc1']])OUTFITS.push({id:`${shape}-${tone.toLowerCase()}`,name:`${tone} ${name.toLowerCase()}`,color,price,slot:'body',shape});
OUTFITS.push(...[
 {id:'hat-none',name:'No hat',color:'#75553c',price:0,slot:'hat',shape:'none'},
 {id:'hat-straw',name:'Straw sunhat',color:'#e7c481',price:0,slot:'hat',shape:'straw'},
 {id:'hat-top',name:'Midnight top hat',color:'#374453',price:180,slot:'hat',shape:'top'},
 {id:'hat-rose-top',name:'Rose top hat',color:'#995d79',price:190,slot:'hat',shape:'top'},
 {id:'hat-beret',name:'Artist’s beret',color:'#a75750',price:120,slot:'hat',shape:'beret'},
 {id:'hat-bonnet',name:'Cream garden bonnet',color:'#eddbba',price:140,slot:'hat',shape:'bonnet'},
 {id:'accessory-none',name:'No accessory',color:'#ffffff',price:0,slot:'accessory',shape:'none'},
 {id:'accessory-glasses',name:'Round spectacles',color:'#665640',price:100,slot:'accessory',shape:'glasses'},
 {id:'accessory-scarf',name:'Golden scarf',color:'#e4b853',price:100,slot:'accessory',shape:'scarf'},
 {id:'accessory-bow',name:'Cherry bow tie',color:'#b94f62',price:110,slot:'accessory',shape:'bow'},
]);
