import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '../../adapters/providers.js';
import { getPool } from '../../db/pool.js';
import { getMe } from '../../modules/onboarding/service.js';
import { SetupError, safeOwnerReturn } from '../../modules/onboarding/policy.js';
import { readConfig } from '../../config.js';
export async function ownerPageState(destination:string) {
  const safeDestination = safeOwnerReturn(destination);
  let result: Awaited<ReturnType<typeof getMe>>;
  try {
    const session = await auth.resolveSession(new Request(readConfig().origin,{headers:await headers()}));
    if (!session) throw new SetupError('AUTH_REQUIRED');
    result = await getMe(getPool(),session);
  } catch (error) {
    if (error instanceof SetupError && error.code === 'AUTH_REQUIRED') redirect(`/login?return_to=${encodeURIComponent(safeDestination)}`);
    if (error instanceof SetupError && error.code === 'EMAIL_VERIFICATION_REQUIRED') return {state:'verify' as const,data:null};
    return {state:'unavailable' as const,data:null};
  }
  return {state:'available' as const,data:result};
}
