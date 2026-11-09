import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { authApi } from './api/endpoints';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { userLoaded } from './store/authSlice';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductPage from './pages/Product';
import Checkout from './pages/Checkout';
import Auth from './pages/Auth';
import Orders from './pages/Orders';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import Customers from './pages/admin/Customers';

function NotFound() {
  return (
    <div className="py-32 text-center">
      <div className="text-6xl font-extrabold text-slate-200">404</div>
      <p className="mt-2 text-slate-500">Sahifa topilmadi</p>
      <Link to="/" className="btn-primary mt-6">Bosh sahifa</Link>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  // Token hali amal qiladimi — tekshirib, foydalanuvchi ma’lumotini yangilaymiz (401 bo‘lsa client.ts logout qiladi)
  useEffect(() => {
    if (token) authApi.me().then((u) => dispatch(userLoaded(u))).catch(() => {});
  }, [token, dispatch]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="katalog" element={<Catalog />} />
        <Route path="mahsulot/:id" element={<ProductPage />} />
        <Route path="rasmiylashtirish" element={<Checkout />} />
        <Route path="kirish" element={<Auth key="login" mode="login" />} />
        <Route path="royxatdan-otish" element={<Auth key="register" mode="register" />} />
        <Route path="buyurtmalarim" element={<Orders />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="mahsulotlar" element={<AdminProducts />} />
        <Route path="buyurtmalar" element={<AdminOrders />} />
        <Route path="mijozlar" element={<Customers />} />
      </Route>
    </Routes>
  );
}
