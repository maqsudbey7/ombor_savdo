import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { MotionConfig } from 'motion/react';
import { store } from './store';
import App from './App';
import { ConfirmHost, ErrorBoundary } from './components/feedback';
import { registerSW } from './lib/pwa';
import './index.css';

registerSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <ErrorBoundary>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            <ConfirmHost />
          </ErrorBoundary>
        </MotionConfig>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
