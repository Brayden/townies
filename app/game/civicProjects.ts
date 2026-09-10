export const CIVIC_PROJECTS=[
 {id:'park-stage',name:'Park bandstand',category:'Parks',cost:600,prosperity:3,x:-34,z:8,description:'A timber stage, festive canopy, and seating for gatherings in the community park.'},
 {id:'flower-walk',name:'Blossom walk',category:'Parks',cost:400,prosperity:2,x:-48,z:9,description:'Flower arches and colorful planters turn the park’s south lawn into a garden walk.'},
 {id:'orchard-picnic',name:'Orchard picnic grove',category:'Parks',cost:500,prosperity:3,x:-50,z:-27,description:'Picnic tables and shade umbrellas beside the northern orchard.'},
 {id:'garden-terrace',name:'Garden Club terrace',category:'Parks',cost:650,prosperity:3,x:17,z:14,description:'A pergola and raised flower planters beside the Garden Club.'},
 {id:'hall-restoration',name:'Town Hall restoration',category:'Town center',cost:900,prosperity:5,x:0,z:-11,description:'Gold roof trim, civic banners, and a grander entrance for Town Hall.'},
 {id:'market-canopies',name:'Market square renewal',category:'Town center',cost:750,prosperity:4,x:0,z:15,description:'Bright new overhead canopies and pennants above all six market stalls.'},
 {id:'shopfronts',name:'Main Street shopfronts',category:'Town center',cost:700,prosperity:4,x:0,z:-7,description:'Matching flower boxes, striped shades, and banners for the town’s shops.'},
 {id:'library-court',name:'Library reading court',category:'Town center',cost:500,prosperity:3,x:-16,z:14,description:'Outdoor book displays, reading benches, and a shade canopy at the library.'},
 {id:'school-court',name:'School discovery court',category:'Neighborhoods',cost:600,prosperity:3,x:-7,z:-30,description:'A colorful learning circle and outdoor classroom beside the school.'},
 {id:'river-lights',name:'Riverside lantern walk',category:'Neighborhoods',cost:800,prosperity:4,x:34,z:0,description:'A coordinated row of warm lanterns and flower urns along the east riverbank.'},
 {id:'neighborhood-lights',name:'Neighborhood welcome lights',category:'Neighborhoods',cost:1000,prosperity:5,x:-21,z:31,description:'Warm street lanterns along the southern and eastern neighborhood streets.'},
 {id:'harbor-terrace',name:'Harbor sunset terrace',category:'Neighborhoods',cost:850,prosperity:4,x:-39,z:54,description:'A waterside seating terrace with a timber pergola and harbor lanterns.'},
] as const;
export const projectById=(id:unknown)=>CIVIC_PROJECTS.find(p=>p.id===id);
export const TAX_POLICIES=[{value:0,name:'Light touch',description:'No work tax. More take-home pay; projects rely on savings and donations.'},{value:1,name:'Balanced',description:'Up to 1 coin per completed work action goes to the town.'},{value:2,name:'Town builder',description:'Up to 2 coins per action fund faster upgrades; take-home pay is lower.'}] as const;
export const townLevel=(count:number)=>({name:['Growing village','Flourishing town','Thriving town','Town of distinction'][Math.min(3,Math.floor(count/4))],bonus:Math.min(3,Math.floor(count/4)),next:count>=12?null:4-count%4});
// Existing payouts represent take-home pay under the original one-coin tax.
// A job always leaves at least one coin with its worker, even at the highest policy.
export function workPay(base:number,tax:number,bonus=0){const gross=base+1+bonus,withheld=Math.min(tax,gross-1);return {coins:gross-withheld,tax:withheld};}
export type CivicState={tax:number;featured:string|null;term:string;projects:{id:string;funded:number;completed:number;mayorName:string|null}[];history:{id:string;name:string;kind:string;project:string|null;amount:number;created:number}[]};
