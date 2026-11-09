import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch } from '.';

export interface Toast { id: string; message: string; type: 'ok' | 'err' }
interface UiState { cartOpen: boolean; toasts: Toast[] }

const initialState: UiState = { cartOpen: false, toasts: [] };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCartOpen: (s, { payload }: PayloadAction<boolean>) => { s.cartOpen = payload; },
    toastAdded: (s, { payload }: PayloadAction<Toast>) => { s.toasts.push(payload); },
    toastRemoved: (s, { payload }: PayloadAction<string>) => { s.toasts = s.toasts.filter((t) => t.id !== payload); },
  },
});

export const { setCartOpen, toastAdded, toastRemoved } = uiSlice.actions;
export default uiSlice.reducer;

/** Thunk: toast ko‘rsatib, 3.2 soniyadan so‘ng yashiradi. */
export const toast = (message: string, type: Toast['type'] = 'ok') => (dispatch: AppDispatch) => {
  const id = nanoid();
  dispatch(toastAdded({ id, message, type }));
  setTimeout(() => dispatch(toastRemoved(id)), 3200);
};
