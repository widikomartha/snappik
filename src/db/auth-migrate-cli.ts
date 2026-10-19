import pg from 'pg';
import { readConfig } from '../config.js';
import { migrateAuth } from './auth-migrate.js';
const config=readConfig();
if(config.authMode!=='better-auth-local')throw new Error('AUTH_LOCAL_CONFIGURATION_REQUIRED');
// No runtime generator, unknown-database reset or production mode.
const migrationConfig=readConfig({...process.env,DATABASE_URL:process.env.MIGRATION_DATABASE_URL??config.databaseUrl});
const target=new URL(migrationConfig.databaseUrl),runtime=new URL(config.databaseUrl);
if(target.hostname!==runtime.hostname||target.port!==runtime.port||target.pathname!==runtime.pathname)throw new Error('AUTH_MIGRATION_TARGET_MISMATCH');
const pool=new pg.Pool({connectionString:migrationConfig.databaseUrl,max:1,connectionTimeoutMillis:5000});
try{await migrateAuth(pool);console.log('Reviewed local auth migrations applied');}
catch(error){
  console.error(error instanceof Error&&error.message==='AUTH_ACCOUNT_DUPLICATES_REQUIRE_REVIEW'
    ?'AUTH_ACCOUNT_DUPLICATES_REQUIRE_REVIEW':'AUTH_MIGRATION_FAILED_REVIEW_REQUIRED');
  process.exitCode=1;
}
finally{await pool.end();}
