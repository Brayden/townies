'use client';
import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import {ArrowRight,Eye,EyeOff,LoaderCircle,LogOut,Leaf} from 'lucide-react';
import TownScene from '../game/TownScene';
type Account={id?:string;name:string;email?:string};
const AccountContext=createContext<{user:Account;mode:string;signOut:()=>Promise<void>}|null>(null);
export const useAccount=()=>useContext(AccountContext);
export default function AccountGate({children}:{children:ReactNode}){
 const [user,setUser]=useState<Account|null>(null),[mode,setMode]=useState('account'),[checking,setChecking]=useState(true),[form,setForm]=useState<'login'|'signup'>('signup'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[invited,setInvited]=useState(false);
 const check=useCallback(async()=>{try{const r=await fetch('/api/account',{cache:'no-store'}),v=await r.json() as {user:Account|null;mode:string;error?:string};if(!r.ok)throw new Error(v.error);setUser(v.user);setMode(v.mode);setError('')}catch{setError('We couldn’t connect. Please try again.')}finally{setChecking(false)}},[]);
 useEffect(()=>{void check();setInvited(new URLSearchParams(window.location.hash.slice(1)).has('town'));const expired=()=>{setUser(null);setForm('login');setError('Please log in again to continue. Your town progress is saved.')};window.addEventListener('townies-session-ended',expired);return()=>window.removeEventListener('townies-session-ended',expired)},[check]);
 async function signOut(){if(mode==='sites'){window.location.assign('/signout-with-chatgpt?return_to=%2F');return}const r=await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw new Error('Could not log out. Please try again.');setUser(null);setForm('login');setPassword('');setError('')}
 async function submit(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');try{const r=await fetch(`/api/auth/${form==='signup'?'sign-up/email':'sign-in/email'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password,...(form==='signup'?{name:name.trim()}:{}),rememberMe:true})});const v=await r.json() as {message?:string};if(!r.ok)throw new Error(r.status===429?'Too many attempts. Please wait a minute and try again.':form==='login'?'That email and password didn’t match. Please try again.':v.message??'We couldn’t create your account. Please try again.');setPassword('');await check()}catch(e){setError(e instanceof Error?e.message:'Please try again.')}finally{setBusy(false)}}
 if(user)return <AccountContext.Provider value={{user,mode,signOut}}>{children}</AccountContext.Provider>;
 return <main className="account-home">
  <div className="account-town" aria-hidden="true" inert><TownScene enabled={false} onReady={api=>api.overview()}/></div>
  <div className="account-shade"/>
  <header className="account-brand"><span className="wordmark">townies<span>.</span></span><span className="account-beta">Friends beta</span></header>
  <div className="account-layout"><section className="account-intro"><span className="account-eyebrow"><Leaf size={17}/>A little town. A shared story.</span><h1>Your place<br/>in the neighborhood.</h1><p>Make a home, find your calling, and build a town worth coming back to—with friends.</p></section>
  <section className="account-card paper" aria-label="Your Townies account">
   {checking?<div className="account-loading" role="status"><LoaderCircle className="animate-spin" size={24}/>Getting your front door ready…</div>:<>
    <h2>{form==='signup'?'Make yourself at home.':'Welcome home.'}</h2><p>{invited?'Your town invitation will be waiting after you sign in.':form==='signup'?'Create an account to find your first town.':'Log in to pick up where you left off.'}</p>
    {mode==='sites'?<a className="primary-button full" href="/signin-with-chatgpt?return_to=%2F" target="_top">Continue with ChatGPT<ArrowRight size={18}/></a>:<>
    <div className="account-tabs" role="group" aria-label="Account options"><button aria-pressed={form==='signup'} onClick={()=>{setForm('signup');setError('');setPassword('')}}>Create account</button><button aria-pressed={form==='login'} onClick={()=>{setForm('login');setError('');setPassword('')}}>Log in</button></div>
    <form onSubmit={submit}>
     {form==='signup'&&<><label htmlFor="account-name">Your name</label><input id="account-name" autoComplete="name" required minLength={2} maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?"/></>}
     <label htmlFor="account-email">Email</label><input id="account-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoCapitalize="none" spellCheck={false}/>
     <label htmlFor="account-password">Password</label><div className="account-password"><input id="account-password" type={show?'text':'password'} autoComplete={form==='signup'?'new-password':'current-password'} required minLength={form==='signup'?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} aria-describedby={form==='signup'?'password-hint':undefined}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>
     {form==='signup'&&<small id="password-hint">At least 12 characters. A few memorable words work well.</small>}
     {error&&<p className="account-error" role="alert">{error}</p>}
     <button className="primary-button full" disabled={busy} type="submit">{busy?<LoaderCircle className="animate-spin" size={18}/>:<ArrowRight size={18}/>} {busy?'One moment…':form==='signup'?'Create account & play':'Log in & play'}</button>
    </form></>}
    <p className="account-note">Your home and progress stay with your account, on desktop and mobile.</p>
   </>}
   {!checking&&error==='We couldn’t connect. Please try again.'&&<button className="secondary-button full" onClick={()=>void check()}>Try connecting again</button>}
  </section></div>
 </main>;
}
export function AccountSettings(){const account=useAccount();const [busy,setBusy]=useState(false),[error,setError]=useState('');if(!account)return null;return <div className="account-settings"><p>Signed in as <strong>{account.user.email??account.user.name}</strong></p><button className="secondary-button full" disabled={busy} onClick={async()=>{setBusy(true);try{await account.signOut()}catch{setError('We couldn’t log you out. Please try again.')}finally{setBusy(false)}}}><LogOut size={17}/>Log out</button>{error&&<p role="alert">{error}</p>}</div>}
