import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import ui from './uiSlice';
import { save } from '../lib/storage';
import { queryClient } from '../lib/queryClient';
import { clearUserData } from '../lib/pwa';

export const store = configureStore({ reducer: { auth, ui } });

// Kirish ma'lumoti va tilni localStorage'da saqlash
let prev = store.getState();
document.documentElement.lang = prev.ui.lang;

// Tungi / kunduzgi rejim: <html class="dark">
const media = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(theme: string) {
  const dark = theme === 'dark' || (theme === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1120' : '#2145ee');
}
applyTheme(prev.ui.theme);
media.addEventListener?.('change', () => applyTheme(store.getState().ui.theme));
store.subscribe(() => {
  const s = store.getState();
  if (s.auth !== prev.auth) {
    save('auth', s.auth);
    // Chiqildi yoki boshqa odam kirdi — oldingi foydalanuvchi ma'lumotlari ekranda/keshda qolmasin
    if (!s.auth.token || (prev.auth.user && s.auth.user && prev.auth.user.id !== s.auth.user.id)) {
      queryClient.clear();
      clearUserData();
    }
  }
  if (s.ui.theme !== prev.ui.theme) {
    try { localStorage.setItem('theme', s.ui.theme); } catch { /* storage yo'q */ }
    applyTheme(s.ui.theme);
  }
  if (s.ui.lang !== prev.ui.lang) {
    try { localStorage.setItem('lang', s.ui.lang); } catch { /* storage yo'q */ }
    document.documentElement.lang = s.ui.lang;
  }
  prev = s;
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
