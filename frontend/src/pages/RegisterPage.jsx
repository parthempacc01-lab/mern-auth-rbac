import { useState } from "react";
import { authApi } from "../api/authApi";
import Notice from "../components/Notice";
import PasswordField from "../components/PasswordField";

export default function RegisterPage({ navigate }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    if (!form.name.trim() || !form.email.trim() || !form.password) return setError("Complete every field to create your account.");
    if (form.password.length < 6) return setError("Your password must contain at least 6 characters.");
    if (form.password !== form.confirmPassword) return setError("The two passwords do not match.");
    setLoading(true);
    try {
      const data = await authApi.register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      setMessage(`${data.message}. Check your email, verify your account, then sign in.`);
      setForm({ name: "", email: "", password: "", confirmPassword: "" });
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };

  return <section className="auth-card"><p className="eyebrow">Create your account</p><h1>Get started securely</h1><p className="auth-card__copy">Your account will need email verification before you can sign in.</p>
    <form onSubmit={submit} noValidate><Notice>{error}</Notice><Notice type="success">{message}</Notice>
      <label className="field" htmlFor="register-name"><span className="field__label">Full name</span><input id="register-name" value={form.name} onChange={update("name")} autoComplete="name" required /></label>
      <label className="field" htmlFor="register-email"><span className="field__label">Email address</span><input id="register-email" type="email" value={form.email} onChange={update("email")} autoComplete="email" required /></label>
      <PasswordField id="register-password" label="Password" value={form.password} onChange={update("password")} autoComplete="new-password" hint="Use at least 6 characters." />
      <PasswordField id="register-confirm-password" label="Confirm password" value={form.confirmPassword} onChange={update("confirmPassword")} autoComplete="new-password" />
      <button className="button button--primary" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
    </form><p className="auth-card__footer">Already registered? <button className="link-button" onClick={() => navigate("/login")}>Sign in</button></p>
  </section>;
}
