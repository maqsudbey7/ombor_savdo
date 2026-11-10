import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loggedIn } from '../store/authSlice';
import { useDemoLogin } from '../hooks/useDemoLogin';
import { ErrorBox, LangSwitch, Logo, Toasts } from '../components/ui';
import { useT, type TKey } from '../i18n';

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const isReg = mode === 'register';
  const [form, setForm] = useState({ name: '', phone: '+998', password: '' });
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next');
  const demo = useDemoLogin();
  const t = useT();

  const mutation = useMutation({
    mutationFn: () => (isReg ? authApi.register(form) : authApi.login({ phone: form.phone, password: form.password })),
    onSuccess: (res) => { dispatch(loggedIn(res)); nav(next || '/omborlar', { replace: true }); },
  });

  if (user && !mutation.isSuccess) return <Navigate to="/omborlar" replace />;
  const ch = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const submit = (e: FormEvent) => { e.preventDefault(); mutation.mutate(); };
  const q = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grid absolute inset-0 animate-grid [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
        <Link to="/" className="relative"><Logo dark /></Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative">
          <h2 className="text-4xl font-extrabold leading-tight">{t('auth.sideA')}<br /><span className="text-brand-300">{t('auth.sideB')}</span></h2>
          <ul className="mt-8 space-y-3 text-slate-300">
            {(['auth.b1', 'auth.b2', 'auth.b3', 'auth.b4'] as TKey[]).map((k, i) => (
              <motion.li key={k} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400" /> {t(k)}
              </motion.li>
            ))}
          </ul>
        </motion.div>
        <div className="relative text-sm text-slate-500">© {new Date().getFullYear()} OmborSavdo</div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-4">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="lg:invisible"><Logo /></Link>
            <LangSwitch />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{isReg ? t('auth.regTitle') : t('auth.loginTitle')}</h1>
            <p className="mt-1.5 text-slate-500">{isReg ? t('auth.regSub') : t('auth.loginSub')}</p>
          </div>
          {isReg && <label className="block"><span className="label">{t('auth.name')}</span><input id="name" required minLength={2} className="input py-3" value={form.name} onChange={ch('name')} /></label>}
          <label className="block"><span className="label">{t('auth.phone')}</span><input id="phone" required type="tel" className="input py-3" value={form.phone} onChange={ch('phone')} placeholder="+998 90 123 45 67" /></label>
          <label className="block"><span className="label">{t('auth.password')}</span><input id="password" required type="password" minLength={6} className="input py-3" value={form.password} onChange={ch('password')} placeholder={t('auth.passwordPh')} /></label>
          {mutation.error && <ErrorBox error={mutation.error} />}
          <button disabled={mutation.isPending} className="btn-primary w-full py-3.5 text-base">{mutation.isPending ? t('common.wait') : isReg ? t('auth.register') : t('auth.login')}</button>
          <div className="relative py-2 text-center text-xs text-slate-400 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-slate-200"><span className="relative bg-slate-50 px-3">{t('common.or')}</span></div>
          <button type="button" onClick={() => demo.mutate()} disabled={demo.isPending} className="btn-ghost w-full py-3"><PlayCircle size={18} /> {demo.isPending ? t('land.demoLoading') : t('auth.demo')}</button>
          <p className="pt-2 text-center text-sm text-slate-500">
            {isReg ? <>{t('auth.haveAcc')} <Link to={`/kirish${q}`} className="font-semibold text-brand-600">{t('auth.login')}</Link></>
              : <>{t('auth.noAcc')} <Link to={`/royxatdan-otish${q}`} className="font-semibold text-brand-600">{t('auth.toRegister')}</Link></>}
          </p>
        </motion.form>
      </div>
      <Toasts />
    </div>
  );
}
