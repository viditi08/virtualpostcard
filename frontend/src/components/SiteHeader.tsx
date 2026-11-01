import { Link, NavLink } from "react-router-dom";
import { Show, UserButton } from "@clerk/react";
import { Mail, PenLine } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Logo() {
  return (
    <Link to="/" data-testid="header-logo-link" className="group flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center rounded-full bg-terracotta text-white shadow-[0_3px_0_#7d3424] transition-transform duration-300 group-hover:-rotate-12">
        <Mail className="size-4.5" strokeWidth={2.2} />
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
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Show when="signed-out">
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
          </Show>
          <Show when="signed-in">
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
            <div data-testid="header-user-button" className="ml-1 flex items-center">
              <UserButton />
            </div>
          </Show>
        </nav>
      </div>
    </header>
  );
}
