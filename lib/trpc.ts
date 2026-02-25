import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  if (!url) {
    throw new Error(
      "Rork did not set EXPO_PUBLIC_RORK_API_BASE_URL, please use support"
    );
  }

  return url;
};

let currentUserEmail: string | null = null;

export const setTrpcUserEmail = (email: string | null) => {
  currentUserEmail = email;
  console.log(`[TRPC] User email set to: ${email}`);
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        const headers: Record<string, string> = {};
        if (currentUserEmail) {
          headers["x-user-email"] = currentUserEmail;
        }
        return headers;
      },
    }),
  ],
});
