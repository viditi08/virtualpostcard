import { SignIn, SignUp } from "@clerk/react";
import { Logo } from "@/components/SiteHeader";
import { HERO_IMAGE } from "@/lib/postcard";

export default function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
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
        <div data-testid={`${mode}-panel`}>
          {mode === "sign-in" ? (
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />
          ) : (
            <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
          )}
        </div>
      </main>
    </div>
  );
}
