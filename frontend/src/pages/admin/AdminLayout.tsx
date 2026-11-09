import { Link, Navigate, NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, Package, Store, Users } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { Toasts } from '../../components/ui';

const NAV = [
  { to: '/admin', label: 'Boshqaruv', icon: LayoutDashboard, end: true },
  { to: '/admin/mahsulotlar', label: 'Mahsulotlar va ombor', icon: Package },
  { to: '/admin/buyurtmalar', label: 'Buyurtmalar', icon: ClipboardList },
  { to: '/admin/mijozlar', label: 'Mijozlar', icon: Users },
];

export default function AdminLayout() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/kirish?next=/admin" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen lg:flex">
      <aside className="relative border-b border-slate-800 bg-slate-900 text-slate-300 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-0">
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/admin" className="text-lg font-extrabold text-white">Ombor<span className="text-brand-400">Admin</span></Link>
          <Link to="/" className="flex items-center gap-1 text-xs hover:text-white lg:hidden"><Store size={14} /> Do‘kon</Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="absolute bottom-5 left-5 hidden items-center gap-2 text-sm hover:text-white lg:flex"><Store size={16} /> Do‘konga qaytish</Link>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8"><Outlet /></main>
      <Toasts />
    </div>
  );
}
