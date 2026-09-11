import {townContext} from './context';
import {env} from 'cloudflare:workers';
export function db(){const local=townContext.getStore();if(local)return local.database;if(!env.DB)throw new Error('The town database is unavailable. Please try again.');return env.DB;}
