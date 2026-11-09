import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import ui from './uiSlice';
import { save } from '../lib/storage';

export const store = configureStore({ reducer: { auth, ui } });

// Kirish ma'lumotini localStorage'da saqlash
let prev = store.getState().auth;
store.subscribe(() => {
  const { auth: a } = store.getState();
  if (a !== prev) save('auth', a);
  prev = a;
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
