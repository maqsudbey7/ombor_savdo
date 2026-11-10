import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    // 401/403/404/422 — qayta urinishdan foyda yo'q; tarmoq/server xatosida bir marta qayta urinadi
    queries: { retry: (n, e) => n < 1 && ![401, 403, 404, 422].includes((e as { status?: number }).status ?? 0), refetchOnWindowFocus: false, staleTime: 15_000 },
  },
});
