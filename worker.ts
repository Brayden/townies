import handler from 'vinext/server/fetch-handler';
export {Town} from './server/towns/Town';
export {ResidentCoordinator} from './server/towns/ResidentCoordinator';
import {townSocket} from './server/towns/router';
export default {fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){if(new URL(request.url).pathname==='/api/town-socket')return townSocket(request);return handler.fetch(request,env,ctx)}};
