import type { Metadata,Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Townies — Your little corner of the world',description:'Make a home, find your calling, and grow a thriving little town together.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Townies',statusBarStyle:'black-translucent'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#486546'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
