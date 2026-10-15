import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { AuthAdapter } from '../../adapters/providers.js';
import { completeSetup, getMe } from './service.js';
import { SetupError } from './policy.js';

export function createOwnerHandlers(deps: {pool:()=>pg.Pool; auth:AuthAdapter; origin:()=>string}) {
  async function handle(request: Request, mutation: boolean) {
    const requestId = randomUUID();
    const headers = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
    try {
      if (mutation && (request.headers.get('origin') !== deps.origin() || request.headers.get('sec-fetch-site') === 'cross-site')) throw new SetupError('FORBIDDEN');
      const session = await deps.auth.resolveSession(request);
      if (!session) throw new SetupError('AUTH_REQUIRED');
      if (!mutation) return Response.json({data:await getMe(deps.pool(),session)},{headers});
      if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) throw new SetupError('INVALID_INPUT');
      const reader = request.body?.getReader();
      if (!reader) throw new SetupError('INVALID_INPUT');
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        for (;;) {
          const {done,value} = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 8192) { await reader.cancel(); throw new SetupError('INVALID_INPUT'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new SetupError('INVALID_INPUT'); }
      const result = await completeSetup(deps.pool(),session,body,requestId);
      return Response.json({data:result.data},{status:result.created ? 201 : 200,headers});
    } catch (error) {
      const known = error instanceof SetupError;
      const code = known ? error.code : 'TEMPORARILY_UNAVAILABLE';
      const status = !known ? 503 : code === 'AUTH_REQUIRED' ? 401 : ['FORBIDDEN','EMAIL_VERIFICATION_REQUIRED'].includes(code) ? 403 : ['SLUG_TAKEN','SETUP_CONFLICT'].includes(code) ? 409 : 400;
      return Response.json({error:{code,message:code,request_id:requestId,...(known && error.field ? {fields:{[error.field]:code}} : {})}},
        {status,headers:{...headers,...(status === 503 ? {'Retry-After':'5'} : {})}});
    }
  }
  return {me:(request:Request)=>handle(request,false),onboarding:(request:Request)=>handle(request,true)};
}
