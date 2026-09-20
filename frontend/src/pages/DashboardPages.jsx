import { useEffect, useState } from "react";
import { accountApi } from "../api/accountApi";
import Notice from "../components/Notice";
import { useAuth } from "../context/useAuth";

export function DashboardPage({ navigate }) {
  const { user, role } = useAuth();
  return <><header className="page-heading"><div><p className="eyebrow">Account overview</p><h1>Good to see you, {user?.name?.split(" ")[0]}.</h1><p>Your secure session is active and your account is ready to use.</p></div><button className="button button--secondary" onClick={() => navigate("/profile")}>View profile</button></header><section className="stat-grid"><article className="stat-card"><span className="stat-icon">✓</span><p>Account status</p><strong>{user?.emailVerified ? "Verified" : "Verification required"}</strong><small>Email confirmation determines sign-in access.</small></article><article className="stat-card"><span className="stat-icon">⌁</span><p>Access level</p><strong className="role-badge">{role}</strong><small>Permissions are enforced by the backend.</small></article><article className="stat-card"><span className="stat-icon">⌘</span><p>Session security</p><strong>Protected</strong><small>Your refresh token remains HTTP-only.</small></article></section><section className="info-card"><h2>Security is built in</h2><p>Profile and role-specific routes require a short-lived access token. If it expires, the application securely asks the backend to refresh the session using its HTTP-only cookie.</p></section></>;
}

export function ProfilePage() {
  const { user, refreshProfile } = useAuth(); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const refresh = async () => { setLoading(true); setError(""); try { await refreshProfile(); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } };
  return <><header className="page-heading"><div><p className="eyebrow">Your account</p><h1>Profile details</h1><p>This data comes directly from the protected profile endpoint.</p></div><button className="button button--secondary" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh profile"}</button></header><Notice>{error}</Notice><section className="profile-card"><div className="profile-card__hero"><span className="profile-avatar">{user?.name?.charAt(0).toUpperCase()}</span><div><h2>{user?.name}</h2><p>{user?.email}</p></div></div><dl className="details-list"><div><dt>Role</dt><dd className="role-badge">{user?.role}</dd></div><div><dt>Email status</dt><dd>{user?.emailVerified ? "Verified" : "Not verified"}</dd></div><div><dt>Account created</dt><dd>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unavailable"}</dd></div></dl></section></>;
}

function RoleArea({ title, description, request }) {
  const [state, setState] = useState({ loading: true, message: "", error: "" });
  useEffect(() => { let active = true; request().then((data) => active && setState({ loading: false, message: data.message, error: "" })).catch((error) => active && setState({ loading: false, message: "", error: error.message })); return () => { active = false; }; }, [request]);
  return <><header className="page-heading"><div><p className="eyebrow">Role-protected area</p><h1>{title}</h1><p>{description}</p></div></header><section className="access-card"><span className="access-card__icon">⌁</span>{state.loading ? <p>Checking your backend permissions…</p> : <><Notice>{state.error}</Notice>{state.message && <Notice type="success">{state.message}</Notice>}</>}</section></>;
}

export function AdminPage() { return <RoleArea title="Admin workspace" description="Only backend-approved administrators can access this route." request={accountApi.getAdminArea} />; }
export function StaffPage() { return <RoleArea title="Staff workspace" description="The backend authorizes admins and moderators for this route." request={accountApi.getStaffArea} />; }
