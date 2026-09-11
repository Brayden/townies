import {townContext} from './context';
import {env} from 'cloudflare:workers';
import {passkey} from '@better-auth/passkey';
import {betterAuth} from 'better-auth/minimal';
import {APIError} from 'better-auth/api';
import {hasProfanity,NAME_LANGUAGE_ERROR} from '../server/profanity';
import {drizzleAdapter} from '@better-auth/drizzle-adapter';
import {drizzle} from 'drizzle-orm/d1';
import * as schema from './auth-schema';

export const usesSitesIdentity=()=>env.TOWNIES_AUTH_MODE==='sites';
export function accounts(){
 if(!env.BETTER_AUTH_SECRET||!env.BETTER_AUTH_URL)throw new Error('Account service is not configured.');
 return betterAuth({
  appName:'Townies',baseURL:env.BETTER_AUTH_URL,secret:env.BETTER_AUTH_SECRET,
  database:drizzleAdapter(drizzle(env.DB,{schema}),{provider:'sqlite',schema,transaction:false}),
  databaseHooks:{user:{create:{before:async user=>{if(hasProfanity(user.name))throw new APIError('BAD_REQUEST',{message:NAME_LANGUAGE_ERROR})}},update:{before:async user=>{if(typeof user.name==='string'&&hasProfanity(user.name))throw new APIError('BAD_REQUEST',{message:NAME_LANGUAGE_ERROR})}}}},
  plugins:[passkey({rpID:new URL(env.BETTER_AUTH_URL).hostname,rpName:'Townies',origin:new URL(env.BETTER_AUTH_URL).origin,authenticatorSelection:{residentKey:'required',userVerification:'preferred'}})],
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,autoSignIn:true},
  session:{expiresIn:60*60*24*30,updateAge:60*60*24},
  advanced:{cookiePrefix:'townies',ipAddress:{ipAddressHeaders:['cf-connecting-ip']}},
  rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{'/sign-up/email':{window:60,max:5},'/sign-in/email':{window:60,max:10},'/passkey/generate-register-options':{window:60,max:10},'/passkey/verify-registration':{window:60,max:10},'/passkey/generate-authenticate-options':{window:60,max:15},'/passkey/verify-authentication':{window:60,max:15}}},
 });
}
// Never trust dispatcher headers on the standalone Worker. Email is not a resident key.
export async function gameIdentity(req:Request):Promise<string|null>{
 const local=townContext.getStore();if(local)return local.identity;
 if(usesSitesIdentity())return req.headers.get('oai-authenticated-user-id');
 const session=await accounts().api.getSession({headers:req.headers});
 return session?`account:${session.user.id}`:null;
}
