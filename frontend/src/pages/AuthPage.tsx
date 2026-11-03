import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/react";
import { Logo } from "@/components/SiteHeader";
import { deskSignIn, deskSignUp } from "@/components/auth/LocalSession";
import { useSession } from "@/components/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HERO_IMAGE } from "@/lib/postcard";
import { ApiError } from "@/lib/api";

function messageFrom(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === "object" && "detail" in err.body) {
    const detail = (err.body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (typeof first?.msg === "string") return first.msg;
    }
  }
  return "Something went wrong. Try again.";
}

function DeskAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "sign-up") await deskSignUp(email, password, name);
      else await deskSignIn(email, password);
      window.location.assign("/app");
    } catch (err) {
      setError(messageFrom(err));
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4" data-testid={`${mode}-panel`}>
      <div>
        <h1 className="font-serif text-3xl text-ink">{mode === "sign-in" ? "Sign in" : "Create your desk"}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {mode === "sign-in"
            ? "Pick up the postcards you have already sealed."
            : "This studio is running without Clerk, so your account lives on this machine."}
        </p>
      </div>
      {mode === "sign-up" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sam Rivera" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={mode === "sign-up" ? 8 : 1}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-10 w-full rounded-full shadow-[0_3px_0_#7d3424]">
        {pending ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        {mode === "sign-in" ? (
          <>
            New here?{" "}
            <Link to="/sign-up" className="font-medium text-terracotta underline">
              Start free
            </Link>
          </>
        ) : (
          <>
            Already have a desk?{" "}
            <Link to="/sign-in" className="font-medium text-terracotta underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

export default function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const session = useSession();
  return (
    <div className="paper-grain grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-[#FDFCFA] lg:flex lg:flex-col lg:justify-between">
        <div className="[&_span]:text-[#FDFCFA]">
          <Logo />
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-6 rotate-3 rounded-[4px] bg-envelope-in/10" />
          <img
            src={HERO_IMAGE}
            alt="Illustrated postcard of balloons over a valley"
            className="relative -rotate-3 rounded-[2px] border-[8px] border-cardstock shadow-2xl"
          />
        </div>
        <div>
          <h2 className="font-serif text-4xl italic leading-tight">
            {mode === "sign-in" ? "Welcome back to your postal desk." : "Your first postcard is waiting."}
          </h2>
          <p className="mt-3 max-w-sm text-[#C2B8AE]">Design it, seal it, send it. They'll open an envelope, not an email.</p>
        </div>
      </aside>
      <main className="flex flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        {session.mode === "clerk" ? (
          <div data-testid={`${mode}-panel`}>
            {mode === "sign-in" ? (
              <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />
            ) : (
              <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
            )}
          </div>
        ) : (
          <DeskAuthForm mode={mode} />
        )}
      </main>
    </div>
  );
}
