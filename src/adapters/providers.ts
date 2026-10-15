// No verified identity is manufactured here. DEC-001 is still open.
declare const verifiedOwner: unique symbol;
export type VerifiedOwner = Readonly<{ userId: string; sessionId: string; [verifiedOwner]: true }>;
// Only an authoritative server-side provider lookup may produce this value.
// The adapter must check durable revocation, security version and provider proof.
// This is never parsed from JSON, tenant headers, email or UI role flags.
export type ProviderSession = Readonly<{
  provider: string; subject: string; sessionId: string; expiresAt: Date;
  emailVerified: boolean; email: string; displayName: string;
}>;
export interface AuthAdapter { resolveSession(request: Request): Promise<ProviderSession | null> }
export interface DriveAdapter { scan(project: { studioId: string; projectId: string }, signal: AbortSignal): Promise<void> }
export class ProviderUnavailable extends Error { constructor() { super('PROVIDER_NOT_CONFIGURED'); } }
export const auth: AuthAdapter = { async resolveSession() { throw new ProviderUnavailable(); } };
export const drive: DriveAdapter = { async scan() { throw new ProviderUnavailable(); } };
