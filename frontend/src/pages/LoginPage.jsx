import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PasswordInput } from "../components/ui/FormField";
import { BrandMark } from "../components/ui/BrandMark";

export default function LoginPage({ portalRole }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const label = portalRole === "admin" ? "Admin" : "Staff";

  async function handleSubmit(event) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const role = await login(email, password);
      if (role !== portalRole) { setError("You don’t have access to this portal."); return; }
      navigate(portalRole === "admin" ? "/admin/dashboard" : "/staff/orders");
    } catch { setError("Invalid email or password."); } finally { setLoading(false); }
  }

  return (
    <main className="auth-ui grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-[#462C7D] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandMark light portal={label} to="/" />
        <div className="max-w-md"><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Welcome back</p><h1 className="mt-4 text-4xl font-bold leading-tight text-white">Everything you need to keep orders moving.</h1><p className="mt-4 text-sm leading-6 text-white/70">A focused workspace for managing products, payments, pickup schedules, and customer orders.</p></div>
        <p className="text-xs text-white/50">The Hidden Oven · Secure portal access</p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><BrandMark portal={label} /></div>
          <div className="auth-card p-6 sm:p-8">
            <p className="page-eyebrow">{label} portal</p><h1 className="text-3xl font-bold">Welcome back</h1><p className="mb-7 mt-2 text-sm text-[#6F6B78]">Sign in with your authorized {label.toLowerCase()} account.</p>
            <form onSubmit={handleSubmit}>
              <div className="mb-4"><label className="label" htmlFor="portal-email">Email</label><input id="portal-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={`${label.toLowerCase()}@hiddenoven.com`} required autoFocus className="input" autoComplete="email" /></div>
              <PasswordInput label="Password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
              {error && <p className="mb-4 rounded-xl bg-[#FFF1F0] p-3 text-sm text-[#B42318]" role="alert">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Signing in…" : "Sign in"}</button>
            </form>
          </div>
          <button type="button" onClick={() => navigate("/")} className="btn-ghost mx-auto mt-5 flex">← Return to customer site</button>
        </div>
      </section>
    </main>
  );
}
