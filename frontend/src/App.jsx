import AppShell from "./components/AppShell";
import { useAuth } from "./context/useAuth";
import { DashboardPage, ProfilePage, AdminPage, StaffPage } from "./pages/DashboardPages";
import { ForgotPasswordPage, ResetPasswordPage } from "./pages/RecoveryPages";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { NotFoundPage, UnauthorizedPage } from "./pages/StatusPages";
import ProtectedRoute, { PageLoader } from "./routes/ProtectedRoute";
import { useRouter } from "./routes/useRouter";
import "./App.css";

const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];

function AuthLayout({ children, navigate }) {
  return <div className="auth-layout"><button className="brand brand--button" onClick={() => navigate("/login")}><span>SA</span>SecureAuth</button><div className="auth-layout__content">{children}</div><p className="auth-layout__aside">Simple authentication. Serious security.</p></div>;
}

function App() {
  const { pathname, search, navigate } = useRouter();
  const { status, isAuthenticated } = useAuth();
  const resetToken = new URLSearchParams(search).get("token");

  if (status === "loading") return <PageLoader />;
  if (isAuthenticated && publicPaths.includes(pathname)) { navigate("/dashboard"); return null; }

  const publicPage = { "/login": <LoginPage navigate={navigate} />, "/register": <RegisterPage navigate={navigate} />, "/forgot-password": <ForgotPasswordPage navigate={navigate} />, "/reset-password": <ResetPasswordPage navigate={navigate} token={resetToken} /> }[pathname];
  if (publicPage) return <AuthLayout navigate={navigate}>{publicPage}</AuthLayout>;

  const page = { "/dashboard": <DashboardPage navigate={navigate} />, "/profile": <ProfilePage />, "/admin": <AdminPage />, "/staff": <StaffPage />, "/unauthorized": <UnauthorizedPage navigate={navigate} /> }[pathname] || <NotFoundPage navigate={navigate} />;
  const roles = pathname === "/admin" ? ["admin"] : pathname === "/staff" ? ["admin", "moderator"] : undefined;
  return <ProtectedRoute roles={roles} navigate={navigate}><AppShell path={pathname} navigate={navigate}>{page}</AppShell></ProtectedRoute>;
}

export default App;
