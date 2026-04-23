import { QueryClient } from "@tanstack/react-query";

/**
 * Match `cyrus-ui/src/lib/queryClient.ts` defaults so Command Center pages behave the same
 * when embedded in the fused shell or run in isolation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
