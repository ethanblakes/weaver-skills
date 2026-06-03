import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;

// Admin methods are injected by the admin plugin at runtime.
// Use type assertion since TypeScript can't infer plugin types statically.
export const adminClient = authClient as typeof authClient & {
  admin: {
    listUsers: (params: {
      query?: Record<string, unknown>;
    }) => Promise<{ data?: { users: unknown[] }; error?: unknown }>;
    createUser: (body: {
      email: string;
      password?: string;
      name: string;
      role?: string;
    }) => Promise<{ data?: unknown; error?: unknown }>;
    banUser: (body: {
      userId: string;
      banReason?: string;
      banExpires?: string;
    }) => Promise<unknown>;
    unbanUser: (body: { userId: string }) => Promise<unknown>;
    removeUser: (body: { userId: string }) => Promise<unknown>;
    setRole: (body: { userId: string; role: string }) => Promise<unknown>;
  };
};
