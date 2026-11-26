import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../lib/auth.tsx";

export function RequireUser() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** The server checks the admin label on every admin request; this only hides the page. */
export function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

export function Loading({ label = "Opening your envelope…" }: { label?: string }) {
  return (
    <div className="text-desk-ink grid min-h-dvh place-items-center" role="status">
      <p className="typed text-sm">{label}</p>
    </div>
  );
}
