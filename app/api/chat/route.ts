import {townRoute} from '@/server/towns/router';
import * as legacy from '@/server/chat';
export async function GET(req:Request){return await townRoute(req)??legacy.GET(req)}
export async function POST(req:Request){return await townRoute(req)??legacy.POST(req)}
