import { createContext, useContext } from "react";

export interface DeskUser {
  userId: string;
  email: string;
  name: string;
  firstName: string;
}

export interface DeskSession {
  mode: "clerk" | "local";
  isLoaded: boolean;
  userId: string | null;
  user: DeskUser | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<DeskSession | null>(null);

export function SessionProvider({ value, children }: { value: DeskSession; children: React.ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): DeskSession {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must render inside the auth provider");
  return value;
}
