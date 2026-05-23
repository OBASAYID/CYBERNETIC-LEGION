import { QueryClient, QueryCache } from "@tanstack/react-query";

function apiRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  if (error instanceof Error && /503|initializing|network/i.test(error.message)) return true;
  return failureCount < 2;
}

/**
 * Command Center defaults — resilient API reads, no aggressive polling.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (import.meta.env?.DEV) {
        console.warn("[Query]", query.queryKey, error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 300_000,
      refetchInterval: false,
      refetchOnWindowFocus: true,
      retry: apiRetry,
    },
    mutations: {
      retry: 1,
    },
  },
});
