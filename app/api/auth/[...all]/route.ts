import {revokeTownSession} from '@/server/towns/router';
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
  // Finish the bounded body read before an early rejection so local proxy
  // connections are not reused with an abandoned request stream.
  const origin=req.headers.get('origin');if(req.method==='POST'&&origin&&origin!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});
  const path=new URL(req.url).pathname;
  if(req.method==='POST'&&path.endsWith('/sign-out')){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});await revokeTownSession(req)}
  if(req.method==='POST'&&/\/(revoke-session|revoke-sessions|revoke-other-sessions|change-password|delete-user)$/.test(path))await revokeTownSession(req,true);
  return await accounts().handler(req)
 }catch(error){console.error('account request failed',error);return Response.json({error:'Account service is temporarily unavailable.'},{status:503})}
}
export const GET=handle;
export const POST=handle;
