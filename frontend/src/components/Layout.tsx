import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Clock, Grid3x3, Home, LayoutDashboard, LogOut, MapPin, Package, Phone, Search, ShoppingCart, Trash2, User, Warehouse, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { removeFromCart, selectCartTotals, setQty } from '../store/cartSlice';
import { setCartOpen } from '../store/uiSlice';
import { fmt } from '../lib/format';
import { nextTier, priceFor } from '../lib/pricing';
import { ProductImage, QtyInput, Toasts } from './ui';

function UserMenu() {
  const user = useAppSelector((s) => s.auth.user)!;
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const item = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50';
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100" onClick={() => setOpen(!open)}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{user.name[0]?.toUpperCase()}</span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium lg:block">{user.name}</span>
      </button>
      {open && (
        <div className="card absolute right-0 mt-2 w-56 p-1.5 text-sm" onClick={() => setOpen(false)}>
          <div className="px-3 py-2"><div className="font-semibold">{user.name}</div><div className="text-xs text-slate-500">{user.company || user.phone}</div></div>
          <hr className="my-1 border-slate-100" />
          {user.role === 'admin' && <Link to="/admin" className={item}><LayoutDashboard size={16} /> Admin panel</Link>}
          <Link to="/buyurtmalarim" className={item}><Package size={16} /> Buyurtmalarim</Link>
          <button onClick={() => { dispatch(logout()); nav('/'); }} className={`${item} text-rose-600 hover:bg-rose-50`}><LogOut size={16} /> Chiqish</button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const user = useAppSelector((s) => s.auth.user);
  const { count } = useAppSelector(selectCartTotals);
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const search = (e: FormEvent) => { e.preventDefault(); nav(`/katalog?q=${encodeURIComponent(q.trim())}`); };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30"><Warehouse size={18} /></span>
          <span className="hidden text-lg sm:block">Ombor<span className="text-brand-600">Savdo</span></span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          {[['/katalog', 'Katalog'], ['/buyurtmalarim', 'Buyurtmalarim']].map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</NavLink>
          ))}
        </nav>
        <form className="relative flex-1" onSubmit={search} role="search">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input bg-slate-100 pl-10 ring-0 focus:bg-white" placeholder="Mahsulot nomi yoki SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <button className="relative hidden h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 md:grid" onClick={() => dispatch(setCartOpen(true))} aria-label="Savat">
          <ShoppingCart size={20} />
          {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">{count}</span>}
        </button>
        {user ? <UserMenu /> : <Link to="/kirish" className="btn-primary px-3 sm:px-4"><User size={16} /><span className="hidden sm:inline">Kirish</span></Link>}
      </div>
    </header>
  );
}

function CartDrawer() {
  const open = useAppSelector((s) => s.ui.cartOpen);
  const items = useAppSelector((s) => s.cart.items);
  const totals = useAppSelector(selectCartTotals);
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const close = () => dispatch(setCartOpen(false));

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={close} />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold">Savat <span className="text-slate-400">({totals.count})</span></h2>
          <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100" onClick={close} aria-label="Yopish"><X size={20} /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {!items.length && <div className="py-20 text-center text-slate-500"><ShoppingCart className="mx-auto mb-3 text-slate-300" size={40} />Savat hozircha bo‘sh</div>}
          {items.map(({ product: p, qty }) => {
            const price = priceFor(p, qty);
            const nt = nextTier(p, qty);
            return (
              <div key={p.id} className="flex gap-3 rounded-2xl p-2 ring-1 ring-slate-100">
                <ProductImage product={p} className="h-20 w-20 shrink-0 rounded-xl [&>span]:text-3xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="line-clamp-2 text-sm font-semibold">{p.name}</div>
                    <button onClick={() => dispatch(removeFromCart(p.id))} className="text-slate-400 hover:text-rose-500" aria-label="O‘chirish"><Trash2 size={16} /></button>
                  </div>
                  <div className="text-xs text-slate-500">{fmt(price)} / {p.unit}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <QtyInput size="sm" value={qty} min={p.moq} max={p.stock} onChange={(v) => dispatch(setQty({ id: p.id, qty: v }))} />
                    <div className="text-sm font-bold">{fmt(price * qty)}</div>
                  </div>
                  {nt && <div className="mt-1.5 text-[11px] text-emerald-600">Yana {nt.min_qty - qty} {p.unit} qo‘shsangiz — {fmt(nt.price)}/{p.unit}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {items.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 p-5">
            {totals.saved > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Ulgurji tejamkorlik</span><span>−{fmt(totals.saved)}</span></div>}
            <div className="flex justify-between text-lg font-bold"><span>Jami</span><span>{fmt(totals.total)}</span></div>
            <button className="btn-primary w-full py-3" onClick={() => { close(); nav('/rasmiylashtirish'); }}>Buyurtmani rasmiylashtirish</button>
          </div>
        )}
      </aside>
    </div>
  );
}

function MobileNav() {
  const { count } = useAppSelector(selectCartTotals);
  const dispatch = useAppDispatch();
  const cls = ({ isActive }: { isActive: boolean }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-600' : 'text-slate-500'}`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <NavLink to="/" end className={cls}><Home size={20} />Bosh sahifa</NavLink>
      <NavLink to="/katalog" className={cls}><Grid3x3 size={20} />Katalog</NavLink>
      <button onClick={() => dispatch(setCartOpen(true))} className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
        <ShoppingCart size={20} />Savat
        {count > 0 && <span className="absolute left-1/2 top-1 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{count}</span>}
      </button>
      <NavLink to="/buyurtmalarim" className={cls}><Package size={20} />Buyurtmalar</NavLink>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white pb-16 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-extrabold"><Warehouse size={20} className="text-brand-600" /> OmborSavdo</div>
          <p className="mt-2 text-sm text-slate-500">Do‘konlar, kafe va korxonalar uchun to‘g‘ridan-to‘g‘ri ombordan ulgurji narxlarda yetkazib berish.</p>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2"><Phone size={16} /> +998 90 000 00 00</div>
          <div className="flex items-center gap-2"><MapPin size={16} /> Toshkent sh., Ombor ko‘chasi, 1</div>
          <div className="flex items-center gap-2"><Clock size={16} /> Du–Sha, 08:00–19:00</div>
        </div>
        <div className="text-sm text-slate-500 sm:text-right">© {new Date().getFullYear()} OmborSavdo. Barcha huquqlar himoyalangan.</div>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <MobileNav />
      <CartDrawer />
      <Toasts />
    </div>
  );
}
