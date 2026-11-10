import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, useLocation, useOutlet, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftRight, Boxes, HandCoins, LayoutDashboard, LayoutGrid, LogOut, Menu, Plus, Settings, Tags, X } from 'lucide-react';
import { useWarehouses } from '../hooks/queries';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { setSidebarOpen } from '../store/uiSlice';
import { COLORS } from '../lib/format';
import { LangSwitch, Logo, Skeleton, Toasts } from './ui';
import NotificationBell from './NotificationBell';
import { useT, type TKey } from '../i18n';
import WarehouseModal from './WarehouseModal';

const SECTIONS: { to: string; label: TKey; icon: typeof Boxes }[] = [
  { to: '', label: 'nav.dashboard', icon: LayoutDashboard },
  { to: 'mahsulotlar', label: 'nav.products', icon: Boxes },
  { to: 'harakatlar', label: 'nav.movements', icon: ArrowLeftRight },
  { to: 'qarzdorlar', label: 'nav.debts', icon: HandCoins },
  { to: 'kategoriyalar', label: 'nav.categories', icon: Tags },
  { to: 'sozlamalar', label: 'nav.settings', icon: Settings },
];

function Sidebar({ onNewWarehouse, onLogout }: { onNewWarehouse: () => void; onLogout: () => void }) {
  const { data: warehouses, isPending } = useWarehouses();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const t = useT();
  const wid = Number(useParams().wid) || null;
  const close = () => dispatch(setSidebarOpen(false));

  return (
    <div className="flex h-full flex-col bg-ink-950 text-slate-400">
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/omborlar" onClick={close}><Logo dark /></Link>
        <div className="flex items-center gap-1">
          <span className="hidden lg:block"><NotificationBell dark /></span>
          <button className="icon-btn text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" onClick={close} aria-label={t('common.close')}><X size={20} /></button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <NavLink to="/omborlar" end onClick={close}
          className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
          <LayoutGrid size={18} /> {t('nav.allWarehouses')}
        </NavLink>

        <div className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('nav.myWarehouses')}</div>
        {isPending && [0, 1].map((i) => <Skeleton key={i} className="mx-3 mb-2 h-9 bg-white/5" />)}
        {warehouses?.map((w) => {
          const active = w.id === wid;
          return (
            <div key={w.id}>
              <Link to={`/omborlar/${w.id}`} onClick={close}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'text-white' : 'hover:bg-white/5 hover:text-white'}`}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${COLORS[w.color].grad} ${active ? 'ring-4 ring-white/10' : ''}`} />
                <span className="truncate">{w.name}</span>
                {w.low_stock_count > 0 && <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-400">{w.low_stock_count}</span>}
              </Link>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="mb-2 ml-[18px] space-y-0.5 border-l border-white/10 pl-3">
                      {SECTIONS.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={`/omborlar/${w.id}${to ? `/${to}` : ''}`} end onClick={close}
                          className={({ isActive }) => `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition ${isActive ? 'text-white' : 'hover:text-white'}`}>
                          {({ isActive }) => (
                            <>
                              {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-brand-600/90 shadow-glow" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
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
          className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-sm font-medium transition hover:border-brand-400 hover:text-white">
          <Plus size={18} /> {t('nav.newWarehouse')}
        </button>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex justify-center"><LangSwitch dark /></div>
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-violet-500 text-sm font-bold text-white">{user?.name[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{user?.name}</div><div className="truncate text-xs">{user?.phone}</div></div>
          <button className="icon-btn text-slate-400 hover:bg-white/10 hover:text-rose-400" title={t('nav.logout')} aria-label={t('nav.logout')}
            onClick={onLogout}><LogOut size={18} /></button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const user = useAppSelector((s) => s.auth.user);
  const open = useAppSelector((s) => s.ui.sidebarOpen);
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const [newWh, setNewWh] = useState(false);
  const loggingOut = useRef(false);
  const t = useT();
  const onLogout = () => { loggingOut.current = true; dispatch(logout()); };

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  if (!user) return <Navigate to={loggingOut.current ? '/' : `/kirish?next=${encodeURIComponent(pathname)}`} replace />;

  return (
    <div className="min-h-screen lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block"><Sidebar onNewWarehouse={() => setNewWh(true)} onLogout={onLogout} /></aside>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => dispatch(setSidebarOpen(false))} />
            <motion.div className="absolute inset-y-0 left-0 w-[85%] max-w-xs" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
              <Sidebar onNewWarehouse={() => setNewWh(true)} onLogout={onLogout} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl lg:hidden">
        <button className="icon-btn -ml-2" onClick={() => dispatch(setSidebarOpen(true))} aria-label={t('nav.menu')}><Menu size={22} /></button>
        <Link to="/omborlar" className="flex-1"><Logo /></Link>
        <NotificationBell align="right" />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
          {outlet}
        </motion.div>
      </main>
      <WarehouseModal open={newWh} onClose={() => setNewWh(false)} />
      <Toasts />
    </div>
  );
}
