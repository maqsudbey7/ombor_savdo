import { useEffect } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { authApi } from './api/endpoints';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { userLoaded } from './store/authSlice';
import AppLayout from './components/AppLayout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Warehouses from './pages/Warehouses';
import Dashboard from './pages/warehouse/Dashboard';
import Products from './pages/warehouse/Products';
import Movements from './pages/warehouse/Movements';
import Categories from './pages/warehouse/Categories';
import Settings from './pages/warehouse/Settings';
import Debts from './pages/warehouse/Debts';
import Account from './pages/Account';
import { useT } from './i18n';

function NotFound() {
  const t = useT();
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="bg-gradient-to-br from-brand-400 to-violet-500 bg-clip-text text-8xl font-black text-transparent">404</div>
        <p className="mt-2 text-slate-500">{t('common.notFound')}</p>
        <Link to="/" className="btn-primary mt-6">{t('common.home')}</Link>
      </div>
    </div>
  );
}

export default function App() {
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();
  // Token hali amal qiladimi — tekshiramiz (401 bo'lsa client.ts chiqarib yuboradi)
  useEffect(() => {
    if (token) authApi.me().then((u) => dispatch(userLoaded(u))).catch(() => {});
  }, [token, dispatch]);

  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="kirish" element={<Auth key="login" mode="login" />} />
      <Route path="royxatdan-otish" element={<Auth key="register" mode="register" />} />
      <Route path="omborlar" element={<AppLayout />}>
        <Route index element={<Warehouses />} />
        <Route path="hisob" element={<Account />} />
        <Route path=":wid" element={<Dashboard />} />
        <Route path=":wid/mahsulotlar" element={<Products />} />
        <Route path=":wid/harakatlar" element={<Movements />} />
        <Route path=":wid/qarzdorlar" element={<Debts />} />
        <Route path=":wid/kategoriyalar" element={<Categories />} />
        <Route path=":wid/sozlamalar" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
