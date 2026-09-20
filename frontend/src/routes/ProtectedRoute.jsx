import { useAuth } from "../context/useAuth";

export function PageLoader() {
  return <div className="page-loader"><span className="spinner" />Loading your secure workspace…</div>;
}

export default function ProtectedRoute({ children, roles, navigate }) {
  const { status, role } = useAuth();

  if (status === "loading") return <PageLoader />;
  if (status !== "authenticated") {
    navigate("/login");
    return null;
  }
  if (roles && !roles.includes(role)) {
    navigate("/unauthorized");
    return null;
  }
  return children;
}
