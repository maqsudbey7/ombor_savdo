import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, useLocation, useNavigate, useOutlet, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, HandCoins, LayoutDashboard, LayoutGrid, LogOut, Menu, PackagePlus,
  Plus, Settings, Tags, UserRound, X,
} from 'lucide-react';
import { useWarehouses } from '../hooks/queries';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { setSidebarOpen } from '../store/uiSlice';
import { COLORS } from '../lib/format';
import { DEMO } from '../hooks/useDemoLogin';
import { LangSwitch, Logo, Skeleton, ThemeSwitch, Toasts } from './ui';
import { OfflineBanner } from './feedback';
import NotificationBell from './NotificationBell';
import { useT, type TKey } from '../i18n';
import WarehouseModal from './WarehouseModal';
import MovementModal from './MovementModal';
import ProductDrawer from './ProductDrawer';
import { DebtModal } from './DebtDialogs';
import type { MovementType } from '../types/api';

const SECTIONS: { to: string; label: TKey; icon: typeof Boxes }[] = [
  { to: '', label: 'nav.dashboard', icon: LayoutDashboard },
  { to: 'mahsulotlar', label: 'nav.products', icon: Boxes },
  { to: 'harakatlar', label: 'nav.movements', icon: ArrowLeftRight },
  { to: 'qarzdorlar', label: 'nav.debts', icon: HandCoins },
  { to: 'kategoriyalar', label: 'nav.categories', icon: Tags },
  { to: 'sozlamalar', label: 'nav.settings', icon: Settings },
];

const linkCls = (active: boolean) =>
  `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

function Sidebar({ onNewWarehouse, onLogout }: { onNewWarehouse: () => void; onLogout: () => void }) {
  const { data: warehouses, isPending } = useWarehouses();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const t = useT();
  const wid = Number(useParams().wid) || null;
  const close = () => dispatch(setSidebarOpen(false));

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/omborlar" onClick={close}><Logo /></Link>
        <div className="flex items-center gap-1">
          <span className="hidden lg:block"><NotificationBell /></span>
          <button className="icon-btn lg:hidden" onClick={close} aria-label={t('common.close')}><X size={20} /></button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <NavLink to="/omborlar" end onClick={close} className={({ isActive }) => linkCls(isActive)}>
          <LayoutGrid size={18} /> {t('nav.allWarehouses')}
        </NavLink>

        <div className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('nav.myWarehouses')}</div>
        {isPending && [0, 1].map((i) => <Skeleton key={i} className="mx-3 mb-2 h-9" />)}
        {warehouses?.map((w) => {
          const active = w.id === wid;
          return (
            <div key={w.id}>
              <Link to={`/omborlar/${w.id}`} onClick={close}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}>
                <span className={`h-3 w-3 shrink-0 rounded-full bg-gradient-to-br ${COLORS[w.color].grad}`} />
                <span className="truncate">{w.name}</span>
                {w.low_stock_count > 0 && <span className="ml-auto rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">{w.low_stock_count}</span>}
              </Link>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }} className="overflow-hidden">
                    <div className="mb-2 ml-[17px] space-y-0.5 border-l-2 border-slate-100 pl-2.5">
                      {SECTIONS.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={`/omborlar/${w.id}${to ? `/${to}` : ''}`} end onClick={close}
                          className={({ isActive }) => `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${isActive ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                          {({ isActive }) => (
                            <>
                              {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-brand-600" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                              <Icon size={16} className="relative" /> <span className="relative">{t(label)}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        <button onClick={() => { close(); onNewWarehouse(); }}
          className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600">
          <Plus size={18} /> {t('nav.newWarehouse')}
        </button>
      </nav>

      <div className="space-y-2 border-t border-slate-100 p-3">
        <div className="flex items-center justify-between gap-2 px-1"><LangSwitch /><ThemeSwitch /></div>
        <div className="flex items-center gap-1">
          <NavLink to="/omborlar/hisob" onClick={close} className={({ isActive }) => `flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition ${isActive ? 'bg-brand-50' : 'hover:bg-slate-100'}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{user?.name[0]?.toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{user?.name}</span><span className="block truncate text-xs text-slate-500">{t('nav.account')}</span></span>
          </NavLink>
          <button className="icon-btn hover:bg-rose-50 hover:text-rose-600" title={t('nav.logout')} aria-label={t('nav.logout')} onClick={onLogout}><LogOut size={18} /></button>
        </div>
      </div>
    </div>
  );
}

type Quick = { kind: 'move'; type: MovementType } | { kind: 'debt' } | { kind: 'product' } | null;

/** Telefonda pastki menyu: eng ko'p ishlatiladigan bo'limlar + o'rtada "+" (tez amal). */
function BottomNav({ wid, onQuick }: { wid: number; onQuick: () => void }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const item = (to: string, label: TKey, Icon: typeof Boxes) => (
    <NavLink to={`/omborlar/${wid}${to ? `/${to}` : ''}`} end
      className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${isActive ? 'text-brand-600' : 'text-slate-500'}`}>
      <Icon size={21} /> {t(label)}
    </NavLink>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-end">
        {item('', 'nav.home', LayoutDashboard)}
        {item('mahsulotlar', 'nav.products', Boxes)}
        <div className="flex flex-1 justify-center">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onQuick} aria-label={t('nav.quick')}
            className="-mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/40">
            <Plus size={28} />
          </motion.button>
        </div>
        {item('qarzdorlar', 'nav.debts', HandCoins)}
        <button onClick={() => dispatch(setSidebarOpen(true))} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-slate-500">
          <Menu size={21} /> {t('nav.more')}
        </button>
      </div>
    </nav>
  );
}

function QuickSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (q: Quick) => void }) {
  const t = useT();
  const items: { q: Quick; icon: typeof Boxes; title: TKey; sub: TKey; cls: string }[] = [
    { q: { kind: 'move', type: 'in' }, icon: ArrowDownToLine, title: 'quick.in', sub: 'quick.inSub', cls: 'bg-emerald-100 text-emerald-700' },
    { q: { kind: 'move', type: 'out' }, icon: ArrowUpFromLine, title: 'quick.out', sub: 'quick.outSub', cls: 'bg-rose-100 text-rose-700' },
    { q: { kind: 'debt' }, icon: HandCoins, title: 'quick.debt', sub: 'quick.debtSub', cls: 'bg-amber-100 text-amber-700' },
    { q: { kind: 'product' }, icon: PackagePlus, title: 'quick.product', sub: 'quick.productSub', cls: 'bg-brand-100 text-brand-700' },
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="relative w-full rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="mb-2 px-1 font-bold">{t('nav.quick')}</div>
            <div className="grid grid-cols-2 gap-3">
              {items.map((it, i) => (
                <motion.button key={it.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => onPick(it.q)} className="flex flex-col items-start rounded-2xl p-4 text-left ring-1 ring-slate-200 active:bg-slate-50">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${it.cls}`}><it.icon size={22} /></span>
                  <span className="mt-3 font-semibold">{t(it.title)}</span>
                  <span className="text-xs text-slate-500">{t(it.sub)}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AppLayout() {
  const user = useAppSelector((s) => s.auth.user);
  const open = useAppSelector((s) => s.ui.sidebarOpen);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const outlet = useOutlet({ onLogout: () => onLogout() });
  const wid = Number(useParams().wid) || null;
  const [newWh, setNewWh] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [quick, setQuick] = useState<Quick>(null);
  const loggingOut = useRef(false);
  const t = useT();
  const onLogout = () => { loggingOut.current = true; dispatch(logout()); };
  const isDemo = user?.phone === DEMO.phone;

  useEffect(() => { window.scrollTo(0, 0); setSheet(false); }, [pathname]);
  if (!user) return <Navigate to={loggingOut.current ? '/' : `/kirish?next=${encodeURIComponent(pathname)}`} replace />;

  return (
    <div className="min-h-screen lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block"><Sidebar onNewWarehouse={() => setNewWh(true)} onLogout={onLogout} /></aside>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => dispatch(setSidebarOpen(false))} />
            <motion.div className="absolute inset-y-0 left-0 w-[85%] max-w-xs" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
              <Sidebar onNewWarehouse={() => setNewWh(true)} onLogout={onLogout} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 z-30">
        <OfflineBanner />
        <header className="flex h-14 items-center gap-2 border-b border-slate-200/70 bg-white/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
          {!wid && <button className="icon-btn -ml-2" onClick={() => dispatch(setSidebarOpen(true))} aria-label={t('nav.menu')}><Menu size={22} /></button>}
          <Link to="/omborlar" className="flex-1"><Logo /></Link>
          <NotificationBell align="right" />
          <Link to="/omborlar/hisob" aria-label={t('nav.account')} className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {user.name[0]?.toUpperCase() || <UserRound size={18} />}
          </Link>
        </header>
      </div>

      {isDemo && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 ring-1 ring-amber-100 sm:text-sm">
          <span>{t('demo.banner')}</span>
          <button className="font-bold underline underline-offset-2" onClick={() => { onLogout(); setTimeout(() => navigate('/royxatdan-otish'), 0); }}>{t('demo.cta')}</button>
        </div>
      )}

      <main className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10 ${wid ? 'pb-28 lg:pb-10' : ''}`}>
        <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          {outlet}
        </motion.div>
      </main>

      {wid && <BottomNav wid={wid} onQuick={() => setSheet(true)} />}
      <QuickSheet open={sheet} onClose={() => setSheet(false)} onPick={(q) => { setSheet(false); setQuick(q); }} />
      {wid && (
        <>
          <MovementModal wid={wid} open={quick?.kind === 'move'} type={quick?.kind === 'move' ? quick.type : 'in'} onClose={() => setQuick(null)} />
          <DebtModal wid={wid} open={quick?.kind === 'debt'} onClose={() => setQuick(null)} />
          <ProductDrawer wid={wid} open={quick?.kind === 'product'} onClose={() => setQuick(null)} />
        </>
      )}
      <WarehouseModal open={newWh} onClose={() => setNewWh(false)} />
      <Toasts />
    </div>
  );
}
