import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PasswordInput } from "../components/ui/FormField";

export default function LoginPage({ portalRole }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const label = portalRole === "admin" ? "Admin" : "Staff";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const role = await login(email, password);
      if (role !== portalRole) {
        setError("You don't have access to this portal.");
        return;
      }
      navigate(portalRole === "admin" ? "/admin/dashboard" : "/staff/orders");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "11px 13px",
    border: "1.5px solid rgba(201,168,76,0.25)",
    borderRadius: "8px",
    fontSize: "0.87rem",
    fontFamily: "Inter, sans-serif",
    background: "rgba(255,255,255,0.05)",
    color: "#F0E8D8",
    outline: "none",
    transition: "border 0.2s, background 0.2s",
    WebkitAppearance: "none",
    appearance: "none",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background:
          "radial-gradient(ellipse at 30% 50%, #261748 0%, #0D0820 70%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 font-display font-bold text-xl"
            style={{
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.3)",
              color: "#C9A84C",
              boxShadow: "0 0 24px rgba(201,168,76,0.2)",
              animation: "loginGlow 3s ease-in-out infinite alternate",
            }}
          >
            HO
          </div>
          <h1
            className="font-display text-[1.4rem] font-bold"
            style={{ color: "#E8C96D" }}
          >
            The Hidden Oven
          </h1>
          <p className="text-[0.78rem] mt-1" style={{ color: "#9080A8" }}>
            {label} Portal
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#1E1235",
            border: "1px solid rgba(201,168,76,0.18)",
            borderRadius: "18px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.65)",
            padding: "28px",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                className="block text-[0.69rem] font-bold uppercase tracking-[0.5px] mb-1.5"
                style={{ color: "#9080A8" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@hiddenoven.com"
                required
                autoFocus
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = "#C9A84C";
                  e.target.style.background = "rgba(201,168,76,0.06)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(201,168,76,0.25)";
                  e.target.style.background = "rgba(255,255,255,0.05)";
                }}
              />
            </div>

            {/* Password */}
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* Error */}
            {error && (
              <p
                className="text-[0.77rem] text-center"
                style={{ color: "#E05252" }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-[0.87rem] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "#C9A84C",
                color: "#1A0F2E",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "#E8C96D";
                  e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(201,168,76,0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#C9A84C";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes loginGlow {
          from { box-shadow: 0 0 10px rgba(201,168,76,0.2); }
          to   { box-shadow: 0 0 28px rgba(201,168,76,0.45); }
        }
      `}</style>
    </div>
  );
}
