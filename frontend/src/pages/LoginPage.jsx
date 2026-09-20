import { useState } from "react";
import Notice from "../components/Notice";
import PasswordField from "../components/PasswordField";
import { useAuth } from "../context/useAuth";
import { authApi } from "../api/authApi";
import "./LoginPage.css";

export default function LoginPage({ navigate, search }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.email.trim() || !form.password) return setError("Enter your email address and password.");
    setLoading(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const googleFailed = new URLSearchParams(search).get("google") === "error";

  return <section className="auth-card"><p className="eyebrow">Welcome back</p><h1>Sign in to your account</h1><p className="auth-card__copy">Use your verified account to access your secure workspace.</p>
    <form onSubmit={submit} noValidate>
      <Notice>{error}</Notice>
      <Notice>{googleFailed ? "Google sign-in could not be completed. Please try again." : ""}</Notice>
      <label className="field" htmlFor="login-email"><span className="field__label">Email address</span><input id="login-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required /></label>
      <PasswordField id="login-password" label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button className="link-button link-button--right" type="button" onClick={() => navigate("/forgot-password")}>Forgot password?</button>
      <button className="button button--primary" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      <div className="auth-divider"><span>or</span></div>
      <button className="button button--google" type="button" onClick={authApi.startGoogleLogin} disabled={loading}>Continue with Google</button>
    </form>
    <p className="auth-card__footer"><button className="link-button" onClick={() => navigate("/resend-verification")}>Resend verification email</button><br />New here? <button className="link-button" onClick={() => navigate("/register")}>Create an account</button></p>
  </section>;
}
