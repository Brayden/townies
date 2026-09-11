import {accounts,usesSitesIdentity} from '@/db/auth';
async function handle(req:Request){
 if(usesSitesIdentity())return Response.json({error:'Use the Sites sign-in on this host.'},{status:404});
 if(Number(req.headers.get('content-length')??0)>16384)return Response.json({error:'Request too large.'},{status:413});
 try{
  if(req.method==='POST'&&req.body){
   const reader=req.body.getReader();let size=0;const chunks:Uint8Array[]=[];
   while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384){await reader.cancel();return Response.json({error:'Request too large.'},{status:413})}chunks.push(part.value)}
   const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length}
   req=new Request(req.url,{method:req.method,headers:req.headers,body});
  }
  return await accounts().handler(req)
 }catch(error){console.error('account request failed',error);return Response.json({error:'Account service is temporarily unavailable.'},{status:503})}
}
export const GET=handle;
export const POST=handle;
