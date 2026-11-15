import { Link, NavLink } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { PenLine } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/session";

export function Logo() {
  return (
    <Link to="/" data-testid="header-logo-link" className="group flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center rounded-[10px] bg-terracotta text-white shadow-[0_3px_0_#7d3424] transition-transform duration-300 group-hover:-rotate-6">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <rect x="3" y="6" width="18" height="12" rx="1.6" fill="currentColor" />
          <rect x="4.3" y="7.3" width="15.4" height="9.4" rx="0.8" fill="#FFFDF9" />
          <rect x="15.1" y="8.3" width="3.5" height="4.2" rx="0.4" fill="#C8963E" />
          <path d="M6.1 11.2h7.2M6.1 13.2h5.4M6.1 15.2h3.4" stroke="#A34832" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      </span>
      <span className="font-serif text-xl font-semibold tracking-tight text-ink">
        Whimsy<span className="italic text-terracotta">Post</span>
      </span>
    </Link>
  );
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200",
    isActive ? "bg-accent text-ink" : "text-ink-muted hover:text-ink",
  );

export function SiteHeader() {
  const { isLoaded, userId, user, mode, signOut } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {isLoaded && !userId && (
            <>
              <Link to="/sign-in" data-testid="header-sign-in-link" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Sign in
              </Link>
              <Link
                to="/sign-up"
                data-testid="header-start-free-button"
                className={cn(buttonVariants({ size: "sm" }), "rounded-full px-4 shadow-[0_3px_0_#7d3424] active:translate-y-px")}
              >
                Start free
              </Link>
            </>
          )}
          {isLoaded && userId && (
            <>
              <NavLink to="/app" end data-testid="header-dashboard-link" className={navLink}>
                My postcards
              </NavLink>
              <Link
                to="/app/new"
                data-testid="header-new-postcard-button"
                className={cn(buttonVariants({ size: "sm" }), "hidden rounded-full px-4 shadow-[0_3px_0_#7d3424] sm:inline-flex")}
              >
                <PenLine className="size-4" /> New postcard
              </Link>
              <div data-testid="header-user-button" className="ml-1 flex items-center gap-1">
                {mode === "clerk" ? (
                  <UserButton />
                ) : (
                  <>
                    {user?.firstName && <span className="hidden text-sm text-ink sm:inline">{user.firstName}</span>}
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                      data-testid="header-sign-out-button"
                    >
                      Sign out
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
