import {env} from 'cloudflare:workers';
export function db(){if(!env.DB)throw new Error('The town database is unavailable. Please try again.');return env.DB;}
