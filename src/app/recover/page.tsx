import {readConfig} from '../../config';
import {RecoveryForm} from './recovery-form';
import {recoveryBootstrap} from '../../modules/auth/recovery-browser';
export const dynamic='force-dynamic';
export default async function Recover({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const config=readConfig();
  const locale=(await searchParams).lang==='en'?'en':'id';
  return <><script dangerouslySetInnerHTML={{__html:recoveryBootstrap}} />
    <RecoveryForm enabled={Boolean(config.authMode==='better-auth-local'&&config.recoveryKey)} initialLocale={locale}/></>;
}
