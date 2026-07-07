import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

let cachedRouter: ReturnType<typeof createRouter> | undefined;
let cachedQueryClient: QueryClient | undefined;

export const getRouter = () => {
  if (!cachedQueryClient) {
    cachedQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
        },
      },
    });
  }

  if (!cachedRouter) {
    cachedRouter = createRouter({
      routeTree,
      context: { queryClient: cachedQueryClient },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0,
    });
  }

  return cachedRouter;
};

export const resetRouter = () => {
  if (cachedQueryClient) {
    cachedQueryClient.clear();
  }
  cachedRouter = undefined;
  cachedQueryClient = undefined;
};
