import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { CurrentUserProvider } from './contexts/CurrentUserContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Kill every HTML5 drag at the source. The CSS rules in index.css cover the
// common cases, but Chromium's drag-when-text-is-selected behaviour ignores
// `-webkit-user-drag: none` on the descendants and creates a translucent
// drag-image that follows the cursor - looking exactly like the whole UI is
// being dragged across the screen. preventDefault() on dragstart blocks
// every drag origin (text, images, links) regardless of what CSS says.
//
// Future opt-in: any element marked `data-allow-drag` (e.g., a future drop
// zone for file uploads) keeps its native drag behaviour. None today.
window.addEventListener('dragstart', (e) => {
  const target = e.target;
  if (target instanceof HTMLElement && target.closest('[data-allow-drag]')) {
    return;
  }
  e.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <App />
      </CurrentUserProvider>
    </QueryClientProvider>
  </StrictMode>,
);
