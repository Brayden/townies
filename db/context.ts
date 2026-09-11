import {AsyncLocalStorage} from 'node:async_hooks';
export const townContext=new AsyncLocalStorage<{database:D1Database;identity:string}>();
