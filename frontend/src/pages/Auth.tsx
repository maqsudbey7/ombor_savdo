import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Warehouse } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { useAppDispatch } from '../store/hooks';
import { loggedIn } from '../store/authSlice';

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const isReg = mode === 'register';
  const [form, setForm] = useState({ name: '', phone: '+998', company: '', password: '' });
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next');

  const mutation = useMutation({
    mutationFn: () => (isReg ? authApi.register(form) : authApi.login({ phone: form.phone, password: form.password })),
    onSuccess: (res) => {
      dispatch(loggedIn(res));
      nav(next || (res.user.role === 'admin' ? '/admin' : '/'), { replace: true });
    },
  });

  const ch = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const submit = (e: FormEvent) => { e.preventDefault(); mutation.mutate(); };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <form onSubmit={submit} className="card w-full space-y-4 p-8">
        <div className="mb-2 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white"><Warehouse /></div>
          <h1 className="text-2xl font-bold">{isReg ? 'Hamkor sifatida ro‘yxatdan o‘tish' : 'Xush kelibsiz!'}</h1>
          <p className="mt-1 text-sm text-slate-500">{isReg ? 'Ulgurji narxlarda buyurtma berish uchun' : 'Hisobingizga kiring'}</p>
        </div>
        {isReg && <div><label className="label" htmlFor="name">Ism familiya *</label><input id="name" required minLength={2} className="input" value={form.name} onChange={ch('name')} /></div>}
        <div><label className="label" htmlFor="phone">Telefon *</label><input id="phone" required type="tel" className="input" value={form.phone} onChange={ch('phone')} placeholder="+998 90 123 45 67" /></div>
        {isReg && <div><label className="label" htmlFor="company">Kompaniya / do‘kon nomi</label><input id="company" className="input" value={form.company} onChange={ch('company')} /></div>}
        <div><label className="label" htmlFor="password">Parol *</label><input id="password" required type="password" minLength={6} className="input" value={form.password} onChange={ch('password')} /></div>
        {mutation.error && <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{mutation.error.message}</div>}
        <button disabled={mutation.isPending} className="btn-primary w-full py-3">{mutation.isPending ? 'Kuting…' : isReg ? 'Ro‘yxatdan o‘tish' : 'Kirish'}</button>
        <p className="text-center text-sm text-slate-500">
          {isReg
            ? <>Hisobingiz bormi? <Link to={`/kirish${next ? `?next=${next}` : ''}`} className="font-semibold text-brand-600">Kirish</Link></>
            : <>Hisobingiz yo‘qmi? <Link to={`/royxatdan-otish${next ? `?next=${next}` : ''}`} className="font-semibold text-brand-600">Ro‘yxatdan o‘ting</Link></>}
        </p>
      </form>
    </div>
  );
}
