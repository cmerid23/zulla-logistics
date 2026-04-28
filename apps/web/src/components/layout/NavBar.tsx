import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Logo } from "../marketing/Logo";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="glass-nav sticky top-0 z-30 border-b border-white/[0.07]">
      <div className="mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden mono text-[11px] uppercase tracking-wider text-muted md:inline">
                {user.contactName ?? user.companyName ?? user.email}
              </span>
              <button className="btn-ghost btn-sm" onClick={() => logout.mutate()}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-accent btn-sm">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
