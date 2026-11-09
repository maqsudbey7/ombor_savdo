import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import cart from './cartSlice';
import ui from './uiSlice';
import { save } from '../lib/storage';

export const store = configureStore({ reducer: { auth, cart, ui } });

// auth va savatni localStorage'da saqlash
let prev = store.getState();
store.subscribe(() => {
  const s = store.getState();
  if (s.auth !== prev.auth) save('auth', s.auth);
  if (s.cart !== prev.cart) save('cart', s.cart);
  prev = s;
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
