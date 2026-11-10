import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch } from '.';
import { detectLang, type Lang } from '../i18n';

export interface Toast { id: string; message: string; type: 'ok' | 'err' }
export type Theme = 'light' | 'dark' | 'system';
interface UiState { toasts: Toast[]; sidebarOpen: boolean; lang: Lang; theme: Theme }

function loadTheme(): Theme {
  try { const v = localStorage.getItem('theme'); if (v === 'light' || v === 'dark' || v === 'system') return v; } catch { /* yo'q */ }
  return 'system';
}

const initialState: UiState = { toasts: [], sidebarOpen: false, lang: detectLang(), theme: loadTheme() };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toastAdded: (s, { payload }: PayloadAction<Toast>) => { s.toasts.push(payload); },
    toastRemoved: (s, { payload }: PayloadAction<string>) => { s.toasts = s.toasts.filter((t) => t.id !== payload); },
    setSidebarOpen: (s, { payload }: PayloadAction<boolean>) => { s.sidebarOpen = payload; },
    setLang: (s, { payload }: PayloadAction<Lang>) => { s.lang = payload; },
    setTheme: (s, { payload }: PayloadAction<Theme>) => { s.theme = payload; },
  },
});

export const { toastAdded, toastRemoved, setSidebarOpen, setLang, setTheme } = uiSlice.actions;
export default uiSlice.reducer;

/** Thunk: toast ko‘rsatib, 3.5 (xato bo'lsa 6) soniyadan so‘ng yashiradi. */
export const toast = (message: string, type: Toast['type'] = 'ok') => (dispatch: AppDispatch) => {
  const id = nanoid();
  dispatch(toastAdded({ id, message, type }));
  setTimeout(() => dispatch(toastRemoved(id)), type === 'err' ? 6000 : 3500);
};
