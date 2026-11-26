import { AppwriteException, ID, type Models } from "appwrite";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ADMIN_LABEL } from "../../shared/appwrite.ts";
import { account } from "./appwrite.ts";

type User = Models.User<Models.Preferences>;

interface Auth {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  /** A short-lived token proving who the user is to the Express server. */
  jwt: () => Promise<string>;
}

const Ctx = createContext<Auth | null>(null);

/** Turns Appwrite's error codes into sentences a user can act on. */
export function authMessage(err: unknown): string {
  if (err instanceof AppwriteException) {
    switch (err.type) {
      case "user_invalid_credentials":
        return "That email and password don't match an account.";
      case "user_already_exists":
        return "There's already an account with that email. Sign in instead.";
      case "user_blocked":
        return "This account has been disabled.";
      case "general_rate_limit_exceeded":
        return "Too many attempts. Wait a minute and try again.";
      case "user_password_recently_used":
      case "password_recently_used":
        return "Pick a password you haven't used recently.";
      case "user_password_personal_data":
      case "password_personal_data":
        return "Your password can't contain your name or email.";
    }
    if (err.code === 0 || err.message.includes("Failed to fetch"))
      return "Can't reach the sign-in service. Check your connection.";
    return err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

let cachedJwt: { token: string; at: number } | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setUser(await account.get());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo<Auth>(
    () => ({
      user,
      loading,
      isAdmin: Boolean(user?.labels.includes(ADMIN_LABEL)),
      reload,
      async signIn(email, password) {
        await account.createEmailPasswordSession({ email, password });
        await reload();
      },
      async signUp(name, email, password) {
        await account.create({ userId: ID.unique(), email, password, name });
        await account.createEmailPasswordSession({ email, password });
        await reload();
      },
      async signOut() {
        cachedJwt = null;
        await account.deleteSession({ sessionId: "current" }).catch(() => {});
        setUser(null);
      },
      async jwt() {
        // JWTs last 15 minutes; reuse one for 10 to avoid a round trip per admin request.
        if (cachedJwt && Date.now() - cachedJwt.at < 10 * 60_000) return cachedJwt.token;
        const { jwt } = await account.createJWT();
        cachedJwt = { token: jwt, at: Date.now() };
        return jwt;
      },
    }),
    [user, loading, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
