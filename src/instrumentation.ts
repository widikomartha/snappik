import { readConfig } from './config';
export function register() { if (process.env.NEXT_RUNTIME === 'nodejs') readConfig(); }
