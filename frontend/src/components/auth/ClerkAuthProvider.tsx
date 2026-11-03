import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider, useAuth, useUser } from "@clerk/react";
import { LocalSessionProvider } from "@/components/auth/LocalSession";
import { SessionProvider, type DeskUser } from "@/components/auth/session";

// Brand Clerk here once: it styles sign-in, sign-up and the user menu.
const appearance = {
  variables: {
    colorPrimary: "#A34832",
    colorPrimaryForeground: "#FFFFFF",
    colorBackground: "#FFFDF9",
    colorForeground: "#2C1810",
    colorInput: "#FFFFFF",
    colorInputForeground: "#2C1810",
    colorBorder: "#E5DBCB",
    fontFamily: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
};

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "";

interface ClerkConfig {
  enabled: boolean;
  publishable_key: string;
  proxy_url: string;
}

function ClerkSessionBridge({ children }: { children: React.ReactNode }) {
  const { getToken, userId, isLoaded, signOut } = useAuth();
  const { user } = useUser();
  const deskUser: DeskUser | null = user
    ? {
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? "",
        firstName: user.firstName ?? "",
      }
    : null;
  return (
    <SessionProvider
      value={{
        mode: "clerk",
        isLoaded,
        userId: userId ?? null,
        user: deskUser,
        getToken: () => getToken(),
        signOut: async () => {
          await signOut();
        },
      }}
    >
      {children}
    </SessionProvider>
  );
}

function ClerkShell({ config, children }: { config: ClerkConfig; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={config.publishable_key}
      proxyUrl={config.proxy_url || undefined}
      appearance={appearance}
      routerPush={(to: string) => navigate(to)}
      routerReplace={(to: string) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
    >
      <ClerkSessionBridge>{children}</ClerkSessionBridge>
    </ClerkProvider>
  );
}

// Starts Clerk from the backend's runtime config, so deploy's live keys need no rebuild.
// When Clerk keys are absent, the same tree runs on a local desk account instead.
// Must render inside <BrowserRouter> so Clerk navigates without reloading.
export default function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ClerkConfig | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [local, setLocal] = useState(false);

  // Retries while the backend restarts (e.g. right after provisioning).
  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      try {
        const cfg = (await (await fetch(`${BACKEND_URL}/api/clerk/config`)).json()) as ClerkConfig;
        if (cancelled) return;
        if (cfg.enabled) {
          setConfig(cfg);
          return;
        }
        setLocal(true);
        return;
      } catch {
        /* retry below */
      }
      if (cancelled) return;
      if (attempt >= 20) {
        setUnavailable(true);
        return;
      }
      setTimeout(() => load(attempt + 1), 1500);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (unavailable) {
    return (
      <p style={{ padding: 24 }}>
        Whimsy Post can't reach its studio right now. Refresh the page to try again.
      </p>
    );
  }
  if (local) return <LocalSessionProvider>{children}</LocalSessionProvider>;
  if (!config) return <p style={{ padding: 24 }}>Loading Whimsy Post...</p>;
  return <ClerkShell config={config}>{children}</ClerkShell>;
}
