import { useRef } from "react";
import { Navigate } from "react-router-dom";
import { setTokenGetter } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useSession } from "@/components/auth/session";

/** Registers the session token with the fetch layer and wipes cached data when the user changes. */
export function AuthBridge() {
  const { getToken, userId, isLoaded } = useSession();
  const lastUser = useRef<string | null | undefined>(undefined);
  setTokenGetter(() => getToken());
  if (isLoaded && lastUser.current !== userId) {
    if (lastUser.current !== undefined) queryClient.clear();
    lastUser.current = userId ?? null;
  }
  return null;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useSession();
  if (!isLoaded) {
    return <p className="paper-grain grid min-h-screen place-items-center text-ink-muted">Opening your desk…</p>;
  }
  if (!userId) return <Navigate to="/sign-in" replace />;
  return children;
}
