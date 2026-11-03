import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { SessionProvider, type DeskUser } from "@/components/auth/session";

const TOKEN_KEY = "whimsy_desk_token";

interface AuthUser {
  user_id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function readDeskToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function writeDeskToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function toDeskUser(user: AuthUser): DeskUser {
  const name = user.name.trim();
  return {
    userId: user.user_id,
    email: user.email,
    name,
    firstName: name.split(" ")[0] || "",
  };
}

/** Signed-in state for a machine that has no Clerk keys. The token is a local HS256 session. */
export function LocalSessionProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<DeskUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const token = readDeskToken();
    if (!token) {
      setIsLoaded(true);
      return;
    }
    // The token is not decoded in the browser. /api/me confirms it and fills the greeting.
    let cancelled = false;
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error("session");
        return (await res.json()) as { user_id: string; email: string; name: string };
      })
      .then((profile) => {
        if (cancelled) return;
        setUser(toDeskUser({ user_id: profile.user_id, email: profile.email, name: profile.name }));
      })
      .catch(() => {
        writeDeskToken(null);
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    writeDeskToken(null);
    setUser(null);
    queryClient.clear();
    navigate("/");
  }, [navigate]);

  const value = useMemo(
    () => ({
      mode: "local" as const,
      isLoaded,
      userId: user?.userId ?? null,
      user,
      getToken: async () => readDeskToken(),
      signOut,
    }),
    [isLoaded, user, signOut],
  );

  return <SessionProvider value={value}>{children}</SessionProvider>;
}

export async function deskSignUp(email: string, password: string, name: string): Promise<void> {
  const res = await apiPost<AuthResponse>("/auth/signup", { email, password, name });
  writeDeskToken(res.token);
}

export async function deskSignIn(email: string, password: string): Promise<void> {
  const res = await apiPost<AuthResponse>("/auth/login", { email, password });
  writeDeskToken(res.token);
}
