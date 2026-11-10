/** Ilova (PWA): service worker va "o'rnatish" tugmasi. */
import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function registerSW() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BeforeInstallPromptEvent; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; installed = true; emit(); });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  emit();
  try {
    await e.prompt();
    const ok = (await e.userChoice).outcome === 'accepted';
    if (ok) { installed = true; emit(); }
    return ok;
  } catch {
    return false;
  }
}

/** Chiqishda: shu qurilmada saqlangan ma'lumot nusxalarini o'chirish. */
export function clearUserData() {
  navigator.serviceWorker?.controller?.postMessage('clear-user-data');
  if ('caches' in window) caches.delete('ombor-api-v1').catch(() => {});
}

interface InstallState { canPrompt: boolean; installed: boolean; ios: boolean }
let snap: InstallState | null = null;
function get(): InstallState {
  const n = { canPrompt: !!deferred, installed: installed || isStandalone(), ios: isIOS() };
  if (!snap || snap.canPrompt !== n.canPrompt || snap.installed !== n.installed || snap.ios !== n.ios) snap = n;
  return snap;
}
export const useInstall = () => useSyncExternalStore(subscribe, get);
