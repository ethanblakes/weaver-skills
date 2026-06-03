import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type ServerSession = {
  user?: {
    id?: string;
    role?: string | null;
  } & Record<string, unknown>;
  session?: Record<string, unknown>;
} | null;

type GetSessionOptions = {
  headers: Headers;
};

type AuthApi = {
  api?: {
    getSession?: (options: GetSessionOptions) => Promise<ServerSession>;
  };
};

export async function getServerSession(
  requestHeaders?: Headers
): Promise<ServerSession> {
  const authApi = auth as AuthApi;
  const resolvedHeaders = requestHeaders ?? (await headers());
  return authApi.api?.getSession?.({ headers: resolvedHeaders }) ?? null;
}

export function isAdminSession(session: ServerSession) {
  return session?.user?.role === "admin";
}
