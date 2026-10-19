export function readConfig(env: Record<string,string | undefined> = process.env) {
  function integer(name: string, fallback: number, min: number, max: number) {
    const text = env[name] ?? String(fallback);
    if (!/^\d+$/.test(text) || Number(text) < min || Number(text) > max) throw new Error(`CONFIG_${name}`);
    return Number(text);
  }
  let origin: URL;
  let database: URL;
  try { origin = new URL(env.APP_ORIGIN ?? ''); database = new URL(env.DATABASE_URL ?? ''); }
  catch { throw new Error('CONFIG_URL_REQUIRED'); }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error('CONFIG_DATABASE_URL');
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('CONFIG_APP_ORIGIN');
  if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new Error('CONFIG_HTTPS_REQUIRED');
  const authMode=env.AUTH_MODE??'unconfigured';
  if (!['unconfigured','better-auth-local'].includes(authMode) || (env.DRIVE_MODE ?? 'unconfigured') !== 'unconfigured') throw new Error('CONFIG_PROVIDER_NOT_IMPLEMENTED');
  if(authMode==='better-auth-local') {
    if(!['localhost','127.0.0.1','[::1]'].includes(origin.hostname) || !['localhost','127.0.0.1','[::1]'].includes(database.hostname))throw new Error('CONFIG_AUTH_LOCAL_ONLY');
    if(!/^[a-zA-Z0-9_-]{1,64}$/.test(env.AUTH_INSTANCE_ID??''))throw new Error('CONFIG_AUTH_INSTANCE_ID');
    if((env.BETTER_AUTH_SECRET?.length??0)<32)throw new Error('CONFIG_AUTH_SECRET_REQUIRED');
    if(env.BETTER_AUTH_URL && env.BETTER_AUTH_URL!==origin.origin)throw new Error('CONFIG_AUTH_ORIGIN_MISMATCH');
    if(env.AUTH_RECOVERY_KEY && (!/^[A-Za-z0-9_-]{43}$/.test(env.AUTH_RECOVERY_KEY)||Buffer.from(env.AUTH_RECOVERY_KEY,'base64url').toString('base64url')!==env.AUTH_RECOVERY_KEY))throw new Error('CONFIG_RECOVERY_KEY');
  }
  return {
    origin: origin.origin, databaseUrl: database.href,authMode,authInstanceId:env.AUTH_INSTANCE_ID,authSecret:env.BETTER_AUTH_SECRET,
    recoveryKey:env.AUTH_RECOVERY_KEY,
    poolMax: integer('DB_POOL_MAX', 5, authMode==='better-auth-local'?2:1, 20),
    concurrency: integer('WORKER_CONCURRENCY', 2, 1, 4),
    leaseSeconds: integer('JOB_LEASE_SECONDS', 120, 3, 600),
  };
}
