import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Townies — Your little corner of the world',description:'Make a home, find your calling, and grow a thriving little town together.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Townies',statusBarStyle:'default'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
