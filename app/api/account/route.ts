import {accounts,usesSitesIdentity} from '@/db/auth';
export async function GET(req:Request){
 const headers={'Cache-Control':'no-store'};
 try{
  if(usesSitesIdentity()){const id=req.headers.get('oai-authenticated-user-id');return Response.json({mode:'sites',user:id?{name:'Townie'}:null},{headers})}
  const s=await accounts().api.getSession({headers:req.headers});
  return Response.json({mode:'account',user:s?{id:s.user.id,name:s.user.name,email:s.user.email}:null},{headers});
 }catch{return Response.json({error:'We could not connect to your account. Please try again.'},{status:503,headers})}
}
