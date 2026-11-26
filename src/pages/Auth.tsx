import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Clasp, Wordmark } from "../components/Clasp.tsx";
import { Loading } from "../components/guards.tsx";
import { authMessage, useAuth } from "../lib/auth.tsx";

/** The front of the envelope: the address label is the sign-in form. */
export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signingUp = mode === "sign-up";

  if (loading) return <Loading />;
  if (user) return <Navigate to={from} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (signingUp) await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[34rem]">
        <div className="text-desk-ink mb-6 text-center">
          <Wordmark className="text-band text-2xl" />
          <p className="mx-auto mt-5 max-w-md text-lg leading-snug font-semibold text-balance text-desk-ink sm:text-xl">
            Put your resume in once. See remote jobs ranked by how much of your experience each one asks for.
          </p>
        </div>

        {/* the envelope */}
        <div className="bg-envelope relative rounded-[3px] px-5 pt-14 pb-7 shadow-[0_18px_40px_-16px_rgb(46_29_12/0.7)] sm:px-10">
          {/* printed border, as on a real long brown envelope */}
          <div className="border-envelope-deep pointer-events-none absolute inset-2 rounded-xs border" aria-hidden />
          <Clasp className="absolute top-1 left-1/2 h-12 w-32 -translate-x-1/2" />

          {/* the address label */}
          <form onSubmit={submit} className="slip relative px-6 pt-5 pb-6 sm:px-8" noValidate={false}>
            <div className="border-rule flex items-baseline justify-between gap-4 border-b pb-3">
              <h1 className="text-lg font-extrabold tracking-tight">{signingUp ? "New applicant" : "Welcome back"}</h1>
              <Link
                to={signingUp ? "/sign-in" : "/sign-up"}
                state={{ from }}
                className="text-ballpen text-sm font-semibold underline"
              >
                {signingUp ? "I have an account" : "Create an account"}
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {signingUp && (
                <Field label="Name" htmlFor="name">
                  <input
                    id="name"
                    className="field"
                    autoComplete="name"
                    required
                    maxLength={128}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
              )}
              <Field label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  className="field"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Password" htmlFor="password" hint={signingUp ? "At least 8 characters" : undefined}>
                <input
                  id="password"
                  type="password"
                  className="field"
                  autoComplete={signingUp ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            </div>

            {error && (
              <p role="alert" className="bg-string-soft text-string mt-4 rounded-xs px-3 py-2 text-sm">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn mt-6 w-full">
              {busy ? (signingUp ? "Creating your account…" : "Signing in…") : signingUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-envelope-ink">
            Your resume and profile are private to you. Jobs come from Remotive, Remote OK, Arbeitnow and Jobicy.
          </p>
        </div>
      </div>
    </main>
  );
}

function Field(props: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={props.htmlFor} className="caption text-ink-soft flex justify-between">
        {props.label}
        {props.hint && <span className="font-normal tracking-normal normal-case">{props.hint}</span>}
      </label>
      {props.children}
    </div>
  );
}
