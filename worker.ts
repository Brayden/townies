import handler from 'vinext/server/fetch-handler';
export {Town} from './server/towns/Town';
export {ResidentCoordinator} from './server/towns/ResidentCoordinator';
import {townSocket} from './server/towns/router';
export default {fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){const url=new URL(request.url);if(url.hostname==='townies.brayden-wilmoth.workers.dev'&&env.BETTER_AUTH_URL==='https://townies.town'){url.protocol='https:';url.host='townies.town';return Response.redirect(url.href,308)}if(url.pathname==='/api/town-socket')return townSocket(request);return handler.fetch(request,env,ctx)}};
