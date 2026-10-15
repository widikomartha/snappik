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
  if ((env.AUTH_MODE ?? 'unconfigured') !== 'unconfigured' || (env.DRIVE_MODE ?? 'unconfigured') !== 'unconfigured') throw new Error('CONFIG_PROVIDER_NOT_IMPLEMENTED');
  return {
    origin: origin.origin, databaseUrl: database.href,
    poolMax: integer('DB_POOL_MAX', 5, 1, 20),
    concurrency: integer('WORKER_CONCURRENCY', 2, 1, 4),
    leaseSeconds: integer('JOB_LEASE_SECONDS', 120, 3, 600),
  };
}
