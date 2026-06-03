declare module "better-auth" {
  export function betterAuth(options: Record<string, unknown>): unknown;
}

declare module "better-auth/crypto" {
  export function hashPassword(password: string): Promise<string>;
}

declare module "better-auth/next-js" {
  export function toNextJsHandler(auth: unknown): {
    GET: (request: Request) => Response | Promise<Response>;
    POST: (request: Request) => Response | Promise<Response>;
  };
}

declare module "better-auth/plugins" {
  export function admin(options?: Record<string, unknown>): unknown;
}

declare module "better-auth/plugins/admin" {
  export function admin(options?: Record<string, unknown>): unknown;
}

declare module "better-auth/react" {
  interface AuthSession {
    user?: {
      id?: string;
    } & Record<string, unknown>;
  }

  interface AuthClientResult<TData = unknown> {
    data?: TData;
    error?: unknown;
  }

  interface AuthClient {
    useSession(): {
      data: AuthSession | null;
      isPending: boolean;
    };
    signIn: {
      email(credentials: {
        email: string;
        password: string;
      }): Promise<AuthClientResult>;
    };
    signOut(): Promise<AuthClientResult>;
  }

  export function createAuthClient(
    options?: Record<string, unknown>
  ): AuthClient;
}
