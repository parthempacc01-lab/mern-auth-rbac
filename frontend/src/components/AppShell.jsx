import { useState } from "react";
import { useAuth } from "../context/useAuth";

const navItems = [
  ["/dashboard", "Overview"],
  ["/profile", "Profile"],
];

export default function AppShell({ path, navigate, children }) {
  const { user, role, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!window.confirm("Log out of your account?")) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const items = [
    ...navItems,
    ...(role === "admin" ? [["/admin", "Admin area"]] : []),
    ...(["admin", "moderator"].includes(role) ? [["/staff", "Staff area"]] : []),
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand brand--button" onClick={() => navigate("/dashboard")}><span>SA</span>SecureAuth</button>
        <nav aria-label="Main navigation">
          {items.map(([href, label]) => <button key={href} className={`nav-link ${path === href ? "nav-link--active" : ""}`} onClick={() => navigate(href)}>{label}</button>)}
        </nav>
        <div className="sidebar__user">
          <span className="avatar">{user?.name?.charAt(0).toUpperCase()}</span>
          <div><strong>{user?.name}</strong><small>{role}</small></div>
          <button className="text-button" onClick={handleLogout} disabled={isLoggingOut}>{isLoggingOut ? "Leaving…" : "Log out"}</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
