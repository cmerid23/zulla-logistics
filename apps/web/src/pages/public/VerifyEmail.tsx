import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { MarketingNav } from "../../components/marketing/MarketingNav";
import { Footer } from "../../components/marketing/Footer";

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const verify = useMutation({
    mutationFn: () => api.get<{ verified: true }>(`/auth/verify-email`, { query: { token } }),
  });

  useEffect(() => {
    if (token) verify.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-black">
      <MarketingNav />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24">
        <div className="card w-full p-8 text-center">
          {verify.isPending && (
            <>
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">Verifying…</h1>
            </>
          )}
          {verify.isSuccess && (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green/12 text-3xl text-green">✓</div>
              <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">Email verified</h1>
              <p className="mt-2 font-body text-sm text-muted">You can sign in now.</p>
              <Link to="/login" className="btn-accent btn-lg mt-6 w-full">Sign in</Link>
            </>
          )}
          {verify.isError && (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-500/12 text-3xl text-red-400">✕</div>
              <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">Link expired</h1>
              <p className="mt-2 font-body text-sm text-muted">Sign in to request a new verification email.</p>
              <Link to="/login" className="btn-accent btn-lg mt-6 w-full">Sign in</Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
