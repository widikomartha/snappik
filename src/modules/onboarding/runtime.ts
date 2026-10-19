import { runtimeAuth as auth } from '../auth/runtime.js';
import { getPool } from '../../db/pool.js';
import { readConfig } from '../../config.js';
import { createOwnerHandlers } from './http.js';
export const ownerHandlers = createOwnerHandlers({pool:getPool,auth,origin:()=>readConfig().origin});
