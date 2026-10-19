export type AuthOperation='login'|'recovery'|'reset'|'totp';
export type AdmissionPolicy={window:number;global:Record<AuthOperation,number>;subject:{login:number;recovery:number;totp:number}};
// Local pilot safety budgets, not a measured SaaS capacity claim. No disable switch.
export function readAdmissionPolicy(env:Record<string,string|undefined>={}):AdmissionPolicy {
  function number(name:string,fallback:number,max:number){
    const value=env[name]??String(fallback);
    if(!/^\d+$/.test(value)||Number(value)<1||Number(value)>max)throw new Error(`CONFIG_${name}`);
    return Number(value);
  }
  return {window:number('AUTH_RATE_WINDOW_SECONDS',60,3600),global:{
    login:number('AUTH_RATE_LOGIN_GLOBAL',120,10000),recovery:number('AUTH_RATE_RECOVERY_GLOBAL',60,10000),
    reset:number('AUTH_RATE_RESET_GLOBAL',60,10000),totp:number('AUTH_RATE_TOTP_GLOBAL',60,10000)},subject:{
    login:number('AUTH_RATE_LOGIN_ACCOUNT',10,1000),recovery:number('AUTH_RATE_RECOVERY_ACCOUNT',10,1000),
    totp:number('AUTH_RATE_TOTP_PROOF',5,1000)}};
}
