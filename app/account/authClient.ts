'use client';
import {createAuthClient} from 'better-auth/client';
import {passkeyClient} from '@better-auth/passkey/client';
export const authClient=createAuthClient({plugins:[passkeyClient()]});
export const supportsPasskeys=()=>typeof window!=='undefined'&&window.isSecureContext&&typeof PublicKeyCredential!=='undefined'&&!!navigator.credentials;
export function passkeyError(error:{code?:string;status?:number;message?:string},action:'login'|'add'|'remove'){
 if(error.code==='AUTH_CANCELLED'||error.code==='ERROR_CEREMONY_ABORTED'||error.code==='ERROR_PASSTHROUGH_SEE_CAUSE')return action==='login'?'Passkey sign-in wasn’t completed. Try again or use your password.':'Passkey setup wasn’t completed. You can try again whenever you’re ready.';
 if(error.code==='ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED')return 'This passkey is already added to your account.';
 if(error.status===429)return 'Too many attempts. Please wait a minute and try again.';
 if(action!=='login'&&(error.status===401||error.code==='SESSION_IS_NOT_FRESH'))return 'Please log out and back in before changing your passkeys.';
 return action==='login'?'We couldn’t sign you in with that passkey. Try again or use your password.':action==='add'?'We couldn’t add your passkey. Please try again.':'We couldn’t remove that passkey. Please try again.';
}
