import { useRef } from "react";
import { Navigate } from "react-router-dom";
import { Show, useAuth } from "@clerk/react";
import { setTokenGetter } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

/** Registers Clerk's getToken with the fetch layer and wipes cached data when the user changes. */
export function AuthBridge() {
  const { getToken, userId, isLoaded } = useAuth();
  const lastUser = useRef<string | null | undefined>(undefined);
  setTokenGetter(() => getToken());
  if (isLoaded && lastUser.current !== userId) {
    if (lastUser.current !== undefined) queryClient.clear();
    lastUser.current = userId ?? null;
  }
  return null;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Navigate to="/sign-in" replace />
      </Show>
    </>
  );
}
