import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { Download, KeyRound, Languages, LogOut, MonitorSmartphone, ShieldCheck, Smartphone, Trash2, UserRound, type LucideIcon } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loggedIn, userLoaded } from '../store/authSlice';
import { toast } from '../store/uiSlice';
import { useT } from '../i18n';
import { DEMO } from '../hooks/useDemoLogin';
import { ErrorBox, LangSwitch } from '../components/ui';
import { PasswordInput, passwordScore } from '../components/feedback';
import { promptInstall, useInstall } from '../lib/pwa';

function Section({ icon: Icon, title, children, danger }: { icon: LucideIcon; title: string; children: ReactNode; danger?: boolean }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`card p-5 sm:p-6 ${danger ? 'ring-rose-100' : ''}`}>
      <h2 className={`mb-4 flex items-center gap-2 text-base font-bold ${danger ? 'text-rose-600' : ''}`}>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${danger ? 'bg-rose-50' : 'bg-brand-50 text-brand-600'}`}><Icon size={17} /></span>{title}
      </h2>
      {children}
    </motion.section>
  );
}

export default function Account() {
  const user = useAppSelector((s) => s.auth.user)!;
  const dispatch = useAppDispatch();
  const { onLogout } = useOutletContext<{ onLogout: () => void }>();
  const t = useT();
  const demo = user.phone === DEMO.phone;
  const install = useInstall();

  const [name, setName] = useState(user.name);
  const profile = useMutation({
    mutationFn: () => authApi.updateProfile(name.trim()),
    onSuccess: (u) => { dispatch(userLoaded(u)); dispatch(toast(t('acc.saved'))); },
  });

  const [pw, setPw] = useState({ cur: '', next: '', again: '' });
  const mismatch = pw.again.length > 0 && pw.next !== pw.again;
  const changePw = useMutation({
    mutationFn: () => authApi.changePassword(pw.cur, pw.next),
    onSuccess: (r) => { dispatch(loggedIn(r)); setPw({ cur: '', next: '', again: '' }); dispatch(toast(t('acc.pwChanged'))); },
  });

  const logoutAll = useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: (r) => { dispatch(loggedIn(r)); dispatch(toast(t('acc.logoutAllDone'))); },
    onError: (e: Error) => dispatch(toast(e.message, 'err')),
  });

  const exportData = useMutation({
    mutationFn: authApi.exportData,
    onSuccess: () => dispatch(toast(t('acc.exported'))),
    onError: (e: Error) => dispatch(toast(e.message, 'err')),
  });

  const [delPw, setDelPw] = useState('');
  const del = useMutation({
    mutationFn: () => authApi.deleteAccount(delPw),
    onSuccess: () => { onLogout(); dispatch(toast(t('acc.deleted'))); },
  });

  const submitPw = (e: FormEvent) => { e.preventDefault(); if (!mismatch) changePw.mutate(); };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-600 text-xl font-bold text-white">{user.name[0]?.toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{t('acc.title')}</h1>
          <p className="text-sm text-slate-500">{t('acc.sub')}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
        <div className="flex items-center gap-2 font-bold text-emerald-800"><ShieldCheck size={19} /> {t('acc.safeTitle')}</div>
        <ul className="mt-2 space-y-1.5 text-sm text-emerald-900/80">
          {(['acc.safe1', 'acc.safe2', 'acc.safe3'] as const).map((k) => <li key={k} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{t(k)}</li>)}
        </ul>
      </div>

      {demo && <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">{t('acc.demoNote')}</div>}

      <Section icon={UserRound} title={t('acc.profile')}>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); profile.mutate(); }}>
          <label className="block"><span className="label">{t('acc.name')}</span>
            <input className="input" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} disabled={demo} autoComplete="name" />
          </label>
          <button className="btn-primary" disabled={demo || profile.isPending || name.trim() === user.name || name.trim().length < 2}>
            {profile.isPending ? t('common.saving') : t('common.save')}
          </button>
        </form>
        <p className="mt-2 text-sm text-slate-500">{t('common.phone')}: <b className="text-slate-700">{user.phone}</b></p>
        {profile.error && <ErrorBox error={profile.error} className="mt-3" />}
      </Section>

      <Section icon={KeyRound} title={t('acc.changePw')}>
        <form className="space-y-3" onSubmit={submitPw}>
          <label className="block"><span className="label">{t('acc.currentPw')}</span>
            <PasswordInput className="" value={pw.cur} onChange={(v) => setPw({ ...pw, cur: v })} autoComplete="current-password" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label">{t('acc.newPw')}</span>
              <PasswordInput className="" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} meter autoComplete="new-password" placeholder={t('pw.rule')} />
            </label>
            <label className="block"><span className="label">{t('acc.newPw2')}</span>
              <PasswordInput className="" value={pw.again} onChange={(v) => setPw({ ...pw, again: v })} autoComplete="new-password" />
              {mismatch && <span className="mt-1 block text-xs font-medium text-rose-600">{t('acc.pwMismatch')}</span>}
            </label>
          </div>
          {changePw.error && <ErrorBox error={changePw.error} />}
          <button className="btn-primary" disabled={demo || changePw.isPending || !pw.cur || passwordScore(pw.next) === 0 || pw.next !== pw.again}>
            {changePw.isPending ? t('common.saving') : t('acc.changePw')}
          </button>
        </form>
      </Section>

      <Section icon={MonitorSmartphone} title={t('acc.logoutAll')}>
        <p className="text-sm text-slate-600">{t('acc.logoutAllText')}</p>
        <button className="btn-ghost mt-4" disabled={demo || logoutAll.isPending} onClick={() => logoutAll.mutate()}><LogOut size={16} /> {t('acc.logoutAll')}</button>
      </Section>

      <Section icon={Download} title={t('acc.export')}>
        <p className="text-sm text-slate-600">{t('acc.exportText')}</p>
        <button className="btn-ghost mt-4" disabled={exportData.isPending} onClick={() => exportData.mutate()}>
          <Download size={16} /> {exportData.isPending ? t('common.wait') : t('acc.export')}
        </button>
      </Section>

      <div className="grid gap-5 sm:grid-cols-2">
        <Section icon={Languages} title={t('acc.lang')}><LangSwitch /></Section>
        <Section icon={Smartphone} title={t('acc.app')}>
          {install.installed ? <p className="text-sm font-medium text-emerald-600">✓ {t('acc.installed')}</p> : (
            <>
              <p className="text-sm text-slate-600">{t('acc.appText')}</p>
              {install.canPrompt
                ? <button className="btn-primary mt-3" onClick={() => promptInstall()}><Smartphone size={16} /> {t('acc.install')}</button>
                : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{t(install.ios ? 'acc.iosHow' : 'acc.androidHow')}</p>}
            </>
          )}
        </Section>
      </div>

      <button className="btn-ghost w-full py-3 sm:w-auto" onClick={onLogout}>
        <LogOut size={16} /> {t('acc.logout')}
      </button>

      {!demo && (
        <Section icon={Trash2} title={t('acc.delete')} danger>
          <p className="text-sm text-slate-600">{t('acc.deleteText')}</p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); del.mutate(); }}>
            <label className="block flex-1"><span className="label">{t('acc.deleteConfirm')}</span>
              <PasswordInput className="" value={delPw} onChange={setDelPw} autoComplete="current-password" />
            </label>
            <button className="btn bg-rose-600 text-white hover:bg-rose-700" disabled={!delPw || del.isPending}><Trash2 size={16} /> {t('acc.delete')}</button>
          </form>
          {del.error && <ErrorBox error={del.error} className="mt-3" />}
        </Section>
      )}
    </div>
  );
}
