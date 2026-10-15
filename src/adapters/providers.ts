// No verified identity is manufactured by the scaffold. BL-004 supplies the adapter.
declare const verifiedOwner: unique symbol;
export type VerifiedOwner = Readonly<{ userId: string; sessionId: string; [verifiedOwner]: true }>;
export interface AuthAdapter { resolveOwner(request: Request): Promise<VerifiedOwner | null> }
export interface DriveAdapter { scan(project: { studioId: string; projectId: string }, signal: AbortSignal): Promise<void> }
export class ProviderUnavailable extends Error { constructor() { super('PROVIDER_NOT_CONFIGURED'); } }
export const auth: AuthAdapter = { async resolveOwner() { return null; } };
export const drive: DriveAdapter = { async scan() { throw new ProviderUnavailable(); } };
