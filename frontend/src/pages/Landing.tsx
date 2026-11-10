import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, BarChart3, Bell, BellRing, ClipboardCheck, HandCoins, History, Lock, PlayCircle, Warehouse } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { useDemoLogin } from '../hooks/useDemoLogin';
import { CountUp, LangSwitch, Logo, Toasts } from '../components/ui';
import { useT, type TKey } from '../i18n';
import { stagger } from '../lib/motion';
import { moneyShort } from '../lib/format';

const FEATURES: { icon: typeof Warehouse; key: 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6'; color: string }[] = [
  { icon: Warehouse, key: 'f1', color: 'from-blue-500 to-indigo-600' },
  { icon: ArrowDownToLine, key: 'f2', color: 'from-emerald-500 to-teal-600' },
  { icon: HandCoins, key: 'f3', color: 'from-amber-400 to-orange-500' },
  { icon: Bell, key: 'f4', color: 'from-rose-500 to-pink-600' },
  { icon: ClipboardCheck, key: 'f5', color: 'from-violet-500 to-purple-600' },
  { icon: BarChart3, key: 'f6', color: 'from-cyan-400 to-sky-600' },
];

const STEPS = ['s1', 's2', 's3'] as const;

function HeroPreview() {
  const t = useT();
  const bars = [38, 62, 45, 80, 56, 92, 70, 64, 88, 52, 76, 98];
  const moves = [
    { t: 'in', name: t('land.pv.m1'), q: t('land.pv.q1') },
    { t: 'out', name: t('land.pv.m2'), q: t('land.pv.q2') },
    { t: 'in', name: t('land.pv.m3'), q: t('land.pv.q3') },
  ];
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-10 rounded-full bg-brand-600/30 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 40, rotateX: 12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="relative rounded-3xl bg-white/[.06] p-5 ring-1 ring-white/15 backdrop-blur-xl [transform-style:preserve-3d]">
        <div className="flex items-center justify-between">
          <div><div className="text-xs text-slate-400">{t('land.pv.value')}</div><div className="text-3xl font-extrabold text-white"><CountUp value={1_284_500_000} format={moneyShort} /> <span className="text-base font-semibold text-slate-400">{t('common.currency')}</span></div></div>
          <span className="badge bg-emerald-400/15 text-emerald-300">▲ 12.4%</span>
        </div>
        <div className="mt-6 flex h-28 items-end gap-1.5">
          {bars.map((h, i) => (
            <motion.div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400" initial={{ height: 0 }} animate={{ height: `${h}%` }}
              transition={{ delay: 0.5 + i * 0.05, type: 'spring', stiffness: 120, damping: 14 }} />
          ))}
        </div>
        <div className="mt-5 space-y-2">
          {moves.map((m, i) => (
            <motion.div key={m.name} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.15 }}
              className="flex items-center gap-3 rounded-xl bg-white/[.06] px-3 py-2.5 ring-1 ring-white/10">
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${m.t === 'in' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>
                {m.t === 'in' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
              </span>
              <span className="flex-1 truncate text-sm text-slate-200">{m.name}</span>
              <span className={`text-sm font-bold ${m.t === 'in' ? 'text-emerald-300' : 'text-rose-300'}`}>{m.q}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4, type: 'spring' }}
        className="absolute -top-14 left-8 hidden animate-float items-center gap-2 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-2xl sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-600"><Bell size={18} /></span>
        <div><div className="text-xs text-slate-500">{t('land.pv.low')}</div><div className="text-sm font-bold">{t('land.pv.lowItem')}</div></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, type: 'spring' }}
        className="absolute -bottom-12 -right-6 hidden items-center gap-2 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-2xl [animation:float_5s_ease-in-out_1s_infinite] sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100 text-rose-600"><BellRing size={18} /></span>
        <div><div className="text-xs text-slate-500">{t('land.pv.debt')}</div><div className="text-sm font-bold">{t('land.pv.debtItem')}</div></div>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const user = useAppSelector((s) => s.auth.user);
  const demo = useDemoLogin();
  const t = useT();

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="bg-grid absolute inset-0 animate-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link to="/"><Logo dark /></Link>
          <nav className="flex items-center gap-2">
            <LangSwitch dark />
            {user ? (
              <Link to="/omborlar" className="btn-primary">{t('land.mine')} <ArrowRight size={16} /></Link>
            ) : (
              <>
                <Link to="/kirish" className="btn hidden text-slate-300 hover:bg-white/10 hover:text-white sm:inline-flex">{t('land.login')}</Link>
                <Link to="/royxatdan-otish" className="btn-primary">{t('land.start')}</Link>
              </>
            )}
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-2 lg:pb-32 lg:pt-16">
          <motion.div variants={stagger.container} initial="hidden" animate="show">
            <motion.span variants={stagger.item} className="badge bg-white/10 px-3 py-1 text-brand-200 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t('land.badge')}
            </motion.span>
            <motion.h1 variants={stagger.item} className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {t('land.h1a')}<br />
              <span className="bg-gradient-to-r from-brand-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">{t('land.h1b')}</span>
            </motion.h1>
            <motion.p variants={stagger.item} className="mt-6 max-w-xl text-lg text-slate-300">
              {t('land.sub')}
            </motion.p>
            <motion.div variants={stagger.item} className="mt-9 flex flex-wrap gap-3">
              <Link to={user ? '/omborlar' : '/royxatdan-otish'} className="btn-primary px-6 py-3.5 text-base">
                {user ? t('land.ctaMine') : t('land.ctaStart')} <ArrowRight size={18} />
              </Link>
              {!user && (
                <button onClick={() => demo.mutate()} disabled={demo.isPending} className="btn px-6 py-3.5 text-base text-white ring-1 ring-white/25 hover:bg-white/10">
                  <PlayCircle size={18} /> {demo.isPending ? t('land.demoLoading') : t('land.demo')}
                </button>
              )}
            </motion.div>
            <motion.div variants={stagger.item} className="mt-10 flex gap-8 text-sm text-slate-400">
              <div><div className="text-2xl font-bold text-white"><CountUp value={20} />+</div>{t('land.stat1')}</div>
              <div><div className="text-2xl font-bold text-white">∞</div>{t('land.stat2')}</div>
              <div><div className="text-2xl font-bold text-white">24/7</div>{t('land.stat3')}</div>
            </motion.div>
          </motion.div>
          <HeroPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-brand-600">{t('land.featTag')}</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('land.featTitle')}</h2>
          <p className="mt-4 text-slate-500">{t('land.featSub')}</p>
        </motion.div>
        <motion.div variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div key={f.key} variants={stagger.item} whileHover={{ y: -6 }} className="card group p-6 transition-shadow hover:shadow-xl">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}><f.icon size={22} /></div>
              <h3 className="mt-5 text-lg font-bold">{t(`land.${f.key}.t`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{t(`land.${f.key}.x`)}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">{t('land.stepsTitle')}</h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div key={s} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="relative card p-7">
                <div className="bg-gradient-to-br from-brand-500 to-violet-500 bg-clip-text text-5xl font-black text-transparent">0{i + 1}</div>
                <h3 className="mt-4 text-lg font-bold">{t(`land.${s}.t`)}</h3>
                <p className="mt-1 text-sm text-slate-500">{t(`land.${s}.x`)}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-14 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
            {([[Lock, 'land.t1'], [History, 'land.t2'], [BellRing, 'land.t3']] as [typeof Lock, TKey][]).map(([Icon, k]) => (
              <div key={k} className="flex items-center gap-3"><Icon size={18} className="shrink-0 text-brand-600" /> {t(k)}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 px-6 py-16 text-center text-white sm:px-16">
          <div className="bg-grid absolute inset-0 opacity-60" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('land.ctaTitle')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-100">{t('land.ctaSub')}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to={user ? '/omborlar' : '/royxatdan-otish'} className="btn bg-white px-6 py-3.5 text-base text-brand-700 hover:bg-brand-50">{t('land.start')} <ArrowRight size={18} /></Link>
              {!user && <button onClick={() => demo.mutate()} className="btn px-6 py-3.5 text-base text-white ring-1 ring-white/40 hover:bg-white/10">{t('land.ctaDemo')}</button>}
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <span>© {new Date().getFullYear()} OmborSavdo — {t('land.footer')}</span>
        </div>
      </footer>
      <Toasts />
    </div>
  );
}
