import {readFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
if(config.name!=='townies'||config.vars?.TOWNIES_AUTH_MODE!=='account'){
 throw new Error('Build the standalone Townies app first with npm run build:cloudflare.');
}
// The Vite plugin copies local secrets for emulation; they are not release files.
await rm('dist/server/.dev.vars',{force:true});
const result=spawnSync('npx',['wrangler','deploy','--config','dist/server/wrangler.json'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
