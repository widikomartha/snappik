export class SetupError extends Error {
  constructor(public readonly code: 'AUTH_REQUIRED' | 'EMAIL_VERIFICATION_REQUIRED' | 'INVALID_INPUT' | 'SLUG_TAKEN' | 'SETUP_CONFLICT' | 'FORBIDDEN', public readonly field?: string) { super(code); }
}
export const reservedSlugs = new Set(['app','api','auth','login','logout','register','recover','onboarding','ops','admin','g','health','help','support','privacy','terms','settings','account','projects','status','www','static','assets','public','_next','favicon','robots','sitemap']);
export type SetupInput = { name: string; slug: string; locale: 'id' | 'en'; timezone: string };
export function parseSetup(value: unknown): SetupInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SetupError('INVALID_INPUT');
  const input = value as Record<string,unknown>;
  const keys = ['name','slug','locale','timezone'];
  if (Object.keys(input).some(k => !keys.includes(k)) || keys.some(k => typeof input[k] !== 'string')) throw new SetupError('INVALID_INPUT');
  const name = (input.name as string).trim();
  if ([...name].length < 1 || [...name].length > 100 || /[\p{Cc}\p{Cf}]/u.test(name)) throw new SetupError('INVALID_INPUT','name');
  const slug = input.slug as string;
  if (!/^[a-z0-9-]{3,50}$/.test(slug) || reservedSlugs.has(slug)) throw new SetupError('INVALID_INPUT','slug');
  if (input.locale !== 'id' && input.locale !== 'en') throw new SetupError('INVALID_INPUT','locale');
  const timezone = input.timezone as string;
  if (timezone.length > 100 || (timezone !== 'UTC' && !Intl.supportedValuesOf('timeZone').includes(timezone))) throw new SetupError('INVALID_INPUT','timezone');
  return {name,slug,locale:input.locale,timezone};
}
export function safeOwnerReturn(value: unknown): string {
  return typeof value === 'string' && value.length <= 512 && /^\/app(?:\/[A-Za-z0-9_-]+)*\/?$/.test(value) ? value : '/app';
}
// Versioned project defaults; no absolute deadline is minted until a project exists.
export const projectDefaults = Object.freeze({detect_subfolders:true,notes_enabled:true,layout:'grid',main:{enabled:true,quota:20,expires_at:null},download:{enabled:false,expires_at:null}});
