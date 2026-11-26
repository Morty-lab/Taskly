import { LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../lib/auth.tsx";
import { Wordmark } from "./Clasp.tsx";

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-[3px] px-2 py-1.5 text-sm font-semibold sm:px-2.5 transition-colors ${
    isActive ? "bg-[#f3e6d3] text-band" : "text-[#f3e6d3] hover:bg-white/10"
  }`;

export function Shell() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-band text-[#f3e6d3] border-b-2 border-[#2e1d0c]">
        <div className="mx-auto flex max-w-7xl items-center gap-x-3 px-4 py-3 sm:gap-x-6 sm:px-6">
          <NavLink to="/" aria-label="Job Scraper home">
            <Wordmark className="text-[0.9rem] sm:text-[1.05rem]" />
          </NavLink>
          <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
            <NavLink to="/" end className={link}>
              Jobs
            </NavLink>
            <NavLink to="/profile" className={link}>
              Profile
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={link}>
                Users
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden max-w-48 truncate md:inline" title={user?.email}>
              {user?.name || user?.email}
            </span>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/sign-in");
              }}
              aria-label="Sign out"
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-[3px] px-2 py-1.5 font-semibold hover:bg-white/10 sm:px-2.5"
            >
              <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="text-desk-ink mx-auto w-full max-w-7xl px-4 pb-8 text-xs sm:px-6">
        Jobs from{" "}
        {[
          ["Remotive", "https://remotive.com"],
          ["Remote OK", "https://remoteok.com"],
          ["Arbeitnow", "https://www.arbeitnow.com"],
          ["Jobicy", "https://jobicy.com"],
        ].map(([name, url], i, all) => (
          <span key={name}>
            <a href={url} target="_blank" rel="noopener" className="font-semibold underline">
              {name}
            </a>
            {i < all.length - 1 ? ", " : ". "}
          </span>
        ))}
        Every listing links to its original posting.
      </footer>
    </div>
  );
}
