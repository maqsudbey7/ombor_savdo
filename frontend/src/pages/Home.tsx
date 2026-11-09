import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent, Boxes, ShieldCheck, Truck } from 'lucide-react';
import { useCategories, useProducts } from '../hooks/queries';
import ProductCard from '../components/ProductCard';
import { Spinner } from '../components/ui';

const STATS = [['5 000+', 'Mahsulot birligi omborda'], ['−15%', 'Gacha ulgurji chegirma'], ['1 200+', 'Doimiy mijozlar'], ['24 soat', 'Yetkazib berish']];
const FEATURES = [
  [Truck, 'Tez yetkazish', 'O‘z transportimiz bilan'],
  [BadgePercent, 'Pog‘onali narx', 'Ko‘p olsangiz — arzon'],
  [Boxes, 'Real qoldiq', 'Ombor holati jonli'],
  [ShieldCheck, 'Hujjatlar', 'Hisob-faktura va shartnoma'],
] as const;

export default function Home() {
  const cats = useCategories();
  const products = useProducts({ in_stock: true });

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-600 text-white">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="badge bg-white/15 text-white ring-1 ring-white/25">🚚 Toshkent bo‘ylab 24 soatda yetkazish</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">To‘g‘ridan-to‘g‘ri ombordan.<br /><span className="text-brand-200">Ulgurji narxlarda.</span></h1>
            <p className="mt-4 max-w-lg text-brand-100">Biznesingiz uchun mahsulotlarni qulay buyurtma qiling: hajm oshgan sari narx pasayadi, qoldiq real vaqtda ko‘rinadi.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/katalog" className="btn bg-white px-6 py-3 text-brand-700 hover:bg-brand-50">Katalogni ko‘rish <ArrowRight size={18} /></Link>
              <Link to="/royxatdan-otish" className="btn px-6 py-3 text-white ring-1 ring-white/40 hover:bg-white/10">Hamkor bo‘lish</Link>
            </div>
          </div>
          <div className="hidden grid-cols-2 gap-4 md:grid">
            {STATS.map(([a, b], i) => (
              <div key={b} className={`rounded-3xl bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur ${i % 2 ? 'translate-y-6' : ''}`}>
                <div className="text-3xl font-extrabold">{a}</div><div className="mt-1 text-sm text-brand-100">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-7xl px-4">
        <div className="card relative grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([Icon, t, d]) => (
            <div key={t} className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon size={20} /></div>
              <div><div className="font-semibold">{t}</div><div className="text-sm text-slate-500">{d}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <h2 className="text-2xl font-bold tracking-tight">Kategoriyalar</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cats.data?.map((c) => (
            <Link key={c.id} to={`/katalog?category=${c.slug}`} className="card group p-5 text-center transition hover:-translate-y-0.5 hover:ring-brand-300">
              <div className="text-4xl transition group-hover:scale-110">{c.icon}</div>
              <div className="mt-3 text-sm font-semibold">{c.name}</div>
              <div className="text-xs text-slate-400">{c.product_count} ta mahsulot</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Ommabop mahsulotlar</h2>
          <Link to="/katalog" className="text-sm font-semibold text-brand-600 hover:underline">Barchasi →</Link>
        </div>
        {products.isPending ? <Spinner /> : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.data?.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </>
  );
}
