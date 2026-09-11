import {env} from 'cloudflare:workers';
import {betterAuth} from 'better-auth/minimal';
import {drizzleAdapter} from '@better-auth/drizzle-adapter';
import {drizzle} from 'drizzle-orm/d1';
import * as schema from './auth-schema';

export const usesSitesIdentity=()=>env.TOWNIES_AUTH_MODE==='sites';
export function accounts(){
 if(!env.BETTER_AUTH_SECRET||!env.BETTER_AUTH_URL)throw new Error('Account service is not configured.');
 return betterAuth({
  appName:'Townies',baseURL:env.BETTER_AUTH_URL,secret:env.BETTER_AUTH_SECRET,
  database:drizzleAdapter(drizzle(env.DB,{schema}),{provider:'sqlite',schema,transaction:false}),
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,autoSignIn:true},
  session:{expiresIn:60*60*24*30,updateAge:60*60*24},
  advanced:{cookiePrefix:'townies',ipAddress:{ipAddressHeaders:['cf-connecting-ip']}},
  rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{'/sign-up/email':{window:60,max:5},'/sign-in/email':{window:60,max:10}}},
 });
}
// Never trust dispatcher headers on the standalone Worker. Email is not a resident key.
export async function gameIdentity(req:Request):Promise<string|null>{
 if(usesSitesIdentity())return req.headers.get('oai-authenticated-user-id');
 const session=await accounts().api.getSession({headers:req.headers});
 return session?`account:${session.user.id}`:null;
}
